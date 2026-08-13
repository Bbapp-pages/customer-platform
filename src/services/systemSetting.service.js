const SystemSetting = require('../models/SystemSetting');

const SINGLETON_ID = 'system';

// Upsert atómico: con find-then-create, dos llamadas concurrentes (ej. los dos
// cron cada 15 min disparando a la misma hora en el primer arranque, antes de
// que exista el documento) podían chocar y una tirar un error de llave
// duplicada. findOneAndUpdate con upsert deja que Mongo resuelva la carrera.
const getSettings = async () =>
  SystemSetting.findOneAndUpdate(
    { _id: SINGLETON_ID },
    { $setOnInsert: { _id: SINGLETON_ID, aiEnabled: true } },
    { upsert: true, new: true }
  );

const isAiEnabled = async () => (await getSettings()).aiEnabled;

const setAiEnabled = async (aiEnabled) =>
  SystemSetting.findByIdAndUpdate(SINGLETON_ID, { aiEnabled }, { upsert: true, new: true, setDefaultsOnInsert: true });

module.exports = { getSettings, isAiEnabled, setAiEnabled };
