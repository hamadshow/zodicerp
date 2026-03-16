import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

export function FinanzaHeader({
  variant = 'full',
  isScrolled = false,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  onCloseMobileMenu,
  onOpenAuth,
  loginHref = '/login',
  registerHref = '/register',
  logoutHref = '/logout',
  dashboardHref = '/dashboard',
  customerFirstName = null,
  homeHref,
}) {
  const page = usePage();
  const auth = page?.props?.auth || null;
  const authUser = auth?.user || null;
  const authCustomer = auth?.customer || null;
  const authSupplier = auth?.supplier || null;
  const resolvedName =
    authUser?.name ||
    authCustomer?.name_ar ||
    authCustomer?.name_en ||
    authSupplier?.name_ar ||
    authSupplier?.name_en ||
    customerFirstName ||
    null;
  const resolvedEmail = authUser?.email || authCustomer?.email || authSupplier?.email || null;
  const avatarLetter = (resolvedName || resolvedEmail || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();
  const isAuthenticated = Boolean(authUser || authCustomer || authSupplier || customerFirstName);
  const showFullNav = variant === 'full';
  const toggleMobileMenu = onToggleMobileMenu || (() => {});
  const closeMobileMenu = onCloseMobileMenu || (() => {});
  const brandHref = homeHref || (showFullNav ? '#top' : '/');

  return (
    <>
      <header className={`finanza-header ${isScrolled ? 'finanza-header--scrolled' : ''}`}>
        <div className="container-fluid finanza-header-inner">
          <a className="finanza-brand" href={brandHref} aria-label="Finanza home">
            ZodicERP
          </a>
          {showFullNav ? (
            <nav className={`finanza-nav ${isMobileMenuOpen ? 'finanza-nav--open' : ''}`} aria-label="Primary">
              <a className="finanza-nav-link finanza-nav-link--active" href="#top" aria-current="page">
                Home
              </a>
              <a className="finanza-nav-link" href="#about">
                About
              </a>
              <a className="finanza-nav-link" href="#services">
                Services
              </a>
              <a className="finanza-nav-link" href="#projects">
                Projects
              </a>
              <a className="finanza-nav-link" href="#contact">
                Contact
              </a>
            </nav>
          ) : null}
          <div className="finanza-header-actions" aria-label="Actions">
            <div className="finanza-auth-actions">
              {isAuthenticated ? (
                <div className="finanza-userChip">
                  <Link className="finanza-userChip-main" href={dashboardHref} aria-label="Open dashboard">
                    <span className="finanza-userChip-avatar" aria-hidden="true">
                      {avatarLetter}
                    </span>
                    <span className="finanza-userChip-meta">
                      <span className="finanza-userChip-name">{resolvedName || 'Account'}</span>
                      {resolvedEmail ? <span className="finanza-userChip-email">{resolvedEmail}</span> : null}
                    </span>
                  </Link>
                  <Link
                    className="finanza-userChip-logout"
                    href={logoutHref}
                    method="post"
                    as="button"
                    type="button"
                    aria-label="Logout"
                  >
                    <i className="fa-solid fa-right-from-bracket" />
                  </Link>
                </div>
              ) : (
                <>
                  <Link className="finanza-btn finanza-btn--ghost" href={loginHref}>
                    Login
                  </Link>
                  <Link className="finanza-btn finanza-btn--primary finanza-btn--sm" href={registerHref}>
                    Register
                  </Link>
                </>
              )}
            </div>

            <a className="finanza-icon-btn finanza-icon-btn--soft" href="#" aria-label="Facebook">
              <i className="fa-brands fa-facebook-f" />
            </a>
            <a className="finanza-icon-btn finanza-icon-btn--soft" href="#" aria-label="Twitter">
              <i className="fa-brands fa-twitter" />
            </a>
            <a className="finanza-icon-btn finanza-icon-btn--soft" href="#" aria-label="LinkedIn">
              <i className="fa-brands fa-linkedin-in" />
            </a>

            {showFullNav ? (
              <button
                type="button"
                className="finanza-burger"
                aria-label="Open menu"
                aria-expanded={isMobileMenuOpen}
                onClick={toggleMobileMenu}
              >
                <span />
                <span />
                <span />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {showFullNav && isMobileMenuOpen ? (
        <div
          className="finanza-mobileMenu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMobileMenu();
          }}
        >
          <div className="finanza-mobileMenu-panel">
            <div className="finanza-mobileMenu-top">
              <div className="finanza-mobileMenu-title">Menu</div>
              <button type="button" className="finanza-mobileMenu-close" aria-label="Close menu" onClick={closeMobileMenu}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <a className="finanza-mobileMenu-link" href="#top" onClick={closeMobileMenu}>
              Home
            </a>
            <a className="finanza-mobileMenu-link" href="#about" onClick={closeMobileMenu}>
              About
            </a>
            <a className="finanza-mobileMenu-link" href="#services" onClick={closeMobileMenu}>
              Services
            </a>
            <a className="finanza-mobileMenu-link" href="#projects" onClick={closeMobileMenu}>
              Projects
            </a>
            <a className="finanza-mobileMenu-link" href="#contact" onClick={closeMobileMenu}>
              Contact
            </a>

            <div className="finanza-mobileMenu-actions">
              {isAuthenticated ? (
                <>
                  <a className="finanza-btn finanza-btn--ghost" href={dashboardHref}>
                    Dashboard
                  </a>
                  <Link className="finanza-btn finanza-btn--primary" href={logoutHref} method="post" as="button" type="button">
                    Logout
                  </Link>
                </>
              ) : (
                <>
                  <button type="button" className="finanza-btn finanza-btn--ghost" onClick={() => onOpenAuth?.('login')}>
                    Login
                  </button>
                  <button type="button" className="finanza-btn finanza-btn--primary" onClick={() => onOpenAuth?.('register')}>
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

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

const Home = () => {
  const { auth, localization } = usePage().props;
  const countryCode =
    localization?.country_code ||
    (typeof localization?.current_country === 'string'
      ? localization.current_country
      : localization?.current_country?.code?.toLowerCase?.()) ||
    'sa';
  const locale = localization?.current_locale || localization?.locale || 'en';
  const loginHref = `/${countryCode}/${locale}/login`;
  const registerHref = `/${countryCode}/${locale}/register`;
  const logoutHref = `/${countryCode}/${locale}/logout`;
  const dashboardHref = `/${countryCode}/${locale}/dashboard`;
  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: countryCode,
      lang: locale,
      ...params,
    });
  };
  const customerName =
    auth?.customer?.name_ar ||
    auth?.customer?.name_en ||
    auth?.user?.name ||
    auth?.supplier?.name_ar ||
    auth?.supplier?.name_en ||
    null;
  const customerFirstName = useMemo(() => {
    if (!customerName) return null;
    const trimmed = String(customerName).trim();
    if (!trimmed) return null;
    return trimmed.split(/\s+/)[0] || null;
  }, [customerName]);
  const slides = useMemo(
    () => [
      {
        image: '/storage/images/carousel-1.jpg',
        title: 'Your Financial Status Is Our Goal',
        subtitle: 'Modern finance support for startups, SMBs, and enterprises.',
        ctaLabel: 'Explore More',
        ctaHref: '#services',
      },
      {
        image: '/storage/images/carousel-2.jpg',
        title: 'Smarter Growth With Data-Driven Strategy',
        subtitle: 'Planning, reporting, and investment guidance built for scale.',
        ctaLabel: 'View Services',
        ctaHref: '#services',
      },
      {
        image: '/storage/images/header.jpg',
        title: 'Build Stronger Cashflow',
        subtitle: 'Reduce risk, improve margins, and keep your runway healthy.',
        ctaLabel: 'Contact Us',
        ctaHref: '#contact',
      },
    ],
    []
  );

  const aboutImage = '/storage/images/about.jpg';

  const serviceCards = useMemo(
    () => [
      {
        icon: 'fa-solid fa-chart-line',
        title: 'Financial Planning',
        text: 'Budgeting, forecasting, and KPI dashboards to support growth.',
      },
      {
        icon: 'fa-solid fa-coins',
        title: 'Cash Investment',
        text: 'Optimize liquidity and allocate capital with confidence.',
      },
      {
        icon: 'fa-solid fa-briefcase',
        title: 'Financial Consultancy',
        text: 'Expert guidance tailored to your business stage and goals.',
      },
      {
        icon: 'fa-solid fa-hand-holding-dollar',
        title: 'Business Loans',
        text: 'Structured financing options with clear terms and support.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Risk Management',
        text: 'Identify, assess, and mitigate financial exposure proactively.',
      },
      {
        icon: 'fa-solid fa-file-invoice-dollar',
        title: 'Tax & Reporting',
        text: 'Accurate reporting and compliance-aligned documentation.',
      },
    ],
    []
  );

  const projects = useMemo(
    () => [
      { title: 'Financial Consultancy', src: '/storage/images/service-1.jpg', tag: 'Consulting' },
      { title: 'Business Loans', src: '/storage/images/service-2.jpg', tag: 'Funding' },
      { title: 'Financial Planning', src: '/storage/images/service-3.jpg', tag: 'Planning' },
      { title: 'Risk Management', src: '/storage/images/service-4.jpg', tag: 'Risk' },
      { title: 'Investment Strategy', src: '/storage/images/carousel-2.jpg', tag: 'Invest' },
    ],
    []
  );

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);

  const [projectsIndex, setProjectsIndex] = useState(0);
  const [projectsPerView, setProjectsPerView] = useState(3);
  const [isProjectsDragging, setIsProjectsDragging] = useState(false);
  const projectsViewportRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, lastX: 0 });

  const [authModal, setAuthModal] = useState(null);
  const {
    data: loginData,
    setData: setLoginData,
    post: postLogin,
    processing: loginProcessing,
    errors: loginErrors,
    reset: resetLogin,
    clearErrors: clearLoginErrors,
  } = useForm({
    email: '',
    password: '',
    remember: false,
  });
  const {
    data: registerData,
    setData: setRegisterData,
    post: postRegister,
    processing: registerProcessing,
    errors: registerErrors,
    reset: resetRegister,
    clearErrors: clearRegisterErrors,
  } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const [contactValues, setContactValues] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [contactErrors, setContactErrors] = useState({});
  const [contactSuccess, setContactSuccess] = useState('');

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (authModal === 'login') {
      clearRegisterErrors();
      resetRegister();
    } else if (authModal === 'register') {
      clearLoginErrors();
      resetLogin();
    } else {
      clearLoginErrors();
      clearRegisterErrors();
      resetLogin();
      resetRegister();
    }
  }, [authModal, clearLoginErrors, clearRegisterErrors, resetLogin, resetRegister]);

  useEffect(() => {
    if (isHeroPaused) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined;
    const id = window.setInterval(() => setHeroIndex((i) => (i + 1) % slides.length), 5200);
    return () => window.clearInterval(id);
  }, [isHeroPaused, slides.length]);

  useEffect(() => {
    const viewport = projectsViewportRef.current;
    if (!viewport) return undefined;

    const computePerView = () => {
      const w = window.innerWidth;
      if (w < 576) return 1;
      if (w < 768) return 1;
      if (w < 992) return 2;
      if (w < 1200) return 2;
      return 3;
    };

    const onResize = () => {
      const next = computePerView();
      setProjectsPerView(next);
    };

    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const projectsMaxIndex = Math.max(0, projects.length - projectsPerView);
  const projectsIndexClamped = Math.min(projectsIndex, projectsMaxIndex);

  useEffect(() => {
    if (projectsIndex !== projectsIndexClamped) setProjectsIndex(projectsIndexClamped);
  }, [projectsIndex, projectsIndexClamped]);

  useEffect(() => {
    if (isProjectsDragging) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined;
    const id = window.setInterval(() => {
      setProjectsIndex((i) => (i >= projectsMaxIndex ? 0 : i + 1));
    }, 4200);
    return () => window.clearInterval(id);
  }, [isProjectsDragging, projectsMaxIndex]);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) return undefined;

    const items = Array.from(document.querySelectorAll('[data-animate]'));
    if (items.length === 0) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-inview');
            io.unobserve(entry.target);
          }
        }
      },
      { root: null, threshold: 0.12 }
    );

    for (const el of items) io.observe(el);
    return () => io.disconnect();
  }, []);

  const goHero = (next) => setHeroIndex(((next % slides.length) + slides.length) % slides.length);
  const nextHero = () => goHero(heroIndex + 1);
  const prevHero = () => goHero(heroIndex - 1);

  const goProjects = (next) => setProjectsIndex(Math.max(0, Math.min(projectsMaxIndex, next)));
  const nextProjects = () => goProjects(projectsIndexClamped + 1);
  const prevProjects = () => goProjects(projectsIndexClamped - 1);

  const projectsOffsetPx = (() => {
    const viewport = projectsViewportRef.current;
    if (!viewport) return 0;
    const slideW = viewport.clientWidth / Math.max(1, projectsPerView);
    return projectsIndexClamped * slideW;
  })();

  const onProjectsPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = { active: true, startX: e.clientX, lastX: e.clientX };
    setIsProjectsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onProjectsPointerMove = (e) => {
    if (!dragRef.current.active) return;
    dragRef.current.lastX = e.clientX;
  };

  const onProjectsPointerUp = (e) => {
    if (!dragRef.current.active) return;
    const delta = dragRef.current.lastX - dragRef.current.startX;
    dragRef.current.active = false;
    setIsProjectsDragging(false);

    if (Math.abs(delta) < 50) return;
    if (delta < 0) nextProjects();
    else prevProjects();
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const validateContact = (values) => {
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = 'Name is required.';
    if (!values.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = 'Enter a valid email.';
    if (!values.subject.trim()) nextErrors.subject = 'Subject is required.';
    if (!values.message.trim()) nextErrors.message = 'Message is required.';
    else if (values.message.trim().length < 10) nextErrors.message = 'Message must be at least 10 characters.';
    return nextErrors;
  };

  const onContactSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateContact(contactValues);
    setContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setContactSuccess('Thanks! Your message has been sent successfully.');
    setContactValues({ name: '', email: '', subject: '', message: '' });
    window.setTimeout(() => setContactSuccess(''), 4000);
  };

  const openAuth = (mode) => {
    setAuthModal(mode);
    setIsMobileMenuOpen(false);
  };

  const closeAuth = () => setAuthModal(null);

  return (
    <>
      <Head title="Home" />

      <div id="top" className="finanza-landing">
        <a className="finanza-skip-link" href="#main-content">
          Skip to content
        </a>

        <FinanzaHeader
          variant="full"
          isScrolled={isScrolled}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen((v) => !v)}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          onOpenAuth={openAuth}
          loginHref={loginHref}
          registerHref={registerHref}
          logoutHref={logoutHref}
          dashboardHref={dashboardHref}
          customerFirstName={customerFirstName}
        />

        <main id="main-content">
          <section
            className="finanza-hero finanza-hero--slider"
            aria-label="Hero slider"
            onMouseEnter={() => setIsHeroPaused(true)}
            onMouseLeave={() => setIsHeroPaused(false)}
          >
            <div className="finanza-hero-slider">
              {slides.map((s, idx) => (
                <div
                  key={s.title}
                  className={`finanza-hero-slide ${idx === heroIndex ? 'is-active' : ''}`}
                  style={{ backgroundImage: `url(${s.image})` }}
                  aria-hidden={idx !== heroIndex}
                >
                  <div className="finanza-hero-overlay" />
                  <div className="container-fluid finanza-hero-content">
                    <div className="finanza-hero-kicker" data-animate>
                      Welcome to ZodicERP
                    </div>
                    <h1 className="finanza-hero-title" data-animate>
                      {s.title}
                    </h1>
                    <p className="finanza-hero-subtitle" data-animate>
                      {s.subtitle}
                    </p>
                    <a className="finanza-btn finanza-btn--primary" href={s.ctaHref} data-animate>
                      {s.ctaLabel}
                    </a>
                  </div>
                </div>
              ))}

              <button type="button" className="finanza-hero-arrow finanza-hero-arrow--prev" aria-label="Previous slide" onClick={prevHero}>
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button type="button" className="finanza-hero-arrow finanza-hero-arrow--next" aria-label="Next slide" onClick={nextHero}>
                <i className="fa-solid fa-chevron-right" />
              </button>

              <div className="finanza-hero-dots" role="tablist" aria-label="Hero pagination">
                {slides.map((s, idx) => (
                  <button
                    key={s.title}
                    type="button"
                    className={`finanza-dot ${idx === heroIndex ? 'is-active' : ''}`}
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-current={idx === heroIndex}
                    onClick={() => goHero(idx)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section id="about" className="finanza-section" aria-label="About">
            <div className="container-fluid">
              <div className="finanza-about-grid">
                <div className="finanza-about-media">
                  <div className="finanza-imageZoom" data-animate>
                    <img className="finanza-card-image" src={aboutImage} alt="About Finanza" loading="lazy" />
                  </div>
                </div>
                <div className="finanza-about-copy">
                  <div className="finanza-pill" data-animate>
                    About Us
                  </div>
                  <h2 className="finanza-title" data-animate>
                    We Help Our Clients To Grow Their Business
                  </h2>
                  <p className="finanza-muted" data-animate>
                    Tempor erat elitr rebum at clita. Diam dolor diam ipsum sit. Aliqu diam amet diam et eos. Clita erat ipsum et lorem et sit, sed
                    stet lorem sit clita duo justo magna dolore erat amet
                  </p>
                  <div className="finanza-about-bullets" data-animate>
                    <div className="finanza-bullet">
                      <i className="fa-solid fa-check" /> No Hidden Costs
                    </div>
                    <div className="finanza-bullet">
                      <i className="fa-solid fa-check" /> Dedicated Team
                    </div>
                    <div className="finanza-bullet">
                      <i className="fa-solid fa-check" /> 24/7 Support
                    </div>
                  </div>
                </div>
              </div>

              <div className="finanza-features">
                <div className="finanza-feature" data-animate>
                  <div className="finanza-feature-icon">
                    <i className="fa-solid fa-xmark" />
                  </div>
                  <div className="finanza-feature-body">
                    <div className="finanza-feature-title">No Hidden Cost</div>
                    <div className="finanza-feature-text">Clita erat ipsum lorem sit sed stet duo justo</div>
                  </div>
                </div>
                <div className="finanza-feature" data-animate>
                  <div className="finanza-feature-icon">
                    <i className="fa-solid fa-users" />
                  </div>
                  <div className="finanza-feature-body">
                    <div className="finanza-feature-title">Dedicated Team</div>
                    <div className="finanza-feature-text">Clita erat ipsum lorem sit sed stet duo justo</div>
                  </div>
                </div>
                <div className="finanza-feature" data-animate>
                  <div className="finanza-feature-icon">
                    <i className="fa-solid fa-phone" />
                  </div>
                  <div className="finanza-feature-body">
                    <div className="finanza-feature-title">24/7 Available</div>
                    <div className="finanza-feature-text">Clita erat ipsum lorem sit sed stet duo justo</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="services" className="finanza-section finanza-section--alt" aria-label="Services">
            <div className="container-fluid">
              <div className="finanza-center">
                <div className="finanza-pill" data-animate>
                  Services
                </div>
                <h2 className="finanza-title">Awesome Financial Services For Business</h2>
              </div>

              <div className="finanza-servicesCards" role="list">
                {serviceCards.map((s) => (
                  <article key={s.title} className="finanza-serviceCard" role="listitem" data-animate>
                    <div className="finanza-serviceCard-icon">
                      <i className={s.icon} />
                    </div>
                    <h3 className="finanza-serviceCard-title">{s.title}</h3>
                    <p className="finanza-muted finanza-serviceCard-text">{s.text}</p>
                    <a className="finanza-serviceCard-link" href="#contact" aria-label={`${s.title} details`}>
                      Read more <i className="fa-solid fa-arrow-right" />
                    </a>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="projects" className="finanza-section" aria-label="Projects">
            <div className="container-fluid">
              <div className="finanza-center">
                <div className="finanza-pill" data-animate>
                  Our Projects
                </div>
                <h2 className="finanza-title">We Have Completed Latest Projects</h2>
              </div>

              <div className={`finanza-carousel ${isProjectsDragging ? 'is-dragging' : ''}`} data-animate style={{ '--per-view': projectsPerView }}>
                <div
                  className="finanza-carousel-viewport"
                  ref={projectsViewportRef}
                  onPointerDown={onProjectsPointerDown}
                  onPointerMove={onProjectsPointerMove}
                  onPointerUp={onProjectsPointerUp}
                  onPointerCancel={onProjectsPointerUp}
                >
                  <div className="finanza-carousel-track" style={{ transform: `translate3d(-${projectsOffsetPx}px, 0, 0)` }}>
                    {projects.map((p) => (
                      <article key={p.title} className="finanza-project finanza-carousel-slide">
                        <div className="finanza-project-media finanza-imageZoom">
                          <img className="finanza-project-image" src={p.src} alt={p.title} loading="lazy" />
                        </div>
                        <div className="finanza-project-meta">
                          <div className="finanza-project-tag">{p.tag}</div>
                          <div className="finanza-project-title">{p.title}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <button type="button" className="finanza-carousel-arrow finanza-carousel-arrow--prev" aria-label="Previous projects" onClick={prevProjects}>
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button type="button" className="finanza-carousel-arrow finanza-carousel-arrow--next" aria-label="Next projects" onClick={nextProjects}>
                  <i className="fa-solid fa-chevron-right" />
                </button>

                <div className="finanza-carousel-dots" aria-label="Projects pagination">
                  {Array.from({ length: projectsMaxIndex + 1 }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`finanza-dot ${idx === projectsIndexClamped ? 'is-active' : ''}`}
                      aria-label={`Go to projects page ${idx + 1}`}
                      aria-current={idx === projectsIndexClamped}
                      onClick={() => goProjects(idx)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="contact" className="finanza-section finanza-section--alt" aria-label="Contact">
            <div className="container-fluid">
              <div className="finanza-contact-grid">
                <div className="finanza-contact-form" data-animate>
                  <div className="finanza-pill">Contact</div>
                  <h2 className="finanza-title">If You Have Any Query, Please Contact Us</h2>
                  <p className="finanza-muted">We usually reply within 24 hours.</p>

                  {contactSuccess ? <div className="finanza-alert finanza-alert--success">{contactSuccess}</div> : null}

                  <form className="finanza-form" onSubmit={onContactSubmit} noValidate>
                    <div className="finanza-form-row">
                      <div className="finanza-field">
                        <div className="finanza-float">
                          <input
                            className={`finanza-input ${contactErrors.name ? 'is-invalid' : ''}`}
                            id="name"
                            name="name"
                            type="text"
                            placeholder=" "
                            autoComplete="name"
                            value={contactValues.name}
                            onChange={(e) => setContactValues((v) => ({ ...v, name: e.target.value }))}
                          />
                          <label className="finanza-label" htmlFor="name">
                            Your Name
                          </label>
                        </div>
                        {contactErrors.name ? <div className="finanza-error">{contactErrors.name}</div> : null}
                      </div>

                      <div className="finanza-field">
                        <div className="finanza-float">
                          <input
                            className={`finanza-input ${contactErrors.email ? 'is-invalid' : ''}`}
                            id="email"
                            name="email"
                            type="email"
                            placeholder=" "
                            autoComplete="email"
                            value={contactValues.email}
                            onChange={(e) => setContactValues((v) => ({ ...v, email: e.target.value }))}
                          />
                          <label className="finanza-label" htmlFor="email">
                            Your Email
                          </label>
                        </div>
                        {contactErrors.email ? <div className="finanza-error">{contactErrors.email}</div> : null}
                      </div>
                    </div>

                    <div className="finanza-field">
                      <div className="finanza-float">
                        <input
                          className={`finanza-input ${contactErrors.subject ? 'is-invalid' : ''}`}
                          id="subject"
                          name="subject"
                          type="text"
                          placeholder=" "
                          value={contactValues.subject}
                          onChange={(e) => setContactValues((v) => ({ ...v, subject: e.target.value }))}
                        />
                        <label className="finanza-label" htmlFor="subject">
                          Subject
                        </label>
                      </div>
                      {contactErrors.subject ? <div className="finanza-error">{contactErrors.subject}</div> : null}
                    </div>

                    <div className="finanza-field">
                      <div className="finanza-float">
                        <textarea
                          className={`finanza-textarea ${contactErrors.message ? 'is-invalid' : ''}`}
                          id="message"
                          name="message"
                          rows={5}
                          placeholder=" "
                          value={contactValues.message}
                          onChange={(e) => setContactValues((v) => ({ ...v, message: e.target.value }))}
                        />
                        <label className="finanza-label" htmlFor="message">
                          Message
                        </label>
                      </div>
                      {contactErrors.message ? <div className="finanza-error">{contactErrors.message}</div> : null}
                    </div>

                    <button className="finanza-btn finanza-btn--primary" type="submit">
                      Send Message
                    </button>
                  </form>
                </div>

                <div className="finanza-contact-map" aria-label="Map" data-animate>
                  <iframe
                    title="Map"
                    className="finanza-map"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=-74.019%2C40.700%2C-73.971%2C40.732&layer=mapnik"
                  />
                </div>
              </div>
            </div>
          </section>
        </main>

        <FinanzaFooter />

        <a className="finanza-backtotop" href="#top" aria-label="Back to top">
          <i className="fa-solid fa-arrow-up" />
        </a>

        {authModal ? (
          <div
            className="finanza-modal"
            role="dialog"
            aria-modal="true"
            aria-label={authModal === 'login' ? 'Login' : 'Register'}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeAuth();
            }}
          >
            <div className="finanza-modal-card">
              <div className="finanza-modal-top">
                <div className="finanza-modal-title">{authModal === 'login' ? 'Sign in' : 'Create account'}</div>
                <button type="button" className="finanza-modal-close" aria-label="Close" onClick={closeAuth}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {authModal === 'login' ? (
                <form
                  className="finanza-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    postLogin(getLocalizedRoute('login'), {
                      preserveScroll: true,
                      onSuccess: () => setAuthModal(null),
                      onFinish: () => resetLogin('password'),
                    });
                  }}
                >
                  <div className="finanza-field">
                    <div className="finanza-float">
                      <input
                        className="finanza-input"
                        id="loginEmail"
                        type="email"
                        placeholder=" "
                        autoComplete="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData('email', e.target.value)}
                        required
                      />
                      <label className="finanza-label" htmlFor="loginEmail">
                        Email
                      </label>
                    </div>
                    {loginErrors.email ? <div className="finanza-error">{loginErrors.email}</div> : null}
                  </div>
                  <div className="finanza-field">
                    <div className="finanza-float">
                      <input
                        className="finanza-input"
                        id="loginPassword"
                        type="password"
                        placeholder=" "
                        autoComplete="current-password"
                        value={loginData.password}
                        onChange={(e) => setLoginData('password', e.target.value)}
                        required
                      />
                      <label className="finanza-label" htmlFor="loginPassword">
                        Password
                      </label>
                    </div>
                    {loginErrors.password ? <div className="finanza-error">{loginErrors.password}</div> : null}
                  </div>
                  <label className="finanza-check">
                    <input
                      type="checkbox"
                      checked={loginData.remember}
                      onChange={(e) => setLoginData('remember', e.target.checked)}
                    />{' '}
                    Remember me
                  </label>
                  <button className="finanza-btn finanza-btn--primary" type="submit" disabled={loginProcessing}>
                    Login
                  </button>
                  <button type="button" className="finanza-btn finanza-btn--ghost" onClick={() => setAuthModal('register')}>
                    Create an account
                  </button>
                  <a className="finanza-modal-link" href={loginHref}>
                    Open full login page
                  </a>
                </form>
              ) : (
                <form
                  className="finanza-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    postRegister(getLocalizedRoute('register'), {
                      preserveScroll: true,
                      onSuccess: () => setAuthModal(null),
                      onFinish: () => resetRegister('password', 'password_confirmation'),
                    });
                  }}
                >
                  <div className="finanza-field">
                    <div className="finanza-float">
                      <input
                        className="finanza-input"
                        id="regName"
                        type="text"
                        placeholder=" "
                        autoComplete="name"
                        value={registerData.name}
                        onChange={(e) => setRegisterData('name', e.target.value)}
                        required
                      />
                      <label className="finanza-label" htmlFor="regName">
                        Name
                      </label>
                    </div>
                    {registerErrors.name ? <div className="finanza-error">{registerErrors.name}</div> : null}
                  </div>
                  <div className="finanza-field">
                    <div className="finanza-float">
                      <input
                        className="finanza-input"
                        id="regEmail"
                        type="email"
                        placeholder=" "
                        autoComplete="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData('email', e.target.value)}
                        required
                      />
                      <label className="finanza-label" htmlFor="regEmail">
                        Email
                      </label>
                    </div>
                    {registerErrors.email ? <div className="finanza-error">{registerErrors.email}</div> : null}
                  </div>
                  <div className="finanza-field">
                    <div className="finanza-float">
                      <input
                        className="finanza-input"
                        id="regPassword"
                        type="password"
                        placeholder=" "
                        autoComplete="new-password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData('password', e.target.value)}
                        required
                      />
                      <label className="finanza-label" htmlFor="regPassword">
                        Password
                      </label>
                    </div>
                    {registerErrors.password ? <div className="finanza-error">{registerErrors.password}</div> : null}
                  </div>
                  <div className="finanza-field">
                    <div className="finanza-float">
                      <input
                        className="finanza-input"
                        id="regPassword2"
                        type="password"
                        placeholder=" "
                        autoComplete="new-password"
                        value={registerData.password_confirmation}
                        onChange={(e) => setRegisterData('password_confirmation', e.target.value)}
                        required
                      />
                      <label className="finanza-label" htmlFor="regPassword2">
                        Confirm password
                      </label>
                    </div>
                    {registerErrors.password_confirmation ? (
                      <div className="finanza-error">{registerErrors.password_confirmation}</div>
                    ) : null}
                  </div>
                  <button className="finanza-btn finanza-btn--primary" type="submit" disabled={registerProcessing}>
                    Register
                  </button>
                  <button type="button" className="finanza-btn finanza-btn--ghost" onClick={() => setAuthModal('login')}>
                    I already have an account
                  </button>
                  <Link className="finanza-modal-link" href={registerHref}>
                    Open full register page
                  </Link>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default Home;
