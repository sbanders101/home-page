const EGA = {
  black: "#000000",
  blue: "#0000aa",
  green: "#00aa00",
  cyan: "#00aaaa",
  red: "#aa0000",
  magenta: "#aa00aa",
  brown: "#aa5500",
  lightGray: "#aaaaaa",
  darkGray: "#555555",
  brightBlue: "#5555ff",
  brightGreen: "#55ff55",
  brightCyan: "#55ffff",
  brightRed: "#ff5555",
  brightMagenta: "#ff55ff",
  yellow: "#ffff55",
  white: "#ffffff"
};

const DICE = [
  {
    key: "d4",
    label: "d4",
    sides: 4,
    model: "tetra",
    colors: [EGA.red, EGA.brightRed, EGA.yellow],
    labelScale: 1.08
  },
  {
    key: "d6",
    label: "d6",
    sides: 6,
    model: "cube",
    colors: [EGA.blue, EGA.brightBlue, EGA.brightCyan],
    labelScale: 1.08
  },
  {
    key: "d8",
    label: "d8",
    sides: 8,
    model: "octa",
    colors: [EGA.green, EGA.brightGreen, EGA.yellow],
    labelScale: 1.08
  },
  {
    key: "d10",
    label: "d10",
    sides: 10,
    model: "dodeca",
    colors: [EGA.magenta, EGA.brightMagenta, EGA.white],
    labelScale: 1.12
  },
  {
    key: "d12",
    label: "d12",
    sides: 12,
    model: "dodeca",
    colors: [EGA.brown, EGA.yellow, EGA.white],
    labelScale: 1.08
  },
  {
    key: "d20",
    label: "d20",
    sides: 20,
    model: "dodeca",
    colors: [EGA.cyan, EGA.brightCyan, EGA.white],
    labelScale: 1.1
  },
  {
    key: "d100",
    label: "d%",
    sides: 100,
    model: "dodeca",
    colors: [EGA.darkGray, EGA.magenta, EGA.brightMagenta],
    labelScale: 1.14
  }
];

const TAU = Math.PI * 2;

const vAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vScale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vCross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const vLength = (a) => Math.hypot(a[0], a[1], a[2]);

