(function () {
  function qs(sel) {
    return document.querySelector(sel);
  }

  function fmtPhase(phase) {
    const p = Number(phase);
    if (p === 0) return "Lobby";
    if (p === 1) return "Castle Building";
    if (p === 2) return "Wall Construction";
    if (p === 3) return "Army Creation";
    if (p === 4) return "Vocabulary Boost";
    if (p === 5) return "Battle";
    return `Phase ${p}`;
  }

  function setStatusPill(ok) {
    const el = qs("#statusPill");
    if (!el) return;
    el.textContent = ok ? "Online" : "Offline";
    el.style.borderColor = ok ? "rgba(34,211,238,.55)" : "rgba(248,113,113,.55)";
    el.style.color = ok ? "rgba(233,238,252,.86)" : "rgba(233,238,252,.68)";
  }

  function getQueryParam(name) {
    const url = new URL(location.href);
    return url.searchParams.get(name);
  }

  window.KCSG = {
    qs,
    fmtPhase,
    setStatusPill,
    getQueryParam
  };
})();

