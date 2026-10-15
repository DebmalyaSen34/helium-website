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

// The atom is drawn in a 400x400 viewBox and scaled to fit its container
const VIEW = 400;
const C = VIEW / 2;

// One tilted orbit per feature, fanned out evenly like the classic atom mark.
// a/b are the ellipse radii (b/a sets the apparent tilt), theta the in-plane rotation.
const orbits = [
  { a: 118, b: 40, theta: -72, speed: 0.016, phase: 0.4 },
  { a: 134, b: 44, theta: -36, speed: -0.013, phase: 2.1 },
  { a: 150, b: 48, theta: 0, speed: 0.011, phase: 4.0 },
  { a: 166, b: 52, theta: 36, speed: -0.0095, phase: 1.2 },
  { a: 180, b: 56, theta: 72, speed: 0.0082, phase: 5.3 },
];

const TRAIL_SPANS = [0.9, 0.55, 0.25];

// Helium-4 nucleus: 2 protons + 2 neutrons on the corners of a tetrahedron
const NUCLEONS = [
  { kind: 'proton', v: [1, 1, 1] },
  { kind: 'proton', v: [-1, -1, 1] },
  { kind: 'neutron', v: [1, -1, -1] },
  { kind: 'neutron', v: [-1, 1, -1] },
];
const NUCLEON_SPREAD = 5.2;

