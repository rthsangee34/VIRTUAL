const { clamp } = require("./state");

function normalizeAnswer(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function teamForPlayer(session, playerId) {
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return null;
  return session.teams.find((t) => t.id === player.teamId) || null;
}

function findQuestion(session, questionId) {
  return session.questionBank.find((q) => q.id === questionId) || null;
}

function questionPublic(q, askedAt, expiresAt) {
  return {
    id: q.id,
    phase: q.phase,
    prompt: q.prompt,
    type: q.type,
    choices: q.choices || null,
    askedAt,
    expiresAt
  };
}

function setQuestionBank(session, questions) {
  if (!Array.isArray(questions)) return { ok: false, error: "questions must be an array" };
  const normalized = [];
  for (const q of questions) {
    if (!q || typeof q !== "object") return { ok: false, error: "invalid question object" };
    if (!q.id || !q.prompt || !q.phase) return { ok: false, error: "question requires id, phase, prompt" };
    normalized.push({
      id: String(q.id),
      phase: Number(q.phase),
      type: q.type === "text" ? "text" : "mcq",
      prompt: String(q.prompt),
      choices: Array.isArray(q.choices) ? q.choices.map(String) : undefined,
      answer: q.answer
    });
  }
  session.questionBank = normalized;
  session.audit.push({ at: Date.now(), event: "setQuestionBank", count: normalized.length });
  return { ok: true };
}

function startPhase(session, phase) {
  const p = Number(phase);
  if (![0, 1, 2, 3, 4, 5].includes(p)) return { ok: false, error: "phase must be 0-5" };
  session.phase = p;
  session.status = p === 0 ? "lobby" : "in_progress";
  session.currentQuestion = null;
  session.audit.push({ at: Date.now(), event: "startPhase", phase: p });
  return { ok: true };
}

function askQuestion(session, questionId, ms = 20000) {
  const q = findQuestion(session, questionId);
  if (!q) return { ok: false, error: "question not found" };
  if (session.phase !== 0 && q.phase !== session.phase) {
    return { ok: false, error: `question is for phase ${q.phase}, but session is phase ${session.phase}` };
  }

  const now = Date.now();
  const expiresAt = now + ms;
  session.currentQuestion = {
    id: q.id,
    phase: q.phase,
    prompt: q.prompt,
    type: q.type,
    choices: q.choices,
    answer: q.answer,
    askedAt: now,
    expiresAt,
    answeredByTeamIds: new Set()
  };
  session.audit.push({ at: now, event: "askQuestion", id: q.id, phase: q.phase, expiresAt });
  return { ok: true, questionPublic: questionPublic(q, now, expiresAt) };
}

function evaluateQuestion(q, rawAnswer) {
  if (q.answer === "__ANY_VERB__") {
    const a = String(rawAnswer || "").trim();
    return a.length >= 2 && !/\s{2,}/.test(a);
  }
  if (Array.isArray(q.answer)) {
    const a = normalizeAnswer(rawAnswer);
    return q.answer.some((x) => normalizeAnswer(x) === a);
  }
  return normalizeAnswer(q.answer) === normalizeAnswer(rawAnswer);
}

function applyPhaseScoring(team, phase, isCorrect, isSkipped) {
  const r = team.resources;

  if (phase === 1) {
    if (isCorrect) r.castleHp = clamp(r.castleHp + 50, 0, 1000);
    else if (isSkipped || !isCorrect) r.castleHp = clamp(r.castleHp - 20, 0, 1000);
  }

  if (phase === 2) {
    if (isCorrect) r.wallHp = clamp(r.wallHp + 500, 0, 20000);
  }

  if (phase === 3) {
    if (isCorrect) r.armyPoints = clamp(r.armyPoints + 50, 0, 2000);
    r.soldiers = Math.floor(r.armyPoints);
    r.weaponsUnlocked = r.armyPoints > 500;
  }

  if (phase === 4) {
    if (isCorrect) r.vocabBonus = clamp(r.vocabBonus + 1, 0, 20);
  }

  if (phase === 5) {
    if (isCorrect) {
      r.castleHp = clamp(r.castleHp + 100, 0, 1000);
      r.wallHp = clamp(r.wallHp + 200, 0, 20000);
      r.soldiers = clamp(r.soldiers + 50, 0, 5000);
    } else {
      const mitigation = clamp((r.vocabBonus || 0) * 0.01, 0, 0.3);
      const castleDamage = Math.round(200 * (1 - mitigation));
      r.castleHp = clamp(r.castleHp - castleDamage, 0, 1000);

      const lossPct = 0.2 * (1 - mitigation / 2);
      r.soldiers = clamp(Math.floor(r.soldiers * (1 - lossPct)), 0, 5000);
    }
  }
}

function applyAnswer(session, { playerId, questionId, answer }) {
  if (!session.currentQuestion) return { ok: false, error: "No active question" };
  if (session.currentQuestion.id !== questionId) return { ok: false, error: "Question not active" };

  const team = teamForPlayer(session, playerId);
  if (!team) return { ok: false, error: "Player/team not found" };

  if (session.currentQuestion.answeredByTeamIds.has(team.id)) {
    return { ok: false, error: "Team already answered" };
  }
  session.currentQuestion.answeredByTeamIds.add(team.id);

  const isCorrect = evaluateQuestion(session.currentQuestion, answer);
  applyPhaseScoring(team, session.currentQuestion.phase, isCorrect, false);

  if (isCorrect) team.stats.correct += 1;
  else team.stats.wrong += 1;

  const publicResult = {
    teamId: team.id,
    questionId: session.currentQuestion.id,
    phase: session.currentQuestion.phase,
    correct: isCorrect
  };

  session.audit.push({ at: Date.now(), event: "answer", ...publicResult });
  return { ok: true, publicResult };
}

applyAnswer.joinStudent = function joinStudent(session, { name, previousPlayerId, socketId }) {
  const n = String(name || "").trim();
  if (!n) return { ok: false, error: "Name required" };

  if (previousPlayerId) {
    const existing = session.players.find((p) => p.id === previousPlayerId);
    if (existing) {
      existing.connected = true;
      existing.socketId = socketId;
      const team = session.teams.find((t) => t.id === existing.teamId);
      if (team) {
        const member = team.members.find((m) => m.id === existing.id);
        if (member) member.connected = true;
      }
      return {
        ok: true,
        player: existing,
        playerPublic: { id: existing.id, name: existing.name, teamId: existing.teamId, connected: true }
      };
    }
  }

  if (session.players.length >= 30) return { ok: false, error: "Session full (30 players)" };

  const sorted = [...session.teams].sort((a, b) => a.members.length - b.members.length);
  const team = sorted.find((t) => t.members.length < 5);
  if (!team) return { ok: false, error: "All teams full" };

  const id = `p-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  const player = {
    id,
    name: n,
    teamId: team.id,
    connected: true,
    socketId,
    pos: {
      x: Math.round((Math.random() - 0.5) * 60),
      y: Math.round((Math.random() - 0.5) * 60)
    }
  };
  session.players.push(player);
  team.members.push({ id, name: n, connected: true });

  session.audit.push({ at: Date.now(), event: "join", playerId: id, teamId: team.id });
  return { ok: true, player, playerPublic: { id, name: n, teamId: team.id, connected: true } };
};

applyAnswer.disconnectStudent = function disconnectStudent(session, { playerId }) {
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return;
  player.connected = false;
  player.socketId = null;
  const team = session.teams.find((t) => t.id === player.teamId);
  if (team) {
    const member = team.members.find((m) => m.id === player.id);
    if (member) member.connected = false;
  }
  session.audit.push({ at: Date.now(), event: "disconnect", playerId });
};

applyAnswer.moveStudent = function moveStudent(session, { playerId, dx, dy }) {
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "Player not found" };
  if (!player.pos) player.pos = { x: 0, y: 0 };

  const step = 10;
  const nx = player.pos.x + Math.round(clamp(Number(dx) || 0, -1, 1) * step);
  const ny = player.pos.y + Math.round(clamp(Number(dy) || 0, -1, 1) * step);

  // Keep players near their team zone: clamp to a soft square.
  player.pos.x = clamp(nx, -80, 80);
  player.pos.y = clamp(ny, -80, 80);
  session.audit.push({ at: Date.now(), event: "move", playerId, x: player.pos.x, y: player.pos.y });
  return { ok: true, pos: player.pos };
};

function tickExpiredQuestions(session) {
  if (!session.currentQuestion) return false;
  if (Date.now() < session.currentQuestion.expiresAt) return false;

  const phase = session.currentQuestion.phase;
  const answered = session.currentQuestion.answeredByTeamIds;
  let changed = false;

  if (phase === 1 || phase === 5) {
    for (const team of session.teams) {
      if (answered.has(team.id)) continue;
      changed = true;
      team.stats.skipped += 1;
      applyPhaseScoring(team, phase, false, true);
      session.audit.push({ at: Date.now(), event: "skip", teamId: team.id, questionId: session.currentQuestion.id, phase });
    }
  }

  session.currentQuestion = null;
  return true;
}

module.exports = {
  setQuestionBank,
  startPhase,
  askQuestion,
  applyAnswer,
  tickExpiredQuestions
};
