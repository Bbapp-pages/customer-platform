const fs = require('fs');
const path = require('path');

const { GoogleGenAI, createPartFromFunctionResponse } = require('@google/genai');

const env = require('../../config/env');
const campaignBooking = require('../../services/campaignBooking.service');
const {
  CLINIC_UTC_OFFSET,
  CLINIC_WEBSITE,
  CLINIC_PHONE,
  CLINIC_SUPPORT_PHONE,
  CLINIC_ADDRESS,
} = require('../../config/campaignSchedule.constants');
const { toClinicWallClock, addClinicDays } = require('../../utils/clinicTime');

const MAX_TOOL_ROUNDTRIPS = 5;

const instructionsPath = path.join(__dirname, '../../../instructions.md');
const getInstructions = () => fs.readFileSync(instructionsPath, 'utf8');

let aiClient;
const getClient = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return aiClient;
};

// list_services y check_eligibility NO se exponen como tools: en pruebas, el
// modelo (gemini-3.1-flash-lite) narraba "voy a verificar" sin llegar a invocar
// la función, sobre todo con el system prompt completo + varias tools a la vez.
// Se resuelven siempre server-side y se inyectan como hechos ya verificados en
// el system instruction, para que el modelo nunca tenga que "decidir" pedirlos.
// Solo quedan como tools las acciones que dependen de datos de la conversación
// (fecha/hora) o que mutan estado real (agendar/cancelar/reprogramar).
// El teléfono NUNCA es un parámetro que el modelo deba rellenar: en pruebas
// llegó a inventar valores (placeholders, números de ejemplo) al relayarlo
// desde el contexto. El teléfono real de la conversación se inyecta aquí
// server-side (ver callTool) y se ignora cualquier "phone" que el modelo mande.
const TOOLS = [
  {
    name: 'get_available_slots',
    description:
      'Consulta los horarios reales disponibles para un servicio en una fecha. Nunca ofrezcas ni confirmes un horario sin llamar antes a esta función.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        serviceCode: { type: 'string' },
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
      },
      required: ['serviceCode', 'date'],
    },
    handler: ({ serviceCode, date }) => campaignBooking.getAvailableSlots({ serviceCode, date }),
  },
  {
    name: 'book_appointment',
    description:
      'Agenda la cita del beneficio de campaña del cliente en un horario ya confirmado disponible con get_available_slots. Solo llámala cuando el cliente confirmó explícitamente fecha y hora.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre completo del cliente' },
        serviceCode: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:mm' },
      },
      required: ['serviceCode', 'date', 'time'],
    },
    handler: ({ name, serviceCode, date, time, phone }) =>
      campaignBooking.bookAppointment({ phone, name, serviceCode, date, time }),
  },
  {
    name: 'cancel_appointment',
    description:
      'Cancela la cita agendada del cliente. Esto hace que el beneficio se pierda para siempre. Solo llámala cuando el cliente confirmó explícitamente que quiere cancelar.',
    parametersJsonSchema: { type: 'object', properties: {} },
    handler: ({ phone }) => campaignBooking.cancelAppointment({ phone }),
  },
  {
    name: 'reschedule_appointment',
    description:
      'Reprograma la cita del cliente a una nueva fecha/hora ya confirmada disponible con get_available_slots. No funciona si el beneficio ya se perdió.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:mm' },
      },
      required: ['date', 'time'],
    },
    handler: ({ date, time, phone }) => campaignBooking.rescheduleAppointment({ phone, date, time }),
  },
  {
    name: 'record_appointment_feedback',
    description:
      'Registra la retroalimentación de una cita ya realizada, cuando el cliente cuenta cómo le fue. Llámala siempre que el cliente responda a la pregunta de retroalimentación.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        result: { type: 'string', enum: ['positive', 'negative'] },
        comment: { type: 'string', description: 'Lo que el cliente contó, en sus palabras' },
      },
      required: ['result'],
    },
    handler: ({ result, comment, phone }) =>
      campaignBooking.recordAppointmentFeedback({ phone, result, comment }),
  },
  {
    name: 'register_participant',
    description:
      'Registra a un cliente nuevo en la campaña activa. Solo llámala cuando ya tengas su nombre completo, número de documento de identidad y correo electrónico — nunca con datos incompletos o inventados.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        documentId: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name', 'documentId', 'email'],
    },
    handler: ({ name, documentId, email, phone }) =>
      campaignBooking.registerParticipantViaChat({ phone, name, documentId, email }),
  },
  {
    name: 'record_skin_concern',
    description:
      'Registra qué le gustaría mejorar principalmente en su piel a un cliente recién registrado, cuando responde la pregunta de segmentación. Llámala una sola vez por cliente, solo si respondió esa pregunta.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        concern: {
          type: 'string',
          enum: [
            'MANCHAS_PIGMENTACION',
            'CICATRICES_ACNE',
            'ARRUGAS_LINEAS',
            'TEXTURA_POROS',
            'REJUVENECIMIENTO_GENERAL',
            'OTRO',
          ],
        },
        detail: {
          type: 'string',
          description: 'Lo que el cliente dijo en sus palabras, sobre todo si eligió OTRO',
        },
      },
      required: ['concern'],
    },
    handler: ({ concern, detail, phone }) =>
      campaignBooking.recordSkinConcern({ phone, concern, detail }),
  },
];

