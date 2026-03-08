import React, { useEffect } from 'react';
import { Link } from '@inertiajs/react';
import Header from './Components/Header';
import Footer from './Components/Footer';
import '../../../../css/suppliers/main.scss';

export default function Suppliers() {
  useEffect(() => {
    // Add fade-in animation to elements when page loads
    const elements = document.querySelectorAll(
      '.benefit-card, .testimonial, .growth-card, .checklist-block'
    );
    elements.forEach((el, index) => {
      el.style.animationDelay = `${index * 0.1}s`;
    });
  }, []);

  return (
    <div className="suppliers-page">
      <Header />

      {/* Hero Section */}
      <section className="hero">
        <div className="suppliers-container">
          <h1>
            Start selling on
            <br />
            noon today!
          </h1>
          <p className="hero-subtitle">
            Join the region's leading e-commerce platform and grow your
            business.
          </p>
          <div className="hero-actions">
            <Link href={route('supplier.register')} className="cta-btn">
              Register Now →
            </Link>
          </div>
        </div>
      </section>

      {/* Why Join Us? */}
      <section className="why-section">
        <div className="suppliers-container">
          <h2>Why Join Us?</h2>
          <div className="benefits-grid">
            <div className="benefit-card fade-in">
              <div className="icon-circle">🚀</div>
              <h3>Reach Millions</h3>
              <p>
                Millions of shoppers, one app. Noon puts your products in front
                of more people, every single day.
              </p>
            </div>
            <div className="benefit-card fade-in">
              <div className="icon-circle">🚚</div>
              <h3>Fast, Flexible Delivery</h3>
              <p>
                Choose how you ship. Noon handles the speed, care, and customer
                smiles.
              </p>
            </div>
            <div className="benefit-card fade-in">
              <div className="icon-circle">📈</div>
              <h3>Grow fast, Earn Big</h3>
              <p>
                Unlock growth with noon's seller tools - built to turn your
                hustle into real results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ready To Sell */}
      <section className="start-section">
        <div className="suppliers-container">
          <div className="start-layout">
            <div className="text-content">
              <span className="subtitle">HOW TO REGISTER</span>
              <h2>
                Ready To Sell?
                <br />
                It's Fast - Here's What You'll Need:
              </h2>

              <div className="checklist-block fade-in">
                <span className="subtitle">FULFILLMENT STRATEGY</span>
                <h3>
                  Decide if you want to be Fulfilled by noon (FBN) or Fulfilled
                  by Partner (FBP).
                </h3>
                <a href="#" className="highlight">
                  Learn more →
                </a>
              </div>

              <div className="checklist">
                <h3>Seller Setup Checklist:</h3>
                <ul>
                  <li>Business email or personal email</li>
                  <li>Reachable phone number with WhatsApp</li>
                  <li>
                    National ID (like Emirates ID or passport) for verification
                  </li>
                </ul>
              </div>

              <div className="checklist-block fade-in">
                <h3>If you're a VAT-registered seller, you'll need:</h3>
                <ul className="checklist">
                  <li>Commercial Registration</li>
                  <li>Power of Attorney (if account manager)</li>
                </ul>
                <p className="note">
                  If annual revenue is below 375,000 AED, you don't need to
                  register for VAT.
                </p>
              </div>

              <button className="cta-btn outline small">Documents FAQs</button>
            </div>
            <div className="mockup-container">
              <div className="phone-mockup">
                <div className="mockup-placeholder">App Preview</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Know Your Costs */}
      <section className="growth-section">
        <div className="suppliers-container">
          <h2>
            Know Your Costs, <span className="highlight">Grow Smarter</span>
          </h2>
          <div className="growth-layout">
            <div className="growth-card dark fade-in">
              <h3>We keep fees competitive so you can grow faster.</h3>
              <p className="large-text">Transparent Fees</p>
              <p>
                Learn about commissions, other costs, and how to use our
                reporting tools to sharpen your strategy.
              </p>
              <a href="#" className="highlight">
                Learn more →
              </a>
            </div>
            <div className="video-wrapper fade-in">
              <div className="play-overlay">
                <span className="play-icon">▶</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="suppliers-container">
          <h2>Testimonials</h2>
          <div className="testimonials-grid">
            <div className="testimonial fade-in">
              <div className="quote">
                "Partnering with noon has been a game changer. The platform is
                easy. Since joining at the start of 2023, their support has been
                incredible."
              </div>
              <div className="author">
                <div className="avatar">A</div>
                <div>
                  <strong>Founder</strong>
                  <span>XZ Stores</span>
                </div>
              </div>
            </div>
            <div className="testimonial fade-in">
              <div className="quote">
                "Our sales picked up quickly. Highly recommend for anyone
                looking to reach more customers. Noon's team is very
                supportive."
              </div>
              <div className="author">
                <div className="avatar">B</div>
                <div>
                  <strong>Owner</strong>
                  <span>General Trading</span>
                </div>
              </div>
            </div>
            <div className="testimonial fade-in">
              <div className="quote">
                "The best move we ever made was joining noon. Our online growth
                has been incredible. The support team really shows up."
              </div>
              <div className="author">
                <div className="avatar">C</div>
                <div>
                  <strong>Head of E-Commerce</strong>
                  <span>Retail Group</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VAT Banner */}
      <section className="vat-banner">
        <div className="suppliers-container">
          <div className="vat-content">
            <h3>Submit VAT information</h3>
            <p style={{ color: '#aaa', marginTop: '8px' }}>
              Non-UAE sellers: VAT registration is mandatory. UAE sellers: If
              you hit 375,000 AED in taxable imports, you must register.
            </p>
          </div>
          <a href="#" className="vat-link">
            Learn more about VAT rules →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
