(function () {
  const { qs, fmtPhase, setStatusPill, getQueryParam } = window.KCSG;
  const socket = window.io();

  let sessionCode = null;
  const canvas = qs("#map");
  const ctx = canvas.getContext("2d");

  const layout = [
    { x: 180, y: 160 },
    { x: 550, y: 110 },
    { x: 920, y: 160 },
    { x: 920, y: 440 },
    { x: 550, y: 490 },
    { x: 180, y: 440 }
  ];

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawBackground() {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Central kingdom circle
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 120, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.restore();
  }

  function wallStyle(tier) {
    if (tier === "Wooden") return { fill: "rgba(245,158,11,0.22)", stroke: "rgba(245,158,11,0.55)" };
    if (tier === "Stone") return { fill: "rgba(148,163,184,0.18)", stroke: "rgba(148,163,184,0.55)" };
    if (tier === "Iron") return { fill: "rgba(226,232,240,0.14)", stroke: "rgba(226,232,240,0.55)" };
    if (tier === "Fortress") return { fill: "rgba(34,211,238,0.12)", stroke: "rgba(34,211,238,0.55)" };
    return { fill: "rgba(255,255,255,0.06)", stroke: "rgba(255,255,255,0.18)" };
  }

  function drawTeamZone(team, pos) {
    const { wallTier, armyModels, totalScore } = team.derived;
    const wall = wallStyle(wallTier);

    ctx.save();
    ctx.translate(pos.x, pos.y);

    // Wall ring
    ctx.beginPath();
    ctx.arc(0, 0, 88, 0, Math.PI * 2);
    ctx.fillStyle = wall.fill;
    ctx.strokeStyle = wall.stroke;
    ctx.lineWidth = 8;
    ctx.fill();
    ctx.stroke();

    // Castle (height indicates HP)
    const castleH = 26 + Math.round((team.resources.castleHp / 1000) * 54);
    ctx.fillStyle = team.color;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(-26, 22 - castleH, 52, castleH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.strokeRect(-26, 22 - castleH, 52, castleH);

    // Army models (1 per 100 soldiers)
    const models = Math.min(9, armyModels);
    for (let i = 0; i < models; i++) {
      const ax = -42 + (i % 3) * 14;
      const ay = 38 + Math.floor(i / 3) * 14;
      ctx.beginPath();
      ctx.arc(ax, ay, 4.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(233,238,252,0.78)";
      ctx.fill();
    }

    // Label
    ctx.fillStyle = "rgba(233,238,252,0.9)";
    ctx.font = "700 14px Bahnschrift, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(team.name, 0, -102);

    ctx.fillStyle = "rgba(233,238,252,0.65)";
    ctx.font = "12px Bahnschrift, Segoe UI, sans-serif";
    ctx.fillText(`Score ${totalScore}`, 0, -84);
    ctx.restore();
  }

  function renderLegend(session) {
    const el = qs("#legend");
    el.innerHTML = "";
    const teams = [...(session.teams || [])].sort((a, b) => (b.derived?.totalScore || 0) - (a.derived?.totalScore || 0));
    for (const t of teams) {
      const card = document.createElement("div");
      card.className = "legcard";
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="width:10px;height:10px;border-radius:50%;background:${t.color};display:inline-block"></span>
            <strong style="color:rgba(233,238,252,.9)">${t.name}</strong>
          </div>
          <span>Score ${t.derived.totalScore}</span>
        </div>
        <div style="margin-top:8px;display:grid;gap:4px">
          <div>Castle ${t.resources.castleHp}/1000</div>
          <div>Wall ${t.resources.wallHp}/20000 (${t.derived.wallTier})</div>
          <div>Army ${t.resources.soldiers} (${t.derived.armyModels} models)</div>
          <div>Vocab ${t.resources.vocabBonus}/20</div>
        </div>
      `;
      el.appendChild(card);
    }
  }

  function drawPlayers(session) {
    const teamPosById = new Map();
    for (let i = 0; i < Math.min(session.teams.length, layout.length); i++) {
      teamPosById.set(session.teams[i].id, layout[i]);
    }

    const players = session.players || [];
    ctx.save();
    for (const p of players) {
      const base = teamPosById.get(p.teamId);
      if (!base) continue;
      const x = base.x + (p.pos?.x || 0);
      const y = base.y + (p.pos?.y || 0);
      ctx.beginPath();
      ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      const team = session.teams.find((t) => t.id === p.teamId);
      ctx.fillStyle = team?.color ? `${team.color}` : "rgba(233,238,252,0.8)";
      ctx.globalAlpha = p.connected ? 0.9 : 0.35;
      ctx.fill();
      ctx.globalAlpha = p.connected ? 0.7 : 0.25;
      ctx.strokeStyle = "rgba(233,238,252,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function render(session) {
    qs("#phasePill").textContent = `Phase: ${fmtPhase(session.phase)}`;
    clear();
    drawBackground();
    const teams = session.teams || [];
    for (let i = 0; i < Math.min(teams.length, layout.length); i++) {
      drawTeamZone(teams[i], layout[i]);
    }
    drawPlayers(session);
    renderLegend(session);
  }

  socket.on("connect", () => setStatusPill(true));
  socket.on("disconnect", () => setStatusPill(false));

  socket.on("session:state", (session) => {
    if (sessionCode && session.code !== sessionCode) return;
    render(session);
  });

  qs("#watchBtn").addEventListener("click", () => {
    const code = qs("#codeInput").value.trim().toUpperCase();
    if (!code) return;
    sessionCode = code;
    socket.emit("viewer:watchSession", { code }, (res) => {
      if (!res?.ok) return alert(res?.error || "Unable to watch (session not found)");
      render(res.session);
    });
  });

  const codeFromUrl = getQueryParam("code");
  if (codeFromUrl) qs("#codeInput").value = String(codeFromUrl).toUpperCase();
})();
