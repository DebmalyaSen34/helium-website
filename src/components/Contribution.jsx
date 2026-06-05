import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FaGithub, FaStar } from 'react-icons/fa';

const Contribution = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="contribute" className="contribution-section">
      <motion.div
        ref={ref}
        className="contribution-content"
        initial={{ opacity: 0, y: 50 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
      >
        <div className="contribution-header">
          <h2>Build the Future of Terminal AI</h2>
          <p>
            Helium is open-core and community-driven. Join thousands of
            developers shaping the next generation of autonomous tools.
          </p>
        </div>

        <motion.div
          className="contribution-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="contribution-stat">
            <span className="stat-number">5,000+</span>
            <span className="stat-label">Contributors</span>
          </div>
          <div className="contribution-stat">
            <span className="stat-number">100%</span>
            <span className="stat-label">Open Source</span>
          </div>
          <div className="contribution-stat">
            <span className="stat-number">0</span>
            <span className="stat-label">API Keys Required</span>
          </div>
        </motion.div>

        <motion.div
          className="contribution-card"
          whileHover={{ y: -4, boxShadow: '0 0 20px rgba(0, 242, 255, 0.15)' }}
        >
          <FaStar size={36} style={{ color: 'var(--accent)', marginBottom: '20px' }} />
          <h3>Contribute on GitHub</h3>
          <p>
            Found a bug? Have a feature idea? Submit a pull request and help
            make Helium better for everyone.
          </p>
          <a
            href="https://github.com/your-repo/helium"
            target="_blank"
            rel="noopener noreferrer"
            className="contribution-link"
          >
            View on GitHub →
          </a>
        </motion.div>

        <motion.div
          className="contribution-cta"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <a
            href="https://github.com/your-repo/helium"
            target="_blank"
            rel="noopener noreferrer"
            className="github-large-button"
          >
            <FaGithub size={20} />
            <span>Contribute on GitHub</span>
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Contribution;
