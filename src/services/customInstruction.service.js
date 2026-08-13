const CustomInstruction = require('../models/CustomInstruction');

const listCustomInstructions = () => CustomInstruction.find({}).sort({ createdAt: 1 });

const getCustomInstructionsPromptBlock = async () => {
  const rules = await listCustomInstructions();
  if (rules.length === 0) return '';
  return `\n\n---\n\n## INSTRUCCIONES ADICIONALES DEL EQUIPO (agregadas manualmente desde el panel de administración, tienen la MISMA prioridad y obligatoriedad que el resto de estas instrucciones — no las trates como sugerencias opcionales)\n${rules.map((r, i) => `${i + 1}. ${r.text}`).join('\n')}`;
};

module.exports = { listCustomInstructions, getCustomInstructionsPromptBlock };
