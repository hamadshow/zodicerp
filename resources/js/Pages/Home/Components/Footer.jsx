import React from 'react';
import '../../../../css/homepage/main.scss';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-column">
            <h3>About ZodiMarket</h3>
            <ul>
              <li>
                <a href="#">About Us</a>
              </li>
              <li>
                <a href="#">Our Mission</a>
              </li>
              <li>
                <a href="#">Press & Media</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#">Contact Us</a>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>For Buyers</h3>
            <ul>
              <li>
                <a href="#">Buyer Dashboard</a>
              </li>
              <li>
                <a href="#">Procurement Guide</a>
              </li>
              <li>
                <a href="#">Trade Protection</a>
              </li>
              <li>
                <a href="#">Quality Inspection</a>
              </li>
              <li>
                <a href="#">Shipping Solutions</a>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>For Suppliers</h3>
            <ul>
              <li>
                <a href="#">Supplier Portal</a>
              </li>
              <li>
                <a href="#">Seller Academy</a>
              </li>
              <li>
                <a href="#">Membership Plans</a>
              </li>
              <li>
                <a href="#">Trade Events</a>
              </li>
              <li>
                <a href="#">Marketing Tools</a>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Resources</h3>
            <ul>
              <li>
                <a href="#">Mobile App</a>
              </li>
              <li>
                <a href="#">Product Search</a>
              </li>
              <li>
                <a href="#">API Documentation</a>
              </li>
              <li>
                <a href="#">Browser Extensions</a>
              </li>
              <li>
                <a href="#">Help Center</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <p>© 2024 ZodiMarket. All rights reserved.</p>
            <p className="footer-legal">
              ZodiMarket is a premier B2B marketplace connecting global buyers
              and verified suppliers worldwide.
            </p>
          </div>

          <div className="social-links">
            <a href="#" className="social-link" aria-label="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className="social-link" aria-label="Twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#" className="social-link" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className="social-link" aria-label="LinkedIn">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="#" className="social-link" aria-label="YouTube">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
