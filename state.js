const { makeBuiltInQuestionBank } = require("./questions");

const TEAM_DEFS = [
  { id: "t1", name: "Crimson", color: "#c81e1e" },
  { id: "t2", name: "Sapphire", color: "#1d4ed8" },
  { id: "t3", name: "Emerald", color: "#059669" },
  { id: "t4", name: "Amber", color: "#d97706" },
  { id: "t5", name: "Violet", color: "#7c3aed" },
  { id: "t6", name: "Obsidian", color: "#111827" }
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function createInitialSessionState(code) {
  const now = Date.now();
  const teams = TEAM_DEFS.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    members: [],
    resources: {
      castleHp: 0,
      wallHp: 0,
      armyPoints: 0,
      soldiers: 0,
      weaponsUnlocked: false,
      vocabBonus: 0
    },
    stats: {
      correct: 0,
      wrong: 0,
      skipped: 0
    }
  }));

  return {
    code,
    createdAt: now,
    phase: 0,
    status: "lobby", // lobby | in_progress | ended
    questionBank: makeBuiltInQuestionBank(),
    currentQuestion: null, // {id, phase, askedAt, expiresAt, answeredByTeamIds:Set}
    teams,
    players: [], // {id,name,teamId,connected, socketId?, pos?}
    audit: []
  };
}

function publicSessionState(session) {
  const { code, createdAt, phase, status, teams, players, currentQuestion } = session;
  return {
    code,
    createdAt,
    phase,
    status,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      memberCount: t.members.length,
      members: t.members.map((m) => ({ id: m.id, name: m.name, connected: m.connected })),
      resources: t.resources,
      stats: t.stats,
      derived: {
        wallTier: wallTier(t.resources.wallHp),
        armyModels: Math.floor((t.resources.soldiers || 0) / 100),
        totalScore: (t.resources.castleHp || 0) + (t.resources.wallHp || 0) + (t.resources.soldiers || 0)
      }
    })),
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      teamId: p.teamId,
      connected: p.connected,
      pos: p.pos || { x: 0, y: 0 }
    })),
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          phase: currentQuestion.phase,
          prompt: currentQuestion.prompt,
          type: currentQuestion.type,
          choices: currentQuestion.choices || null,
          askedAt: currentQuestion.askedAt,
          expiresAt: currentQuestion.expiresAt
        }
      : null
  };
}

function wallTier(wallHp) {
  if (wallHp >= 15000) return "Fortress";
  if (wallHp >= 10000) return "Iron";
  if (wallHp >= 5000) return "Stone";
  if (wallHp > 0) return "Wooden";
  return "None";
}

module.exports = {
  TEAM_DEFS,
  clamp,
  createInitialSessionState,
  publicSessionState,
  wallTier
};
