import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FaGithub } from 'react-icons/fa';

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
          <h2>Own a Part of Helium</h2>
          <p>
            Helium is built by the community, for the community. Contribute code,
            fix bugs, or add features — and make Helium yours.
          </p>
        </div>

        <motion.div
          className="contribution-card"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ y: -4, boxShadow: '0 0 20px rgba(0, 242, 255, 0.15)' }}
        >
          <FaGithub size={40} style={{ color: 'var(--accent)', marginBottom: '24px' }} />
          <h3>Contribute to Helium</h3>
          <p>
            Found a bug? Have an idea? Submit a pull request and become part of
            the project. Every contribution matters.
          </p>
          <a
            href="https://github.com/DebmalyaSen34/helium-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="contribution-link"
          >
            Start Contributing →
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Contribution;
