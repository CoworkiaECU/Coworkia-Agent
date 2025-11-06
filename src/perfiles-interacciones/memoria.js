// Sistema de memoria: perfiles de usuarios e historial de interacciones
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const INTERACTIONS_FILE = path.join(DATA_DIR, 'interactions.jsonl');

// Asegurar que existe la carpeta data/
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadAllProfiles() {
  if (!fs.existsSync(PROFILES_FILE)) return Promise.resolve('{}');
  return fs.promises.readFile(PROFILES_FILE, 'utf-8');
}

export function loadProfile(userId) {
  const filePath = path.join(DATA_DIR, userId + '.json');
  if (!fs.existsSync(filePath)) return null;
  return fs.promises.readFile(filePath, 'utf-8').then(JSON.parse).catch(() => null);
}

export function saveProfile(userId, partialProfile = {}) {
  return fs.promises.writeFile(path.join(DATA_DIR, userId + '.json'), JSON.stringify(partialProfile, null, 2));
}

export function saveInteraction(event = {}) {
  return fs.promises.appendFile(INTERACTIONS_FILE, JSON.stringify(event) + '\n');
}