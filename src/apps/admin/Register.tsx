import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Globe, 
  CheckCircle2, 
  ChevronLeft, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api.js';
import { useAuthStore } from '../../shared/store/authStore.js';
import { getDeviceFingerprint } from '../../shared/utils/fingerprint.js';
import logoImg from '../../assets/TAWLA_Logo.png';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const initialPlan = (searchParams.get('plan') as 'trial' | 'basic' | 'pro') || 'trial';
  const invoiceId = searchParams.get('invoice_id') || searchParams.get('invoiceId') || '';

  const [formData, setFormData] = useState({
    name: searchParams.get('restaurant') || '',
    slug: '',
    ownerName: '',
    phone: '',
    email: searchParams.get('email') || '',
    address: '',
    username: '',
    password: '',
    plan: initialPlan,
    invoiceId: invoiceId,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [usernameStatus, setUsernameStatus] = useState<{
    checked: boolean;
    available: boolean;
    checking: boolean;
    message: string;
  }>({
    checked: false,
    available: true,
    checking: false,
    message: '',
  });

  // Auto generate slug from restaurant name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w\u0621-\u064A-]+/g, '');

    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === prev.name.toLowerCase().trim().replace(/[\s_]+/g, '-') ? generatedSlug : prev.slug,
    }));
  };

  // Check username availability on blur
  const handleUsernameBlur = async () => {
    const uname = formData.username.toLowerCase().trim();
    if (!uname || uname.length < 3) return;

    setUsernameStatus(prev => ({ ...prev, checking: true }));
    try {
      const res = await api.get(`/auth/check-username?username=${encodeURIComponent(uname)}`);
      if (res.data?.data) {
        setUsernameStatus({
          checked: true,
          available: res.data.data.available,
          checking: false,
          message: res.data.data.message,
        });
      }
    } catch {
      setUsernameStatus({ checked: false, available: true, checking: false, message: '' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error('يرجى كتابة اسم المطعم أو الكافيه.');
    if (!formData.slug.trim()) return toast.error('يرجى تحديد الرابط المميز (Slug).');
    if (!formData.ownerName.trim()) return toast.error('يرجى كتابة اسم المدير أو المسؤول.');
    if (!formData.phone.trim() || formData.phone.length < 10) return toast.error('يرجى كتابة رقم هاتف صالح للتواصل.');
    if (!formData.username.trim() || formData.username.length < 3) return toast.error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل.');
    if (!/^[a-z0-9_.-]+$/.test(formData.username.toLowerCase().trim())) {
      return toast.error('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام فقط.');
    }
    if (usernameStatus.checked && !usernameStatus.available) {
      return toast.error('اسم المستخدم محجوز بالفعل، يرجى اختيار اسم مستخدم آخر.');
    }
    if (!formData.password || formData.password.length < 6) return toast.error('كلمة المرور يجب أن تكون 6 خانات على الأقل.');
    if (!agreedToTerms) return toast.error('يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية.');

    setIsSubmitting(true);

    try {
      const cleanUsername = formData.username.toLowerCase().trim();
      const deviceFingerprint = await getDeviceFingerprint();

      const response = await api.post('/auth/register-restaurant', {
        name: formData.name.trim(),
        slug: formData.slug.toLowerCase().trim(),
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        username: cleanUsername,
        password: formData.password,
        plan: formData.plan,
        invoiceId: formData.invoiceId || undefined,
        deviceFingerprint,
      });

      const data = response.data?.data;
      if (data?.accessToken && data?.user && data?.restaurant) {
        toast.success('🎉 تم إنشاء حساب مطعمك وتفعيله بنجاح! جاري تحويلك للوحة التحكم...');
        loginStore(data.accessToken, data.user, data.restaurant, data.offlineLease);
        setTimeout(() => {
          navigate('/admin');
        }, 800);
      } else {
        toast.success('تم تسجيل الحساب بنجاح، يمكنك تسجيل الدخول الآن.');
        navigate('/login');
      }
    } catch (err: any) {
      console.error('[Registration Error]:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'تعذر تسجيل الحساب، يرجى مراجعة البيانات.';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1612] font-sans antialiased selection:bg-[#801B2C]/15 selection:text-[#801B2C]" dir="rtl">
      <Toaster position="top-center" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#801B2C]/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoImg} alt="طاولة" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-[19px] font-extrabold text-[#1C1612] tracking-tight" style={{ fontFamily: '"Tajawal", sans-serif' }}>
                طـاولـة <span className="text-[#801B2C]">.</span>
              </span>
              <span className="text-[10px] text-[#5C524C]/70 -mt-1 font-medium">تسجيل حساب مطعم جديد</span>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold text-[#5C524C]">
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              تفعيل فوري خلال 60 ثانية
            </span>
            <Link to="/login" className="flex items-center gap-1 text-[#801B2C] hover:underline">
              لديك حساب؟ تسجيل الدخول
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
        {/* Title */}
        <div className="mb-10 text-center sm:text-right">
          <span className="text-xs font-bold text-[#801B2C] uppercase tracking-wider bg-[#801B2C]/5 px-3 py-1 rounded-full border border-[#801B2C]/15">
            حساب جديد
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1612] mt-3">
            تسجيل مطعم أو كافيه جديد في طاولة
          </h1>
          <p className="text-xs sm:text-sm text-[#5C524C] mt-1.5">
            أنشئ حسابك وابدأ في إدارة المنيو والطلبات والطاولات وخدمة الزبائن فوراً.
          </p>

          {invoiceId && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-900 rounded-full text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>مرتبط بفاتورة معتمدة: #{invoiceId}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Right Column: Steps (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Plan Selection (if not tied to invoice) */}
            {!invoiceId && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
                <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">1</span>
                  خطة البدء
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, plan: 'trial' }))}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                      formData.plan === 'trial'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-[0_4px_20px_rgba(5,150,105,0.12)] ring-2 ring-emerald-600/20'
                        : 'border-zinc-200 hover:border-emerald-500/40 bg-[#FAF8F5]/50'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-emerald-950">تجربة 14 يوماً</h3>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'trial' ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300'}`}>
                          {formData.plan === 'trial' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="text-lg font-extrabold text-emerald-700">مجاناً بالكامل</div>
                      <p className="text-[11px] text-[#5C524C]">بدون بطاقة ائتمان أو دفع مسبق</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData(prev => ({ ...prev, plan: 'basic' }))}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                      formData.plan === 'basic'
                        ? 'border-[#801B2C] bg-[#801B2C]/5 shadow-[0_4px_20px_rgba(128,27,44,0.12)] ring-2 ring-[#801B2C]/20'
                        : 'border-zinc-200 hover:border-[#801B2C]/40 bg-[#FAF8F5]/50'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-[#1C1612]">الباقة الأساسية</h3>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'basic' ? 'border-[#801B2C] bg-[#801B2C]' : 'border-zinc-300'}`}>
                          {formData.plan === 'basic' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-[#1C1612] font-mono">1,500</span>
                        <span className="text-xs text-[#5C524C]">ج.م / شهر</span>
                      </div>
                      <p className="text-[11px] text-[#5C524C]">للكافيهات والمطاعم الناشئة</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData(prev => ({ ...prev, plan: 'pro' }))}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                      formData.plan === 'pro'
                        ? 'border-[#801B2C] bg-[#801B2C]/5 shadow-[0_4px_20px_rgba(128,27,44,0.12)] ring-2 ring-[#801B2C]/20'
                        : 'border-zinc-200 hover:border-[#801B2C]/40 bg-[#FAF8F5]/50'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-[#801B2C]">المتقدمة Pro</h3>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'pro' ? 'border-[#801B2C] bg-[#801B2C]' : 'border-zinc-300'}`}>
                          {formData.plan === 'pro' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-[#801B2C] font-mono">3,000</span>
                        <span className="text-xs text-[#5C524C]">ج.م / شهر</span>
                      </div>
                      <p className="text-[11px] text-[#5C524C]">شاملة كامل المميزات</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Restaurant Information */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">2</span>
                بيانات المطعم أو الكافيه
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">اسم المطعم أو الكافيه *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleNameChange}
                      placeholder="مثال: مطعم فوكس برجر"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">رابط المنيو (Slug) *</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                      placeholder="fox-burger"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm font-mono text-left outline-none transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">اسم المسؤول / المالك *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      name="ownerName"
                      placeholder="محمد حسن"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">رقم الهاتف للتواصل *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      name="phone"
                      dir="ltr"
                      placeholder="010XXXXXXXX"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all text-right"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      name="email"
                      dir="ltr"
                      placeholder="owner@example.com"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Admin Credentials */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">3</span>
                بيانات حساب المدير (Admin)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#1C1612]">اسم المستخدم (Username) *</label>
                    {usernameStatus.checking && <span className="text-[10px] text-zinc-500">جاري الفحص...</span>}
                    {usernameStatus.checked && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${usernameStatus.available ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {usernameStatus.available ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {usernameStatus.message}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
                        setFormData(prev => ({ ...prev, username: val }));
                        setUsernameStatus({ checked: false, available: true, checking: false, message: '' });
                      }}
                      onBlur={handleUsernameBlur}
                      name="username"
                      placeholder="admin_fox"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm font-mono text-left outline-none transition-all"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[10px] text-[#5C524C]/80 mt-1">حروف إنجليزية صغيرة وأرقام فقط (غير مكرر بالنظام).</p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      name="password"
                      placeholder="••••••••"
                      className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#5C524C]/80 mt-1">6 أحرف أو أرقام على الأقل.</p>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="pt-2 border-t border-zinc-100">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#5C524C] leading-relaxed select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 accent-[#801B2C] w-4 h-4 rounded"
                  />
                  <span>
                    أوافق على{' '}
                    <Link to="/terms" target="_blank" className="text-[#801B2C] font-bold hover:underline">
                      شروط وأحكام الاستخدام
                    </Link>{' '}
                    و{' '}
                    <Link to="/refund" target="_blank" className="text-[#801B2C] font-bold hover:underline">
                      سياسة الاسترجاع والخصوصية
                    </Link>
                    .
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Left Column: Summary Card & Action Button (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] pb-4 border-b border-zinc-100">
                ملخص التسجيل
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#1C1612]">
                    {formData.plan === 'trial' ? 'باقة التجربة المجانية (Trial)' : formData.plan === 'pro' ? 'الباقة المتقدمة Pro' : 'الباقة الأساسية'}
                  </span>
                  <span className="font-bold font-mono text-[#1C1612]">
                    {formData.plan === 'trial' ? '0 ج.م' : formData.plan === 'pro' ? '3,000 ج.م' : '1,500 ج.م'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C524C]">
                  <span>فترة الصلاحية</span>
                  <span className="font-bold">
                    {formData.plan === 'trial' ? '14 يوماً كاملة' : '30 يوماً شهرياً'}
                  </span>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-[#1C1612]">المستحق للدفع الآن</span>
                  <div className="text-left" dir="ltr">
                    <span className="text-2xl font-black text-[#801B2C] font-mono">
                      {formData.plan === 'trial' || invoiceId ? '0.00' : formData.plan === 'pro' ? '3,000' : '1,500'}
                    </span>
                    <span className="text-xs font-bold text-[#801B2C] mr-1"> EGP</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#801B2C] hover:bg-[#5E1422] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#801B2C]/20 transition-all text-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>تأكيد التسجيل والدخول للوحة التحكم</span>
                    <ChevronLeft className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Included Benefits */}
              <div className="pt-6 border-t border-zinc-100 space-y-3">
                <h4 className="text-xs font-bold text-[#1C1612]">ضمانات منصة طاولة:</h4>
                <ul className="space-y-2 text-xs text-[#5C524C]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>تفعيل فوري لجميع أقسام المنيو والطلبات في ثوانٍ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>دعم فني وتدريب مجاني على استخدام المنظومة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>حماية مشفرة وتخزين آمن لكافة بيانات المبيعات</span>
                  </li>
                </ul>
              </div>

              {/* Security Seal */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-center gap-4 text-zinc-400 text-[11px] font-medium">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  اتصال مشفر 256-bit
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#801B2C]" />
                  منظومة معتمدة
                </span>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
