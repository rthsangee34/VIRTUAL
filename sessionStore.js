const fs = require("fs");
const path = require("path");

const { createInitialSessionState, publicSessionState } = require("../game/state");

/** @type {Map<string, any>} */
const sessions = new Map();

function randomCode(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function randomKey(len = 12) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function createSession() {
  let code = randomCode();
  while (sessions.has(code)) code = randomCode();
  const session = createInitialSessionState(code);
  session.teacherKey = randomKey();
  sessions.set(code, session);
  return session;
}

function getSession(code) {
  return sessions.get(String(code || "").toUpperCase()) || null;
}

function getAllSessions() {
  return Array.from(sessions.values());
}

function listPublicSessionState(session) {
  return publicSessionState(session);
}

function ensureDataDir() {
  const dir = path.join(__dirname, "..", "..", "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function endSession(code) {
  const session = getSession(code);
  if (!session) return { ok: false, error: "Session not found" };

  const dataDir = ensureDataDir();
  const safe = session.code.replace(/[^A-Z0-9]/g, "");
  const filename = `results-${safe}-${Date.now()}.json`;
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(publicSessionState(session), null, 2), "utf8");

  sessions.delete(session.code);
  return { ok: true, savedTo: filePath };
}

module.exports = {
  createSession,
  getSession,
  getAllSessions,
  listPublicSessionState,
  endSession
};
