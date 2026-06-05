import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState } from 'react';
import { FaCopy, FaCheck } from 'react-icons/fa';

const CodeBlock = ({ code, description }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-description">{description}</span>
        <motion.button
          className="copy-button"
          onClick={handleCopy}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {copied ? <FaCheck /> : <FaCopy />}
        </motion.button>
      </div>
      <pre className="code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const Installation = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="installation" className="installation-section">
      <motion.div
        ref={ref}
        className="section-header"
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">Get Started in Seconds</h2>
        <p className="section-subtitle">
          Two commands. That&apos;s all it takes.
        </p>
      </motion.div>

      <motion.div
        className="installation-content"
        initial={{ opacity: 0, y: 50 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="installation-layout">
          {/* Left: Terminal demo */}
          <motion.div
            className="installation-demo"
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="demo-header">
              <span className="demo-dot red"></span>
              <span className="demo-dot yellow"></span>
              <span className="demo-dot green"></span>
              <span className="demo-title">helium-core</span>
            </div>
            <pre className="demo-content">
{`user@helium-core:~$ helium solve "refactor this api into rust"
// Analyzing project directory...
`}<span className="success">{`✔ Indexing 42 files`}</span>{`
`}<span className="success">{`✔ Mapping dependencies`}</span>{`
`}<span className="success">{`✔ Generating Rust architecture`}</span>{`
`}<span className="highlight">{`Generated 5 modules in /src/helium_output`}</span>{`
`}<span className="prompt">{`Apply changes? [Y/n]`}</span>
            </pre>
          </motion.div>

          {/* Right: Installation steps */}
          <div className="installation-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Install Helium</h3>
                <p>Install the agent using pip</p>
                <CodeBlock
                  code="pip install helium-agent"
                  description="bash"
                />
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Initialize</h3>
                <p>Navigate to your project and launch Helium</p>
                <CodeBlock
                  code="helium ."
                  description="bash"
                />
              </div>
            </div>

            <motion.div
              className="installation-note"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <p>
                <strong>Requirements:</strong> Python 3.8+ required. Helium
                runs entirely on your local machine — no API keys needed.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Installation;
