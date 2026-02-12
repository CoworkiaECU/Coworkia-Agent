// Proxy de base de datos usado solo en tests E2E
// Delegamos todas las operaciones al adaptador en memoria de src/database/database.js
import databaseService from '../../../src/database/database.js';

async function initialize() {
  await databaseService.initialize();
  return true;
}

async function run(query, params = []) {
  return databaseService.run(query, params);
}

async function get(query, params = []) {
  return databaseService.get(query, params);
}

export default {
  initialize,
  run,
  get
};
