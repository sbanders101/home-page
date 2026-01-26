export const createDnDDice = () => {
  let canvas = null;
  let ctx = null;
  let container = null;
  let dpr = 1;
  let resizeHandler = null;
  let pointerMoveHandler = null;
  let pointerLeaveHandler = null;
  let pointerDownHandler = null;
  let rafId = null;

  const dice = [
    { key: "d4", label: "d4", sides: 4, shapeSides: 3, color: "#e74c3c" },
    { key: "d6", label: "d6", sides: 6, shapeSides: 6, color: "#3498db" },
    { key: "d8", label: "d8", sides: 8, shapeSides: 8, color: "#f1c40f" },
    { key: "d10", label: "d10", sides: 10, shapeSides: 10, color: "#2ecc71" },
    { key: "d12", label: "d12", sides: 12, shapeSides: 12, color: "#9b59b6" },
    { key: "d20", label: "d20", sides: 20, shapeSides: 20, color: "#e67e22" },
    { key: "d100", label: "d%", sides: 100, shapeSides: 10, color: "#16a085" }
  ];

  const state = new Map();
  const history = [];
  let hoverKey = null;
  let anim = null;
  let needsRender = true;

  const secureRandomInt = (min, max) => {
    const range = max - min + 1;
    if (range <= 0) {
      return min;
    }
    const cryptoObj =
      typeof crypto !== "undefined" && crypto.getRandomValues ? crypto : null;

    if (cryptoObj) {
      const u32 = new Uint32Array(1);
      const maxUnbiased = Math.floor(0x100000000 / range) * range - 1;
      let x;
      do {
        cryptoObj.getRandomValues(u32);
        x = u32[0] >>> 0;
      } while (x > maxUnbiased);
      return min + (x % range);
    }
    return min + Math.floor(Math.random() * range);
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const requestRender = () => {
    needsRender = true;
    if (!anim) {
      drawFrame();
    }
  };

  const roundRect = (x, y, w, h, r) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  const drawPolygon = (cx, cy, radius, sides, rotation) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i += 1) {
      const a = rotation + (i * Math.PI * 2) / sides;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  };

  const layoutDice = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const topPad = 72;
    const bottomPad = 84;
    const usableH = Math.max(200, H - (topPad + bottomPad));
    const rows = H > 900 ? 3 : 2;
    const cols = Math.ceil(dice.length / rows);
    const cellW = W / cols;
    const cellH = usableH / rows;
    const radius = Math.max(
      36,
      Math.min(Math.min(cellW, cellH) * 0.32, 90)
    );

    let i = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const d = dice[i++];
        if (!d) {
          break;
        }
        const cx = (c + 0.5) * cellW;
        const cy = topPad + (r + 0.5) * cellH;
        const prev = state.get(d.key) || {};
        state.set(d.key, {
          ...prev,
          cx,
          cy,
          r: radius,
          rot: prev.rot || 0,
          rolling: prev.rolling || false,
          last: prev.last ?? null,
          flicker: prev.flicker || null
        });
      }
    }

    requestRender();
  };

  const resizeCanvas = () => {
    if (!canvas || !ctx) {
      return;
    }
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutDice();
  };

  const drawFrame = (ts) => {
    if (!needsRender && !anim) {
      return;
    }
    needsRender = false;

    const W = window.innerWidth;
    const H = window.innerHeight;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0b0f17");
    grad.addColorStop(1, "#111827");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const vg = ctx.createRadialGradient(
      W / 2,
      H / 2,
      0,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.8
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 22px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Click a die to roll", W / 2, 40);
    ctx.restore();

    if (anim) {
      if (!anim.start) {
        anim.start = performance.now();
      }
      const t = Math.min(1, (ts - anim.start) / anim.duration);
      const e = easeOutCubic(t);
      const s = state.get(anim.key);
      if (s) {
        s.rot = anim.rotStart + e * anim.rotDelta;
        const now = ts;
        if (t < 0.8 && now - (anim.lastFlicker || 0) > 60) {
          s.flicker = secureRandomInt(1, anim.sides);
          anim.lastFlicker = now;
        }
      }
      if (t >= 1) {
        const s2 = state.get(anim.key);
        if (s2) {
          s2.rolling = false;
          s2.flicker = null;
          s2.last = secureRandomInt(1, anim.sides);
        }
        anim = null;
      } else {
        rafId = requestAnimationFrame(drawFrame);
      }
    }

    for (const d of dice) {
      const s = state.get(d.key);
      if (!s) {
        continue;
      }
      const { cx, cy, r } = s;

      const hovered = hoverKey === d.key && !s.rolling;
      const scale = hovered ? 1.06 : s.rolling ? 1.08 : 1.0;
      const radius = r * scale;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      drawPolygon(cx, cy, radius, d.shapeSides, s.rot || 0);
      ctx.fillStyle = d.color;
      ctx.fill();

      ctx.clip();
      const rg = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius * 1.2
      );
      rg.addColorStop(0, "rgba(255,255,255,0.28)");
      rg.addColorStop(1, "rgba(255,255,255,0.04)");
      ctx.fillStyle = rg;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();

      ctx.save();
      drawPolygon(cx, cy, radius, d.shapeSides, s.rot || 0);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 16px ui-sans-serif, system-ui";
      ctx.fillText(d.label, cx, cy - radius * 0.55);

      let displayVal = "";
      if (s.rolling && s.flicker != null) {
        displayVal = String(s.flicker);
      } else if (s.last != null) {
        displayVal = String(s.last);
      }

      if (d.sides === 100 && displayVal) {
        if (displayVal === "100") {
          displayVal = "100";
        } else {
          const n = parseInt(displayVal, 10);
          displayVal = n.toString().padStart(2, "0");
        }
      }

      if (displayVal) {
        ctx.font = "800 28px ui-sans-serif, system-ui";
        ctx.fillText(displayVal, cx, cy + radius * 0.05);
      }
      ctx.restore();
    }

    const footerH = 50;
    ctx.save();
    const y = H - footerH - 18;
    roundRect(20, y, W - 40, footerH, 12);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "600 14px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `Roll history (latest first): ${history.join("   ")}`,
      34,
      y + footerH / 2
    );
    ctx.restore();
  };

  const pushHistory = (key, val) => {
    const tag = `${key}→${val}`;
    history.unshift(tag);
    if (history.length > 12) {
      history.pop();
    }
  };

  const canvasPoint = (evt) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  };

  const hitTest = (x, y) => {
    for (const d of dice) {
      const s = state.get(d.key);
      if (!s) {
        continue;
      }
      const hoverRadius = s.r * 1.1;
      const dx = x - s.cx;
      const dy = y - s.cy;
      if (dx * dx + dy * dy <= hoverRadius * hoverRadius) {
        return d.key;
      }
    }
    return null;
  };

  const handlePointerMove = (event) => {
    const { x, y } = canvasPoint(event);
    const hit = hitTest(x, y);
    if (hit !== hoverKey) {
      hoverKey = hit;
      requestRender();
    }
  };

  const handlePointerLeave = () => {
    hoverKey = null;
    requestRender();
  };

  const handlePointerDown = (event) => {
    const { x, y } = canvasPoint(event);
    const key = hitTest(x, y);
    if (!key) {
      return;
    }
    const d = dice.find((item) => item.key === key);
    const s = state.get(key);
    if (!d || !s || s.rolling || anim) {
      return;
    }

    s.rolling = true;
    const fullTurns = secureRandomInt(3, 6);
    const rotDelta =
      fullTurns * Math.PI * 2 + (Math.random() - 0.5) * Math.PI * 0.5;
    anim = {
      key,
      sides: d.sides,
      duration: secureRandomInt(900, 1300),
      start: null,
      rotStart: s.rot || 0,
      rotDelta,
      lastFlicker: 0
    };

    const finishWatcher = () => {
      if (!anim) {
        if (s.last != null) {
          pushHistory(d.label, s.last);
          requestRender();
        }
      } else {
        rafId = requestAnimationFrame(finishWatcher);
      }
    };
    rafId = requestAnimationFrame(finishWatcher);

    rafId = requestAnimationFrame(drawFrame);
  };

  const init = (host) => {
    container = host;
    container.innerHTML = "";
    container.classList.add("dnd-dice");

    canvas = document.createElement("canvas");
    canvas.className = "dnd-dice__canvas";
    canvas.setAttribute("aria-label", "DnD Dice Roller (Canvas)");
    ctx = canvas.getContext("2d");
    container.appendChild(canvas);

    resizeHandler = () => resizeCanvas();
    window.addEventListener("resize", resizeHandler, { passive: true });

    pointerMoveHandler = (event) => handlePointerMove(event);
    pointerLeaveHandler = () => handlePointerLeave();
    pointerDownHandler = (event) => handlePointerDown(event);

    canvas.addEventListener("pointermove", pointerMoveHandler, { passive: true });
    canvas.addEventListener("pointerleave", pointerLeaveHandler, {
      passive: true
    });
    canvas.addEventListener("pointerdown", pointerDownHandler);

    resizeCanvas();
    requestRender();
    rafId = requestAnimationFrame(drawFrame);
  };

  const cleanup = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
    }

    if (pointerMoveHandler) {
      canvas?.removeEventListener("pointermove", pointerMoveHandler);
    }

    if (pointerLeaveHandler) {
      canvas?.removeEventListener("pointerleave", pointerLeaveHandler);
    }

    if (pointerDownHandler) {
      canvas?.removeEventListener("pointerdown", pointerDownHandler);
    }

    if (container) {
      container.classList.remove("dnd-dice");
      container.innerHTML = "";
    }

    canvas = null;
    ctx = null;
    container = null;
    resizeHandler = null;
    pointerMoveHandler = null;
    pointerLeaveHandler = null;
    pointerDownHandler = null;
    rafId = null;
    anim = null;
    hoverKey = null;
    needsRender = true;
    history.length = 0;
    state.clear();
  };

  return { init, cleanup };
};