const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

const FUNCTION_DECLARATIONS = TOOLS.map(({ name, description, parametersJsonSchema }) => ({
  name,
  description,
  parametersJsonSchema,
}));

const formatDateWithWeekday = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));

  return `${label} (${dateStr})`;
};

const buildFollowUpDateConstraint = () => {
  const today = toClinicWallClock(new Date()).date;
  const day1 = addClinicDays(today, 1);
  const day2 = addClinicDays(today, 2);

  const allowedDates = day1.weekday === 0 ? [day2.date] : [day1.date];
  if (day1.weekday !== 0 && day2.weekday !== 0) {
    allowedDates.push(day2.date);
  }

  return `REGLA OBLIGATORIA PARA ESTA CONVERSACIÓN (no negociable, tiene prioridad sobre cualquier
fecha que el cliente mencione): este cliente fue contactado proactivamente por la campaña y
todavía no tiene cita agendada. Las ÚNICAS fechas que existen para agendar con este cliente son
(usa exactamente este nombre de día, no lo recalcules):
${allowedDates.map((d, i) => `${i + 1}. ${formatDateWithWeekday(d)}`).join('\n')}
${allowedDates.length === 2 ? `Prioriza llenar la fecha 1 (${allowedDates[0]}) antes de ofrecer la fecha 2.` : ''}
Si el cliente pide, propone o insiste en cualquier otra fecha (incluida "el próximo [día]",
"la otra semana", o cualquier fecha fuera de esta lista): NO llames a get_available_slots con esa
fecha, NO la aceptes. En su lugar, explícale amablemente que por este contacto especial solo hay
cupo disponible en ${allowedDates.length === 2 ? 'estas dos fechas' : 'esta fecha'} y vuelve a
ofrecérsela(s). Si get_available_slots muestra que ya no hay cupo en ninguna de estas fechas
permitidas, dile honestamente que el equipo lo va a contactar para reprogramar — nunca ofrezcas
una fecha fuera de esta lista como alternativa.`;
};

const buildRegistrationFlow = (eligibility) => {
  if (eligibility.reason !== 'not_a_participant') {
    return '';
  }

  return `\n\nCLIENTE NUEVO, TODAVÍA NO ES PARTICIPANTE: ya no existe un formulario web, el
registro se hace por este chat. IMPORTANTE — esto aplica incluso si en mensajes ANTERIORES de
esta misma conversación tú le dijiste que ya estaba registrado o que ya era participante: ese
dato quedó obsoleto (por ejemplo, un administrador pudo haber reiniciado su registro). El dato
de AHORA (not_a_participant) siempre tiene prioridad sobre lo que hayas dicho antes — no le
digas "ya estabas registrado" ni nada parecido, no menciones ninguna contradicción, simplemente
trátalo con toda naturalidad como alguien que se registra de nuevo, como si fuera la primera vez.
Cuéntale que es la campaña de Más Salud LATAM y que al registrarse entra al proceso de selección
para obtener GRATIS uno de dos beneficios (Hollywood Peel o Láser CO₂ fraccionado) — NUNCA le
digas cuál de los dos le tocó ni que "ya ganó", eso todavía no se anuncia y se le avisa más
adelante cuando lo contactemos. Para participar pídele: nombre completo, número de documento de
identidad, y correo electrónico (el teléfono ya lo tienes, no lo pidas). No avances más de lo que
la conversación ya trae — no inventes ni completes ningún dato que el cliente no te haya dado
explícitamente, y no le preguntes de nuevo un dato que ya te dio. Cuando tengas los tres datos,
llama a register_participant. Si el registro fue exitoso:

1) Confírmale el registro con un cierre que genere expectativa y deje claro qué sigue — NO lo
cierres con un simple "gracias". Usa la idea de: quedó registrado/a en el proceso de selección de
la campaña de tratamientos faciales de Más Salud LATAM, participará por una sesión 100% GRATIS de
Hollywood Peel o Láser CO₂ fraccionado, y si es seleccionado/a lo van a contactar por este mismo
WhatsApp para decirle qué tratamiento le tocó y coordinar su cita.

2) Inmediatamente después (mismo turno o el siguiente, sin que se sienta como un formulario),
pregúntale qué le gustaría mejorar principalmente en su piel, dándole estas opciones numeradas:
1. Manchas y pigmentación
2. Cicatrices de acné
3. Arrugas y líneas de expresión
4. Textura y poros
5. Rejuvenecimiento general
6. Otro
Cuando responda (por número o en sus palabras), llama a record_skin_concern con el concern que
mejor corresponda (usa OTRO si no calza en las anteriores) y pon en detail lo que dijo si aporta
contexto. Esto es solo para conocerlo mejor, nunca lo presentes como obligatorio ni insistas más
de una vez — si no responde o cambia de tema, sigue la conversación con naturalidad.`;
};

