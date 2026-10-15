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

// Principal shell orbits configuration (2n^2 rule: inner n=1 has 2, outer n=2 has 3)
const shellConfigs = {
  inner: { id: 'inner', label: 'K', a: 110, b: 44, theta: -28, speed: 0.012, wobble: 0 },
  outer: { id: 'outer', label: 'L', a: 160, b: 64, theta: 28, speed: -0.008, wobble: 2.1 },
};

const electronConfigs = [
  { featureIdx: 0, shellId: 'inner', phase: 0 },
  { featureIdx: 1, shellId: 'inner', phase: Math.PI },
  { featureIdx: 2, shellId: 'outer', phase: 0 },
  { featureIdx: 3, shellId: 'outer', phase: (Math.PI * 2) / 3 },
  { featureIdx: 4, shellId: 'outer', phase: (Math.PI * 4) / 3 },
];

const TRAIL_SPANS = [0.95, 0.6, 0.28];

// Point on a shell's ellipse (relative to the atom centre) at parametric angle alpha
const shellPoint = (shell, alpha, thetaDeg) => {
  const rad = (thetaDeg * Math.PI) / 180;
  const xRaw = shell.a * Math.cos(alpha);
  const yRaw = shell.b * Math.sin(alpha);
  return [xRaw * Math.cos(rad) - yRaw * Math.sin(rad), xRaw * Math.sin(rad) + yRaw * Math.cos(rad)];
};

