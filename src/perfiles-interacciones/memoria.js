// Sistema de memoria: perfiles de usuarios e historial de interacciones
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const INTERACTIONS_FILE = path.join(DATA_DIR, 'interactions.jsonl');

export function loadAllProfiles() {
  return fs.promises.readFile(PROFILES_FILE, 'utf-8');
}

export function loadProfile(userId) {
  return fs.promises.readFile(path.join(DATA_DIR, userId + '.json'), 'utf-8');
}

export function saveProfile(userId, partialProfile = {}) {
  return fs.promises.writeFile(path.join(DATA_DIR, userId + '.json'), JSON.stringify(partialProfile));
}

export function saveInteraction(event = {}) {
  return fs.promises.appendFile(INTERACTIONS_FILE, JSON.stringify(event) + '\n');
}