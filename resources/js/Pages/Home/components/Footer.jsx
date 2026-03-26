import React from 'react';

export function FinanzaFooter() {
  return (
    <footer className="finanza-footer" aria-label="Footer">
      <div className="container-fluid finanza-footer-grid">
        <div>
          <div className="finanza-footer-title">Our Office</div>
          <div className="finanza-footer-line">
            <i className="fa-solid fa-location-dot" /> 123 Street, New York, USA
          </div>
          <div className="finanza-footer-line">
            <i className="fa-solid fa-phone" /> +012 345 67890
          </div>
          <div className="finanza-footer-line">
            <i className="fa-solid fa-envelope" /> info@example.com
          </div>
          <div className="finanza-footer-social">
            <a className="finanza-icon-btn finanza-icon-btn--outline" href="#" aria-label="Twitter">
              <i className="fa-brands fa-twitter" />
            </a>
            <a className="finanza-icon-btn finanza-icon-btn--outline" href="#" aria-label="Facebook">
              <i className="fa-brands fa-facebook-f" />
            </a>
            <a className="finanza-icon-btn finanza-icon-btn--outline" href="#" aria-label="YouTube">
              <i className="fa-brands fa-youtube" />
            </a>
            <a className="finanza-icon-btn finanza-icon-btn--outline" href="#" aria-label="LinkedIn">
              <i className="fa-brands fa-linkedin-in" />
            </a>
          </div>
        </div>

        <div>
          <div className="finanza-footer-title">Services</div>
          <a className="finanza-footer-link" href="#services">
            Financial Planning
          </a>
          <a className="finanza-footer-link" href="#services">
            Cash Investment
          </a>
          <a className="finanza-footer-link" href="#services">
            Financial Consultancy
          </a>
          <a className="finanza-footer-link" href="#services">
            Business Loans
          </a>
        </div>

        <div>
          <div className="finanza-footer-title">Quick Links</div>
          <a className="finanza-footer-link" href="#about">
            About Us
          </a>
          <a className="finanza-footer-link" href="#services">
            Our Services
          </a>
          <a className="finanza-footer-link" href="#projects">
            Our Projects
          </a>
          <a className="finanza-footer-link" href="#contact">
            Contact Us
          </a>
        </div>

        <div>
          <div className="finanza-footer-title">Newsletter</div>
          <div className="finanza-muted finanza-footer-note">Subscribe to receive updates and offers.</div>
          <form className="finanza-newsletter" onSubmit={(e) => e.preventDefault()}>
            <input className="finanza-input" type="email" placeholder="Your email" aria-label="Email" required />
            <button className="finanza-btn finanza-btn--primary" type="submit">
              SignUp
            </button>
          </form>
        </div>
      </div>

      <div className="finanza-copyright">
        <div className="container-fluid finanza-copyright-inner">
          <div>© Finanza, All Right Reserved.</div>
          <a className="finanza-footer-link finanza-footer-link--inline" href="#top">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}