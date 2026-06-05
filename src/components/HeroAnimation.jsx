import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import Interactive3DAtom from './Interactive3DAtom';

// Generate particles for the blast — tight, fast, heavy
const generateBlastParticles = (count = 80) => {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const velocity = 400 + Math.random() * 800;
    const size = 1.5 + Math.random() * 3;
    const lifetime = 2000 + Math.random() * 3000;
    particles.push({
      id: i,
      angle,
      velocity,
      size,
      lifetime,
      delay: Math.random() * 0.06,
      opacity: 0.6 + Math.random() * 0.4,
    });
  }
  return particles;
};

const BLAST_PARTICLES = generateBlastParticles(70);

const HeroAnimation = () => {
  const [phase, setPhase] = useState('idle'); // idle -> approach -> collision -> merged
  const [showText, setShowText] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('approach'), 300);
    const t2 = setTimeout(() => setPhase('collision'), 1400);
    const t3 = setTimeout(() => {
      setShowParticles(true);
      setPhase('merged');
    }, 1480);
    const t4 = setTimeout(() => setShowText(true), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // Canvas particle system for persistent background protons
  const initParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use viewport dimensions for full coverage
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;

    const cx = width / 2;
    const cy = height / 2;

    // Create blast particles
    const blastParticles = BLAST_PARTICLES.map((p) => {
      const vx = Math.cos(p.angle) * p.velocity;
      const vy = Math.sin(p.angle) * p.velocity;
      return {
        x: cx,
        y: cy,
        vx,
        vy,
        size: p.size,
        opacity: p.opacity,
        life: p.lifetime,
        maxLife: p.lifetime,
        delay: p.delay,
        born: performance.now(),
        type: 'blast',
      };
    });

    // Create ambient floating particles — tiny background protons with random flashes
    const ambientParticles = Array.from({ length: 45 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      size: 1 + Math.random() * 2,
      opacity: 0.08 + Math.random() * 0.18,
      life: Infinity,
      maxLife: Infinity,
      delay: 2.0 + Math.random() * 1.5,
      born: performance.now(),
      type: 'ambient',
      // Flash system
      flashTimer: 2000 + Math.random() * 6000, // ms until next flash
      flashDuration: 800 + Math.random() * 600,  // ms the flash lasts
      flashPeak: 0.5 + Math.random() * 0.5,      // peak brightness multiplier
      flashCountdown: 2000 + Math.random() * 6000,
      isFlashing: false,
      flashStart: 0,
    }));

    particlesRef.current = [...blastParticles, ...ambientParticles];
  }, []);

  useEffect(() => {
    if (!showParticles) return;
    initParticles();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio;

    const animate = () => {
      const now = performance.now();
      const rect = canvas.getBoundingClientRect();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        const elapsed = now - p.born;
        if (elapsed < p.delay * 1000) return;

        const age = elapsed - p.delay * 1000;

        if (p.type === 'blast') {
          const progress = age / p.life;
          if (progress > 1) return;

          // Minimal deceleration — particles fly hard
          const friction = 0.998;
          p.vx *= friction;
          p.vy *= friction;
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;

          // Sharp fade — hold intensity then drop fast
          const fadeStart = 0.5;
          const alpha =
            progress < fadeStart
              ? p.opacity
              : p.opacity * Math.pow(1 - (progress - fadeStart) / (1 - fadeStart), 2);

          // Motion streak — trail behind the particle
          const tx = p.x - p.vx * 0.04;
          const ty = p.y - p.vy * 0.04;
          const grad = ctx.createLinearGradient(
            tx * dpr, ty * dpr, p.x * dpr, p.y * dpr
          );
          grad.addColorStop(0, `rgba(180, 160, 50, 0)`);
          grad.addColorStop(1, `rgba(180, 160, 50, ${alpha * 0.6})`);
          ctx.beginPath();
          ctx.moveTo(tx * dpr, ty * dpr);
          ctx.lineTo(p.x * dpr, p.y * dpr);
          ctx.strokeStyle = grad;
          ctx.lineWidth = p.size * 0.8 * dpr;
          ctx.stroke();

          // Clean dot — muted yellow, no glow
          ctx.beginPath();
          ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 175, 60, ${alpha})`;
          ctx.fill();
        }

        if (p.type === 'ambient') {
          // Gentle drift with boundary wrapping
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;

          // Soft boundary bounce
          if (p.x < -20) p.x = rect.width + 20;
          if (p.x > rect.width + 20) p.x = -20;
          if (p.y < -20) p.y = rect.height + 20;
          if (p.y > rect.height + 20) p.y = -20;

          // Gentle velocity drift
          p.vx += (Math.random() - 0.5) * 0.2;
          p.vy += (Math.random() - 0.5) * 0.2;
          p.vx *= 0.999;
          p.vy *= 0.999;

          // Base pulse
          const pulse = 0.5 + 0.5 * Math.sin(age * 0.001 + p.x * 0.01);
          let alpha = p.opacity * pulse;

          // Flash cycle — randomly brighten and fade back
          const dt = 16; // ~60fps frame
          if (!p.isFlashing) {
            p.flashCountdown -= dt;
            if (p.flashCountdown <= 0) {
              p.isFlashing = true;
              p.flashStart = now;
            }
          }

          if (p.isFlashing) {
            const flashAge = now - p.flashStart;
            const flashProgress = flashAge / p.flashDuration;

            if (flashProgress >= 1) {
              // Flash done — reset timer
              p.isFlashing = false;
              p.flashCountdown = p.flashTimer + Math.random() * 4000;
            } else {
              // Bell curve: ramp up, peak, ramp down
              const flashCurve = Math.sin(flashProgress * Math.PI);
              const boost = flashCurve * p.flashPeak;
              alpha = Math.min(1, alpha + boost * p.opacity);

              // Also grow slightly during flash
              const flashSize = p.size * (1 + flashCurve * 0.8);
              ctx.beginPath();
              ctx.arc(p.x * dpr, p.y * dpr, flashSize * dpr, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(200, 175, 60, ${alpha})`;
              ctx.fill();
              // Bright core during peak
              if (flashCurve > 0.5) {
                ctx.beginPath();
                ctx.arc(p.x * dpr, p.y * dpr, (flashSize * 0.4) * dpr, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 240, 150, ${alpha * flashCurve})`;
                ctx.fill();
              }
              return; // already drew
            }
          }

          // Clean muted yellow dot — no glow
          ctx.beginPath();
          ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 175, 60, ${alpha})`;
          ctx.fill();
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [showParticles, initParticles]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isApproaching = phase === 'approach' || phase === 'collision';

  return (
    <div className="hero-animation">
      {/* Persistent particle canvas - covers full hero section */}
      <canvas
        ref={canvasRef}
        className="hero-particle-canvas"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Left Proton */}
      <AnimatePresence>
        {phase !== 'merged' && (
          <motion.div
            className="proton proton-left"
            initial={{ x: '-60vw', opacity: 0 }}
            animate={
              phase === 'idle'
                ? { x: '-60vw', opacity: 0 }
                : phase === 'approach'
                  ? { x: '-6%', opacity: 1 }
                  : { x: '0%', opacity: 0, scale: 0.2 }
            }
            exit={{ opacity: 0, scale: 0 }}
            transition={
              phase === 'approach'
                ? { duration: 0.9, ease: [0.55, 0, 1, 0.45] }
                : { duration: 0.12 }
            }
          >
            <div className="proton-core" />
            <div className="proton-glow" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Proton */}
      <AnimatePresence>
        {phase !== 'merged' && (
          <motion.div
            className="proton proton-right"
            initial={{ x: '60vw', opacity: 0 }}
            animate={
              phase === 'idle'
                ? { x: '60vw', opacity: 0 }
                : phase === 'approach'
                  ? { x: '6%', opacity: 1 }
                  : { x: '0%', opacity: 0, scale: 0.2 }
            }
            exit={{ opacity: 0, scale: 0 }}
            transition={
              phase === 'approach'
                ? { duration: 0.9, ease: [0.55, 0, 1, 0.45] }
                : { duration: 0.12 }
            }
          >
            <div className="proton-core" />
            <div className="proton-glow" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collision — no flash halo, particles handle the impact */}

      {/* Helium Atom */}
      <AnimatePresence>
        {phase === 'merged' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 18,
              delay: 0.1,
            }}
            style={{ zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <Interactive3DAtom />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Text */}
      <AnimatePresence>
        {showText && (
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="hero-title">Helium Agent</h1>
            <p className="hero-subtitle">Light Local AI Agent</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeroAnimation;
