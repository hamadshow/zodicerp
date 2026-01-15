import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="suppliers-container">
        <p>&copy; {new Date().getFullYear()} Noon. All rights reserved.</p>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
