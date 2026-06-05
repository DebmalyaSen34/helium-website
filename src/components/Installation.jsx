import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect, useRef, useCallback } from 'react';
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

const HELIUM_ASCII = `
 ██╗  ██╗███████╗██╗     ██╗██╗   ██╗███╗   ███╗
 ██║  ██║██╔════╝██║     ██║██║   ██║████╗ ████║
 ███████║█████╗  ██║     ██║██║   ██║██╔████╔██║
 ██╔══██║██╔══╝  ██║     ██║██║   ██║██║╚██╔╝██║
 ██║  ██║███████╗███████╗██║╚██████╔╝██║ ╚═╝ ██║
 ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝     ╚═╝`;

const InstallerTerminal = ({ inView }) => {
  const [lines, setLines] = useState([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const terminalRef = useRef(null);
  const animRef = useRef(null);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Run animation sequence
  const runAnimation = useCallback(async () => {
    if (!inView) return;

    const sleep = (ms) => new Promise(resolve => {
      animRef.current = setTimeout(resolve, ms);
    });

    const addLine = (line) => {
      setLines(prev => [...prev, line]);
    };

    try {
      // Wait for scroll into view
      await sleep(800);

      // Command 1: pip install helium-agent
      addLine({ type: 'cmd', text: 'pip install helium-agent' });
      await sleep(600);

      addLine({ type: 'dim', text: 'Collecting helium-agent...' });
      await sleep(400);

      addLine({ type: 'dim', text: 'Installing collected packages...' });
      await sleep(500);

      addLine({ type: 'success', text: 'Successfully installed helium-agent', icon: '✓' });
      await sleep(800);

      // Command 2: helium .
      addLine({ type: 'cmd', text: 'helium .' });
      await sleep(600);

      addLine({ type: 'normal', text: 'Install Helium. It\'s a CLI tool.' });
      await sleep(500);

      addLine({ type: 'ascii', text: HELIUM_ASCII });
      await sleep(700);

      addLine({ type: 'success', text: 'You\'re all set!', icon: '✓' });
      await sleep(400);

      addLine({ type: 'dim', text: 'Check the docs for guides and examples.' });
      await sleep(400);

      addLine({ type: 'dim', text: 'Close this installer to get started.' });
      await sleep(500);

      addLine({ type: 'dim', text: 'Closing installer...' });
      await sleep(500);

      addLine({ type: 'accent', text: 'Done. Helium is ready.' });

      // Wait then reset and loop
      await sleep(4000);
      setLines([]);
      setShowCursor(true);

      // Loop
      await sleep(1000);
      runAnimation();
    } catch (e) {
      // Component unmounted, do nothing
    }
  }, [inView]);

  useEffect(() => {
    if (inView) {
      runAnimation();
    }
    return () => {
      if (animRef.current) {
        clearTimeout(animRef.current);
      }
    };
  }, [inView, runAnimation]);

  return (
    <div className="installer-terminal" ref={terminalRef}>
      <div className="installer-body">
        {lines.map((line, i) => (
          <div key={i} className={`installer-line installer-${line.type}`}>
            {line.type === 'cmd' && <span className="installer-prompt">~ &gt;</span>}
            {line.icon && <span className="installer-icon">{line.icon}</span>}
            {line.type === 'ascii' ? (
              <pre className="installer-ascii">{line.text}</pre>
            ) : (
              <span>{line.text}</span>
            )}
          </div>
        ))}

        {/* Current cursor line */}
        {showCursor && (
          <div className="installer-line installer-cmd-line">
            <span className="installer-prompt">~ &gt;</span>
            <span className={`installer-cursor ${cursorVisible ? 'visible' : ''}`} />
          </div>
        )}
      </div>
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
            <InstallerTerminal inView={inView} />
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
