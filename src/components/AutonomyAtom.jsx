import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBolt,
  FaTerminal,
  FaBrain,
  FaMemory,
  FaLock,
} from 'react-icons/fa';

const autonomyFeatures = [
  {
    icon: FaBolt,
    title: 'Fully Local',
    description: 'Run everything on your own hardware. No cloud dependency, no latency.',
  },
  {
    icon: FaTerminal,
    title: 'Coding Workflow',
    description: 'Deeply integrated with your IDE and shell for seamless refactoring.',
  },
  {
    icon: FaBrain,
    title: 'Deep Research',
    description: 'Autonomous agents capable of scouring documentation and codebases.',
  },
  {
    icon: FaMemory,
    title: 'Persistent Memory',
    description: 'Helium remembers your project context, conventions, and history.',
  },
  {
    icon: FaLock,
    title: 'Privacy First',
    description: 'Your data never leaves your machine. Local-first architecture by design.',
  },
];

// The atom is simulated in a 400x400 space and scaled to the canvas size
const VIEW = 400;
const C = VIEW / 2;
const PARTICLES = 2600;

// Helium ground state (1s²): each electron's radial probability is
// P(r) ∝ r² · e^(−2·Z_eff·r / a₀), with Z_eff ≈ 1.69 from electron screening.
// That is a Gamma(3) distribution, so r is the sum of three exponential draws.
const Z_EFF = 1.69;
const A0 = 72; // Bohr radius in view units; puts 99% of the density inside ~180 units
const sample1s = () => {
  const r = (-Math.log(Math.random()) - Math.log(Math.random()) - Math.log(Math.random())) * (A0 / (2 * Z_EFF));
  // Uniform direction on the sphere (s orbitals are spherically symmetric)
  const cosT = Math.random() * 2 - 1;
  const sinT = Math.sqrt(1 - cosT * cosT);
  const phi = Math.random() * Math.PI * 2;
  return [r * sinT * Math.cos(phi), r * sinT * Math.sin(phi), r * cosT];
};

// Rasterise an icon's <svg> and sample PARTICLES points from its filled pixels
const ICON_BOX = 230;
const sampleIcon = (svgEl) =>
  new Promise((resolve) => {
    let markup = new XMLSerializer().serializeToString(svgEl).replace(/currentColor/g, '#fff');
    if (!/^<svg[^>]*\sxmlns=/.test(markup)) markup = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    const img = new Image();
    img.onload = () => {
      const size = 160;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const filled = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (data[(y * size + x) * 4 + 3] > 128) filled.push(x, y);
        }
      }
      const pts = new Float32Array(PARTICLES * 2);
      const count = filled.length / 2;
      for (let i = 0; i < PARTICLES; i++) {
        const j = Math.floor(Math.random() * count) * 2;
        // Jitter within the pixel so the shape is smooth rather than gridded
        pts[i * 2] = C + ((filled[j] + Math.random()) / size - 0.5) * ICON_BOX;
        pts[i * 2 + 1] = C + ((filled[j + 1] + Math.random()) / size - 0.5) * ICON_BOX;
      }
      resolve(count > 0 ? pts : null);
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });

