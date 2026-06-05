import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { AutonomyAtom } from './AutonomyAtom';

const heroFeatures = [
  {
    title: 'Run Any Model',
    description:
      'Tested heavily on local models like Gemma 4 and Nemotron using llama.cpp. Use any inference engine — vLLM, llama.cpp, or any cloud endpoint.',
    terminal: {
      prompt: '> helium models --list',
      result: '[LOADED]: gemma4 | ENGINE: llama.cpp',
    },
  },
  {
    title: 'Terminal Native',
    description:
      'No bloated GUIs. Helium lives where you work — the command line. Pipe logs, refactor directories, and deploy infrastructure with zero-click intent.',
    terminal: null,
  },
  {
    title: 'Lightweight',
    description:
      'No unnecessary plugins or extensions. Customize to your needs — Helium ships lean and adapts to your workflow.',
    terminal: null,
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

        {/* Autonomy Section with interactive Helium atom */}
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

        <AutonomyAtom />
      </div>
    </section>
  );
};

export default Features;

