import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import '../../../css/homepage/rtl.scss';
import { FinanzaFooter } from './components/Footer';
import { FinanzaHeader } from './components/Header';

export { FinanzaFooter, FinanzaHeader };

const Home = () => {
  const { auth, localization } = usePage().props;
  console.log('Localization Props:', localization);
  console.log('Translations:', localization?.translations);
  const isRtl = localization?.is_rtl;
  const countryCode =
    localization?.country_code ||
    (typeof localization?.current_country === 'string'
      ? localization.current_country
      : localization?.current_country?.code?.toLowerCase?.()) ||
    'sa';
  const locale = localization?.current_locale || localization?.locale || 'en';

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [isRtl, locale]);
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

  const translations = localization?.translations || {};
  const t = (key, fallback = null) => {
    const groupKey = `homepage.${key}`;
    return translations[groupKey] || translations[key] || fallback || key;
  };
  const slides = useMemo(
    () => [
      {
        image: '/storage/images/carousel-1.jpg',
        title: t('hero_slide_1_title', 'Your Financial Status Is Our Goal'),
        subtitle: t('hero_slide_1_subtitle', 'Modern finance support for startups, SMBs, and enterprises.'),
        ctaLabel: t('hero_btn_explore', 'Explore More'),
        ctaHref: '#services',
      },
      {
        image: '/storage/images/carousel-2.jpg',
        title: t('hero_slide_2_title', 'Smarter Growth With Data-Driven Strategy'),
        subtitle: t('hero_slide_2_subtitle', 'Planning, reporting, and investment guidance built for scale.'),
        ctaLabel: t('hero_btn_view_services', 'View Services'),
        ctaHref: '#services',
      },
      {
        image: '/storage/images/header.jpg',
        title: t('hero_slide_3_title', 'Build Stronger Cashflow'),
        subtitle: t('hero_slide_3_subtitle', 'Reduce risk, improve margins, and keep your runway healthy.'),
        ctaLabel: t('hero_btn_contact', 'Contact Us'),
        ctaHref: '#contact',
      },
    ],
    [t]
  );

  const aboutImage = '/storage/images/about.jpg';

  const serviceCards = useMemo(
    () => [
      {
        icon: 'fa-solid fa-chart-line',
        title: t('service_financial_planning_title', 'Financial Planning'),
        text: t('service_financial_planning_text', 'Budgeting, forecasting, and KPI dashboards to support growth.'),
      },
      {
        icon: 'fa-solid fa-coins',
        title: t('service_cash_investment_title', 'Cash Investment'),
        text: t('service_cash_investment_text', 'Optimize liquidity and allocate capital with confidence.'),
      },
      {
        icon: 'fa-solid fa-briefcase',
        title: t('service_financial_consultancy_title', 'Financial Consultancy'),
        text: t('service_financial_consultancy_text', 'Expert guidance tailored to your business stage and goals.'),
      },
      {
        icon: 'fa-solid fa-hand-holding-dollar',
        title: t('service_business_loans_title', 'Business Loans'),
        text: t('service_business_loans_text', 'Structured financing options with clear terms and support.'),
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: t('service_risk_management_title', 'Risk Management'),
        text: t('service_risk_management_text', 'Identify, assess, and mitigate financial exposure proactively.'),
      },
      {
        icon: 'fa-solid fa-file-invoice-dollar',
        title: t('service_tax_reporting_title', 'Tax & Reporting'),
        text: t('service_tax_reporting_text', 'Accurate reporting and compliance-aligned documentation.'),
      },
    ],
    [t]
  );

  const projects = useMemo(
    () => [
      { title: t('service_financial_consultancy_title', 'Financial Consultancy'), src: '/storage/images/service-1.jpg', tag: t('project_tag_consulting', 'Consulting') },
      { title: t('service_business_loans_title', 'Business Loans'), src: '/storage/images/service-2.jpg', tag: t('project_tag_funding', 'Funding') },
      { title: t('service_financial_planning_title', 'Financial Planning'), src: '/storage/images/service-3.jpg', tag: t('project_tag_planning', 'Planning') },
      { title: t('service_risk_management_title', 'Risk Management'), src: '/storage/images/service-4.jpg', tag: t('project_tag_risk', 'Risk') },
      { title: t('service_cash_investment_title', 'Investment Strategy'), src: '/storage/images/carousel-2.jpg', tag: t('project_tag_invest', 'Invest') },
    ],
    [t]
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
    if (!values.name.trim()) nextErrors.name = t('contact_error_name_required', 'Name is required.');
    if (!values.email.trim()) nextErrors.email = t('contact_error_email_required', 'Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = t('contact_error_email_invalid', 'Enter a valid email.');
    if (!values.subject.trim()) nextErrors.subject = t('contact_error_subject_required', 'Subject is required.');
    if (!values.message.trim()) nextErrors.message = t('contact_error_message_required', 'Message is required.');
    else if (values.message.trim().length < 10) nextErrors.message = t('contact_error_message_min', 'Message must be at least 10 characters.');
    return nextErrors;
  };

  const onContactSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateContact(contactValues);
    setContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setContactSuccess(t('contact_success', 'Thanks! Your message has been sent successfully.'));
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
          {t('skip_to_content', 'Skip to content')}
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
          t={t}
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
                      {t('hero_kicker', 'Welcome to ZodicERP')}
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
                    {t('about', 'About Us')}
                  </div>
                  <h2 className="finanza-title" data-animate>
                    {t('about_title', 'We Help Our Clients To Grow Their Business')}
                  </h2>
                  <p className="finanza-muted" data-animate>
                    {t('about_description', 'Tempor erat elitr rebum at clita. Diam dolor diam ipsum sit. Aliqu diam amet diam et eos. Clita erat ipsum et lorem et sit, sed stet lorem sit clita duo justo magna dolore erat amet')}
                  </p>
                  <div className="finanza-about-bullets" data-animate>
                    <div className="finanza-bullet">
                      <i className="fa-solid fa-check" /> {t('about_bullet_1', 'No Hidden Costs')}
                    </div>
                    <div className="finanza-bullet">
                      <i className="fa-solid fa-check" /> {t('about_bullet_2', 'Dedicated Team')}
                    </div>
                    <div className="finanza-bullet">
                      <i className="fa-solid fa-check" /> {t('about_bullet_3', '24/7 Support')}
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
                    <div className="finanza-feature-title">{t('feature_no_hidden_cost_title', 'No Hidden Cost')}</div>
                    <div className="finanza-feature-text">{t('feature_no_hidden_cost_text', 'Clita erat ipsum lorem sit sed stet duo justo')}</div>
                  </div>
                </div>
                <div className="finanza-feature" data-animate>
                  <div className="finanza-feature-icon">
                    <i className="fa-solid fa-users" />
                  </div>
                  <div className="finanza-feature-body">
                    <div className="finanza-feature-title">{t('feature_dedicated_team_title', 'Dedicated Team')}</div>
                    <div className="finanza-feature-text">{t('feature_dedicated_team_text', 'Clita erat ipsum lorem sit sed stet duo justo')}</div>
                  </div>
                </div>
                <div className="finanza-feature" data-animate>
                  <div className="finanza-feature-icon">
                    <i className="fa-solid fa-phone" />
                  </div>
                  <div className="finanza-feature-body">
                    <div className="finanza-feature-title">{t('feature_24_7_available_title', '24/7 Available')}</div>
                    <div className="finanza-feature-text">{t('feature_24_7_available_text', 'Clita erat ipsum lorem sit sed stet duo justo')}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="services" className="finanza-section finanza-section--alt" aria-label="Services">
            <div className="container-fluid">
              <div className="finanza-center">
                <div className="finanza-pill" data-animate>
                  {t('services', 'Services')}
                </div>
                <h2 className="finanza-title">{t('services_title', 'Awesome Financial Services For Business')}</h2>
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
                       {t('service_read_more', 'Read more')} <i className="fa-solid fa-arrow-right" />
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
                  {t('our_projects', 'Our Projects')}
                </div>
                <h2 className="finanza-title">{t('projects_title', 'We Have Completed Latest Projects')}</h2>
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
                <div className="finanza-pill">{t('contact', 'Contact')}</div>
                <h2 className="finanza-title">{t('contact_title', 'If You Have Any Query, Please Contact Us')}</h2>
                <p className="finanza-muted">{t('contact_subtitle', 'We usually reply within 24 hours.')}</p>

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
                            {t('contact_name_label', 'Your Name')}
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
                            {t('contact_email_label', 'Your Email')}
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
                          {t('contact_subject_label', 'Subject')}
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
                          {t('contact_message_label', 'Message')}
                        </label>
                      </div>
                      {contactErrors.message ? <div className="finanza-error">{contactErrors.message}</div> : null}
                    </div>

                    <button className="finanza-btn finanza-btn--primary" type="submit">
                      {t('contact_submit', 'Send Message')}
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

        <FinanzaFooter t={t} />

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
