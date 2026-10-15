import { useEffect, useRef, useState } from 'react';

const TAU = Math.PI * 2;

// Rotation helpers (points are [x, y, z] arrays, +z points toward the viewer)
const rotX = (p, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};

const rotY = (p, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgba = (rgb, a) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;

// Real helium emission lines. The visible ones are what you see in a helium
// discharge tube; 58.4 nm is the extreme-UV resonance line back to the ground state.
const HELIUM_LINES = [
  { nm: 58.4, hex: '#c9b8ff', uv: true },
  { nm: 447.1, hex: '#6b5cff' },
  { nm: 471.3, hex: '#2f8dff' },
  { nm: 492.2, hex: '#00d9e0' },
  { nm: 501.6, hex: '#2bff8f' },
  { nm: 587.6, hex: '#ffd21f' },
  { nm: 667.8, hex: '#ff3b24' },
  { nm: 706.5, hex: '#c4001c' },
];
const LINE_BY_NM = Object.fromEntries(HELIUM_LINES.map((l) => [l.nm, { ...l, rgb: hexToRgb(l.hex) }]));

// Electronic states the atom can be pushed through by clicking
const STATES = {
  1: { config: '1s²', label: 'Ground state', energy: '−79.0' },
  2: { config: '1s¹ 2p¹', label: 'Excited · n = 2', energy: '−57.8' },
  3: { config: '1s¹ 3d¹', label: 'Excited · n = 3', energy: '−55.9' },
  ion: { config: 'He²⁺ + 2e⁻', label: 'Fully ionized', energy: '0.0' },
};
const ORBITAL_NAME = { 1: '1s', 2: '2p', 3: '3d', ion: 'free' };
const R_SCALE = { 1: 1, 2: 1.42, 3: 1.82 };
const HOLD_MS = 2400; // how long an excited state lives before decaying
const CASCADE_MS = 900; // gap between successive decays

// He-4 nucleus: two protons + two neutrons on a tetrahedron
const NUCLEONS = [
  { v: [1, 1, 1], type: 'p' },
  { v: [1, -1, -1], type: 'n' },
  { v: [-1, 1, -1], type: 'p' },
  { v: [-1, -1, 1], type: 'n' },
].map((n) => ({ ...n, v: n.v.map((c) => c / Math.sqrt(3)) }));

const NUCLEON_COLORS = {
  p: ['#ffffff', '#a8f7ff', '#00d5ff', '#003e57'],
  n: ['#ffffff', '#ffd2b3', '#ff6a1a', '#4d1400'],
};

// Sample points from the 1s probability density |ψ|² ∝ e^(−2r/a): radial part is Gamma(3)
const makeCloud = (count) =>
  Array.from({ length: count }, () => {
    const r = Math.min(1.45, -0.24 * Math.log(Math.random() * Math.random() * Math.random() + 1e-9));
    const u = Math.random() * 2 - 1;
    const t = Math.random() * TAU;
    const q = Math.sqrt(1 - u * u);
    return {
      p: [q * Math.cos(t) * r, u * r, q * Math.sin(t) * r],
      tw: Math.random() * TAU,
      tws: 1.5 + Math.random() * 4,
    };
  });

const createElectrons = () => [
  { spin: '↑', phase: 0, r: 1, rT: 1, a: 1, aT: 1, plane: [0.85, 0.35], prec: 0.07, rgb: [255, 216, 92] },
  { spin: '↓', phase: Math.PI, r: 1, rT: 1, a: 1, aT: 1, plane: [-0.95, 2.1], prec: -0.05, rgb: [255, 164, 64] },
];

export const Interactive3DAtom = () => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const apiRef = useRef(null);
  const pointer = useRef({ x: 0, y: 0, inside: false, down: false, downX: 0, downY: 0, downT: 0, lastX: 0, lastY: 0 });

  const [isGrabbed, setIsGrabbed] = useState(false);
  const [hud, setHud] = useState({ level: 1, seen: [], last: null, count: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let S = 0; // wrapper size (square)
    let PAD = 0; // canvas bleed beyond the wrapper so trails and photons are not clipped
    let C = 0; // canvas centre
    let dpr = 1;

    const resize = () => {
      S = Math.min(wrapper.offsetWidth, wrapper.offsetHeight);
      if (!S) return;
      PAD = Math.round(S * 0.6);
      const W = S + PAD * 2;
      C = W / 2;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = W * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${W}px`;
      canvas.style.left = `${-PAD}px`;
      canvas.style.top = `${-PAD}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    // --- Simulation state -------------------------------------------------
    const view = { rx: 0.35, ry: 0.6, vx: 0.0012, vy: 0.0035, tiltX: 0, tiltY: 0 };
    const electrons = createElectrons();
    const cloud = makeCloud(reduceMotion ? 120 : 280);
    const sim = { level: 1, lastChange: 0, ionAt: 0, heat: 0, spin: 0, time: 0, pending: [] };
    const photons = [];
    const rings = [];
    const sparks = [];
    let hoveredE = -1;
    let seen = new Set();
    let count = 0;

    const pushHud = (extra = {}) =>
      setHud((h) => ({ ...h, level: sim.level, seen: [...seen], count, ...extra }));

    const burst = (x, y, rgb, n, speed) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const v = speed * (0.35 + Math.random() * 0.65);
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.5 + Math.random() * 0.6, rgb });
      }
    };

    const emit = (eIdx, nm) => {
      const line = LINE_BY_NM[nm];
      const e = electrons[eIdx];
      const sp = e.screen || { x: C, y: C };
      let dx = sp.x - C;
      let dy = sp.y - C;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      photons.push({ kind: 'emit', x: sp.x, y: sp.y, dx, dy, t: 0, life: 1.7, rgb: line.rgb, nm });
      rings.push({ x: sp.x, y: sp.y, t: 0, life: 0.9, rgb: line.rgb, max: S * 0.4 });
      burst(sp.x, sp.y, line.rgb, 14, S * 0.9);
      sim.heat = Math.min(1.6, sim.heat + 0.8);
      seen.add(nm);
      count += 1;
      pushHud({ last: nm });
      window.dispatchEvent(new CustomEvent('helium:photon', { detail: { nm, rgb: line.rgb } }));
    };

    const setLevel = (lvl) => {
      sim.level = lvl;
      electrons[1].rT = R_SCALE[lvl];
      pushHud();
    };

    const ionize = (now) => {
      sim.level = 'ion';
      sim.ionAt = now;
      electrons.forEach((e) => {
        e.rT = 4.4;
        e.aT = 0;
      });
      rings.push({ x: C, y: C, t: 0, life: 1.2, rgb: [255, 255, 255], max: S * 1.1, width: 3 });
      rings.push({ x: C, y: C, t: -0.12, life: 1.2, rgb: [0, 242, 255], max: S * 0.9 });
      burst(C, C, [0, 242, 255], 40, S * 1.6);
      burst(C, C, [255, 216, 92], 24, S * 1.2);
      sim.heat = 2.2;
      pushHud();
      window.dispatchEvent(new CustomEvent('helium:photon', { detail: { nm: 0, rgb: [255, 255, 255], ionize: true } }));
    };

    const recapture = (now) => {
      electrons.forEach((e) => {
        e.r = 3.4;
        e.a = 0;
        e.aT = 1;
      });
      electrons[0].rT = 1;
      electrons[1].rT = R_SCALE[3];
      sim.level = 3;
      sim.lastChange = now + 600;
      pushHud();
      const recaptureLines = [447.1, 471.3, 492.2];
      const pick = () => recaptureLines[Math.floor(Math.random() * recaptureLines.length)];
      sim.pending.push({ at: now + 380, fn: () => emit(0, pick()) });
      sim.pending.push({ at: now + 650, fn: () => emit(1, pick()) });
      sim.pending.push({ at: now + 1100, fn: () => emit(0, 58.4) });
    };

    // Fire a photon at the outer electron from the rim of the canvas, in the direction of (fx, fy)
    const excite = (fx, fy) => {
      if (sim.level === 'ion') return;
      let dx = fx - C;
      let dy = fy - C;
      const len = Math.hypot(dx, dy);
      if (len < 1) {
        const a = Math.random() * TAU;
        dx = Math.cos(a);
        dy = Math.sin(a);
      } else {
        dx /= len;
        dy /= len;
      }
      const startR = C * 0.95;
      const nm = sim.level === 1 ? 58.4 : 587.6;
      photons.push({
        kind: 'absorb',
        x0: C + dx * startR,
        y0: C + dy * startR,
        t: 0,
        life: 0.34,
        rgb: LINE_BY_NM[nm].rgb,
        nm,
        target: 1,
        onArrive: (now) => {
          if (sim.level === 'ion') return;
          const sp = electrons[1].screen;
          if (sp) {
            rings.push({ x: sp.x, y: sp.y, t: 0, life: 0.5, rgb: [255, 255, 255], max: S * 0.18 });
            burst(sp.x, sp.y, [255, 240, 200], 10, S * 0.6);
          }
          sim.heat = Math.min(1.6, sim.heat + 0.6);
          sim.lastChange = now;
          if (sim.level < 3) setLevel(sim.level + 1);
          else ionize(now);
        },
      });
    };

    apiRef.current = {
      excite: (clientX, clientY) => {
        const rect = wrapper.getBoundingClientRect();
        excite(clientX - rect.left + PAD, clientY - rect.top + PAD);
      },
      exciteRandom: () => {
        const a = Math.random() * TAU;
        excite(C + Math.cos(a) * 100, C + Math.sin(a) * 100);
      },
      nudge: (vx, vy) => {
        view.vx += vx;
        view.vy += vy;
      },
      drag: (dx, dy) => {
        view.ry += dx * 0.008;
        view.rx += dy * 0.008;
        view.vx = dy * 0.008;
        view.vy = dx * 0.008;
      },
    };

    // --- Rendering helpers ------------------------------------------------
    const drawSphere = (x, y, r, stops, alpha = 1) => {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
      g.addColorStop(0, stops[0]);
      g.addColorStop(0.28, stops[1]);
      g.addColorStop(0.72, stops[2]);
      g.addColorStop(1, stops[3]);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    // A photon drawn the way physicists draw them: a wiggly line
    const drawSquiggle = (x, y, dx, dy, length, amp, waves, rgb, alpha, phase) => {
      const nx = -dy;
      const ny = dx;
      const steps = 36;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const s = i / steps;
        const env = Math.sin(s * Math.PI);
        const w = Math.sin(s * waves * TAU + phase) * amp * env;
        const px = x - dx * length * s + nx * w;
        const py = y - dy * length * s + ny * w;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rgba(rgb, alpha * 0.35);
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = rgba(rgb, alpha);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, TAU);
      ctx.fillStyle = rgba([255, 255, 255], alpha);
      ctx.fill();
    };

    const wavesFor = (nm) => Math.min(9, Math.max(2.5, (3 * 600) / Math.max(nm, 200)));

    // --- Main loop --------------------------------------------------------
    let raf;
    let prev = performance.now();

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!S) {
        resize();
        return;
      }
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const k = dt * 60; // frame-rate independent step
      sim.time += dt;
      const t = sim.time;
      const ptr = pointer.current;

      // View rotation: inertia + gentle auto drift + parallax toward the cursor
      if (!ptr.down) {
        view.vx = view.vx * Math.pow(0.95, k) + 0.0012 * (1 - Math.pow(0.95, k));
        view.vy = view.vy * Math.pow(0.95, k) + (reduceMotion ? 0.0012 : 0.0035) * (1 - Math.pow(0.95, k));
        view.rx += view.vx * k;
        view.ry += view.vy * k;
      }
      const tx = ptr.inside && !ptr.down ? ((ptr.y - C) / S) * 0.5 : 0;
      const ty = ptr.inside && !ptr.down ? ((ptr.x - C) / S) * -0.5 : 0;
      view.tiltX += (tx - view.tiltX) * (1 - Math.pow(0.9, k));
      view.tiltY += (ty - view.tiltY) * (1 - Math.pow(0.9, k));

      // State machine: pending events, decay cascade, recapture
      for (let i = sim.pending.length - 1; i >= 0; i--) {
        if (now >= sim.pending[i].at) {
          const p = sim.pending.splice(i, 1)[0];
          p.fn(now);
        }
      }
      if (sim.level === 'ion') {
        if (now - sim.ionAt > 1900) recapture(now);
      } else if (sim.level > 1 && now - sim.lastChange > HOLD_MS) {
        const from = sim.level;
        setLevel(from - 1);
        sim.lastChange = now - (HOLD_MS - CASCADE_MS);
        if (from === 3) {
          const visible = [587.6, 587.6, 667.8, 706.5, 501.6];
          emit(1, visible[Math.floor(Math.random() * visible.length)]);
        } else {
          emit(1, 58.4);
        }
      }

      sim.heat *= Math.pow(0.975, k);
      sim.spin += dt * (0.5 + sim.heat * 2.5);

      const R = S * 0.37;
      const FOV = S * 2.4;
      const toView = (p) => rotX(rotY(p, view.ry + view.tiltY), view.rx + view.tiltX);
      const project = (p) => {
        const s = FOV / Math.max(FOV - p[2], 1);
        return { x: C + p[0] * s, y: C + p[1] * s, z: p[2], s };
      };

      // Electron dynamics (Kepler-ish: outer orbits are slower)
      electrons.forEach((e, i) => {
        const rk = sim.level === 'ion' && e.rT > 2 ? 2.2 : 4;
        e.r += (e.rT - e.r) * (1 - Math.exp(-dt * rk));
        e.a += (e.aT - e.a) * (1 - Math.exp(-dt * 3));
        // Escaping electrons dissolve before they reach the canvas edge
        e.a = Math.min(e.a, Math.max(0, (3.1 - e.r) / 1.1));
        let speed = 2.6 * Math.pow(Math.max(e.r, 0.6), -1.5);
        if (i === hoveredE) speed *= 0.2;
        if (ptr.down) speed *= 0.5;
        if (reduceMotion) speed *= 0.4;
        e.phase += speed * dt;
      });

      const orbitPoint = (e, phi, r) => {
        let p = [Math.cos(phi) * r * R, 0, Math.sin(phi) * r * R];
        p = rotX(p, e.plane[0]);
        p = rotY(p, e.plane[1] + t * e.prec);
        return toView(p);
      };

      const drawables = [];

      // 1s probability cloud
      const cloudScale = sim.level === 'ion' ? 0 : 1;
      if (cloudScale) {
        for (const c of cloud) {
          const v = project(toView([c.p[0] * R, c.p[1] * R, c.p[2] * R]));
          const tw = reduceMotion ? 0.6 : 0.5 + 0.5 * Math.sin(t * c.tws + c.tw);
          drawables.push({ z: v.z, kind: 'cloud', x: v.x, y: v.y, s: v.s, a: tw });
        }
      }

      // Nucleus: one composite drawable at z=0 so its nucleons can be sorted locally
      drawables.push({ z: 0, kind: 'nucleus' });

      // Orbits, trails, electrons
      electrons.forEach((e, i) => {
        if (e.a < 0.01) return;
        const SEG = 84;
        let prevP = project(orbitPoint(e, 0, e.r));
        for (let s = 1; s <= SEG; s++) {
          const p = project(orbitPoint(e, (s / SEG) * TAU, e.r));
          drawables.push({ z: (p.z + prevP.z) / 2, kind: 'ring', a: prevP, b: p, e, i });
          prevP = p;
        }
        const TRAIL = 28;
        const span = 1.25;
        let tp = project(orbitPoint(e, e.phase - span, e.r));
        for (let s = 1; s <= TRAIL; s++) {
          const f = s / TRAIL;
          const p = project(orbitPoint(e, e.phase - span + f * span, e.r));
          drawables.push({ z: (p.z + tp.z) / 2, kind: 'trail', a: tp, b: p, f, e });
          tp = p;
        }
        const head = project(orbitPoint(e, e.phase, e.r));
        e.screen = head;
        drawables.push({ z: head.z, kind: 'electron', p: head, e, i });
      });

      drawables.sort((a, b) => a.z - b.z);

      // --- Draw ---
      const W = S + PAD * 2;
      ctx.clearRect(0, 0, W, W);

      // Core glow, hotter when the atom is energised
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.8 + 0.2 * Math.sin(t * 2.2);
      const glowR = S * (0.26 + sim.heat * 0.08);
      const glow = ctx.createRadialGradient(C, C, 0, C, C, glowR);
      glow.addColorStop(0, `rgba(120, 245, 255, ${0.22 * pulse + sim.heat * 0.18})`);
      glow.addColorStop(0.35, `rgba(0, 200, 255, ${0.08 * pulse + sim.heat * 0.08})`);
      glow.addColorStop(1, 'rgba(0, 120, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(C - glowR, C - glowR, glowR * 2, glowR * 2);
      ctx.globalCompositeOperation = 'source-over';

      for (const d of drawables) {
        const depth = Math.max(0.25, Math.min(1.4, 0.75 + d.z / (R * 2.2)));
        if (d.kind === 'cloud') {
          const size = 1.3 * d.s;
          ctx.fillStyle = `rgba(150, 230, 255, ${0.28 * d.a * depth})`;
          ctx.fillRect(d.x - size / 2, d.y - size / 2, size, size);
        } else if (d.kind === 'ring') {
          const hl = d.i === hoveredE ? 2.2 : 1;
          ctx.beginPath();
          ctx.moveTo(d.a.x, d.a.y);
          ctx.lineTo(d.b.x, d.b.y);
          ctx.strokeStyle = rgba(d.e.rgb, 0.16 * depth * d.e.a * hl);
          ctx.lineWidth = 1.1 * d.a.s;
          ctx.stroke();
        } else if (d.kind === 'trail') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath();
          ctx.moveTo(d.a.x, d.a.y);
          ctx.lineTo(d.b.x, d.b.y);
          ctx.strokeStyle = rgba(d.e.rgb, d.f * d.f * 0.75 * d.e.a * depth);
          ctx.lineWidth = (0.6 + d.f * 4.2) * d.b.s;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        } else if (d.kind === 'electron') {
          const hov = d.i === hoveredE;
          const r = S * 0.022 * d.p.s * (hov ? 1.5 : 1);
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(d.p.x, d.p.y, 0, d.p.x, d.p.y, r * 3.6);
          g.addColorStop(0, rgba([255, 255, 255], d.e.a));
          g.addColorStop(0.18, rgba(d.e.rgb, 0.95 * d.e.a));
          g.addColorStop(0.5, rgba(d.e.rgb, 0.28 * d.e.a));
          g.addColorStop(1, rgba(d.e.rgb, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(d.p.x, d.p.y, r * 3.6, 0, TAU);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.beginPath();
          ctx.arc(d.p.x, d.p.y, r * 0.7, 0, TAU);
          ctx.fillStyle = rgba([255, 255, 255], d.e.a);
          ctx.fill();
          if (hov) {
            ctx.beginPath();
            ctx.arc(d.p.x, d.p.y, r * 2.2 + Math.sin(t * 8) * 1.5, 0, TAU);
            ctx.strokeStyle = rgba(d.e.rgb, 0.8);
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } else if (d.kind === 'nucleus') {
          const nr = S * 0.042;
          const jig = nr * (0.06 + sim.heat * 0.12);
          const pts = NUCLEONS.map((n, idx) => {
            let p = [n.v[0] * nr, n.v[1] * nr, n.v[2] * nr];
            p = rotY(p, sim.spin);
            p = rotX(p, sim.spin * 0.7);
            p = [
              p[0] + Math.sin(t * 11 + idx * 1.7) * jig,
              p[1] + Math.cos(t * 13 + idx * 2.3) * jig,
              p[2] + Math.sin(t * 9 + idx) * jig,
            ];
            return { ...project(toView(p)), type: n.type };
          });
          // Strong-force "gluon" flicker between nucleons
          ctx.globalCompositeOperation = 'lighter';
          for (let a = 0; a < pts.length; a++) {
            for (let b = a + 1; b < pts.length; b++) {
              const fl = Math.max(0, Math.sin(t * (7 + a * 3 + b * 2) + a * b));
              if (fl < 0.3) continue;
              ctx.beginPath();
              ctx.moveTo(pts[a].x, pts[a].y);
              const mx = (pts[a].x + pts[b].x) / 2 + Math.sin(t * 20 + a) * 3;
              const my = (pts[a].y + pts[b].y) / 2 + Math.cos(t * 17 + b) * 3;
              ctx.quadraticCurveTo(mx, my, pts[b].x, pts[b].y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${fl * 0.35 + sim.heat * 0.2})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
          ctx.globalCompositeOperation = 'source-over';
          pts
            .sort((a, b) => a.z - b.z)
            .forEach((p) => drawSphere(p.x, p.y, nr * 0.95 * p.s, NUCLEON_COLORS[p.type]));
        }
      }

      // --- Screen-space effects: photons, shockwaves, sparks ---
      ctx.globalCompositeOperation = 'lighter';
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        if (r.t < 0) continue;
        const p = r.t / r.life;
        if (p >= 1) {
          rings.splice(i, 1);
          continue;
        }
        const ease = 1 - Math.pow(1 - p, 3);
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4 + ease * r.max, 0, TAU);
        ctx.strokeStyle = rgba(r.rgb, (1 - p) * (1 - p) * 0.9);
        ctx.lineWidth = (r.width || 2) * (1 - p) + 0.5;
        ctx.stroke();
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.t += dt;
        if (s.t >= s.life) {
          sparks.splice(i, 1);
          continue;
        }
        const drag = Math.pow(0.9, k);
        s.vx *= drag;
        s.vy *= drag;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const a = 1 - s.t / s.life;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03);
        ctx.strokeStyle = rgba(s.rgb, a);
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      for (let i = photons.length - 1; i >= 0; i--) {
        const ph = photons[i];
        ph.t += dt;
        const waves = wavesFor(ph.nm);
        if (ph.kind === 'absorb') {
          const target = electrons[ph.target].screen || { x: C, y: C };
          const p = Math.min(1, ph.t / ph.life);
          const ease = p * p;
          const x = ph.x0 + (target.x - ph.x0) * ease;
          const y = ph.y0 + (target.y - ph.y0) * ease;
          let dx = target.x - ph.x0;
          let dy = target.y - ph.y0;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len;
          dy /= len;
          drawSquiggle(x, y, dx, dy, S * 0.18, S * 0.016, waves, ph.rgb, 1, -t * 30);
          if (p >= 1) {
            photons.splice(i, 1);
            ph.onArrive(now);
          }
        } else {
          const p = ph.t / ph.life;
          if (p >= 1) {
            photons.splice(i, 1);
            continue;
          }
          const dist = ph.t * S * 0.95;
          const x = ph.x + ph.dx * dist;
          const y = ph.y + ph.dy * dist;
          drawSquiggle(x, y, ph.dx, ph.dy, S * 0.2, S * 0.016, waves, ph.rgb, 1 - p, -t * 30);
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // --- Hover detection + tooltip ---
      let found = -1;
      if (ptr.inside && !ptr.down) {
        let best = S * 0.08;
        electrons.forEach((e, i) => {
          if (!e.screen || e.a < 0.5) return;
          const d = Math.hypot(e.screen.x - ptr.x, e.screen.y - ptr.y);
          if (d < best) {
            best = d;
            found = i;
          }
        });
      }
      if (found !== hoveredE) {
        hoveredE = found;
        wrapper.dataset.electron = found >= 0 ? 'true' : 'false';
      }
      if (hoveredE >= 0) {
        const e = electrons[hoveredE];
        const orbital = hoveredE === 0 || sim.level === 'ion' ? (sim.level === 'ion' ? 'free' : '1s') : ORBITAL_NAME[sim.level];
        const text = `e⁻  spin ${e.spin}  ${orbital}`;
        ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
        const tw = ctx.measureText(text).width;
        const bx = e.screen.x + 16;
        const by = e.screen.y - 30;
        ctx.fillStyle = 'rgba(10, 14, 16, 0.85)';
        ctx.strokeStyle = rgba(e.rgb, 0.8);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(bx, by, tw + 16, 20);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.screen.x + 5, e.screen.y - 5);
        ctx.lineTo(bx, by + 20);
        ctx.stroke();
        ctx.fillStyle = rgba(e.rgb, 1);
        ctx.fillText(text, bx + 8, by + 14);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      apiRef.current = null;
    };
  }, []);

  // --- Pointer handling (mouse, pen and touch share one path) ---
  const toLocal = (e) => {
    const rect = wrapperRef.current.getBoundingClientRect();
    const pad = Math.round(Math.min(rect.width, rect.height) * 0.6);
    return { x: e.clientX - rect.left + pad, y: e.clientY - rect.top + pad };
  };

  const onPointerDown = (e) => {
    const p = pointer.current;
    p.down = true;
    p.downX = p.lastX = e.clientX;
    p.downY = p.lastY = e.clientY;
    p.downT = performance.now();
    wrapperRef.current.setPointerCapture?.(e.pointerId);
    setIsGrabbed(true);
  };

  const onPointerMove = (e) => {
    const p = pointer.current;
    const local = toLocal(e);
    p.x = local.x;
    p.y = local.y;
    p.inside = true;
    if (!p.down) return;
    apiRef.current?.drag(e.clientX - p.lastX, e.clientY - p.lastY);
    p.lastX = e.clientX;
    p.lastY = e.clientY;
  };

  const onPointerUp = (e) => {
    const p = pointer.current;
    if (!p.down) return;
    p.down = false;
    setIsGrabbed(false);
    const moved = Math.hypot(e.clientX - p.downX, e.clientY - p.downY);
    if (moved < 6 && performance.now() - p.downT < 450) {
      apiRef.current?.excite(e.clientX, e.clientY);
    }
    if (e.pointerType !== 'mouse') p.inside = false;
  };

  const onKeyDown = (e) => {
    const api = apiRef.current;
    if (!api) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      api.exciteRandom();
    } else if (e.key === 'ArrowLeft') api.nudge(0, -0.03);
    else if (e.key === 'ArrowRight') api.nudge(0, 0.03);
    else if (e.key === 'ArrowUp') api.nudge(-0.03, 0);
    else if (e.key === 'ArrowDown') api.nudge(0.03, 0);
  };

  const state = STATES[hud.level];
  const lastLine = hud.last != null ? LINE_BY_NM[hud.last] : null;
  const visibleSeen = HELIUM_LINES.filter((l) => hud.seen.includes(l.nm));
  const complete = visibleSeen.length === HELIUM_LINES.length;

  return (
    <div
      ref={wrapperRef}
      className={`hero-3d-atom-wrapper ${isGrabbed ? 'grabbed' : ''} level-${hud.level}`}
      role="button"
      tabIndex={0}
      aria-label="Interactive helium atom. Drag to rotate, click or press Enter to fire a photon and excite an electron."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        if (!pointer.current.down) pointer.current.inside = false;
      }}
      onKeyDown={onKeyDown}
    >
      <canvas ref={canvasRef} className="atom-canvas" />

      {/* Left instrument readout */}
      <div className="atom-hud atom-hud-left" aria-live="polite">
        <div className="hud-tag">He-4 · Z = 2 · A = 4</div>
        <div className="hud-config" key={state.config}>{state.config}</div>
        <div className={`hud-state ${hud.level === 'ion' ? 'ion' : hud.level > 1 ? 'excited' : ''}`}>{state.label}</div>
        <div className="hud-energy">
          <span>E</span>
          <strong>{state.energy}</strong>
          <span>eV</span>
        </div>
        <div className="hud-levels">
          {[3, 2, 1].map((n) => (
            <div key={n} className={`hud-level ${hud.level === n ? 'on' : ''}`}>
              <span>n={n}</span>
              <i />
            </div>
          ))}
        </div>
        <div className="hud-hint">drag ⟲ spin · click ✦ fire photon</div>
      </div>

      {/* Right spectrometer */}
      <div className="atom-hud atom-hud-right">
        <div className="hud-tag">Emission spectrum</div>
        <div className="hud-spectrum">
          {HELIUM_LINES.filter((l) => !l.uv).map((l) => {
            const on = hud.seen.includes(l.nm);
            const left = ((l.nm - 380) / (720 - 380)) * 100;
            return (
              <span
                key={l.nm}
                className={`hud-line ${on ? 'on' : ''} ${hud.last === l.nm ? 'flash' : ''}`}
                style={{ left: `${left}%`, '--line': l.hex }}
                title={`${l.nm} nm`}
              />
            );
          })}
        </div>
        <div className="hud-axis">
          <span className={`hud-uv ${hud.seen.includes(58.4) ? 'on' : ''}`}>◂ 58.4 EUV</span>
          <span>700 nm</span>
        </div>
        <div className="hud-last" key={`${hud.last}-${hud.count}`}>
          {lastLine ? (
            <>
              <i style={{ background: lastLine.hex, boxShadow: `0 0 10px ${lastLine.hex}` }} />
              λ {lastLine.nm} nm {lastLine.uv ? '· extreme UV' : ''}
            </>
          ) : (
            <span className="hud-dim">no photons yet</span>
          )}
        </div>
        <div className="hud-fact">
          {hud.last === 587.6
            ? 'D₃ — the yellow line that revealed helium in the Sun, 1868.'
            : complete
              ? '✦ Spectrum complete. You found every line.'
              : `${visibleSeen.length} / ${HELIUM_LINES.length} lines observed`}
        </div>
      </div>
    </div>
  );
};

export default Interactive3DAtom;
