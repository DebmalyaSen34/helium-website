import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  FaBolt,
  FaTerminal,
  FaBrain,
  FaMemory,
  FaLock,
} from 'react-icons/fa';

const heroFeatures = [
  {
    title: 'Lightning Fast Fusion',
    description:
      'Engineered for sub-millisecond response times. Helium leverages edge-computing clusters to process complex reasoning chains at the speed of thought.',
    terminal: {
      prompt: '> latency --measure',
      result: '[RESULTS]: 0.002ms | STATUS: PEAK',
    },
  },
  {
    title: 'Terminal Native',
    description:
      'No bloated GUIs. Helium lives where you work — the command line. Pipe logs, refactor directories, and deploy infrastructure with zero-click intent.',
    terminal: null,
  },
  {
    title: 'Advanced AI Reasoning',
    description:
      'Multimodal logic cores designed for autonomous problem-solving. From legacy stack migration to zero-day security audits, Helium reasons through complexity.',
    terminal: null,
  },
];

const autonomyFeatures = [
  {
    icon: FaBolt,
    title: 'Fully Local',
    description:
      'Run everything on your own hardware. No cloud dependency, no latency.',
  },
  {
    icon: FaTerminal,
    title: 'Coding Workflow',
    description:
      'Deeply integrated with your IDE and shell for seamless refactoring.',
  },
  {
    icon: FaBrain,
    title: 'Deep Research',
    description:
      'Autonomous agents capable of scouring documentation and codebases.',
  },
  {
    icon: FaMemory,
    title: 'Persistent Memory',
    description:
      'Helium remembers your project context, conventions, and history.',
  },
  {
    icon: FaLock,
    title: 'Privacy First',
    description:
      'Your data never leaves your machine. Local-first architecture by design.',
  },
];

const HeroFeatureCard = ({ feature, index }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <motion.div
      ref={ref}
      className="feature-hero-card"
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: 'easeOut',
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 0 20px rgba(0, 242, 255, 0.15)',
      }}
    >
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
      {feature.terminal && (
        <div className="feature-terminal">
          <div className="prompt">{feature.terminal.prompt}</div>
          <div className="result">{feature.terminal.result}</div>
        </div>
      )}
    </motion.div>
  );
};

const AutonomyCard = ({ feature, index }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <motion.div
      ref={ref}
      className="feature-card"
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
      whileHover={{
        y: -6,
        boxShadow: '0 0 16px rgba(0, 242, 255, 0.15)',
      }}
    >
      <div className="feature-icon">
        <feature.icon size={32} />
      </div>
      <h3 className="feature-title">{feature.title}</h3>
      <p className="feature-description">{feature.description}</p>
    </motion.div>
  );
};

const Features = () => {
  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [gridRef, gridInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="features" className="features-section">
      {/* Hero feature cards — 3-column top row */}
      <div className="features-content">
        <motion.div
          ref={heroRef}
          className="features-hero-grid"
          initial={{ opacity: 0 }}
          animate={heroInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          {heroFeatures.map((feature, index) => (
            <HeroFeatureCard key={index} feature={feature} index={index} />
          ))}
        </motion.div>

        {/* Autonomy grid — 5-column feature cards */}
        <motion.div
          ref={gridRef}
          className="autonomy-header"
          initial={{ opacity: 0, y: 30 }}
          animate={gridInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2>Engineered for Autonomy</h2>
          <p>
            Built for developers who value privacy, speed, and control
          </p>
        </motion.div>

        <div className="features-grid">
          {autonomyFeatures.map((feature, index) => (
            <AutonomyCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
