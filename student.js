(function () {
  const { qs, fmtPhase, setStatusPill, getQueryParam } = window.KCSG;
  const socket = window.io();

  let sessionCode = null;
  let playerId = localStorage.getItem("kcsg.playerId") || null;
  let teamId = null;
  let lastQuestion = null;
  let timerHandle = null;

  function setPhaseUI(phase) {
    qs("#phasePill").textContent = `Phase: ${fmtPhase(phase)}`;
    const msg =
      phase === 0
        ? "Waiting in lobby…"
        : phase === 1
          ? "Build your castle: answer correctly to gain Castle HP."
          : phase === 2
            ? "Construct walls: grammar questions boost Wall HP."
            : phase === 3
              ? "Create your army: general knowledge earns soldiers."
              : phase === 4
                ? "Vocabulary boost: correct answers improve bonuses."
                : "Battle: be quick, wrong answers trigger poison!";
    qs("#missionText").textContent = msg;
  }

  function setTeamUI(team) {
    teamId = team.id;
    qs("#teamName").textContent = team.name;
    qs("#teamBadge").style.background = team.color;
  }

  function renderLeaderboard(session) {
    const el = qs("#leaderboard");
    el.innerHTML = "";
    const teams = [...(session.teams || [])].sort((a, b) => (b.derived?.totalScore || 0) - (a.derived?.totalScore || 0));
    for (const t of teams) {
      const row = document.createElement("div");
      row.className = "leadrow";
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge" style="background:${t.color}"></span>
          <strong>${t.name}</strong>
        </div>
        <div class="label">${t.derived.totalScore}</div>
      `;
      el.appendChild(row);
    }
  }

  function renderQuestion(q) {
    const box = qs("#questionBox");
    lastQuestion = q;
    if (!q) {
      box.hidden = true;
      qs("#timer").textContent = "--";
      if (timerHandle) clearInterval(timerHandle);
      timerHandle = null;
      return;
    }
    box.hidden = false;
    qs("#qPrompt").textContent = q.prompt;
    qs("#resultLine").textContent = "";
    qs("#answerInput").value = "";
    qs("#answerInput").placeholder = q.type === "mcq" ? "Or type the option text" : "Type your answer";

    const choicesEl = qs("#choices");
    choicesEl.innerHTML = "";
    if (Array.isArray(q.choices) && q.choices.length) {
      for (const c of q.choices) {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.type = "button";
        btn.textContent = c;
        btn.addEventListener("click", () => {
          qs("#answerInput").value = c;
        });
        choicesEl.appendChild(btn);
      }
    }

    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      const left = Math.max(0, q.expiresAt - Date.now());
      const s = Math.ceil(left / 1000);
      qs("#timer").textContent = `${s}s`;
      if (left <= 0) {
        clearInterval(timerHandle);
        timerHandle = null;
      }
    }, 250);
  }

  socket.on("connect", () => setStatusPill(true));
  socket.on("disconnect", () => setStatusPill(false));

  socket.on("session:state", (session) => {
    if (sessionCode && session.code !== sessionCode) return;
    setPhaseUI(session.phase);
    renderLeaderboard(session);
    const myTeam = (session.teams || []).find((t) => t.id === teamId);
    if (myTeam) setTeamUI(myTeam);
    renderQuestion(session.currentQuestion);
  });

  socket.on("question:asked", (q) => renderQuestion(q));

  qs("#joinBtn").addEventListener("click", () => {
    const code = qs("#codeInput").value.trim().toUpperCase();
    const name = qs("#nameInput").value.trim();
    if (!code || !name) return alert("Enter code and name.");

    socket.emit("student:join", { code, name, previousPlayerId: playerId }, (res) => {
      if (!res?.ok) return alert(res?.error || "Join failed");
      sessionCode = code;
      playerId = res.player.id;
      localStorage.setItem("kcsg.playerId", playerId);
      teamId = res.player.teamId;
      qs("#joinPanel").hidden = true;
      qs("#playPanel").hidden = false;
      const myTeam = (res.session.teams || []).find((t) => t.id === teamId);
      if (myTeam) setTeamUI(myTeam);
      setPhaseUI(res.session.phase);
      renderLeaderboard(res.session);
      renderQuestion(res.session.currentQuestion);
    });
  });

  qs("#submitBtn").addEventListener("click", () => {
    if (!sessionCode) return;
    if (!lastQuestion) return;
    const answer = qs("#answerInput").value.trim();
    if (!answer) return;
    socket.emit("student:answer", { code: sessionCode, questionId: lastQuestion.id, answer }, (res) => {
      if (!res?.ok) {
        qs("#resultLine").textContent = res?.error || "Failed";
        return;
      }
      qs("#resultLine").textContent = res.result.correct ? "Correct. Power added to your team." : "Wrong (or poisoned in battle).";
    });
  });

  function bindMove(btnId, dx, dy) {
    const btn = qs(`#${btnId}`);
    if (!btn) return;
    let handle = null;
    const send = () => {
      if (!sessionCode) return;
      socket.emit("student:move", { dx, dy });
    };
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      send();
      handle = setInterval(send, 120);
    });
    const stop = () => {
      if (!handle) return;
      clearInterval(handle);
      handle = null;
    };
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("pointerleave", stop);
  }

  bindMove("moveUp", 0, -1);
  bindMove("moveDown", 0, 1);
  bindMove("moveLeft", -1, 0);
  bindMove("moveRight", 1, 0);

  // Prefill code from query string: student.html?code=ABCDEF
  const codeFromUrl = getQueryParam("code");
  if (codeFromUrl) qs("#codeInput").value = String(codeFromUrl).toUpperCase();
})();
