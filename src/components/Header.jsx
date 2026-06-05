import { motion } from 'framer-motion';
import { FaGithub, FaBook } from 'react-icons/fa';

const Header = () => {
  return (
    <motion.header
      className="header"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className="header-content">
        <motion.div
          className="logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="logo-text">Helium</span>
        </motion.div>

        <nav className="header-nav">
          <a href="#features">Features</a>
          <a href="#installation">Installation</a>
          <a href="#contribute">Contribute</a>
        </nav>

        <div className="header-actions">
          <motion.a
            href="https://github.com/your-repo/helium"
            target="_blank"
            rel="noopener noreferrer"
            className="read-docs-button"
            whileHover={{ scale: 1.05, boxShadow: '0 0 12px rgba(0, 242, 255, 0.3)' }}
            whileTap={{ scale: 0.95 }}
          >
            <FaBook size={14} />
            <span>Read Docs</span>
          </motion.a>

          <motion.a
            href="https://github.com/your-repo/helium"
            target="_blank"
            rel="noopener noreferrer"
            className="github-button"
            whileHover={{ scale: 1.05, boxShadow: '0 0 12px rgba(0, 242, 255, 0.3)' }}
            whileTap={{ scale: 0.95 }}
          >
            <FaGithub size={16} />
            <span>GitHub</span>
          </motion.a>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
