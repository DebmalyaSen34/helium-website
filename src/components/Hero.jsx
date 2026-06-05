import { motion } from 'framer-motion';
import HeroAnimation from './HeroAnimation';

const Hero = () => {
  return (
    <section className="hero-section">
      <HeroAnimation />
      <motion.div
        className="hero-cta"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6, duration: 0.6 }}
      >
        <a href="#installation" className="cta-button primary">
          Get Started
        </a>
        <a href="#features" className="cta-button secondary">
          Learn More
        </a>
      </motion.div>
    </section>
  );
};

export default Hero;