const vNormalize = (a) => {
  const len = vLength(a);
  if (!len) {
    return [0, 0, 0];
  }
  return [a[0] / len, a[1] / len, a[2] / len];
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const randomRange = (min, max) => min + Math.random() * (max - min);

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

const rotateX = (v, angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
};

const rotateY = (v, angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
};

const rotateZ = (v, angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
};

const rotateVec = (v, rx, ry, rz) => rotateZ(rotateY(rotateX(v, rx), ry), rz);

const faceCentroid = (vertices, face) => {
  let center = [0, 0, 0];
  for (const idx of face) {
    center = vAdd(center, vertices[idx]);
  }
  return vScale(center, 1 / face.length);
};

const faceNormal = (vertices, face) => {
  if (face.length < 3) {
    return [0, 0, 0];
  }
  const a = vertices[face[0]];
  const b = vertices[face[1]];
  const c = vertices[face[2]];
  return vNormalize(vCross(vSub(b, a), vSub(c, a)));
};

const scaleVerticesToUnit = (vertices) => {
  let maxLen = 0;
  for (const vertex of vertices) {
    maxLen = Math.max(maxLen, vLength(vertex));
  }
  if (!maxLen) {
    return vertices;
  }
  return vertices.map((vertex) => vScale(vertex, 1 / maxLen));
};

const createModel = (vertices, faces) => {
  const normalizedVertices = scaleVerticesToUnit(vertices);
  const orientedFaces = faces.map((face) => {
    const normal = faceNormal(normalizedVertices, face);
    const centroid = faceCentroid(normalizedVertices, face);
    if (vDot(normal, centroid) < 0) {
      return [...face].reverse();
    }
    return [...face];
  });

  return {
    vertices: normalizedVertices,
    faces: orientedFaces
  };
};

const buildDualModel = (baseModel) => {
  const dualVertices = baseModel.faces.map((face) =>
    faceCentroid(baseModel.vertices, face)
  );

  const adjacentFacesByVertex = new Map();
  baseModel.vertices.forEach((_, index) => {
    adjacentFacesByVertex.set(index, []);
  });

  baseModel.faces.forEach((face, faceIndex) => {
    face.forEach((vertexIndex) => {
      adjacentFacesByVertex.get(vertexIndex).push(faceIndex);
    });
  });

  const dualFaces = [];
  baseModel.vertices.forEach((vertex, vertexIndex) => {
    const adjacentFaces = adjacentFacesByVertex.get(vertexIndex);
    const normal = vNormalize(vertex);
    const ref = Math.abs(normal[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
    const tangentX = vNormalize(vCross(ref, normal));
    const tangentY = vCross(normal, tangentX);

    const ordered = [...adjacentFaces]
      .map((faceIndex) => {
        const p = dualVertices[faceIndex];
        const projected = vSub(p, vScale(normal, vDot(p, normal)));
        const angle = Math.atan2(vDot(projected, tangentY), vDot(projected, tangentX));
        return { faceIndex, angle };
      })
      .sort((a, b) => a.angle - b.angle)
      .map((entry) => entry.faceIndex);

    dualFaces.push(ordered);
  });

  return createModel(dualVertices, dualFaces);
};

const buildModels = () => {
  const phi = (1 + Math.sqrt(5)) / 2;

  const tetra = createModel(
    [
      [1, 1, 1],
      [-1, -1, 1],
      [-1, 1, -1],
      [1, -1, -1]
    ],
    [
      [0, 1, 2],
      [0, 3, 1],
      [0, 2, 3],
      [1, 3, 2]
    ]
  );

  const cube = createModel(
    [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1]
    ],
    [
      [0, 1, 2, 3],
      [4, 7, 6, 5],
      [0, 4, 5, 1],
      [1, 5, 6, 2],
      [2, 6, 7, 3],
      [3, 7, 4, 0]
    ]
  );

  const octa = createModel(
    [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1]
    ],
    [
      [0, 2, 4],
      [2, 1, 4],
      [1, 3, 4],
      [3, 0, 4],
      [2, 0, 5],
      [1, 2, 5],
      [3, 1, 5],
      [0, 3, 5]
    ]
  );

  const icosa = createModel(
    [
      [-1, phi, 0],
      [1, phi, 0],
      [-1, -phi, 0],
      [1, -phi, 0],
      [0, -1, phi],
      [0, 1, phi],
      [0, -1, -phi],
      [0, 1, -phi],
      [phi, 0, -1],
      [phi, 0, 1],
      [-phi, 0, -1],
      [-phi, 0, 1]
    ],
    [
      [0, 11, 5],
      [0, 5, 1],
      [0, 1, 7],
      [0, 7, 10],
      [0, 10, 11],
      [1, 5, 9],
      [5, 11, 4],
      [11, 10, 2],
      [10, 7, 6],
      [7, 1, 8],
      [3, 9, 4],
      [3, 4, 2],
      [3, 2, 6],
      [3, 6, 8],
      [3, 8, 9],
      [4, 9, 5],
      [2, 4, 11],
      [6, 2, 10],
      [8, 6, 7],
      [9, 8, 1]
    ]
  );

  const dodeca = buildDualModel(icosa);

  return {
    tetra,
    cube,
    octa,
    icosa,
    dodeca
  };
};

const MODELS = buildModels();

const createParticleBurst = (type, x, y) => {
  const count = type === "nat20" ? 40 : 24;
  const particles = [];

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU + randomRange(-0.18, 0.18);
    const speed = type === "nat20" ? randomRange(1.5, 4.8) : randomRange(0.8, 3.4);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomRange(0.7, 1.1),
      size: randomRange(1.5, type === "nat20" ? 4.2 : 3.2)
    });
  }

  return particles;
};

