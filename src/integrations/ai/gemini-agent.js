const fs = require('fs');
const path = require('path');

const { GoogleGenAI, createPartFromFunctionResponse } = require('@google/genai');

const env = require('../../config/env');
const campaignBooking = require('../../services/campaignBooking.service');
const { CLINIC_UTC_OFFSET } = require('../../config/campaignSchedule.constants');
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

const buildEligibilityFacts = async (phone) => {
  try {
    const [services, eligibility] = await Promise.all([
      campaignBooking.listServices(),
      campaignBooking.checkEligibility({ phone }),
    ]);

    const followUpConstraint =
      eligibility.participant?.status === 'CONTACTED' ? `\n\n${buildFollowUpDateConstraint()}` : '';

    return `Servicios reales de la campaña activa: ${JSON.stringify(services.services)}.
Elegibilidad de este cliente, ya verificada por el sistema: ${JSON.stringify(eligibility)}.
Esta información YA está verificada — nunca digas que la vas a consultar, ni le pidas al
cliente su teléfono (ya lo tienes). Si "eligible" es false, exhibe honestamente el motivo
sin inventar una cita ni un beneficio.${followUpConstraint}`;
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

const runAgentTurn = async ({ phone, messages }) => {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = getClient();
  const facts = await buildEligibilityFacts(phone);
  const systemInstruction = buildSystemInstruction(facts);

  let contents = messages.map(mapMessageToContent);
  let lastResponse;

  for (let round = 0; round < MAX_TOOL_ROUNDTRIPS; round += 1) {
    lastResponse = await ai.models.generateContent({
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
