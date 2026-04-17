import React from 'react';

export function FinanzaFooter({ t = (k, f) => f || k }) {
  return (
    <footer className="finanza-footer" aria-label="Footer">
      <div className="container-fluid finanza-footer-grid">
        <div>
          <div className="finanza-footer-title">{t('footer_company', 'Company')}</div>
          <a className="finanza-footer-link" href="#about">
            {t('footer_about', 'About')}
          </a>
          <a className="finanza-footer-link" href="#contact">
            {t('footer_contact_us', 'Contact Us')}
          </a>
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
          <div className="finanza-footer-title">{t('footer_quick_links', 'Quick Links')}</div>
          <a className="finanza-footer-link" href="#services">
            {t('footer_services', 'Services')}
          </a>
          <a className="finanza-footer-link" href="#about">
            {t('footer_about', 'About')}
          </a>
          <a className="finanza-footer-link" href="#projects">
            {t('our_projects', 'Our Projects')}
          </a>
          <a className="finanza-footer-link" href="#contact">
            {t('footer_contact_us', 'Contact Us')}
          </a>
        </div>

        <div>
          <div className="finanza-footer-title">{t('footer_newsletter', 'Newsletter')}</div>
          <div className="finanza-muted finanza-footer-note">{t('footer_newsletter_text', 'Subscribe to our newsletter for the latest updates.')}</div>
          <form className="finanza-newsletter" onSubmit={(e) => e.preventDefault()}>
            <input className="finanza-input" type="email" placeholder={t('footer_newsletter_placeholder', 'Enter your email')} aria-label="Email" required />
            <button className="finanza-btn finanza-btn--primary" type="submit">
              {t('footer_subscribe', 'Subscribe')}
            </button>
          </form>
        </div>
      </div>

      <div className="finanza-copyright">
        <div className="container-fluid finanza-copyright-inner">
          <div>© {new Date().getFullYear()} ZodicERP, {t('footer_rights', 'All Rights Reserved.')}</div>
          <a className="finanza-footer-link finanza-footer-link--inline" href="#top">
            {t('back_to_top', 'Back to top')}
          </a>
        </div>
      </div>
    </footer>
  );
}