const rotatePoint = (x, y, thetaDeg) => {
  const r = (thetaDeg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
};

// Point on an orbit (relative to the centre) at parametric angle alpha
const orbitPoint = (orbit, alpha, theta) =>
  rotatePoint(orbit.a * Math.cos(alpha), orbit.b * Math.sin(alpha), theta);

// SVG path for half an orbit: the back half sits behind the nucleus, the front half over it
const halfOrbitPath = (orbit, front) => {
  const sweep = front ? 1 : 0;
  const [x1, y1] = [C + orbit.a, C];
  const [x2, y2] = [C - orbit.a, C];
  return `M ${x1} ${y1} A ${orbit.a} ${orbit.b} 0 0 ${sweep} ${x2} ${y2}`;
};

export const AutonomyAtom = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const [surgeKey, setSurgeKey] = useState(0);
  const activeIndex = hoveredIndex ?? pinnedIndex;

  const wrapperRef = useRef(null);
  const atomRef = useRef(null);
  const cardRefs = useRef([]);
  const lineRefs = useRef([]);
  const innerLineRefs = useRef([]);
  const packetRefs = useRef([]);
  const orbitGroupRefs = useRef([]);
  const frontOrbitGroupRefs = useRef([]);
  const electronRefs = useRef([]);
  const trailRefs = useRef([]);
  const backLayerRef = useRef(null);
  const frontLayerRef = useRef(null);
  const nucleonRefs = useRef([]);
  const nucleonLayerRef = useRef(null);

  // Everything the animation loop reads lives in refs so the loop never restarts
  const layoutRef = useRef({ cards: [], center: { x: 0, y: 0 }, scale: 1, ready: false });
  const activeRef = useRef(null);
  const surgeRef = useRef(0);

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  // Measure card anchors and the atom centre relative to the wrapper
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
        return { x: idx < 2 ? x + card.offsetWidth : x, y: y + card.offsetHeight / 2 };
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
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapper);
    cardRefs.current.forEach((card) => card && ro.observe(card));
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const angles = orbits.map((o) => o.phase);
    const speedMul = orbits.map(() => 1);
    const inFront = orbits.map(() => null);
    let nucleonOrder = '';
    let raf;
    let prev = performance.now();

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const k = Math.min(3, (now - prev) / 16.67);
      prev = now;
      const t = now / 1000;
      const active = activeRef.current;

      surgeRef.current *= Math.pow(0.965, k);
      const surge = surgeRef.current;

      const { cards, center, scale, ready } = layoutRef.current;

      orbits.forEach((orbit, idx) => {
        // Ease speed when a feature is focused instead of snapping
        const target = active === null ? 1 : active === idx ? 0.15 : 0.5;
        speedMul[idx] += (target - speedMul[idx]) * (1 - Math.pow(0.92, k));
        const mul = speedMul[idx] * (1 + surge * 6) * (reduceMotion ? 0.3 : 1);
        angles[idx] += orbit.speed * mul * k;
        const alpha = angles[idx];

        // Each orbit precesses gently so the atom never looks static
        const theta = orbit.theta + (reduceMotion ? 0 : Math.sin(t * 0.18 + idx * 1.3) * 5);
        const rot = `rotate(${theta.toFixed(2)} ${C} ${C})`;
        orbitGroupRefs.current[idx]?.setAttribute('transform', rot);
        frontOrbitGroupRefs.current[idx]?.setAttribute('transform', rot);

        const [x, y] = orbitPoint(orbit, alpha, theta);
        // sin(alpha) > 0 is the half of the ellipse that faces the viewer
        const depth = (Math.sin(alpha) + 1) / 2;
        const s = 0.72 + 0.4 * depth;

        const electron = electronRefs.current[idx];
        if (electron) {
          electron.setAttribute('transform', `translate(${(C + x).toFixed(2)} ${(C + y).toFixed(2)}) scale(${s.toFixed(3)})`);
          electron.style.setProperty('--depth', depth.toFixed(3));

          // Move the electron between the layers behind and in front of the nucleus
          const front = Math.sin(alpha) > 0;
          if (front !== inFront[idx]) {
            inFront[idx] = front;
            const layer = front ? frontLayerRef.current : backLayerRef.current;
            layer?.appendChild(electron);
          }
        }

        // Comet tail: stacked translucent arcs read as a fading gradient
        const dir = Math.sign(orbit.speed);
        TRAIL_SPANS.forEach((span, j) => {
          const trail = trailRefs.current[idx * TRAIL_SPANS.length + j];
          if (!trail) return;
          let d = '';
          const steps = 12;
          for (let st = 0; st <= steps; st++) {
            const a = alpha - dir * span * (1 - st / steps);
            const [px, py] = orbitPoint(orbit, a, theta);
            d += `${st === 0 ? 'M' : 'L'}${(C + px).toFixed(1)} ${(C + py).toFixed(1)} `;
          }
          trail.setAttribute('d', d);
        });

        // Connection lines from the card to its electron and on into the nucleus
        const cardPos = cards[idx];
        const lineEl = lineRefs.current[idx];
        const innerLineEl = innerLineRefs.current[idx];
        if (!ready || !cardPos || !lineEl) return;

        const elX = center.x + x * scale;
        const elY = center.y + y * scale;
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
          const tt = (now / period + (onInner ? 0 : j * 0.5)) % 1;
          const pt = path.getPointAtLength(tt * path.getTotalLength());
          packet.setAttribute('cx', pt.x);
          packet.setAttribute('cy', pt.y);
          packet.setAttribute('opacity', Math.sin(tt * Math.PI).toFixed(3));
        });
      });

      // Spin the He-4 nucleus as a little 3D tetrahedron, painter-sorted by depth
      const ry = reduceMotion ? 0.6 : t * 0.9 * (1 + surge * 4);
      const rx = reduceMotion ? 0.4 : 0.5 + Math.sin(t * 0.6) * 0.4;
      const projected = NUCLEONS.map(({ v }, i) => {
        const [vx, vy, vz] = v;
        const x1 = vx * Math.cos(ry) + vz * Math.sin(ry);
        const z1 = -vx * Math.sin(ry) + vz * Math.cos(ry);
        const y2 = vy * Math.cos(rx) - z1 * Math.sin(rx);
        const z2 = vy * Math.sin(rx) + z1 * Math.cos(rx);
        const jiggle = reduceMotion ? 0 : Math.sin(t * 7 + i * 2) * 0.25 * (1 + surge * 3);
        return { i, x: x1 * NUCLEON_SPREAD + jiggle, y: y2 * NUCLEON_SPREAD - jiggle, z: z2 };
      });
      projected.forEach(({ i, x, y, z }) => {
        const node = nucleonRefs.current[i];
        if (!node) return;
        node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(1 + z * 0.08).toFixed(3)})`);
      });
      const order = projected
        .sort((p, q) => p.z - q.z)
        .map((p) => p.i)
        .join('');
      if (order !== nucleonOrder && nucleonLayerRef.current) {
        nucleonOrder = order;
        projected.forEach(({ i }) => nucleonLayerRef.current.appendChild(nucleonRefs.current[i]));
      }
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
    el.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
  };

  const onCardLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
    setHoveredIndex(null);
  };

  const ActiveIcon = activeIndex !== null ? autonomyFeatures[activeIndex].icon : null;
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
          <span className="card-shell-tag">e⁻ 0{featureIdx + 1}</span>
        </div>
        <p className="card-desc">{feature.description}</p>
      </div>
    );
  };

  return (
    <div className="autonomy-interactive-section" ref={wrapperRef}>
      {/* Connection lines between the cards and their electrons (desktop only) */}
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

        {autonomyFeatures.map((_, idx) => (
          <path
            key={`inner-line-${idx}`}
            ref={(el) => (innerLineRefs.current[idx] = el)}
            className={`inner-line-path ${activeIndex === idx ? 'active' : ''}`}
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
        <div className="autonomy-card-column left-column">
          {autonomyFeatures.slice(0, 2).map((feature, idx) => renderCard(feature, idx))}
        </div>

        <div className="autonomy-atom-column">
          <div
            className={`atom-visualizer-container ${activeIndex !== null ? 'has-active' : ''}`}
            ref={atomRef}
          >
            {/* Back layer: far halves of the orbits, the electron cloud and electrons behind the nucleus */}
            <svg className="atom-layer atom-layer-back" viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true">
              <defs>
                <radialGradient id="he-cloud" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.16" />
                  <stop offset="45%" stopColor="#00f2ff" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="electron-core" cx="38%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fffbe0" />
                  <stop offset="45%" stopColor="#ffd84d" />
                  <stop offset="100%" stopColor="#c89400" />
                </radialGradient>
                <radialGradient id="electron-halo">
                  <stop offset="0%" stopColor="#ffd84d" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#ffd84d" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle className="atom-cloud" cx={C} cy={C} r="120" fill="url(#he-cloud)" />
              <circle className="atom-range" cx={C} cy={C} r="190" />
              <circle className="atom-range" cx={C} cy={C} r="140" />

              {orbits.map((orbit, idx) => (
                <g key={`ob-${idx}`} ref={(el) => (orbitGroupRefs.current[idx] = el)}>
                  <path d={halfOrbitPath(orbit, false)} className={`orbit-ring back ${stateClass(idx)}`} />
                </g>
              ))}

              {orbits.map((_, idx) =>
                TRAIL_SPANS.map((__, j) => (
                  <path
                    key={`trail-${idx}-${j}`}
                    ref={(el) => (trailRefs.current[idx * TRAIL_SPANS.length + j] = el)}
                    className={`electron-trail ${stateClass(idx)}`}
                    strokeWidth={1 + j * 1.2}
                  />
                ))
              )}

              <g ref={backLayerRef}>
                {orbits.map((_, idx) => (
                  <g
                    key={`electron-${idx}`}
                    ref={(el) => (electronRefs.current[idx] = el)}
                    className={`electron ${stateClass(idx)}`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => togglePin(idx)}
                  >
                    <circle className="electron-hit" r="14" />
                    <circle className="electron-halo" r="12" fill="url(#electron-halo)" />
                    <circle className="electron-lock" r="11" />
                    <circle className="electron-body" r="5" fill="url(#electron-core)" />
                  </g>
                ))}
              </g>
            </svg>

            {/* Nucleus: a real helium-4 nucleus. Click it to energise every orbit */}
            <button
              type="button"
              className={`atom-nucleus ${activeIndex !== null ? 'nucleus-active' : ''}`}
              onClick={surge}
              aria-label="Energise the helium atom"
            >
              <span className="nucleus-glow-ring" />
              {surgeKey > 0 && <span key={`surge-${surgeKey}`} className="nucleus-shockwave surge" />}
              {activeIndex !== null && <span key={`shock-${activeIndex}`} className="nucleus-shockwave" />}

              <svg
                className={`nucleus-particles ${activeIndex !== null ? 'hidden' : ''}`}
                viewBox="-20 -20 40 40"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="proton-grad" cx="35%" cy="32%" r="70%">
                    <stop offset="0%" stopColor="#d6fbff" />
                    <stop offset="45%" stopColor="#00f2ff" />
                    <stop offset="100%" stopColor="#007a85" />
                  </radialGradient>
                  <radialGradient id="neutron-grad" cx="35%" cy="32%" r="70%">
                    <stop offset="0%" stopColor="#ffe0cc" />
                    <stop offset="45%" stopColor="#ff7a2e" />
                    <stop offset="100%" stopColor="#8a2c00" />
                  </radialGradient>
                </defs>
                <g ref={nucleonLayerRef}>
                  {NUCLEONS.map((n, i) => (
                    <g key={i} ref={(el) => (nucleonRefs.current[i] = el)}>
                      <circle r="5.6" fill={`url(#${n.kind}-grad)`} />
                    </g>
                  ))}
                </g>
              </svg>

              <AnimatePresence>
                {ActiveIcon && (
                  <motion.span
                    key={`active-nucleus-${activeIndex}`}
                    className="nucleus-active-state"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  >
                    <ActiveIcon size={22} className="active-nucleus-icon" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Front layer: near halves of the orbits and electrons passing in front of the nucleus */}
            <svg className="atom-layer atom-layer-front" viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true">
              {orbits.map((orbit, idx) => (
                <g key={`of-${idx}`} ref={(el) => (frontOrbitGroupRefs.current[idx] = el)}>
                  <path d={halfOrbitPath(orbit, true)} className={`orbit-ring front ${stateClass(idx)}`} />
                </g>
              ))}
              <g ref={frontLayerRef} />
            </svg>
          </div>
        </div>

        <div className="autonomy-card-column right-column">
          {autonomyFeatures.slice(2).map((feature, idx) => renderCard(feature, idx + 2))}
        </div>
      </div>
    </div>
  );
};