const buildRebookingRedirect = (eligibility) => {
  const alreadyUsedBenefit =
    eligibility.participant?.status === 'ATTENDED' && eligibility.prizeStatus === 'REDEEMED';

  if (!alreadyUsedBenefit) {
    return '';
  }

  return `\n\nBENEFICIO YA UTILIZADO: este cliente ya se realizó su cita gratuita de la campaña
(beneficio ya usado, no queda otro disponible). Si te pide agendar una cita nueva, dice que ya
pagó algo, o quiere reprogramar más allá de su beneficio ya usado: NO intentes agendarla tú, no
llames a get_available_slots ni a book_appointment para esto. Dile amablemente que para una cita
nueva escriba directamente a ${CLINIC_SUPPORT_PHONE} o visite ${CLINIC_WEBSITE}.`;
};

const buildFeedbackContext = async (phone) => {
  const pending = await campaignBooking.findPendingFeedbackSummary({ phone });

  if (!pending) {
    return '';
  }

  return `\n\nRETROALIMENTACIÓN PENDIENTE: le preguntamos a este cliente cómo le fue en su cita
de ${pending.serviceName} (${pending.date}). Si en su mensaje te cuenta cómo le fue, llama a
record_appointment_feedback con result="positive" o "negative" según corresponda y comment con
lo que te haya contado. Si el resultado es positivo, agradécele cordialmente. Si es negativo,
dile que lamentas el inconveniente y que por favor cuente lo sucedido escribiendo a
${CLINIC_SUPPORT_PHONE} para que el equipo lo atienda directamente — nunca intentes resolver tú
el problema ni prometas ninguna solución, reprogramación o compensación.`;
};

// Antes de ser CONTACTED, el participante no debe saber qué premio le tocó (eso se anuncia en el
// contacto proactivo de campaignFollowUp.job.js). checkEligibility() sí necesita el servicio real
// para validar el booking internamente, así que el ocultamiento se hace aquí, en lo que ve el
// modelo — nunca le pasamos el dato en crudo para que no pueda filtrarlo aunque el cliente insista.
const redactUnrevealedPrize = (eligibility) => {
  if (eligibility.participant?.status === 'CONTACTED' || !eligibility.service) {
    return eligibility;
  }

  return { ...eligibility, service: 'AUN_NO_REVELADO_no_le_digas_al_cliente_cual_es' };
};

const buildEligibilityFacts = async (phone) => {
  try {
    const [services, rawEligibility] = await Promise.all([
      campaignBooking.listServices(),
      campaignBooking.checkEligibility({ phone }),
    ]);

    const eligibility = redactUnrevealedPrize(rawEligibility);

    const followUpConstraint =
      eligibility.participant?.status === 'CONTACTED' ? `\n\n${buildFollowUpDateConstraint()}` : '';
    const registrationFlow = buildRegistrationFlow(eligibility);
    const rebookingRedirect = buildRebookingRedirect(eligibility);
    const feedbackContext = await buildFeedbackContext(phone);

    return `Servicios reales de la campaña activa: ${JSON.stringify(services.services)}.
Dirección de la clínica (única sede, no hay otras): ${CLINIC_ADDRESS}. Teléfono de contacto
general de la clínica: ${CLINIC_PHONE}. Si el cliente pregunta por la ubicación, cómo llegar, o
dónde queda la clínica, dale esta dirección directamente de una vez — nunca le preguntes en qué
ciudad está ni le pidas más contexto para "verificar cobertura", solo hay esta sede y aplica para
cualquier cliente. Si pregunta por un teléfono para llamar o escribir directamente (no relacionado
con una mala experiencia en su cita ni con un beneficio ya usado, casos que tienen su propio
número más abajo), dale este teléfono de contacto general.
Elegibilidad de este cliente, ya verificada por el sistema EN ESTE MISMO INSTANTE: ${JSON.stringify(eligibility)}.
Esta información es la verdad actual y tiene prioridad absoluta sobre cualquier cosa que tú
mismo hayas dicho en turnos anteriores de esta conversación — el estado del cliente puede
cambiar entre un mensaje y otro (por ejemplo, un administrador puede haber borrado su registro,
reiniciado su participación, o cancelado su cita). Esto aplica a CUALQUIER dato específico que
hayas mencionado antes y que ya no aparezca aquí o aparezca distinto: qué premio le tocó, si está
registrado, la fecha/hora de su cita, o el estado de su beneficio. Si el cliente te pregunta por
o insiste en algo que tú mismo dijiste en un turno anterior pero que esta información de ahora no
confirma, NUNCA lo reafirmes ni lo repitas solo porque está en el historial — pregúntale con
naturalidad los datos que necesites de nuevo como si fuera la primera vez, sin explicarle por qué.
No lo menciones ni te contradigas en voz alta: simplemente actúa según el dato de ahora. Nunca
digas que vas a consultar esta información, ni le pidas al cliente su teléfono (ya lo tienes). Si
"eligible" es false, exhibe honestamente el motivo sin inventar una cita ni un beneficio.
Recuerda resaltar seguido que el beneficio es 100% GRATIS.
Cuando confirmes con éxito que una cita quedó agendada, después de la confirmación ofrécele una
sola vez este enlace para ver el catálogo completo de servicios: ${CLINIC_WEBSITE}
${registrationFlow}${followUpConstraint}${rebookingRedirect}${feedbackContext}`;
  } catch (error) {
    return `No fue posible verificar automáticamente los datos de campaña (${error.message}).
Indícale al cliente que vas a confirmar con el equipo, sin inventar disponibilidad ni beneficios.`;
  }
};