export const AutonomyAtom = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const activeIndex = hoveredIndex ?? pinnedIndex;

  const wrapperRef = useRef(null);
  const atomRef = useRef(null);
  const canvasRef = useRef(null);
  const iconSourceRefs = useRef([]);
  const cardRefs = useRef([]);
  const lineRefs = useRef([]);
  const packetRefs = useRef([]);

  // Everything the animation loop reads lives in refs so the loop never restarts
  const layoutRef = useRef({ cards: [], center: { x: 0, y: 0 }, scale: 1, ready: false });
  const activeRef = useRef(null);
  const iconPointsRef = useRef([]);

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  // Pre-sample each feature icon's silhouette once
  useEffect(() => {
    let cancelled = false;
    Promise.all(iconSourceRefs.current.map((span) => {
      const svg = span?.querySelector('svg');
      return svg ? sampleIcon(svg) : null;
    })).then((sets) => {
      if (!cancelled) iconPointsRef.current = sets;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Measure card anchors and the atom centre relative to the wrapper; size the canvas
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const measure = () => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const cards = cardRefs.current.map((card, idx) => {
        if (!card) return null;
        // offsetLeft/Top ignore the hover tilt transform, so lines stay anchored
        let x = 0;
        let y = 0;
        let el = card;
        while (el && el !== wrapper) {
          x += el.offsetLeft;
          y += el.offsetTop;
          el = el.offsetParent;
        }
        return { x: idx < 2 ? x + card.offsetWidth : x, y: y + card.offsetHeight / 2, left: idx < 2 };
      });

      const atomRect = atomRef.current?.getBoundingClientRect();
      if (!atomRect || atomRect.width === 0) return;
      layoutRef.current = {
        cards,
        center: {
          x: atomRect.left + atomRect.width / 2 - wrapperRect.left,
          y: atomRect.top + atomRect.height / 2 - wrapperRect.top,
        },
        scale: atomRect.width / VIEW,
        ready: true,
      };

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(atomRect.width * dpr);
        canvas.height = Math.round(atomRect.height * dpr);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapper);
    if (atomRef.current) ro.observe(atomRef.current);
    cardRefs.current.forEach((card) => card && ro.observe(card));
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Per-particle state
    const cloud = new Float32Array(PARTICLES * 3); // sampled 1s position (3D)
    const life = new Float32Array(PARTICLES); // 0..1, particle fades in and out over its life
    const lifeRate = new Float32Array(PARTICLES);
    const pos = new Float32Array(PARTICLES * 2); // icon-space position, eases toward its target
    const mix = new Float32Array(PARTICLES); // 0 = cloud, 1 = icon
    const rate = new Float32Array(PARTICLES); // per-particle easing speed, so the morph swarms
    for (let i = 0; i < PARTICLES; i++) {
      const [x, y, z] = sample1s();
      cloud.set([x, y, z], i * 3);
      life[i] = Math.random();
      lifeRate[i] = 0.004 + Math.random() * 0.01;
      pos[i * 2] = C + x;
      pos[i * 2 + 1] = C + y;
      rate[i] = 0.035 + Math.random() * 0.07;
    }

    // Occasional "measurement": one sample flashes where an electron was found
    const flashes = [];
    let nextFlash = 0;

    let raf;
    let running = true;
    let prev = performance.now();
    let spin = 0;

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const k = Math.min(3, (now - prev) / 16.67);
      prev = now;
      const t = now / 1000;
      const active = activeRef.current;
      const targets = active !== null ? iconPointsRef.current[active] : null;

      const w = canvas.width;
      const h = canvas.height;
      const s = w / VIEW;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(s, 0, 0, s, 0, 0);

      // Soft glow under the densest part of the cloud
      const glowR = targets ? 160 : 140;
      const glow = ctx.createRadialGradient(C, C, 0, C, C, glowR);
      glow.addColorStop(0, targets ? 'rgba(0, 242, 255, 0.10)' : 'rgba(0, 242, 255, 0.14)');
      glow.addColorStop(1, 'rgba(0, 242, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, VIEW, VIEW);

      spin += (reduceMotion ? 0 : 0.0025) * k;
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);
      const tilt = 0.35;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#00f2ff';

      for (let i = 0; i < PARTICLES; i++) {
        // Particles live briefly and are re-sampled, so the cloud shimmers like
        // repeated position measurements of the same probability density
        life[i] += lifeRate[i] * k * (reduceMotion ? 0.3 : 1);
        if (life[i] >= 1) {
          life[i] = 0;
          const [x, y, z] = sample1s();
          cloud[i * 3] = x;
          cloud[i * 3 + 1] = y;
          cloud[i * 3 + 2] = z;
        }

        // Rotate the 3D sample slightly so depth reads through brightness
        const cx = cloud[i * 3];
        const cy = cloud[i * 3 + 1];
        const cz = cloud[i * 3 + 2];
        const x1 = cx * cosS + cz * sinS;
        const z1 = -cx * sinS + cz * cosS;
        const y2 = cy * cosT - z1 * sinT;
        const z2 = cy * sinT + z1 * cosT;
        const cloudX = C + x1;
        const cloudY = C + y2;

        const e = 1 - Math.pow(1 - rate[i], k);
        mix[i] += ((targets ? 1 : 0) - mix[i]) * e;
        if (targets) {
          pos[i * 2] += (targets[i * 2] - pos[i * 2]) * e;
          pos[i * 2 + 1] += (targets[i * 2 + 1] - pos[i * 2 + 1]) * e;
        } else {
          // Idle icon positions follow the cloud so the next morph starts from it
          pos[i * 2] += (cloudX - pos[i * 2]) * e;
          pos[i * 2 + 1] += (cloudY - pos[i * 2 + 1]) * e;
        }

        const m = mix[i];
        const jitter = m * (reduceMotion ? 0 : 0.6);
        const x = cloudX + (pos[i * 2] - cloudX) * m + (Math.random() - 0.5) * jitter;
        const y = cloudY + (pos[i * 2 + 1] - cloudY) * m + (Math.random() - 0.5) * jitter;

        const fade = Math.sin(life[i] * Math.PI);
        const depth = 0.55 + 0.45 * ((z2 / 180 + 1) / 2);
        const alpha = (0.5 + 0.35 * m) * (fade * (1 - m) + m) * (depth * (1 - m) + m);
        const size = 1.3 + 0.3 * m;
        ctx.globalAlpha = alpha;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }

      // Measurement flashes (idle only): an electron is "found" at a sampled point
      if (!targets && !reduceMotion && now > nextFlash) {
        const [fx, fy] = sample1s();
        flashes.push({ x: C + fx, y: C + fy, born: now });
        nextFlash = now + 450 + Math.random() * 700;
      }
      for (let f = flashes.length - 1; f >= 0; f--) {
        const age = (now - flashes[f].born) / 900;
        if (age >= 1) {
          flashes.splice(f, 1);
          continue;
        }
        const r = 2 + age * 9;
        const g = ctx.createRadialGradient(flashes[f].x, flashes[f].y, 0, flashes[f].x, flashes[f].y, r);
        g.addColorStop(0, `rgba(255, 220, 90, ${0.9 * (1 - age)})`);
        g.addColorStop(1, 'rgba(255, 220, 90, 0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(flashes[f].x, flashes[f].y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nucleus: ~1/100,000 the size of the atom, so just a bright point
      ctx.globalCompositeOperation = 'source-over';
      const nucleusAlpha = targets ? 0.25 : 1;
      const pulse = reduceMotion ? 1 : 1 + Math.sin(t * 3) * 0.15;
      const ng = ctx.createRadialGradient(C, C, 0, C, C, 9 * pulse);
      ng.addColorStop(0, `rgba(255, 255, 255, ${nucleusAlpha})`);
      ng.addColorStop(0.3, `rgba(255, 140, 70, ${0.8 * nucleusAlpha})`);
      ng.addColorStop(1, 'rgba(255, 94, 7, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(C, C, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Connection line from the active card into the side of the cloud
      const { cards, center, scale, ready } = layoutRef.current;
      lineRefs.current.forEach((lineEl, idx) => {
        const cardPos = cards[idx];
        if (!ready || !cardPos || !lineEl) return;
        const endX = center.x + (cardPos.left ? -1 : 1) * 150 * scale;
        const endY = center.y + (cardPos.y - center.y) * 0.35;
        const midX = (cardPos.x + endX) / 2;
        lineEl.setAttribute('d', `M ${cardPos.x} ${cardPos.y} C ${midX} ${cardPos.y}, ${midX} ${endY}, ${endX} ${endY}`);

        const packets = packetRefs.current[idx];
        if (!packets) return;
        packets.forEach((packet, j) => {
          if (!packet) return;
          if (idx !== active) {
            packet.setAttribute('opacity', '0');
            return;
          }
          const tt = (now / 1500 + j * 0.5) % 1;
          const pt = lineEl.getPointAtLength(tt * lineEl.getTotalLength());
          packet.setAttribute('cx', pt.x);
          packet.setAttribute('cy', pt.y);
          packet.setAttribute('opacity', Math.sin(tt * Math.PI).toFixed(3));
        });
      });
    };

    const start = () => {
      if (running) return;
      running = true;
      prev = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Only animate while the atom is on screen
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(canvas);
    raf = requestAnimationFrame(draw);

    return () => {
      io.disconnect();
      stop();
    };
  }, []);

  const togglePin = (idx) => setPinnedIndex((p) => (p === idx ? null : idx));

  // Card spotlight + tilt follow the cursor (written straight to CSS variables, no re-render)
  const onCardMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    el.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
  };

  const onCardLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
    setHoveredIndex(null);
  };

  const stateClass = (idx) =>
    activeIndex === idx ? 'active' : activeIndex !== null ? 'dim' : '';

  const renderCard = (feature, featureIdx) => {
    const Icon = feature.icon;

    return (
      <div
        key={feature.title}
        ref={(el) => (cardRefs.current[featureIdx] = el)}
        className={`autonomy-feature-card ${stateClass(featureIdx)} ${pinnedIndex === featureIdx ? 'pinned' : ''}`}
        role="button"
        tabIndex={0}
        aria-pressed={pinnedIndex === featureIdx}
        onMouseEnter={() => setHoveredIndex(featureIdx)}
        onMouseMove={onCardMove}
        onMouseLeave={onCardLeave}
        onFocus={() => setHoveredIndex(featureIdx)}
        onBlur={() => setHoveredIndex(null)}
        onClick={() => togglePin(featureIdx)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePin(featureIdx);
          } else if (e.key === 'Escape') setPinnedIndex(null);
        }}
      >
        <div className="card-spotlight" />
        <div className="card-header-row">
          <div className="card-icon-wrapper">
            <Icon size={18} />
          </div>
          <h3 className="card-title">{feature.title}</h3>
        </div>
        <p className="card-desc">{feature.description}</p>
      </div>
    );
  };

  return (
    <div className="autonomy-interactive-section" ref={wrapperRef}>
      {/* Connection lines between the cards and the atom (desktop only) */}
      <svg className="autonomy-connection-svg" aria-hidden="true">
        <defs>
          <radialGradient id="packet-grad">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {autonomyFeatures.map((_, idx) => (
          <path
            key={`line-${idx}`}
            ref={(el) => (lineRefs.current[idx] = el)}
            className={`connection-line-path ${stateClass(idx)}`}
          />
        ))}

        {autonomyFeatures.map((_, idx) =>
          [0, 1].map((j) => (
            <circle
              key={`packet-${idx}-${j}`}
              ref={(el) => {
                packetRefs.current[idx] = packetRefs.current[idx] || [];
                packetRefs.current[idx][j] = el;
              }}
              r="5"
              fill="url(#packet-grad)"
              opacity="0"
            />
          ))
        )}
      </svg>

      <div className="autonomy-interactive-grid">
        <div className="autonomy-card-column left-column">
          {autonomyFeatures.slice(0, 2).map((feature, idx) => renderCard(feature, idx))}
        </div>

        <div className="autonomy-atom-column">
          <div
            className={`atom-visualizer-container ${activeIndex !== null ? 'has-active' : ''}`}
            ref={atomRef}
            onClick={() => setPinnedIndex(null)}
          >
            <canvas
              ref={canvasRef}
              className="atom-cloud-canvas"
              role="img"
              aria-label="Helium atom: the 1s² electron probability cloud around a helium-4 nucleus"
            />
          </div>

          <div className="atom-caption" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activeIndex ?? 'ground'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {activeIndex === null ? (
                  <>
                    He 1s²<span className="atom-caption-dim"> · electron probability density</span>
                  </>
                ) : (
                  <>
                    <span className="atom-caption-dim">collapsed to </span>
                    {autonomyFeatures[activeIndex].title}
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Hidden full-size icons, rasterised once to get the morph targets */}
          <div className="atom-icon-sources" aria-hidden="true">
            {autonomyFeatures.map(({ icon: Icon, title }, idx) => (
              <span key={title} ref={(el) => (iconSourceRefs.current[idx] = el)}>
                <Icon size={256} />
              </span>
            ))}
          </div>
        </div>

        <div className="autonomy-card-column right-column">
          {autonomyFeatures.slice(2).map((feature, idx) => renderCard(feature, idx + 2))}
        </div>
      </div>
    </div>
  );
};