export const createDnDDice = () => {
  let canvas = null;
  let ctx = null;
  let container = null;

  let resizeHandler = null;
  let pointerMoveHandler = null;
  let pointerLeaveHandler = null;
  let pointerDownHandler = null;

  let rafId = null;
  let frameQueued = false;
  let needsRender = true;

  let backdropCanvas = null;
  let backdropCtx = null;

  const state = new Map();
  const history = [];
  let hoverKey = null;

  let rollAnim = null;
  let eventFx = null;
  let audioCtx = null;
  let audioGain = null;

  const requestRender = () => {
    needsRender = true;
    if (!frameQueued) {
      frameQueued = true;
      rafId = requestAnimationFrame(drawFrame);
    }
  };

  const ensureAudio = () => {
    if (typeof window === "undefined") {
      return false;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return false;
    }

    if (!audioCtx) {
      audioCtx = new AudioCtx();
      audioGain = audioCtx.createGain();
      audioGain.gain.value = 0.1;
      audioGain.connect(audioCtx.destination);
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    return true;
  };

  const playRetroBeep = ({
    frequency = 440,
    duration = 0.06,
    delay = 0,
    type = "square",
    volume = 0.48
  }) => {
    if (!audioCtx || !audioGain) {
      return;
    }

    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.05);

    osc.connect(gain);
    gain.connect(audioGain);

    osc.start(now);
    osc.stop(now + duration + 0.06);
  };

  const playRollSfx = (kind) => {
    if (!audioCtx || !audioGain) {
      return;
    }

    if (kind === "start") {
      playRetroBeep({ frequency: 760, duration: 0.028, volume: 0.2 });
      playRetroBeep({ frequency: 980, duration: 0.03, delay: 0.03, volume: 0.19 });
      return;
    }

    if (kind === "land") {
      playRetroBeep({ frequency: 460, duration: 0.032, type: "triangle", volume: 0.24 });
      playRetroBeep({ frequency: 340, duration: 0.024, delay: 0.012, volume: 0.15 });
      return;
    }

    if (kind === "nat20") {
      playRetroBeep({ frequency: 660, duration: 0.05, volume: 0.26 });
      playRetroBeep({ frequency: 880, duration: 0.055, delay: 0.06, volume: 0.27 });
      playRetroBeep({ frequency: 1320, duration: 0.07, delay: 0.13, volume: 0.31 });
      return;
    }

    if (kind === "nat1") {
      playRetroBeep({ frequency: 240, duration: 0.06, volume: 0.24 });
      playRetroBeep({ frequency: 180, duration: 0.08, delay: 0.065, volume: 0.23 });
      playRetroBeep({ frequency: 130, duration: 0.11, delay: 0.15, volume: 0.26 });
    }
  };

  const formatRoll = (sides, value) => {
    if (sides !== 100) {
      return String(value);
    }
    if (value === 100) {
      return "100";
    }
    return String(value).padStart(2, "0");
  };

  const hashTile = (x, y) => {
    const n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    return n % 5;
  };

  const rebuildBackdrop = () => {
    if (!canvas || !ctx) {
      return;
    }

    const W = canvas.width;
    const H = canvas.height;

    backdropCanvas = document.createElement("canvas");
    backdropCanvas.width = W;
    backdropCanvas.height = H;
    backdropCtx = backdropCanvas.getContext("2d");

    if (!backdropCtx) {
      backdropCanvas = null;
      return;
    }

    const b = backdropCtx;
    b.imageSmoothingEnabled = false;

    b.fillStyle = EGA.black;
    b.fillRect(0, 0, W, H);

    const rail = Math.max(8, Math.round(W * 0.04));
    const top = Math.round(H * 0.09);
    const bottom = Math.round(H * 0.84);
    const left = rail;
    const right = W - rail;

    b.fillStyle = EGA.brown;
    b.fillRect(0, top - rail, W, rail);
    b.fillRect(0, bottom, W, rail + 5);
    b.fillRect(0, top - rail, rail, bottom - top + rail + 5);
    b.fillRect(W - rail, top - rail, rail, bottom - top + rail + 5);

    b.fillStyle = EGA.green;
    b.fillRect(left, top, right - left, bottom - top);

    const tile = Math.max(3, Math.round(Math.min(W, H) * 0.008));
    for (let y = top; y < bottom; y += tile) {
      for (let x = left; x < right; x += tile) {
        const hx = Math.floor(x / tile);
        const hy = Math.floor(y / tile);
        const choice = hashTile(hx, hy);
        if (choice <= 1) {
          b.fillStyle = EGA.darkGray;
        } else if (choice === 2) {
          b.fillStyle = EGA.green;
        } else {
          b.fillStyle = EGA.brightGreen;
        }
        b.globalAlpha = choice === 4 ? 0.22 : 0.14;
        b.fillRect(x, y, tile, tile);
      }
    }
    b.globalAlpha = 1;

    b.fillStyle = EGA.darkGray;
    for (let y = top; y < bottom; y += 4) {
      b.globalAlpha = 0.09;
      b.fillRect(left, y, right - left, 1);
    }
    b.globalAlpha = 1;

    b.fillStyle = EGA.black;
    b.globalAlpha = 0.34;
    b.fillRect(0, 0, W, top - 2);
    b.fillRect(0, bottom + rail, W, H - (bottom + rail));
    b.globalAlpha = 1;
  };

  const layoutDice = () => {
    if (!canvas) {
      return;
    }

    const W = canvas.width;
    const H = canvas.height;

    const topPad = Math.max(36, Math.round(H * 0.14));
    const notesH = Math.max(84, Math.round(H * 0.2));
    const bottomPad = notesH + 22;

    const usableH = Math.max(170, H - topPad - bottomPad);

    let rows = 2;
    if (W < 460) {
      rows = 4;
    } else if (W < 700 || H < 340) {
      rows = 3;
    }

    const cols = Math.ceil(DICE.length / rows);
    const cellW = W / cols;
    const cellH = usableH / rows;

    const radius = clamp(Math.min(cellW, cellH) * 0.29, 20, 66);

    let index = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const die = DICE[index];
        index += 1;
        if (!die) {
          break;
        }

        const cx = Math.round((c + 0.5) * cellW);
        const cy = Math.round(topPad + (r + 0.5) * cellH);
        const prev = state.get(die.key) || {};

        state.set(die.key, {
          ...prev,
          cx,
          cy,
          radius,
          rotX: prev.rotX ?? randomRange(0, TAU),
          rotY: prev.rotY ?? randomRange(0, TAU),
          rotZ: prev.rotZ ?? randomRange(0, TAU),
          rolling: prev.rolling || false,
          last: prev.last ?? null,
          flicker: prev.flicker ?? null,
          settleStart: prev.settleStart ?? 0
        });
      }
    }

    requestRender();
  };

  const resizeCanvas = () => {
    if (!canvas || !ctx) {
      return;
    }

    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const pixelScale = cssW >= 920 ? 2 : 1;

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(320, Math.floor(cssW / pixelScale));
    canvas.height = Math.max(240, Math.floor(cssH / pixelScale));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    rebuildBackdrop();
    layoutDice();
  };

  const screenPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const hitTest = (x, y) => {
    for (const die of DICE) {
      const s = state.get(die.key);
      if (!s) {
        continue;
      }
      const radius = s.radius * 0.95;
      const dx = x - s.cx;
      const dy = y - s.cy;
      if (dx * dx + dy * dy <= radius * radius) {
        return die.key;
      }
    }
    return null;
  };

  const pushHistory = (die, value, marker = "") => {
    const printable = formatRoll(die.sides, value);
    const line = marker ? `${die.label}: ${printable} ${marker}` : `${die.label}: ${printable}`;
    history.unshift(line);
    if (history.length > 8) {
      history.pop();
    }
  };

  const startSpecialFx = (type, s) => {
    eventFx = {
      type,
      start: performance.now(),
      duration: type === "nat20" ? 1400 : 1000,
      x: s.cx,
      y: s.cy,
      particles: createParticleBurst(type, s.cx, s.cy)
    };
  };

  const beginRoll = (key) => {
    if (rollAnim) {
      return;
    }

    const die = DICE.find((item) => item.key === key);
    const s = state.get(key);

    if (!die || !s || s.rolling) {
      return;
    }

    s.rolling = true;
    s.flicker = null;

    rollAnim = {
      key,
      sides: die.sides,
      start: performance.now(),
      duration: secureRandomInt(950, 1500),
      spinX: randomRange(6.5, 10.5) * TAU,
      spinY: randomRange(6.5, 10.5) * TAU,
      spinZ: randomRange(2.5, 5.5) * TAU,
      fromX: s.rotX,
      fromY: s.rotY,
      fromZ: s.rotZ,
      lastFlicker: 0
    };

    playRollSfx("start");
    requestRender();
  };

  const drawPolyhedron = (die, s, time) => {
    const model = MODELS[die.model];
    if (!model) {
      return;
    }

    const hover = hoverKey === die.key && !s.rolling;
    const settleAge = Math.max(0, time - (s.settleStart || 0));
    const settle = s.settleStart ? Math.exp(-settleAge / 420) * Math.sin(settleAge / 85) : 0;

    const spinScale = s.rolling ? 1.12 : hover ? 1.06 : 1;
    const radius = s.radius * spinScale;

    const wobbleX = s.rolling ? 0 : settle * 0.14;
    const wobbleY = s.rolling ? 0 : settle * 0.09;

    const transformed = model.vertices.map((vertex) => {
      const rotated = rotateVec(vertex, s.rotX + wobbleX, s.rotY + wobbleY, s.rotZ);
      return rotated;
    });

    const camera = 3.2;
    const squishY = 0.9;

    const projected = transformed.map((vertex) => {
      const z = vertex[2] + 0.35;
      const perspective = camera / (camera - z);
      const x = s.cx + vertex[0] * radius * perspective;
      const y = s.cy + vertex[1] * radius * perspective * squishY;
      return { x, y, z };
    });

    const light = vNormalize([-0.5, -0.9, 1]);

    const facesToDraw = [];

    model.faces.forEach((face) => {
      const a = transformed[face[0]];
      const b = transformed[face[1]];
      const c = transformed[face[2]];
      const normal = vNormalize(vCross(vSub(b, a), vSub(c, a)));

      if (normal[2] <= 0.02) {
        return;
      }

      const centroidZ =
        face.reduce((sum, index) => sum + transformed[index][2], 0) / face.length;

      const brightness = clamp(vDot(normal, light), -0.15, 1);
      const shadeIndex = brightness > 0.54 ? 2 : brightness > 0.18 ? 1 : 0;
      const faceColor = die.colors[shadeIndex];

      facesToDraw.push({
        face,
        centroidZ,
        faceColor,
        shimmer: (brightness + 0.15) * 0.7
      });
    });

    facesToDraw.sort((a, b) => a.centroidZ - b.centroidZ);

    const shadowY = Math.round(s.cy + radius * 0.95);
    const shadowW = Math.round(radius * 1.45);
    const shadowH = Math.max(3, Math.round(radius * 0.24));
    ctx.fillStyle = EGA.black;
    ctx.globalAlpha = 0.34;
    ctx.fillRect(
      Math.round(s.cx - shadowW / 2),
      Math.round(shadowY - shadowH / 2),
      shadowW,
      shadowH
    );
    ctx.globalAlpha = 1;

    for (const faceEntry of facesToDraw) {
      const points = faceEntry.face.map((idx) => projected[idx]);

      ctx.beginPath();
      points.forEach((point, index) => {
        const x = Math.round(point.x);
        const y = Math.round(point.y);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();

      ctx.fillStyle = faceEntry.faceColor;
      ctx.fill();

      ctx.globalAlpha = 0.12 + faceEntry.shimmer * 0.14;
      ctx.fillStyle = EGA.white;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = EGA.black;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = EGA.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const labelSize = Math.round(clamp(radius * 0.22 * (die.labelScale || 1), 12, 22));
    ctx.font = `bold ${labelSize}px 'VT323', 'Courier New', monospace`;
    ctx.strokeStyle = EGA.black;
    ctx.lineWidth = 2;
    ctx.strokeText(die.label, Math.round(s.cx), Math.round(s.cy - radius * 1.08));
    ctx.fillText(die.label, Math.round(s.cx), Math.round(s.cy - radius * 1.08));

    let valueText = "";
    if (s.rolling && s.flicker != null) {
      valueText = formatRoll(die.sides, s.flicker);
    } else if (s.last != null) {
      valueText = formatRoll(die.sides, s.last);
    }

    if (valueText) {
      ctx.fillStyle = EGA.yellow;
      const valueSize = Math.round(clamp(radius * 0.34, 16, 26));
      ctx.font = `bold ${valueSize}px 'VT323', 'Courier New', monospace`;
      ctx.fillText(valueText, Math.round(s.cx), Math.round(s.cy));
      ctx.strokeStyle = EGA.black;
      ctx.lineWidth = 2;
      ctx.strokeText(valueText, Math.round(s.cx), Math.round(s.cy));
    }
  };

  const drawHeader = () => {
    const W = canvas.width;
    const titleY = 24;

    ctx.fillStyle = EGA.black;
    ctx.globalAlpha = 0.68;
    ctx.fillRect(0, 0, W, 40);
    ctx.globalAlpha = 1;

    ctx.fillStyle = EGA.brightCyan;
    ctx.font = "bold 15px 'VT323', 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("EGA DICE VAULT :: TAP A DIE TO ROLL", Math.round(W / 2), titleY);
  };

  const drawNotesPanel = () => {
    const W = canvas.width;
    const H = canvas.height;
    const panelH = Math.max(84, Math.round(H * 0.2));
    const y = H - panelH - 10;

    ctx.fillStyle = "#f5eec8";
    ctx.fillRect(8, y, W - 16, panelH);

    ctx.strokeStyle = EGA.brown;
    ctx.lineWidth = 2;
    ctx.strokeRect(8, y, W - 16, panelH);

    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = "#d8cca2";
    for (let lineY = y + 16; lineY < y + panelH; lineY += 14) {
      ctx.beginPath();
      ctx.moveTo(12, lineY);
      ctx.lineTo(W - 12, lineY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = EGA.red;
    ctx.font = "13px 'Permanent Marker', 'Caveat', 'Comic Sans MS', cursive";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Session notes", 16, y + 10);

    const visible = history.slice(0, 4);
    ctx.fillStyle = "#2c2115";
    ctx.font = "12px 'Permanent Marker', 'Caveat', 'Comic Sans MS', cursive";
    visible.forEach((line, index) => {
      const lineY = y + 26 + index * 15;
      ctx.fillText(`- ${line}`, 16, lineY);
    });

    if (visible.length === 0) {
      ctx.globalAlpha = 0.65;
      ctx.fillText("- roll something legendary", 16, y + 26);
      ctx.globalAlpha = 1;
    }
  };

  const drawEventFx = (time) => {
    if (!eventFx) {
      return;
    }

    const elapsed = time - eventFx.start;
    const t = clamp(elapsed / eventFx.duration, 0, 1);

    if (eventFx.type === "nat20") {
      const pulse = easeOutBack(t);

      ctx.save();
      ctx.translate(eventFx.x, eventFx.y);

      for (let i = 0; i < 10; i += 1) {
        const angle = (i / 10) * TAU + t * 0.45;
        const rayLength = 10 + pulse * 38;
        ctx.strokeStyle = i % 2 === 0 ? EGA.yellow : EGA.white;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
        ctx.lineTo(Math.cos(angle) * rayLength, Math.sin(angle) * rayLength);
        ctx.stroke();
      }

      ctx.restore();

      ctx.fillStyle = EGA.yellow;
      ctx.strokeStyle = EGA.black;
      ctx.lineWidth = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 24px 'VT323', 'Courier New', monospace";
      const textY = eventFx.y - 44 - easeOutCubic(t) * 16;
      ctx.strokeText("NAT 20!", eventFx.x, textY);
      ctx.fillText("NAT 20!", eventFx.x, textY);
    }

    if (eventFx.type === "nat1") {
      const shake = (1 - t) * 4;
      const jitterX = Math.sin(time / 18) * shake;
      const jitterY = Math.cos(time / 24) * shake;

      ctx.globalAlpha = 0.2 * (1 - t);
      ctx.fillStyle = EGA.red;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = EGA.brightRed;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eventFx.x + jitterX, eventFx.y - 28 + jitterY);
      ctx.lineTo(eventFx.x - 10 + jitterX, eventFx.y - 10 + jitterY);
      ctx.lineTo(eventFx.x + 6 + jitterX, eventFx.y + 6 + jitterY);
      ctx.lineTo(eventFx.x - 8 + jitterX, eventFx.y + 26 + jitterY);
      ctx.stroke();

      ctx.fillStyle = EGA.brightRed;
      ctx.strokeStyle = EGA.black;
      ctx.lineWidth = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 20px 'VT323', 'Courier New', monospace";
      const textY = eventFx.y - 40;
      ctx.strokeText("NAT 1", eventFx.x, textY);
      ctx.fillText("NAT 1", eventFx.x, textY);
    }

    eventFx.particles.forEach((particle, index) => {
      const life = clamp(t / particle.life, 0, 1);
      const drift = (time - eventFx.start) * 0.03;
      const px = particle.x + particle.vx * drift;
      const py = particle.y + particle.vy * drift + drift * 0.35;
      const size = Math.max(1, particle.size * (1 - life));

      ctx.globalAlpha = 1 - life;
      if (eventFx.type === "nat20") {
        ctx.fillStyle = index % 3 === 0 ? EGA.white : EGA.yellow;
      } else {
        ctx.fillStyle = index % 2 === 0 ? EGA.brightRed : EGA.red;
      }
      ctx.fillRect(Math.round(px), Math.round(py), Math.round(size), Math.round(size));
      ctx.globalAlpha = 1;
    });

    if (t >= 1) {
      eventFx = null;
    }
  };

  const updateRollAnimation = (time) => {
    if (!rollAnim) {
      return;
    }

    const s = state.get(rollAnim.key);
    const die = DICE.find((item) => item.key === rollAnim.key);
    if (!s || !die) {
      rollAnim = null;
      return;
    }

    const t = clamp((time - rollAnim.start) / rollAnim.duration, 0, 1);
    const eased = easeOutCubic(t);

    s.rotX = rollAnim.fromX + eased * rollAnim.spinX;
    s.rotY = rollAnim.fromY + eased * rollAnim.spinY;
    s.rotZ = rollAnim.fromZ + eased * rollAnim.spinZ;

    if (t < 0.87 && time - rollAnim.lastFlicker > 65) {
      s.flicker = secureRandomInt(1, rollAnim.sides);
      rollAnim.lastFlicker = time;
    }

    if (t >= 1) {
      s.rolling = false;
      s.flicker = null;
      s.last = secureRandomInt(1, die.sides);
      s.settleStart = performance.now();

      const isNatural20 = die.sides === 20 && s.last === 20;
      const isNatural1 = die.sides === 20 && s.last === 1;

      if (isNatural20) {
        pushHistory(die, s.last, "CRIT");
        startSpecialFx("nat20", s);
        playRollSfx("nat20");
      } else if (isNatural1) {
        pushHistory(die, s.last, "FUMBLE");
        startSpecialFx("nat1", s);
        playRollSfx("nat1");
      } else {
        pushHistory(die, s.last);
        playRollSfx("land");
      }

      rollAnim = null;
    }
  };

  function drawFrame(timestamp) {
    frameQueued = false;

    const time = typeof timestamp === "number" ? timestamp : performance.now();

    if (!needsRender && !rollAnim && !eventFx) {
      return;
    }
    needsRender = false;

    updateRollAnimation(time);

    if (!ctx || !canvas) {
      return;
    }

    if (backdropCanvas) {
      ctx.drawImage(backdropCanvas, 0, 0);
    } else {
      ctx.fillStyle = EGA.black;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawHeader();

    for (const die of DICE) {
      const s = state.get(die.key);
      if (!s) {
        continue;
      }
      drawPolyhedron(die, s, time);
    }

    drawEventFx(time);
    drawNotesPanel();

    const shouldContinue = Boolean(rollAnim || eventFx);
    if (shouldContinue) {
      requestRender();
    }
  }

  const handlePointerMove = (event) => {
    if (!canvas) {
      return;
    }

    const { x, y } = screenPoint(event);
    const hit = hitTest(x, y);

    if (hit !== hoverKey) {
      hoverKey = hit;
      canvas.style.cursor = hoverKey ? "pointer" : "default";
      requestRender();
    }
  };

  const handlePointerLeave = () => {
    hoverKey = null;
    if (canvas) {
      canvas.style.cursor = "default";
    }
    requestRender();
  };

  const handlePointerDown = (event) => {
    ensureAudio();
    const { x, y } = screenPoint(event);
    const key = hitTest(x, y);
    if (!key) {
      return;
    }
    beginRoll(key);
  };

  const init = (host) => {
    container = host;
    container.innerHTML = "";
    container.classList.add("dnd-dice");

    canvas = document.createElement("canvas");
    canvas.className = "dnd-dice__canvas";
    canvas.setAttribute("aria-label", "DnD Dice Roller (Canvas)");
    ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    container.appendChild(canvas);

    resizeHandler = () => resizeCanvas();
    window.addEventListener("resize", resizeHandler, { passive: true });

    pointerMoveHandler = (event) => handlePointerMove(event);
    pointerLeaveHandler = () => handlePointerLeave();
    pointerDownHandler = (event) => handlePointerDown(event);

    canvas.addEventListener("pointermove", pointerMoveHandler, { passive: true });
    canvas.addEventListener("pointerleave", pointerLeaveHandler, { passive: true });
    canvas.addEventListener("pointerdown", pointerDownHandler);

    resizeCanvas();
    requestRender();
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
    frameQueued = false;
    needsRender = true;

    backdropCanvas = null;
    backdropCtx = null;

    hoverKey = null;
    rollAnim = null;
    eventFx = null;
    if (audioCtx) {
      audioCtx.close().catch(() => {});
    }
    audioCtx = null;
    audioGain = null;

    history.length = 0;
    state.clear();
  };

  return { init, cleanup };
};
