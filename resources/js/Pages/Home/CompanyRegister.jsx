import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FinanzaFooter, FinanzaHeader } from '@/Pages/Home/Home';

export default function CompanyRegister() {
  const { localization } = usePage().props;

  const countryCode = localization?.country_code || 'sa';
  const locale = localization?.current_locale || localization?.locale || 'ar';

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: countryCode,
      lang: locale,
      ...params,
    });
  };

  const { data, setData, post, processing, errors, reset } = useForm({
    company_name: '',
    english_name: '',
    company_type: '',
    job_title: '',
    mobile: '',
    country: '',
    city: '',
    area: '',
    address: '',
    logo: null,

    accountant_name: '',
    commercial_registration: '',
    tax_number: '',
    vat_number: '',
    date_of_establishment: '',
    social_insurance_number: '',
    annual_goals: '',
    storage: '',
    work_center: '',
    subsidiary_company: '',

    email_address: '',
    official_email: '',
    facebook: '',
    telegram: '',
    youtube: '',
    instagram: '',

    account_holder_name: '',
    bank_name: '',
    iban: '',
    branch_name: '',
    swift_bic: '',
    bank_address: '',
  });

  const submit = (e) => {
    e.preventDefault();

    post(getLocalizedRoute('company.register.store'), {
      forceFormData: true,
      onFinish: () => reset('logo'),
    });
  };

  return (
    <div id="top" className="finanza-landing finanza-companyRegister">
      <FinanzaHeader
        variant="minimal"
        homeHref={getLocalizedRoute('home')}
        loginHref={getLocalizedRoute('login')}
        registerHref={getLocalizedRoute('register')}
      />

      <main id="main-content" className="finanza-companyRegister-main">
        <Head title="Company Registration" />

        <div className="finanza-companyRegister-card">
          <div className="finanza-companyRegister-header">
            <div className="finanza-companyRegister-title">استكمال بيانات الشركة</div>
            <div className="finanza-companyRegister-subtitle">أدخل بيانات الشركة لإتمام إعداد الحساب</div>
          </div>

          <form onSubmit={submit} className="finanza-companyRegister-form">
            <div className="finanza-companyRegister-grid">
              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="company_name"
                    type="text"
                    placeholder=" "
                    value={data.company_name}
                    onChange={(e) => setData('company_name', e.target.value)}
                    required
                  />
                  <label className="finanza-label" htmlFor="company_name">
                    اسم الشركة
                  </label>
                </div>
                {errors.company_name ? <div className="finanza-error">{errors.company_name}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="english_name"
                    type="text"
                    placeholder=" "
                    value={data.english_name}
                    onChange={(e) => setData('english_name', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="english_name">
                    الاسم بالإنجليزية
                  </label>
                </div>
                {errors.english_name ? <div className="finanza-error">{errors.english_name}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="company_type"
                    type="text"
                    placeholder=" "
                    value={data.company_type}
                    onChange={(e) => setData('company_type', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="company_type">
                    نوع الشركة
                  </label>
                </div>
                {errors.company_type ? <div className="finanza-error">{errors.company_type}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="job_title"
                    type="text"
                    placeholder=" "
                    value={data.job_title}
                    onChange={(e) => setData('job_title', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="job_title">
                    المسمى الوظيفي
                  </label>
                </div>
                {errors.job_title ? <div className="finanza-error">{errors.job_title}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="mobile"
                    type="text"
                    placeholder=" "
                    value={data.mobile}
                    onChange={(e) => setData('mobile', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="mobile">
                    رقم الجوال
                  </label>
                </div>
                {errors.mobile ? <div className="finanza-error">{errors.mobile}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="email_address"
                    type="email"
                    placeholder=" "
                    value={data.email_address}
                    onChange={(e) => setData('email_address', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="email_address">
                    البريد الإلكتروني
                  </label>
                </div>
                {errors.email_address ? <div className="finanza-error">{errors.email_address}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="official_email"
                    type="email"
                    placeholder=" "
                    value={data.official_email}
                    onChange={(e) => setData('official_email', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="official_email">
                    البريد الرسمي
                  </label>
                </div>
                {errors.official_email ? <div className="finanza-error">{errors.official_email}</div> : null}
              </div>

              <div className="finanza-field finanza-companyRegister-full">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="address"
                    type="text"
                    placeholder=" "
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="address">
                    العنوان
                  </label>
                </div>
                {errors.address ? <div className="finanza-error">{errors.address}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="country"
                    type="text"
                    placeholder=" "
                    value={data.country}
                    onChange={(e) => setData('country', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="country">
                    الدولة
                  </label>
                </div>
                {errors.country ? <div className="finanza-error">{errors.country}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="city"
                    type="text"
                    placeholder=" "
                    value={data.city}
                    onChange={(e) => setData('city', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="city">
                    المدينة
                  </label>
                </div>
                {errors.city ? <div className="finanza-error">{errors.city}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="area"
                    type="text"
                    placeholder=" "
                    value={data.area}
                    onChange={(e) => setData('area', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="area">
                    المنطقة
                  </label>
                </div>
                {errors.area ? <div className="finanza-error">{errors.area}</div> : null}
              </div>

              <div className="finanza-field finanza-companyRegister-full">
                <div className="finanza-companyRegister-upload">
                  <label className="finanza-companyRegister-uploadLabel" htmlFor="logo">
                    شعار الشركة (اختياري)
                  </label>
                  <input
                    className="finanza-companyRegister-file"
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setData('logo', e.target.files?.[0] || null)}
                  />
                  {errors.logo ? <div className="finanza-error">{errors.logo}</div> : null}
                </div>
              </div>
            </div>

            <div className="finanza-companyRegister-sep" />

            <div className="finanza-companyRegister-sectionTitle">بيانات ضريبية وإدارية</div>
            <div className="finanza-companyRegister-grid">
              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="accountant_name"
                    type="text"
                    placeholder=" "
                    value={data.accountant_name}
                    onChange={(e) => setData('accountant_name', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="accountant_name">
                    اسم المحاسب
                  </label>
                </div>
                {errors.accountant_name ? <div className="finanza-error">{errors.accountant_name}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="commercial_registration"
                    type="text"
                    placeholder=" "
                    value={data.commercial_registration}
                    onChange={(e) => setData('commercial_registration', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="commercial_registration">
                    السجل التجاري
                  </label>
                </div>
                {errors.commercial_registration ? <div className="finanza-error">{errors.commercial_registration}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="tax_number"
                    type="text"
                    placeholder=" "
                    value={data.tax_number}
                    onChange={(e) => setData('tax_number', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="tax_number">
                    الرقم الضريبي
                  </label>
                </div>
                {errors.tax_number ? <div className="finanza-error">{errors.tax_number}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="vat_number"
                    type="text"
                    placeholder=" "
                    value={data.vat_number}
                    onChange={(e) => setData('vat_number', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="vat_number">
                    رقم VAT
                  </label>
                </div>
                {errors.vat_number ? <div className="finanza-error">{errors.vat_number}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="date_of_establishment"
                    type="date"
                    placeholder=" "
                    value={data.date_of_establishment}
                    onChange={(e) => setData('date_of_establishment', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="date_of_establishment">
                    تاريخ التأسيس
                  </label>
                </div>
                {errors.date_of_establishment ? <div className="finanza-error">{errors.date_of_establishment}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="social_insurance_number"
                    type="text"
                    placeholder=" "
                    value={data.social_insurance_number}
                    onChange={(e) => setData('social_insurance_number', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="social_insurance_number">
                    رقم التأمينات الاجتماعية
                  </label>
                </div>
                {errors.social_insurance_number ? <div className="finanza-error">{errors.social_insurance_number}</div> : null}
              </div>
            </div>

            <div className="finanza-companyRegister-sep" />

            <div className="finanza-companyRegister-sectionTitle">بيانات التشغيل</div>
            <div className="finanza-companyRegister-grid">
              <div className="finanza-field finanza-companyRegister-full">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="annual_goals"
                    type="text"
                    placeholder=" "
                    value={data.annual_goals}
                    onChange={(e) => setData('annual_goals', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="annual_goals">
                    الأهداف السنوية
                  </label>
                </div>
                {errors.annual_goals ? <div className="finanza-error">{errors.annual_goals}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="storage"
                    type="text"
                    placeholder=" "
                    value={data.storage}
                    onChange={(e) => setData('storage', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="storage">
                    المخزن
                  </label>
                </div>
                {errors.storage ? <div className="finanza-error">{errors.storage}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="work_center"
                    type="text"
                    placeholder=" "
                    value={data.work_center}
                    onChange={(e) => setData('work_center', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="work_center">
                    مركز العمل
                  </label>
                </div>
                {errors.work_center ? <div className="finanza-error">{errors.work_center}</div> : null}
              </div>

              <div className="finanza-field finanza-companyRegister-full">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="subsidiary_company"
                    type="text"
                    placeholder=" "
                    value={data.subsidiary_company}
                    onChange={(e) => setData('subsidiary_company', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="subsidiary_company">
                    الشركة التابعة
                  </label>
                </div>
                {errors.subsidiary_company ? <div className="finanza-error">{errors.subsidiary_company}</div> : null}
              </div>
            </div>

            <div className="finanza-companyRegister-sep" />

            <div className="finanza-companyRegister-sectionTitle">روابط التواصل</div>
            <div className="finanza-companyRegister-grid">
              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="facebook"
                    type="text"
                    placeholder=" "
                    value={data.facebook}
                    onChange={(e) => setData('facebook', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="facebook">
                    Facebook
                  </label>
                </div>
                {errors.facebook ? <div className="finanza-error">{errors.facebook}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="instagram"
                    type="text"
                    placeholder=" "
                    value={data.instagram}
                    onChange={(e) => setData('instagram', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="instagram">
                    Instagram
                  </label>
                </div>
                {errors.instagram ? <div className="finanza-error">{errors.instagram}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="telegram"
                    type="text"
                    placeholder=" "
                    value={data.telegram}
                    onChange={(e) => setData('telegram', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="telegram">
                    Telegram
                  </label>
                </div>
                {errors.telegram ? <div className="finanza-error">{errors.telegram}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="youtube"
                    type="text"
                    placeholder=" "
                    value={data.youtube}
                    onChange={(e) => setData('youtube', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="youtube">
                    YouTube
                  </label>
                </div>
                {errors.youtube ? <div className="finanza-error">{errors.youtube}</div> : null}
              </div>
            </div>

            <div className="finanza-companyRegister-sep" />

            <div className="finanza-companyRegister-sectionTitle">الحساب البنكي</div>
            <div className="finanza-companyRegister-grid">
              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="account_holder_name"
                    type="text"
                    placeholder=" "
                    value={data.account_holder_name}
                    onChange={(e) => setData('account_holder_name', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="account_holder_name">
                    اسم صاحب الحساب
                  </label>
                </div>
                {errors.account_holder_name ? <div className="finanza-error">{errors.account_holder_name}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="bank_name"
                    type="text"
                    placeholder=" "
                    value={data.bank_name}
                    onChange={(e) => setData('bank_name', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="bank_name">
                    اسم البنك
                  </label>
                </div>
                {errors.bank_name ? <div className="finanza-error">{errors.bank_name}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="iban"
                    type="text"
                    placeholder=" "
                    value={data.iban}
                    onChange={(e) => setData('iban', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="iban">
                    IBAN
                  </label>
                </div>
                {errors.iban ? <div className="finanza-error">{errors.iban}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="branch_name"
                    type="text"
                    placeholder=" "
                    value={data.branch_name}
                    onChange={(e) => setData('branch_name', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="branch_name">
                    اسم الفرع
                  </label>
                </div>
                {errors.branch_name ? <div className="finanza-error">{errors.branch_name}</div> : null}
              </div>

              <div className="finanza-field">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="swift_bic"
                    type="text"
                    placeholder=" "
                    value={data.swift_bic}
                    onChange={(e) => setData('swift_bic', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="swift_bic">
                    SWIFT/BIC
                  </label>
                </div>
                {errors.swift_bic ? <div className="finanza-error">{errors.swift_bic}</div> : null}
              </div>

              <div className="finanza-field finanza-companyRegister-full">
                <div className="finanza-float">
                  <input
                    className="finanza-input"
                    id="bank_address"
                    type="text"
                    placeholder=" "
                    value={data.bank_address}
                    onChange={(e) => setData('bank_address', e.target.value)}
                  />
                  <label className="finanza-label" htmlFor="bank_address">
                    عنوان البنك
                  </label>
                </div>
                {errors.bank_address ? <div className="finanza-error">{errors.bank_address}</div> : null}
              </div>
            </div>

            <div className="finanza-companyRegister-actions">
              <PrimaryActions processing={processing} />
              <Link className="finanza-companyRegister-skip" href={getLocalizedRoute('dashboard')}>
                تخطي الآن
              </Link>
            </div>
          </form>
        </div>
      </main>

      <FinanzaFooter />
    </div>
  );
}

function PrimaryActions({ processing }) {
  return (
    <button className="finanza-btn finanza-btn--primary finanza-companyRegister-submit" type="submit" disabled={processing}>
      حفظ بيانات الشركة
    </button>
  );
}
