import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FinanzaHeader } from './components/Header';
import { FinanzaFooter } from './components/Footer';
import '../../../css/homepage/rtl.scss';
import '../../../css/homepage/_career.scss';

export default function Career({ careers }) {
    const { localization, auth, flash } = usePage().props;
    const isRtl = localization?.is_rtl;
    const countryCode = 
        localization?.country_code || 
        (typeof localization?.current_country === 'string' 
            ? localization.current_country 
            : localization?.current_country?.code?.toLowerCase?.()) || 
        'sa';
    const currentLocale = localization?.current_locale || 'en';

    const t = (key, fallback = null) => {
        const translations = localization?.translations || {};
        return translations[`homepage.${key}`] || translations[`career.${key}`] || translations[key] || fallback || key;
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        name: auth?.user?.name || '',
        email: auth?.user?.email || '',
        phone: '',
        gender: '',
        age: '',
        nationality: '',
        country: '',
        city: '',
        area: '',
        qualification: 'bachelor',
        specialization: '',
        experience_years: '0',
        career_id: '',
        shift_type: [],
        expected_salary: '',
        availability_date: '',
        cv: null,
        certificates: null,
        message: '',
    });

    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('career.apply', { country: countryCode, lang: currentLocale }), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                // Reset file inputs manually as well to be sure
                const fileInputs = document.querySelectorAll('input[type="file"]');
                fileInputs.forEach(input => {
                    input.value = '';
                });
                
                setSuccessMessage(t('application_success', 'تم إرسال طلبك بنجاح!'));
                setTimeout(() => setSuccessMessage(''), 5000);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onError: (errors) => {
                const firstErrorKey = Object.keys(errors)[0];
                const element = document.getElementsByName(firstErrorKey)[0] || document.querySelector(`[className*="${firstErrorKey}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            },
        });
    };

    const handleCheckboxChange = (value) => {
        const currentShiftTypes = [...data.shift_type];
        if (currentShiftTypes.includes(value)) {
            setData('shift_type', currentShiftTypes.filter(type => type !== value));
        } else {
            setData('shift_type', [...currentShiftTypes, value]);
        }
    };

    const displaySuccess = successMessage || flash?.success;

    return (
        <div className="finanza-landing">
            <Head>
                <title>{t('career_title', 'Careers')}</title>
            </Head>
            
            <FinanzaHeader 
                variant="full" 
                t={t}
                localization={localization}
            />

            <main className="career-page-content">
                <section className="career-section">
                    <div className="container">
                        <div className="application-form-container">
                            <h2>{t('application_form_title', ' التوظيف')}</h2>

                            {displaySuccess && (
                                <div className="alert alert-success animate-fade-in">{displaySuccess}</div>
                            )}

                            {errors.form && (
                                <div className="alert alert-danger animate-fade-in">{errors.form}</div>
                            )}
                            
                            <form onSubmit={handleSubmit} className="career-form">
                                
                                {/* المعلومات الشخصية */}
                                <div className="section-title">{t('personal_info_section', 'المعلومات الشخصية')}</div>
                                <div className="grid">
                                    <div className="form-group">
                                        <label>{t('name_label', 'الاسم الكامل')}</label>
                                        <input 
                                            name="name"
                                            type="text" 
                                            className={errors.name ? 'is-invalid' : ''}
                                            placeholder={t('name_placeholder', 'أدخل اسمك الكامل')}
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            required
                                        />
                                        {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('email_label', 'البريد الإلكتروني')}</label>
                                        <input 
                                            name="email"
                                            type="email" 
                                            className={errors.email ? 'is-invalid' : ''}
                                            placeholder="example@mail.com"
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            required
                                        />
                                        {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('phone_label', 'رقم الهاتف')}</label>
                                        <input 
                                            name="phone"
                                            type="tel" 
                                            dir="ltr"
                                            className={errors.phone ? 'is-invalid' : ''}
                                            placeholder="+20 15x xxx xxxx"
                                            value={data.phone}
                                            onChange={e => setData('phone', e.target.value)}
                                            required
                                        />
                                        {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('gender_label', 'الجنس')}</label>
                                        <div className="radio-group">
                                            <label className="radio-item">
                                                <input 
                                                    type="radio" 
                                                    name="gender" 
                                                    value="male"
                                                    checked={data.gender === 'male'}
                                                    onChange={e => setData('gender', e.target.value)}
                                                /> {t('male_label', 'ذكر')}
                                            </label>
                                            <label className="radio-item">
                                                <input 
                                                    type="radio" 
                                                    name="gender" 
                                                    value="female"
                                                    checked={data.gender === 'female'}
                                                    onChange={e => setData('gender', e.target.value)}
                                                /> {t('female_label', 'أنثى')}
                                            </label>
                                        </div>
                                        {errors.gender && <div className="invalid-feedback d-block">{errors.gender}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('age_label', 'العمر')}</label>
                                        <input 
                                            name="age"
                                            type="number" 
                                            min="18"
                                            max="65"
                                            className={errors.age ? 'is-invalid' : ''}
                                            placeholder={t('age_placeholder', 'مثال: 25')}
                                            value={data.age}
                                            onChange={e => setData('age', e.target.value)}
                                            required
                                        />
                                        {errors.age && <div className="invalid-feedback d-block">{errors.age}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('nationality_label', 'الجنسية')}</label>
                                        <select 
                                            name="nationality"
                                            className={errors.nationality ? 'is-invalid' : ''}
                                            value={data.nationality}
                                            onChange={e => setData('nationality', e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>{t('select_nationality', 'اختر الجنسية')}</option>
                                            <option value="egyptian">{t('egyptian_label', 'مصري')}</option>
                                            <option value="other">{t('other_label', 'أخرى')}</option>
                                        </select>
                                        {errors.nationality && <div className="invalid-feedback d-block">{errors.nationality}</div>}
                                    </div>
                                </div>

                                {/* معلومات السكن */}
                                <div className="section-title">{t('address_info_section', 'معلومات السكن')}</div>
                                <div className="grid">
                                    <div className="form-group">
                                        <label>{t('country_label', 'الدولة')}</label>
                                        <input 
                                            name="country"
                                            type="text" 
                                            className={errors.country ? 'is-invalid' : ''}
                                            placeholder={t('country_placeholder', 'اختر الدولة')}
                                            value={data.country}
                                            onChange={e => setData('country', e.target.value)}
                                            required
                                        />
                                        {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('city_label', 'المدينة')}</label>
                                        <input 
                                            name="city"
                                            type="text" 
                                            className={errors.city ? 'is-invalid' : ''}
                                            placeholder={t('city_placeholder', 'اختر المدينة')}
                                            value={data.city}
                                            onChange={e => setData('city', e.target.value)}
                                            required
                                        />
                                        {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>{t('area_label', 'الحي / المنطقة')}</label>
                                        <input 
                                            name="area"
                                            type="text" 
                                            className={errors.area ? 'is-invalid' : ''}
                                            placeholder={t('area_placeholder', 'اكتب الحي')}
                                            value={data.area}
                                            onChange={e => setData('area', e.target.value)}
                                        />
                                        {errors.area && <div className="invalid-feedback d-block">{errors.area}</div>}
                                    </div>
                                </div>

                                {/* المعلومات التعليمية */}
                                <div className="section-title">{t('education_info_section', 'المعلومات التعليمية والخبرة')}</div>
                                <div className="grid">
                                    <div className="form-group">
                                        <label>{t('qualification_label', 'المؤهل الدراسي')}</label>
                                        <select 
                                            name="qualification"
                                            className={errors.qualification ? 'is-invalid' : ''}
                                            value={data.qualification}
                                            onChange={e => setData('qualification', e.target.value)}
                                            required
                                        >
                                            <option value="high-school">{t('high_school_label', 'ثانوية')}</option>
                                            <option value="diploma">{t('diploma_label', 'دبلوم')}</option>
                                            <option value="bachelor">{t('bachelor_label', 'بكالوريوس')}</option>
                                            <option value="master">{t('master_label', 'ماجستير')}</option>
                                        </select>
                                        {errors.qualification && <div className="invalid-feedback d-block">{errors.qualification}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('specialization_label', 'التخصص')}</label>
                                        <input 
                                            name="specialization"
                                            type="text" 
                                            className={errors.specialization ? 'is-invalid' : ''}
                                            placeholder={t('specialization_placeholder', 'علوم حاسب / محاسبة ...')}
                                            value={data.specialization}
                                            onChange={e => setData('specialization', e.target.value)}
                                            required
                                        />
                                        {errors.specialization && <div className="invalid-feedback d-block">{errors.specialization}</div>}
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>{t('experience_years_label', 'سنوات الخبرة')}</label>
                                        <select 
                                            name="experience_years"
                                            className={errors.experience_years ? 'is-invalid' : ''}
                                            value={data.experience_years}
                                            onChange={e => setData('experience_years', e.target.value)}
                                        >
                                            <option value="0">{t('no_experience', 'بدون خبرة')}</option>
                                            <option value="1">{t('one_year', 'سنة واحدة')}</option>
                                            <option value="3">{t('three_years', '3 سنوات')}</option>
                                            <option value="5">{t('five_plus_years', '5 سنوات فأكثر')}</option>
                                        </select>
                                        {errors.experience_years && <div className="invalid-feedback d-block">{errors.experience_years}</div>}
                                    </div>
                                </div>

                                {/* معلومات الوظيفة */}
                                <div className="section-title">{t('job_info_section', 'معلومات الوظيفة')}</div>
                                <div className="grid">
                                    <div className="form-group">
                                        <label>{t('job_label', 'الوظيفة المطلوبة')}</label>
                                        <select 
                                            name="career_id"
                                            className={errors.career_id ? 'is-invalid' : ''}
                                            value={data.career_id}
                                            onChange={e => setData('career_id', e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>{t('select_job_placeholder', 'اختر وظيفة...')}</option>
                                            {careers.map(career => (
                                                <option key={career.id} value={career.id}>
                                                    {career.title} - {career.location}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.career_id && <div className="invalid-feedback d-block">{errors.career_id}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('shift_type_label', 'نوع الدوام')}</label>
                                        <div className="radio-group">
                                            <label className="radio-item">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.shift_type.includes('full-time')}
                                                    onChange={() => handleCheckboxChange('full-time')}
                                                /> {t('full_time_label', 'دوام كامل')}
                                            </label>
                                            <label className="radio-item">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.shift_type.includes('remote')}
                                                    onChange={() => handleCheckboxChange('remote')}
                                                /> {t('remote_label', 'عن بعد')}
                                            </label>
                                        </div>
                                        {errors.shift_type && <div className="invalid-feedback d-block">{errors.shift_type}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('expected_salary_label', 'الراتب المتوقع')}</label>
                                        <input 
                                            name="expected_salary"
                                            type="number" 
                                            className={errors.expected_salary ? 'is-invalid' : ''}
                                            placeholder={t('salary_placeholder', 'مثال: 8000')}
                                            value={data.expected_salary}
                                            onChange={e => setData('expected_salary', e.target.value)}
                                        />
                                        {errors.expected_salary && <div className="invalid-feedback d-block">{errors.expected_salary}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('availability_date_label', 'تاريخ التوفر للعمل')}</label>
                                        <input 
                                            name="availability_date"
                                            type="text" 
                                            className={errors.availability_date ? 'is-invalid' : ''}
                                            placeholder={t('availability_placeholder', 'Immediately / خلال شهر')}
                                            value={data.availability_date}
                                            onChange={e => setData('availability_date', e.target.value)}
                                        />
                                        {errors.availability_date && <div className="invalid-feedback d-block">{errors.availability_date}</div>}
                                    </div>
                                </div>

                                {/* الملفات */}
                                <div className="section-title">{t('files_section', 'الملفات والمرفقات')}</div>
                                <div className="grid">
                                    <div className="form-group">
                                        <label>{t('cv_label', 'إرفاق السيرة الذاتية (PDF, DOC)')}</label>
                                        <div className="file-input-wrapper">
                                            <input 
                                                name="cv"
                                                type="file" 
                                                className={errors.cv ? 'is-invalid' : ''}
                                                onChange={e => setData('cv', e.target.files[0])}
                                                accept=".pdf,.doc,.docx"
                                                required
                                            />
                                        </div>
                                        {errors.cv && <div className="invalid-feedback d-block">{errors.cv}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('certificates_label', 'شهادات إضافية (اختياري)')}</label>
                                        <div className="file-input-wrapper">
                                            <input 
                                                name="certificates"
                                                type="file" 
                                                className={errors.certificates ? 'is-invalid' : ''}
                                                onChange={e => setData('certificates', e.target.files[0])}
                                                accept=".pdf,.doc,.docx,.jpg,.png"
                                            />
                                        </div>
                                        {errors.certificates && <div className="invalid-feedback d-block">{errors.certificates}</div>}
                                    </div>
                                </div>

                                {/* الرسالة التعريفية */}
                                <div className="section-title">{t('message_section', 'الرسالة التعريفية')}</div>
                                <div className="form-group">
                                    <label>{t('message_label', 'لماذا ترغب في الانضمام إلينا؟')}</label>
                                    <textarea 
                                        name="message"
                                        className={errors.message ? 'is-invalid' : ''}
                                        placeholder={t('message_placeholder', 'تحدث باختصار عن خبراتك، مهاراتك، ولماذا أنت الشخص المناسب لهذه الوظيفة...')}
                                        value={data.message}
                                        onChange={e => setData('message', e.target.value)}
                                    ></textarea>
                                    {errors.message && <div className="invalid-feedback d-block">{errors.message}</div>}
                                </div>

                                <button 
                                    type="submit" 
                                    className="submit-btn"
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin me-2"></i>
                                            {t('submitting_btn', 'جاري الإرسال...')}
                                        </>
                                    ) : t('submit_application_btn', 'إرسال الطلب')}
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </main>

            <FinanzaFooter t={t} />
        </div>
    );
}