export const AutonomyAtom = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const [surgeKey, setSurgeKey] = useState(0);
  const activeIndex = hoveredIndex ?? pinnedIndex;

  const wrapperRef = useRef(null);
  const atomCenterRef = useRef(null);
  const cardRefs = useRef([]);
  const electronRefs = useRef([]);
  const lineRefs = useRef([]);
  const innerLineRefs = useRef([]); // lines from electron to nucleus
  const packetRefs = useRef([]); // glowing data packets travelling along the active line
  const trailRefs = useRef([]);
  const ellipseRefs = useRef({});

  // Everything the animation loop reads lives in refs so the loop never restarts
  const layoutRef = useRef({ cards: [], center: { x: 0, y: 0 } });
  const activeRef = useRef(null);
  const surgeRef = useRef(0);

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  // Measure card and atom positions relative to wrapper
  useEffect(() => {
    const updatePositions = () => {
      if (!wrapperRef.current) return;
      const wrapperRect = wrapperRef.current.getBoundingClientRect();

      const cards = cardRefs.current.map((card, idx) => {
        if (!card) return null;
        // offsetLeft/Top ignore the hover tilt transform, so lines stay anchored
        const isLeft = idx < 2;
        let x = 0;
        let y = 0;
        let el = card;
        while (el && el !== wrapperRef.current) {
          x += el.offsetLeft;
          y += el.offsetTop;
          el = el.offsetParent;
        }
        return { x: isLeft ? x + card.offsetWidth : x, y: y + card.offsetHeight / 2 };
      });

      let center = layoutRef.current.center;
      if (atomCenterRef.current) {
        const atomRect = atomCenterRef.current.getBoundingClientRect();
        center = {
          x: atomRect.left + atomRect.width / 2 - wrapperRect.left,
          y: atomRect.top + atomRect.height / 2 - wrapperRect.top,
        };
      }
      layoutRef.current = { cards, center };
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    const t1 = setTimeout(updatePositions, 100);
    const t2 = setTimeout(updatePositions, 500);
    const t3 = setTimeout(updatePositions, 1200);

    return () => {
      window.removeEventListener('resize', updatePositions);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const shellAngles = { inner: 0, outer: 0 };
    const shellMul = { inner: 1, outer: 1 };
    let raf;
    let prev = performance.now();

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const k = Math.min(3, (now - prev) / 16.67);
      prev = now;
      const t = now / 1000;
      const active = activeRef.current;
      const activeShell = active !== null ? electronConfigs[active].shellId : null;

      surgeRef.current *= Math.pow(0.97, k);
      const surge = surgeRef.current;

      const thetas = {};
      Object.values(shellConfigs).forEach((shell) => {
        // Ease shell speed when a feature is focused instead of snapping
        const target = activeShell === null ? 1 : activeShell === shell.id ? 0.12 : 0.55;
        shellMul[shell.id] += (target - shellMul[shell.id]) * (1 - Math.pow(0.92, k));
        const mul = shellMul[shell.id] * (1 + surge * 7) * (reduceMotion ? 0.35 : 1);
        shellAngles[shell.id] += shell.speed * mul * k;

        // Shells slowly precess like a gyroscope
        const theta = shell.theta + (reduceMotion ? 0 : Math.sin(t * 0.22 + shell.wobble) * 9);
        thetas[shell.id] = theta;
        const ellipse = ellipseRefs.current[shell.id];
        if (ellipse) ellipse.setAttribute('transform', `rotate(${theta}, 200, 200)`);
      });

      const { cards, center } = layoutRef.current;

      electronConfigs.forEach((config) => {
        const idx = config.featureIdx;
        const shell = shellConfigs[config.shellId];
        const theta = thetas[config.shellId];
        const alpha = shellAngles[config.shellId] + config.phase;
        const [x, y] = shellPoint(shell, alpha, theta);

        // Fake depth: the lower half of each tilted orbit is in front of the nucleus
        const depth = Math.sin(alpha);
        const scale = 0.7 + 0.45 * ((depth + 1) / 2);

        const electronEl = electronRefs.current[idx];
        if (electronEl) {
          electronEl.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
          electronEl.style.zIndex = idx === active ? 20 : depth > 0 ? 12 : 4;
          electronEl.style.setProperty('--depth', ((depth + 1) / 2).toFixed(3));
        }

        // Comet tail: three stacked translucent arcs read as a fading gradient
        const dir = Math.sign(shell.speed);
        TRAIL_SPANS.forEach((span, j) => {
          const trail = trailRefs.current[idx * TRAIL_SPANS.length + j];
          if (!trail) return;
          let d = '';
          const steps = 10;
          for (let s = 0; s <= steps; s++) {
            const a = alpha - dir * span * (1 - s / steps);
            const [px, py] = shellPoint(shell, a, theta);
            d += `${s === 0 ? 'M' : 'L'} ${(200 + px).toFixed(1)} ${(200 + py).toFixed(1)} `;
          }
          trail.setAttribute('d', d);
        });

        // Connection lines
        const cardPos = cards[idx];
        const lineEl = lineRefs.current[idx];
        const innerLineEl = innerLineRefs.current[idx];
        if (!cardPos || !lineEl || center.x <= 0) return;

        const elX = center.x + x;
        const elY = center.y + y;
        const midX = (cardPos.x + elX) / 2;
        lineEl.setAttribute('d', `M ${cardPos.x} ${cardPos.y} C ${midX} ${cardPos.y}, ${midX} ${elY}, ${elX} ${elY}`);
        if (innerLineEl) innerLineEl.setAttribute('d', `M ${elX} ${elY} L ${center.x} ${center.y}`);

        // Data packets stream card -> electron -> nucleus while a feature is focused
        const packets = packetRefs.current[idx];
        if (!packets) return;
        packets.forEach((packet, j) => {
          if (!packet) return;
          if (idx !== active) {
            packet.setAttribute('opacity', '0');
            return;
          }
          const onInner = j === 2;
          const path = onInner ? innerLineEl : lineEl;
          const period = onInner ? 700 : 1500;
          const tt = ((now / period) + (onInner ? 0 : j * 0.5)) % 1;
          const len = path.getTotalLength();
          const pt = path.getPointAtLength(tt * len);
          packet.setAttribute('cx', pt.x);
          packet.setAttribute('cy', pt.y);
          packet.setAttribute('opacity', Math.sin(tt * Math.PI).toFixed(3));
        });
      });
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const surge = () => {
    surgeRef.current = 1;
    setSurgeKey((n) => n + 1);
  };

  const togglePin = (idx) => setPinnedIndex((p) => (p === idx ? null : idx));

  // Card spotlight + tilt follow the cursor (written straight to CSS variables, no re-render)
  const onCardMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    el.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
  };

  const onCardLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
    setHoveredIndex(null);
  };

  const ActiveIcon = activeIndex !== null ? autonomyFeatures[activeIndex].icon : null;

  const renderCard = (feature, featureIdx) => {
    const Icon = feature.icon;
    const isActive = activeIndex === featureIdx;
    const isDim = activeIndex !== null && !isActive;
    const shell = shellConfigs[electronConfigs[featureIdx].shellId];

    return (
      <div
        key={feature.title}
        ref={(el) => (cardRefs.current[featureIdx] = el)}
        className={`autonomy-feature-card ${isActive ? 'active' : ''} ${isDim ? 'dim' : ''} ${pinnedIndex === featureIdx ? 'pinned' : ''}`}
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
          <span className="card-shell-tag">
            e⁻{featureIdx + 1} · {shell.label}
          </span>
        </div>
        <p className="card-desc">{feature.description}</p>
        <div className="card-indicator-line" />
      </div>
    );
  };

  return (
    <div className="autonomy-interactive-section" ref={wrapperRef}>
      {/* Background SVG containing connection lines */}
      <svg className="autonomy-connection-svg">
        <defs>
          <radialGradient id="packet-grad">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {autonomyFeatures.map((_, idx) => {
          const isActive = activeIndex === idx;
          const isDim = activeIndex !== null && !isActive;
          return (
            <path
              key={`line-${idx}`}
              ref={(el) => (lineRefs.current[idx] = el)}
              className={`connection-line-path ${isActive ? 'active' : ''} ${isDim ? 'dim' : ''}`}
              fill="none"
            />
          );
        })}

        {autonomyFeatures.map((_, idx) => (
          <path
            key={`inner-line-${idx}`}
            ref={(el) => (innerLineRefs.current[idx] = el)}
            className={`inner-line-path ${activeIndex === idx ? 'active' : ''}`}
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="4, 4"
            fill="none"
            style={{ opacity: activeIndex === idx ? 0.6 : 0 }}
          />
        ))}

        {autonomyFeatures.map((_, idx) =>
          [0, 1, 2].map((j) => (
            <circle
              key={`packet-${idx}-${j}`}
              ref={(el) => {
                packetRefs.current[idx] = packetRefs.current[idx] || [];
                packetRefs.current[idx][j] = el;
              }}
              r={j === 2 ? 3.5 : 5}
              fill="url(#packet-grad)"
              opacity="0"
            />
          ))
        )}
      </svg>

      <div className="autonomy-interactive-grid">
        {/* Left Column (Cards 0 and 1) */}
        <div className="autonomy-card-column left-column">
          {autonomyFeatures.slice(0, 2).map((feature, idx) => renderCard(feature, idx))}
        </div>

        {/* Center Column (Helium Atom) */}
        <div className="autonomy-atom-column">
          <div className={`atom-visualizer-container ${activeIndex !== null ? 'has-active' : ''}`} ref={atomCenterRef}>
            <div className="atom-radar" aria-hidden="true" />

            {/* Nucleus in the center; click it to energise every shell */}
            <button
              type="button"
              className={`atom-nucleus ${activeIndex !== null ? 'nucleus-active' : ''}`}
              onClick={surge}
              aria-label="Energise the atom"
            >
              <div className="nucleus-glow-ring" />
              {surgeKey > 0 && <span key={`surge-${surgeKey}`} className="nucleus-shockwave surge" />}
              {activeIndex !== null && <span key={`shock-${activeIndex}`} className="nucleus-shockwave" />}

              <AnimatePresence mode="wait">
                {activeIndex === null ? (
                  <motion.div
                    key="he-nucleus"
                    className="nucleus-default-state"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Visual 3D-like protons and neutrons (5 protons to match 5 electrons/features) */}
                    <div className="nucleus-particle proton-1" />
                    <div className="nucleus-particle proton-2" />
                    <div className="nucleus-particle proton-3" />
                    <div className="nucleus-particle proton-4" />
                    <div className="nucleus-particle proton-5" />
                    <div className="nucleus-particle neutron-1" />
                    <div className="nucleus-particle neutron-2" />
                    <div className="nucleus-particle neutron-3" />
                    <div className="nucleus-particle neutron-4" />
                    <div className="nucleus-particle neutron-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`active-nucleus-${activeIndex}`}
                    className="nucleus-active-state"
                    initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div className="active-icon-glow" />
                    <ActiveIcon size={24} className="active-nucleus-icon" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Orbit SVG Rings (2 principal shells following 2n^2 rule) + electron trails */}
            <svg className="atom-orbits-svg" viewBox="0 0 400 400">
              {Object.values(shellConfigs).map((shell) => {
                const isActive = activeIndex !== null && electronConfigs[activeIndex].shellId === shell.id;
                const isDim = activeIndex !== null && !isActive;
                return (
                  <ellipse
                    key={shell.id}
                    ref={(el) => (ellipseRefs.current[shell.id] = el)}
                    cx="200"
                    cy="200"
                    rx={shell.a}
                    ry={shell.b}
                    transform={`rotate(${shell.theta}, 200, 200)`}
                    className={`orbit-ring-ellipse ${isActive ? 'active' : ''} ${isDim ? 'dim' : ''}`}
                  />
                );
              })}
              {electronConfigs.map(({ featureIdx }) =>
                TRAIL_SPANS.map((_, j) => (
                  <path
                    key={`trail-${featureIdx}-${j}`}
                    ref={(el) => (trailRefs.current[featureIdx * TRAIL_SPANS.length + j] = el)}
                    className={`electron-trail ${activeIndex === featureIdx ? 'active' : ''} ${
                      activeIndex !== null && activeIndex !== featureIdx ? 'dim' : ''
                    }`}
                    strokeWidth={1 + j * 1.3}
                  />
                ))
              )}
            </svg>

            {/* Electron Nodes */}
            {electronConfigs.map((config) => {
              const idx = config.featureIdx;
              const isActive = activeIndex === idx;
              const isDim = activeIndex !== null && !isActive;
              const FeatureIcon = autonomyFeatures[idx].icon;

              return (
                <div
                  key={`electron-${idx}`}
                  ref={(el) => (electronRefs.current[idx] = el)}
                  className={`electron-node ${isActive ? 'active' : ''} ${isDim ? 'dim' : ''}`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => togglePin(idx)}
                  style={{ position: 'absolute', left: '200px', top: '200px' }}
                >
                  <div className="electron-core" />
                  <div className="electron-glow" />
                  {isActive && <span className="electron-lock-ring" />}
                  {isActive && (
                    <div className="electron-hover-label">
                      <FeatureIcon size={10} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (Cards 2, 3, 4) */}
        <div className="autonomy-card-column right-column">
          {autonomyFeatures.slice(2).map((feature, idx) => renderCard(feature, idx + 2))}
        </div>
      </div>
    </div>
  );
};
