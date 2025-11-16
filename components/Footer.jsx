import Socials from './Socials';

/**
 * Footer component with social links and copyright
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-text">
          <p>© {new Date().getFullYear()} Lucci. The economic layer for open source.</p>
        </div>
        <div className="footer-links">
          <Socials />
        </div>
      </div>
    </footer>
  );
}

