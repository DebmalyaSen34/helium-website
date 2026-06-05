const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-main">
          <div className="footer-brand">
            <span className="footer-label">Helium Terminal Systems</span>
          </div>

          <div className="footer-links">
            <a href="#features">Documentation</a>
            <a href="#installation">API</a>
            <a href="#contribute">Status</a>
            <a
              href="https://github.com/DebmalyaSen34/helium-agent"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {currentYear} Helium Terminal Systems. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
