const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");

const { createSession, getSession, listPublicSessionState, endSession, getAllSessions } = require("./lib/sessionStore");
const { applyAnswer, startPhase, askQuestion, setQuestionBank, tickExpiredQuestions } = require("./game/engine");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/session/:code/state", (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ error: "Session not found" });
  return res.json(listPublicSessionState(session));
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

function emitSessionState(sessionCode) {
  const session = getSession(sessionCode);
  if (!session) return;
  io.to(`session:${sessionCode}`).emit("session:state", listPublicSessionState(session));
}

io.on("connection", (socket) => {
  function requireRole(role, cb) {
    if (socket.data.role !== role) {
      cb?.({ ok: false, error: `Forbidden (role ${socket.data.role || "none"})` });
      return false;
    }
    return true;
  }

  function requireSession(code, cb) {
    const normalized = String(code || "").toUpperCase();
    if (socket.data.sessionCode && socket.data.sessionCode !== normalized) {
      cb?.({ ok: false, error: "Socket is joined to a different session" });
      return null;
    }
    return normalized;
  }

  function requireTeacherKey(session, cb) {
    if (!session?.teacherKey) {
      cb?.({ ok: false, error: "Session missing teacher key" });
      return false;
    }
    if (socket.data.teacherKey !== session.teacherKey) {
      cb?.({ ok: false, error: "Invalid teacher key" });
      return false;
    }
    return true;
  }

  socket.on("teacher:createSession", (_payload, cb) => {
    const session = createSession();
    socket.join(`session:${session.code}`);
    socket.data.role = "teacher";
    socket.data.sessionCode = session.code;
    socket.data.teacherKey = session.teacherKey;
    emitSessionState(session.code);
    cb?.({ ok: true, session: listPublicSessionState(session), teacherKey: session.teacherKey });
  });

  socket.on("teacher:joinSession", ({ code, teacherKey }, cb) => {
    const session = getSession(code);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    if (String(teacherKey || "") !== String(session.teacherKey || "")) {
      return cb?.({ ok: false, error: "Invalid teacher key" });
    }
    socket.join(`session:${session.code}`);
    socket.data.role = "teacher";
    socket.data.sessionCode = session.code;
    socket.data.teacherKey = session.teacherKey;
    emitSessionState(session.code);
    cb?.({ ok: true, session: listPublicSessionState(session), teacherKey: session.teacherKey });
  });

  socket.on("viewer:watchSession", ({ code }, cb) => {
    const session = getSession(code);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    socket.join(`session:${session.code}`);
    socket.data.role = socket.data.role || "viewer";
    socket.data.sessionCode = session.code;
    emitSessionState(session.code);
    cb?.({ ok: true, session: listPublicSessionState(session) });
  });

  socket.on("teacher:setQuestionBank", ({ code, questions }, cb) => {
    if (!requireRole("teacher", cb)) return;
    const normalized = requireSession(code, cb);
    if (!normalized) return;
    const session = getSession(normalized);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    if (!requireTeacherKey(session, cb)) return;
    const result = setQuestionBank(session, questions);
    if (!result.ok) return cb?.(result);
    emitSessionState(session.code);
    cb?.({ ok: true });
  });

  socket.on("teacher:startPhase", ({ code, phase }, cb) => {
    if (!requireRole("teacher", cb)) return;
    const normalized = requireSession(code, cb);
    if (!normalized) return;
    const session = getSession(normalized);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    if (!requireTeacherKey(session, cb)) return;
    const result = startPhase(session, phase);
    if (!result.ok) return cb?.(result);
    emitSessionState(session.code);
    cb?.({ ok: true });
  });

  socket.on("teacher:askQuestion", ({ code, questionId }, cb) => {
    if (!requireRole("teacher", cb)) return;
    const normalized = requireSession(code, cb);
    if (!normalized) return;
    const session = getSession(normalized);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    if (!requireTeacherKey(session, cb)) return;
    const result = askQuestion(session, questionId);
    if (!result.ok) return cb?.(result);
    emitSessionState(session.code);
    io.to(`session:${session.code}`).emit("question:asked", result.questionPublic);
    cb?.({ ok: true, question: result.questionPublic });
  });

  socket.on("teacher:endSession", ({ code }, cb) => {
    if (!requireRole("teacher", cb)) return;
    const normalized = requireSession(code, cb);
    if (!normalized) return;
    const session = getSession(normalized);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    if (!requireTeacherKey(session, cb)) return;
    const result = endSession(normalized);
    if (!result.ok) return cb?.(result);
    io.to(`session:${normalized}`).emit("session:ended", { ok: true });
    cb?.({ ok: true, savedTo: result.savedTo });
  });

  socket.on("student:join", ({ code, name, previousPlayerId }, cb) => {
    const session = getSession(code);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    const join = applyAnswer.joinStudent(session, { name, previousPlayerId, socketId: socket.id });
    if (!join.ok) return cb?.(join);

    socket.join(`session:${session.code}`);
    socket.data.role = "student";
    socket.data.sessionCode = session.code;
    socket.data.playerId = join.player.id;

    emitSessionState(session.code);
    cb?.({ ok: true, player: join.playerPublic, session: listPublicSessionState(session) });
  });

  socket.on("student:answer", ({ code, questionId, answer }, cb) => {
    if (!requireRole("student", cb)) return;
    const sessionCode = socket.data.sessionCode || String(code || "").toUpperCase();
    const session = getSession(sessionCode);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    const playerId = socket.data.playerId;
    if (!playerId) return cb?.({ ok: false, error: "Not joined" });
    const result = applyAnswer(session, { playerId, questionId, answer });
    if (!result.ok) return cb?.(result);
    emitSessionState(session.code);
    cb?.({ ok: true, result: result.publicResult });
  });

  socket.on("student:move", ({ dx, dy }, cb) => {
    if (!requireRole("student", cb)) return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return cb?.({ ok: false, error: "Not joined" });
    const session = getSession(sessionCode);
    if (!session) return cb?.({ ok: false, error: "Session not found" });
    const playerId = socket.data.playerId;
    if (!playerId) return cb?.({ ok: false, error: "Not joined" });
    const result = applyAnswer.moveStudent(session, { playerId, dx, dy });
    if (!result.ok) return cb?.(result);
    emitSessionState(session.code);
    cb?.({ ok: true, pos: result.pos });
  });

  socket.on("disconnect", () => {
    const code = socket.data.sessionCode;
    if (!code) return;
    const session = getSession(code);
    if (!session) return;
    if (socket.data.role === "student" && socket.data.playerId) {
      applyAnswer.disconnectStudent(session, { playerId: socket.data.playerId });
      emitSessionState(code);
    }
  });
});

// Background timer: handles question timeouts and applies skip penalties (phase 1 + battle).
setInterval(() => {
  for (const session of getAllSessions()) {
    const changed = tickExpiredQuestions(session);
    if (changed) emitSessionState(session.code);
  }
}, 500);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`);
});
