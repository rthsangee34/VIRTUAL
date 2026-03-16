(function () {
  const { qs, fmtPhase, setStatusPill, getQueryParam } = window.KCSG;
  const socket = window.io();

  let sessionCode = null;
  const nextByPhase = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
  let teacherKey = null;

  function maxForPhase(phase) {
    return Number(phase) === 2 ? 40 : 20;
  }

  function formatId(phase, n) {
    return `p${phase}-${n}`;
  }

  function renderQuickPad() {
    const p = Number(qs("#phaseSelect").value);
    const pad = qs("#quickPad");
    if (![1, 2, 3, 4, 5].includes(p)) {
      pad.hidden = true;
      pad.innerHTML = "";
      return;
    }
    pad.hidden = false;
    pad.innerHTML = "";
    const max = maxForPhase(p);
    for (let i = 1; i <= max; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "qid";
      b.textContent = formatId(p, i);
      b.addEventListener("click", () => {
        qs("#questionIdInput").value = b.textContent;
      });
      pad.appendChild(b);
    }
  }

  function setSessionUI(session, key) {
    sessionCode = session.code;
    teacherKey = key || teacherKey || null;
    qs("#sessionBox").hidden = false;
    qs("#sessionCode").textContent = session.code;
    qs("#teacherKey").textContent = teacherKey || "------------";
    const base = `${location.origin}`;
    qs("#studentLink").href = `${base}/student.html?code=${encodeURIComponent(session.code)}`;
    qs("#studentLink").textContent = "Open Student UI";
    qs("#worldLink").href = `${base}/world.html?code=${encodeURIComponent(session.code)}`;
    qs("#worldLink").textContent = "Open World View";
    qs("#phaseSelect").value = String(session.phase ?? 0);
    renderQuickPad();
    renderTeams(session);
    renderCurrentQuestion(session.currentQuestion);
  }

  function renderCurrentQuestion(q) {
    const box = qs("#currentQuestion");
    if (!q) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    box.hidden = false;
    const exp = q.expiresAt ? new Date(q.expiresAt).toLocaleTimeString() : "";
    box.textContent = `Active: ${q.id} (${fmtPhase(q.phase)}) ends ${exp} | ${q.prompt}`;
  }

  function renderTeams(session) {
    const grid = qs("#teamsGrid");
    grid.innerHTML = "";

    const teams = [...(session.teams || [])].sort((a, b) => (b.derived?.totalScore || 0) - (a.derived?.totalScore || 0));
    for (const t of teams) {
      const div = document.createElement("div");
      div.className = "teamcard";
      div.innerHTML = `
        <div class="teamhead">
          <div class="chip">
            <span class="dot" style="background:${t.color}"></span>
            <span>${t.name}</span>
          </div>
          <div class="label">${t.memberCount}/5</div>
        </div>
        <div class="kv"><span>Castle HP</span><span>${t.resources.castleHp}/1000</span></div>
        <div class="kv"><span>Wall HP</span><span>${t.resources.wallHp}/20000 (${t.derived.wallTier})</span></div>
        <div class="kv"><span>Army</span><span>${t.resources.soldiers} soldiers ${t.resources.weaponsUnlocked ? "(Weapons)" : ""}</span></div>
        <div class="kv"><span>Vocab Bonus</span><span>${t.resources.vocabBonus}/20</span></div>
        <div class="kv"><span>Score</span><span>${t.derived.totalScore}</span></div>
        <div class="kv"><span>Correct/Wrong/Skip</span><span>${t.stats.correct}/${t.stats.wrong}/${t.stats.skipped}</span></div>
      `;
      grid.appendChild(div);
    }
  }

  socket.on("connect", () => setStatusPill(true));
  socket.on("disconnect", () => setStatusPill(false));

  socket.on("session:state", (session) => {
    if (sessionCode && session.code !== sessionCode) return;
    setSessionUI(session);
  });

  socket.on("question:asked", (q) => {
    renderCurrentQuestion(q);
  });

  qs("#createSessionBtn").addEventListener("click", () => {
    socket.emit("teacher:createSession", {}, (res) => {
      if (!res?.ok) return alert(res?.error || "Failed to create session");
      teacherKey = res.teacherKey || null;
      if (teacherKey) {
        localStorage.setItem(`kcsg.teacherKey.${res.session.code}`, teacherKey);
        qs("#teacherKeyInput").value = teacherKey;
      }
      setSessionUI(res.session, teacherKey);
    });
  });

  qs("#joinSessionBtn").addEventListener("click", () => {
    const code = qs("#joinCodeInput").value.trim().toUpperCase();
    if (!code) return;
    const key =
      qs("#teacherKeyInput").value.trim() ||
      localStorage.getItem(`kcsg.teacherKey.${code}`) ||
      "";
    socket.emit("teacher:joinSession", { code, teacherKey: key }, (res) => {
      if (!res?.ok) return alert(res?.error || "Failed to join session");
      teacherKey = res.teacherKey || key || null;
      if (teacherKey) localStorage.setItem(`kcsg.teacherKey.${code}`, teacherKey);
      setSessionUI(res.session, teacherKey);
    });
  });

  qs("#startPhaseBtn").addEventListener("click", () => {
    if (!sessionCode) return alert("Create or join a session first.");
    const phase = Number(qs("#phaseSelect").value);
    socket.emit("teacher:startPhase", { code: sessionCode, phase }, (res) => {
      if (!res?.ok) return alert(res?.error || "Failed to start phase");
    });
  });

  qs("#phaseSelect").addEventListener("change", () => {
    renderQuickPad();
  });

  qs("#askQuestionBtn").addEventListener("click", () => {
    if (!sessionCode) return alert("Create or join a session first.");
    const questionId = qs("#questionIdInput").value.trim();
    if (!questionId) return alert("Enter a question id (e.g., p1-1).");
    socket.emit("teacher:askQuestion", { code: sessionCode, questionId }, (res) => {
      if (!res?.ok) return alert(res?.error || "Failed to ask question");
      renderCurrentQuestion(res.question);
      const m = /^p([1-5])-(\d+)$/.exec(String(questionId).trim());
      if (m) {
        const p = Number(m[1]);
        const n = Number(m[2]);
        nextByPhase[p] = Math.min(maxForPhase(p), n + 1);
      }
    });
  });

  qs("#askNextBtn").addEventListener("click", () => {
    if (!sessionCode) return alert("Create or join a session first.");
    const p = Number(qs("#phaseSelect").value);
    if (![1, 2, 3, 4, 5].includes(p)) return alert("Pick a phase 1-5 first.");
    const max = maxForPhase(p);
    const n = Math.max(1, Math.min(max, nextByPhase[p] || 1));
    const qid = formatId(p, n);
    qs("#questionIdInput").value = qid;
    socket.emit("teacher:askQuestion", { code: sessionCode, questionId: qid }, (res) => {
      if (!res?.ok) return alert(res?.error || "Failed to ask question");
      renderCurrentQuestion(res.question);
      nextByPhase[p] = Math.min(max, n + 1);
    });
  });

  qs("#uploadBankBtn").addEventListener("click", async () => {
    if (!sessionCode) return alert("Create or join a session first.");
    const file = qs("#bankFileInput").files?.[0];
    if (!file) return alert("Choose a JSON file first.");
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return alert("Invalid JSON.");
    }
    socket.emit("teacher:setQuestionBank", { code: sessionCode, questions: parsed }, (res) => {
      if (!res?.ok) return alert(res?.error || "Failed to set question bank");
      alert("Question bank uploaded.");
    });
  });

  qs("#endSessionBtn").addEventListener("click", () => {
    if (!sessionCode) return;
    if (!confirm("End session and save results?")) return;
    socket.emit("teacher:endSession", { code: sessionCode }, (res) => {
      if (!res?.ok) return alert(res?.error || "Failed to end session");
      alert(`Session ended. Results saved to: ${res.savedTo}`);
      sessionCode = null;
      qs("#sessionBox").hidden = true;
      qs("#teamsGrid").innerHTML = "";
      renderCurrentQuestion(null);
    });
  });

  const codeFromUrl = getQueryParam("code");
  if (codeFromUrl) {
    const code = String(codeFromUrl).trim().toUpperCase();
    qs("#joinCodeInput").value = code;
    const key = localStorage.getItem(`kcsg.teacherKey.${code}`) || "";
    if (key) qs("#teacherKeyInput").value = key;
    socket.emit("teacher:joinSession", { code, teacherKey: key }, (res) => {
      if (!res?.ok) return;
      teacherKey = res.teacherKey || key || null;
      setSessionUI(res.session, teacherKey);
    });
  }
})();