const buildSystemInstruction = (facts) => {
  const clinicNow = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  return `${getInstructions()}

---

## CONTEXTO INTERNO (no repetir textualmente al cliente)

Ahora mismo es: ${clinicNow} (hora de la clínica, zona horaria ${CLINIC_UTC_OFFSET}).

${facts}

Para consultar horarios reales o para agendar/cancelar/reprogramar SIEMPRE debes invocar
la función correspondiente en el mismo turno — nunca digas "dame un momento" o "voy a
verificar" sin llamarla ya.`;
};

const mapMessageToContent = (message) => ({
  role: message.sender === 'customer' ? 'user' : 'model',
  parts: [{ text: message.message }],
});

const callTool = async (functionCall, phone) => {
  const tool = TOOLS_BY_NAME.get(functionCall.name);

  if (!tool) {
    return { error: `unknown_tool_${functionCall.name}` };
  }

  try {
    const args = { ...(functionCall.args || {}), phone };
    console.log('[tool call]', functionCall.name, args);
    const result = await tool.handler(args);
    console.log('[tool result]', functionCall.name, JSON.stringify(result));
    return result;
  } catch (error) {
    return { error: error.message || 'internal_error' };
  }
};

// Gemini devuelve 503/429 con cierta frecuencia por sobrecarga temporal del
// modelo ("high demand... please try again later") — son errores transitorios
// que casi siempre se resuelven en segundos, así que reintentamos un par de
// veces antes de rendirnos. Sin esto, un blip de Gemini justo después de una
// acción real (agendar, registrar) deja al cliente con el mensaje de error
// genérico aunque la acción sí se haya completado en la base de datos.
const RETRYABLE_STATUSES = [429, 500, 503];
const RETRY_DELAYS_MS = [800, 2000];

const generateContentWithRetry = async (ai, params) => {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      const isRetryable = RETRYABLE_STATUSES.includes(error.status);
      const hasRetriesLeft = attempt < RETRY_DELAYS_MS.length;

      if (!isRetryable || !hasRetriesLeft) {
        throw error;
      }

      console.warn(
        `[gemini-agent] ${error.status} retryable error, reintentando en ${RETRY_DELAYS_MS[attempt]}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
};

const runAgentTurn = async ({ phone, messages, media }) => {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = getClient();
  const facts = await buildEligibilityFacts(phone);
  const systemInstruction = buildSystemInstruction(facts);

  let contents = messages.map(mapMessageToContent);

  if (media) {
    const lastContent = contents[contents.length - 1];
    lastContent.parts.push({ inlineData: { mimeType: media.mimeType, data: media.data } });
  }

  let lastResponse;

  for (let round = 0; round < MAX_TOOL_ROUNDTRIPS; round += 1) {
    lastResponse = await generateContentWithRetry(ai, {
      model: env.geminiModel,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      },
    });

    const functionCalls = lastResponse.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      break;
    }

    const responseParts = await Promise.all(
      functionCalls.map(async (call) => {
        const result = await callTool(call, phone);
        return createPartFromFunctionResponse(call.id, call.name, result);
      })
    );

    contents = [...contents, lastResponse.candidates[0].content, { role: 'user', parts: responseParts }];
  }

  return lastResponse?.text || 'Disculpa, tuve un problema para responder. ¿Puedes repetir tu mensaje?';
};

module.exports = { runAgentTurn };
