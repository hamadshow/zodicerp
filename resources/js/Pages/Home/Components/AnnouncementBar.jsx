import React, { useState, useEffect } from 'react';
import '../../../../css/homepage/header.css';

export default function AnnouncementBar({
  initialVisible = true,
  text = 'New Verified Suppliers Added Weekly!',
  ctaText = 'Join as Supplier →',
  onCtaClick = () => {},
}) {
  const [visible, setVisible] = useState(initialVisible);
  useEffect(() => {
    setVisible(initialVisible);
  }, [initialVisible]);
  if (!visible) return null;
  return (
    <div className="header-announcement">
      <div className="header-announcement-container">
        <div className="header-announcement-text">
          <span className="announcement-icon">🚀</span>
          <span className="announcement-message">{text}</span>
          <a
            href="#"
            className="announcement-link"
            onClick={(e) => {
              e.preventDefault();
              onCtaClick();
            }}
          >
            {ctaText}
          </a>
        </div>
        <button
          className="announcement-close"
          aria-label="Close announcement"
          onClick={() => setVisible(false)}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
}
