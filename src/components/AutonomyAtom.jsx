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
  inner: { id: 'inner', a: 110, b: 44, theta: -28, speed: 0.012 },
  outer: { id: 'outer', a: 160, b: 64, theta: 28, speed: -0.008 }
};

const electronConfigs = [
  { featureIdx: 0, shellId: 'inner', phase: 0 },
  { featureIdx: 1, shellId: 'inner', phase: Math.PI },
  { featureIdx: 2, shellId: 'outer', phase: 0 },
  { featureIdx: 3, shellId: 'outer', phase: (Math.PI * 2) / 3 },
  { featureIdx: 4, shellId: 'outer', phase: (Math.PI * 4) / 3 }
];

export const AutonomyAtom = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const wrapperRef = useRef(null);
  const atomCenterRef = useRef(null);
  const cardRefs = useRef([]);
  const electronRefs = useRef([]);
  const lineRefs = useRef([]);
  const innerLineRefs = useRef([]); // lines from electron to nucleus

  const [cardPositions, setCardPositions] = useState([]);
  const [atomCenter, setAtomCenter] = useState({ x: 0, y: 0 });

  // Keep track of base angle for each shell (inner, outer)
  const shellAnglesRef = useRef({ inner: 0, outer: 0 });
  const animationFrameId = useRef(null);

  // Measure card and atom positions relative to wrapper
  const updatePositions = () => {
    if (!wrapperRef.current) return;
    const wrapperRect = wrapperRef.current.getBoundingClientRect();

    // Measure cards
    const newPositions = cardRefs.current.map((card, idx) => {
      if (!card) return null;
      const cardRect = card.getBoundingClientRect();
      const isLeft = idx < 2; // Card 0, 1 on the left
      
      // Connection point is at the right edge for left cards, left edge for right cards
      const x = isLeft 
        ? cardRect.right - wrapperRect.left 
        : cardRect.left - wrapperRect.left;
      const y = cardRect.top + cardRect.height / 2 - wrapperRect.top;

      return { x, y, isLeft };
    });
    setCardPositions(newPositions);

    // Measure atom center
    if (atomCenterRef.current) {
      const atomRect = atomCenterRef.current.getBoundingClientRect();
      setAtomCenter({
        x: atomRect.left + atomRect.width / 2 - wrapperRect.left,
        y: atomRect.top + atomRect.height / 2 - wrapperRect.top,
      });
    }
  };

  useEffect(() => {
    updatePositions();
    window.addEventListener('resize', updatePositions);

    // Run again a couple of times as layouts render
    const t1 = setTimeout(updatePositions, 100);
    const t2 = setTimeout(updatePositions, 500);

    return () => {
      window.removeEventListener('resize', updatePositions);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      // Calculate speeds for each shell based on hovers
      let innerSpeed = shellConfigs.inner.speed;
      let outerSpeed = shellConfigs.outer.speed;

      if (hoveredIndex !== null) {
        const hoveredConfig = electronConfigs[hoveredIndex];
        if (hoveredConfig.shellId === 'inner') {
          innerSpeed *= 0.15;
          outerSpeed *= 0.6;
        } else {
          outerSpeed *= 0.15;
          innerSpeed *= 0.6;
        }
      }

      // Increment shell base angles
      shellAnglesRef.current.inner += innerSpeed;
      shellAnglesRef.current.outer += outerSpeed;

      // Position each electron
      electronConfigs.forEach((config) => {
        const idx = config.featureIdx;
        const shell = shellConfigs[config.shellId];
        const baseAngle = shellAnglesRef.current[config.shellId];
        const alpha = baseAngle + config.phase;
        
        const rad = (shell.theta * Math.PI) / 180;
        
        const xRaw = shell.a * Math.cos(alpha);
        const yRaw = shell.b * Math.sin(alpha);

        // Rotate coordinates by theta
        const x = xRaw * Math.cos(rad) - yRaw * Math.sin(rad);
        const y = xRaw * Math.sin(rad) + yRaw * Math.cos(rad);

        // Update electron DOM node style directly
        const electronEl = electronRefs.current[idx];
        if (electronEl) {
          electronEl.style.transform = `translate(${x}px, ${y}px)`;
        }

        // Draw connection lines
        const cardPos = cardPositions[idx];
        const lineEl = lineRefs.current[idx];
        const innerLineEl = innerLineRefs.current[idx];

        if (cardPos && lineEl && atomCenter.x > 0) {
          const elX = atomCenter.x + x;
          const elY = atomCenter.y + y;

          // D d-attribute for bezier curve card -> electron
          // We make a smooth horizontal S-curve
          const midX = (cardPos.x + elX) / 2;
          const d = `M ${cardPos.x} ${cardPos.y} C ${midX} ${cardPos.y}, ${midX} ${elY}, ${elX} ${elY}`;
          lineEl.setAttribute('d', d);

          // Connection electron -> nucleus
          if (innerLineEl) {
            const innerD = `M ${elX} ${elY} L ${atomCenter.x} ${atomCenter.y}`;
            innerLineEl.setAttribute('d', innerD);
          }
        }
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [cardPositions, atomCenter, hoveredIndex]);

  // Nucleus active state details
  const ActiveIcon = hoveredIndex !== null ? autonomyFeatures[hoveredIndex].icon : null;

  return (
    <div className="autonomy-interactive-section" ref={wrapperRef}>
      
      {/* Background SVG containing connection lines */}
      <svg className="autonomy-connection-svg">
        <defs>
          <linearGradient id="line-grad-active" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-secondary, #ff5e07)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="line-grad-dim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
          </linearGradient>
          <radialGradient id="nucleus-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="60%" stopColor="var(--accent-glow)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Draw lines from card to electron */}
        {autonomyFeatures.map((_, idx) => {
          const isActive = hoveredIndex === idx;
          const isDim = hoveredIndex !== null && !isActive;
          return (
            <path
              key={`line-${idx}`}
              ref={el => lineRefs.current[idx] = el}
              className={`connection-line-path ${isActive ? 'active' : ''} ${isDim ? 'dim' : ''}`}
              stroke={isActive ? 'var(--accent)' : 'var(--border)'}
              strokeWidth={isActive ? '2' : '1'}
              fill="none"
            />
          );
        })}

        {/* Draw lines from electron to nucleus (only active/hovered) */}
        {autonomyFeatures.map((_, idx) => {
          const isActive = hoveredIndex === idx;
          return (
            <path
              key={`inner-line-${idx}`}
              ref={el => innerLineRefs.current[idx] = el}
              className={`inner-line-path ${isActive ? 'active' : ''}`}
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeDasharray="4, 4"
              fill="none"
              style={{ opacity: isActive ? 0.6 : 0 }}
            />
          );
        })}
      </svg>

      <div className="autonomy-interactive-grid">
        
        {/* Left Column (Cards 0 and 1) */}
        <div className="autonomy-card-column left-column">
          {autonomyFeatures.slice(0, 2).map((feature, idx) => {
            const featureIdx = idx;
            const Icon = feature.icon;
            const isHovered = hoveredIndex === featureIdx;
            const isDim = hoveredIndex !== null && !isHovered;

            return (
              <div
                key={feature.title}
                ref={el => cardRefs.current[featureIdx] = el}
                className={`autonomy-feature-card ${isHovered ? 'active' : ''} ${isDim ? 'dim' : ''}`}
                onMouseEnter={() => setHoveredIndex(featureIdx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="card-border-glow" />
                <div className="card-header-row">
                  <div className="card-icon-wrapper">
                    <Icon size={18} />
                  </div>
                  <h3 className="card-title">{feature.title}</h3>
                </div>
                <p className="card-desc">{feature.description}</p>
                <div className="card-indicator-line" />
              </div>
            );
          })}
        </div>

        {/* Center Column (Helium Atom) */}
        <div className="autonomy-atom-column">
          <div className="atom-visualizer-container" ref={atomCenterRef}>
            
            {/* Nucleus in the center */}
            <div className={`atom-nucleus ${hoveredIndex !== null ? 'nucleus-active' : ''}`}>
              <div className="nucleus-glow-ring" />
              
              <AnimatePresence mode="wait">
                {hoveredIndex === null ? (
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
                    key={`active-nucleus-${hoveredIndex}`}
                    className="nucleus-active-state"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div className="active-icon-glow" />
                    <ActiveIcon size={24} className="active-nucleus-icon" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Orbit SVG Rings (2 principal shells following 2n^2 rule) */}
            <svg className="atom-orbits-svg" viewBox="0 0 400 400">
              {/* Inner Orbit (n=1) */}
              <ellipse
                cx="200"
                cy="200"
                rx={shellConfigs.inner.a}
                ry={shellConfigs.inner.b}
                transform={`rotate(${shellConfigs.inner.theta}, 200, 200)`}
                className={`orbit-ring-ellipse ${
                  hoveredIndex !== null && electronConfigs[hoveredIndex].shellId === 'inner' ? 'active' : ''
                } ${
                  hoveredIndex !== null && electronConfigs[hoveredIndex].shellId !== 'inner' ? 'dim' : ''
                }`}
              />
              {/* Outer Orbit (n=2) */}
              <ellipse
                cx="200"
                cy="200"
                rx={shellConfigs.outer.a}
                ry={shellConfigs.outer.b}
                transform={`rotate(${shellConfigs.outer.theta}, 200, 200)`}
                className={`orbit-ring-ellipse ${
                  hoveredIndex !== null && electronConfigs[hoveredIndex].shellId === 'outer' ? 'active' : ''
                } ${
                  hoveredIndex !== null && electronConfigs[hoveredIndex].shellId !== 'outer' ? 'dim' : ''
                }`}
              />
            </svg>

            {/* Electron Nodes */}
            {electronConfigs.map((config) => {
              const idx = config.featureIdx;
              const isActive = hoveredIndex === idx;
              const isDim = hoveredIndex !== null && !isActive;
              const FeatureIcon = autonomyFeatures[idx].icon;

              return (
                <div
                  key={`electron-${idx}`}
                  ref={el => electronRefs.current[idx] = el}
                  className={`electron-node ${isActive ? 'active' : ''} ${isDim ? 'dim' : ''}`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    position: 'absolute',
                    left: '200px',
                    top: '200px',
                    zIndex: isActive ? 10 : 5,
                  }}
                >
                  <div className="electron-core" />
                  <div className="electron-glow" />
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
          {autonomyFeatures.slice(2).map((feature, idx) => {
            const featureIdx = idx + 2; // Offset by 2
            const Icon = feature.icon;
            const isHovered = hoveredIndex === featureIdx;
            const isDim = hoveredIndex !== null && !isHovered;

            return (
              <div
                key={feature.title}
                ref={el => cardRefs.current[featureIdx] = el}
                className={`autonomy-feature-card ${isHovered ? 'active' : ''} ${isDim ? 'dim' : ''}`}
                onMouseEnter={() => setHoveredIndex(featureIdx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="card-border-glow" />
                <div className="card-header-row">
                  <div className="card-icon-wrapper">
                    <Icon size={18} />
                  </div>
                  <h3 className="card-title">{feature.title}</h3>
                </div>
                <p className="card-desc">{feature.description}</p>
                <div className="card-indicator-line" />
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
