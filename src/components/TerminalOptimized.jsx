import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCheck } from 'react-icons/fa';

const TerminalOptimized = () => {
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState('');

  // Typing effect for the first command line
  useEffect(() => {
    const fullCommand = 'helium solve "refactor api"';
    if (step === 0) {
      let i = 0;
      const interval = setInterval(() => {
        setTypedText((prev) => prev + fullCommand[i]);
        i++;
        if (i === fullCommand.length) {
          clearInterval(interval);
          setTimeout(() => setStep(1), 800);
        }
      }, 70);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Stepped reveals for the terminal log outputs
  useEffect(() => {
    if (step > 0 && step < 6) {
      const timers = [
        setTimeout(() => setStep(2), 1000), // SHOWING INDEXING_FS
        setTimeout(() => setStep(3), 1800), // SHOWING MAPPING_DEPENDENCY_GRAPH
        setTimeout(() => setStep(4), 2600), // SHOWING GENERATING_RUST_CORE
        setTimeout(() => setStep(5), 3500), // SHOWING OUTPUT
        setTimeout(() => setStep(6), 4400), // SHOWING APPLY_CHANGES
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [step]);

  // Reset animation every 10 seconds to keep the interface dynamic
  useEffect(() => {
    if (step === 6) {
      const resetTimer = setTimeout(() => {
        setStep(0);
        setTypedText('');
      }, 7000);
      return () => clearTimeout(resetTimer);
    }
  }, [step]);

  return (
    <section className="terminal-showcase-section">
      <div className="terminal-showcase-content">
        {/* Left column info */}
        <div className="terminal-showcase-text">
          <motion.h2
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Terminal Optimized
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Helium integrates seamlessly with your environment variables and shell history. 
            Trigger autonomous agents to execute, test, and refactor code within secure, 
            isolated local sandboxes.
          </motion.p>

          <ul className="terminal-showcase-bullets">
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              Zero-config context sensing
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              Local sandbox isolation
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              Mutable agent personas
            </motion.li>
          </ul>
        </div>

        {/* Right column terminal window mockup */}
        <motion.div 
          className="terminal-window"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="terminal-header-bar">
            <div className="terminal-dots">
              <span className="terminal-dot close"></span>
              <span className="terminal-dot minimize"></span>
              <span className="terminal-dot zoom"></span>
            </div>
            <div className="terminal-title-text">
              user — helium-core — bash
            </div>
            <div style={{ width: '40px' }} /> {/* Balance space */}
          </div>

          <div className="terminal-body">
            <div className="terminal-line">
              <span className="terminal-input-prompt">user@helium:~$ </span>
              <span className="terminal-input">{typedText}</span>
              {step === 0 && <span className="terminal-cursor" />}
            </div>

            {step >= 1 && (
              <div className="terminal-line terminal-comment">
                // ANALYZING_VFS...
              </div>
            )}

            {step >= 2 && (
              <motion.div 
                className="terminal-line terminal-success-line"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FaCheck className="terminal-check-icon" /> INDEXING_FS: 42 FILES
              </motion.div>
            )}

            {step >= 3 && (
              <motion.div 
                className="terminal-line terminal-success-line"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FaCheck className="terminal-check-icon" /> MAPPING_DEPENDENCY_GRAPH
              </motion.div>
            )}

            {step >= 4 && (
              <motion.div 
                className="terminal-line terminal-success-line"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FaCheck className="terminal-check-icon" /> GENERATING_RUST_CORE
              </motion.div>
            )}

            {step >= 5 && (
              <motion.div 
                className="terminal-output-accent"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                OUTPUT: 5 MODULES -&gt; /SRC/HELI_OUT
              </motion.div>
            )}

            {step >= 6 && (
              <motion.div 
                className="terminal-line"
                style={{ marginTop: '24px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span>APPLY_CHANGES? [Y/n] </span>
                <span className="terminal-cursor" />
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TerminalOptimized;
