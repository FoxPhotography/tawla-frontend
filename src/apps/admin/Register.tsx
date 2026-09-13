import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  ChevronLeft, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  CreditCard,
  X,
  RefreshCw,
  AlertCircle,
  LogOut,
  LayoutDashboard,
  Smartphone,
  Wallet,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api.js';
import { useAuthStore } from '../../shared/store/authStore.js';
import { getDeviceFingerprint } from '../../shared/utils/fingerprint.js';
import logoImg from '../../assets/TAWLA_Logo.png';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, user, restaurant, logout } = useAuthStore();
  const loginStore = useAuthStore((state) => state.login);

  const initialPlan = (searchParams.get('plan') as 'trial' | 'basic' | 'pro') || 'trial';
  const initialBilling = (searchParams.get('billing') as 'monthly' | 'annual') || 'monthly';
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

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialBilling);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [systemSettings, setSystemSettings] = useState<any>(null);

  // Payment Method States for Paid Plans
  const [paymentMethod, setPaymentMethod] = useState<'vodafone_cash' | 'instapay' | 'paypal' | 'fawaterk'>('vodafone_cash');
  const [senderContact, setSenderContact] = useState('');
  const [senderReference, setSenderReference] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    toast.success('تم نسخ النص بنجاح!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Email OTP Verification States
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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

  // Fetch dynamic system settings for pricing & trial duration
  useEffect(() => {
    api.get('/system-settings')
      .then((res) => {
        if (res.data?.data) {
          setSystemSettings(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Pricing calculations
  const basicMonthly = systemSettings?.pricing?.basic || 1500;
  const proMonthly = systemSettings?.pricing?.pro || 3000;
  const basicAnnual = systemSettings?.pricing?.annualBasic || 15000;
  const proAnnual = systemSettings?.pricing?.annualPro || 30000;
  const trialDays = systemSettings?.trialDays || 15;

  const getPrice = () => {
    if (formData.plan === 'trial') return 0;
    if (formData.plan === 'pro') {
      return billingCycle === 'annual' ? proAnnual : proMonthly;
    }
    return billingCycle === 'annual' ? basicAnnual : basicMonthly;
  };

  const currentPrice = getPrice();

  // Dynamic percentage savings calculation (12 * monthly vs annual)
  const getSavingsPercent = (plan: 'basic' | 'pro') => {
    const monthlyPrice = plan === 'pro' ? proMonthly : basicMonthly;
    const annualPrice = plan === 'pro' ? proAnnual : basicAnnual;
    if (!monthlyPrice || monthlyPrice <= 0 || !annualPrice) return 0;
    const yearlyMonthlyTotal = monthlyPrice * 12;
    if (annualPrice >= yearlyMonthlyTotal) return 0;
    return Math.round(((yearlyMonthlyTotal - annualPrice) / yearlyMonthlyTotal) * 100);
  };

  const basicSavingsPercent = getSavingsPercent('basic');
  const proSavingsPercent = getSavingsPercent('pro');
  const currentSavingsPercent = formData.plan === 'pro' ? proSavingsPercent : basicSavingsPercent;
  const maxSavingsPercent = Math.max(basicSavingsPercent, proSavingsPercent);

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

  // 1. Send OTP
  const handleSendOtp = async () => {
    const email = formData.email.trim();
    if (!email || !email.includes('@')) {
      return toast.error('يرجى كتابة بريد إلكتروني صالح لإرسال كود التأكيد.');
    }

    setIsSendingOtp(true);
    try {
      const res = await api.post('/auth/send-registration-otp', {
        email,
        name: formData.ownerName || formData.name || 'المدير',
      });
      toast.success(res.data?.message || 'تم إرسال كود التأكيد إلى بريدك الإلكتروني بنجاح!');
      setCooldown(60);
      setShowOtpModal(true);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'تعذر إرسال كود التأكيد، يرجى مراجعة البريد والمحاولة ثانية.';
      toast.error(errMsg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 2. Verify OTP
  const handleVerifyOtp = async () => {
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      return toast.error('يرجى إدخال كود التأكيد المكون من 6 أرقام.');
    }

    setIsVerifyingOtp(true);
    try {
      const res = await api.post('/auth/verify-registration-otp', {
        email: formData.email.trim(),
        code: cleanCode,
      });

      const token = res.data?.data?.verificationToken;
      setEmailVerified(true);
      setVerificationToken(token || 'verified');
      setShowOtpModal(false);
      setOtpCode('');
      toast.success('🎉 تم تأكيد بريدك الإلكتروني بنجاح!');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'كود التأكيد غير صحيح أو انتهت صلاحيته.';
      toast.error(errMsg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // 3. Submit Registration Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error('يرجى كتابة اسم المطعم أو الكافيه.');
    if (!formData.slug.trim()) return toast.error('يرجى تحديد الرابط المميز (Slug).');
    if (!formData.ownerName.trim()) return toast.error('يرجى كتابة اسم المدير أو المسؤول.');
    if (!formData.phone.trim() || formData.phone.length < 10) return toast.error('يرجى كتابة رقم هاتف صالح للتواصل.');
    if (!formData.email.trim() || !formData.email.includes('@')) return toast.error('يرجى كتابة بريد إلكتروني صالح.');

    // Enforce email verification
    if (!emailVerified) {
      toast.error('يرجى تأكيد بريدك الإلكتروني أولاً عبر كود التحقق (OTP).');
      handleSendOtp();
      return;
    }

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

      // CASE A: FREE TRIAL OR EXISTING PRE-PAID INVOICE
      if (formData.plan === 'trial' || formData.invoiceId) {
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
          emailVerificationToken: verificationToken,
        });

        const data = response.data?.data;
        if (data?.accessToken && data?.user && data?.restaurant) {
          toast.success(`🎉 تم إنشاء حساب مطعمك وتفعيل تجربتك المجانية لمدة ${trialDays} يوماً بنجاح! جاري توجيهك...`);
          loginStore(data.accessToken, data.user, data.restaurant, data.offlineLease);
          setTimeout(() => {
            navigate('/admin');
          }, 800);
        } else {
          toast.success('تم تسجيل الحساب بنجاح، يمكنك تسجيل الدخول الآن.');
          navigate('/login');
        }
        return;
      }

      // CASE B: PAID PLAN (Basic or Pro) -> VODAFONE CASH / INSTAPAY / PAYPAL / FAWATERK
      if (paymentMethod === 'vodafone_cash' || paymentMethod === 'instapay' || paymentMethod === 'paypal') {
        if (!senderContact.trim()) {
          const contactLabel = paymentMethod === 'vodafone_cash' 
            ? 'رقم المحفظة المُرسل منها' 
            : paymentMethod === 'instapay' 
            ? 'رقم حساب أو هاتف إنستاباي' 
            : 'بريدك الإلكتروني في بايبال';
          setIsSubmitting(false);
          return toast.error(`يرجى كتابة ${contactLabel} لتأكيد الدفع.`);
        }
        if (!senderReference.trim()) {
          setIsSubmitting(false);
          return toast.error('يرجى كتابة رقم العملية / كود التحويل.');
        }
      }

      toast.loading('جاري تسجيل وتوثيق طلب الاشتراك...', { id: 'checkout-toast' });

      const checkoutPayload = {
        restaurantName: formData.name.trim(),
        slug: formData.slug.toLowerCase().trim(),
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim() || undefined,
        username: cleanUsername,
        password: formData.password,
        plan: formData.plan,
        billingCycle,
        amount: currentPrice,
        currency: 'EGP',
        paymentGateway: paymentMethod,
        senderContact: senderContact.trim() || undefined,
        senderReference: senderReference.trim() || undefined,
        emailVerificationToken: verificationToken,
        redirectUrls: {
          successUrl: `${window.location.origin}/payment/confirmation?status=success&type=new`,
          failUrl: `${window.location.origin}/payment/confirmation?status=failed&type=new`,
          pendingUrl: `${window.location.origin}/payment/confirmation?status=pending&type=new`,
        },
      };

      const response = await api.post('/subscriptions/checkout', checkoutPayload);
      const data = response.data?.data;

      if (data?.manualPayment || data?.status === 'pending') {
        toast.success('تم تسجيل تفاصيل السداد بنجاح، جاري فتح إيصال المعاملة...', { id: 'checkout-toast' });
        setTimeout(() => {
          navigate(`/payment/confirmation?invoiceId=${data.invoiceId}&status=pending&type=new&method=${paymentMethod}`);
        }, 500);
        return;
      }

      if (data?.invoiceLink) {
        toast.success('جاري توجيهك الآن إلى بوابة الدفع فواتيرك...', { id: 'checkout-toast' });
        setTimeout(() => {
          window.location.href = data.invoiceLink;
        }, 600);
      } else {
        toast.error('تعذر إنشاء رابط الدفع من بوابة فواتيرك، يرجى المحاولة لاحقاً.', { id: 'checkout-toast' });
      }
    } catch (err: any) {
      console.error('[Registration Error]:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'تعذر استكمال العملية، يرجى مراجعة البيانات.';
      toast.error(errMsg, { id: 'checkout-toast' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ACTIVE SESSION GUARD: If already logged in, prevent duplicate/conflicting registration
  // ══════════════════════════════════════════════════════════════
  if (token && user) {
    const roleLabel = user.role === 'super_admin'
      ? 'المدير العام (Super Admin)'
      : user.role === 'admin'
      ? 'مدير مطعم'
      : user.role === 'cashier'
      ? 'كاشير'
      : 'ويتر';

    const dashboardPath = user.role === 'super_admin' ? '/super-admin' : user.role === 'admin' ? '/admin' : '/staff';

    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center relative overflow-hidden font-sans" dir="rtl">
        <Toaster position="top-center" />

        <div className="relative z-10 w-full max-w-[460px] mx-4">
          <div className="bg-white/95 backdrop-blur-md border border-[#801B2C]/15 rounded-3xl p-8 shadow-[0_20px_50px_rgba(128,27,44,0.08)] text-center">
            <Link to="/" className="inline-block mb-4">
              <img src={logoImg} alt="طاولة" className="h-14 mx-auto object-contain hover:scale-105 transition-transform" />
            </Link>

            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-stone-900 mb-2">أنت مسجل دخولك بالفعل</h2>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              أنت متصل حالياً بحساب نشط. لتسجيل مطعم جديد أو إنشاء حساب مختلف، يرجى تسجيل الخروج أولاً لتجنب أي تداخل في بيانات المتصفح والجلسات.
            </p>

            <div className="bg-[#FAF8F5] border border-[#801B2C]/10 rounded-2xl p-4 text-right mb-6 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 font-medium">اسم الحساب:</span>
                <span className="font-bold text-stone-900">{user.name || user.username}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 font-medium">نوع الصلاحية:</span>
                <span className="font-bold text-[#801B2C] bg-[#801B2C]/10 px-2.5 py-0.5 rounded-md">{roleLabel}</span>
              </div>
              {restaurant && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500 font-medium">المطعم الحالي:</span>
                  <span className="font-bold text-stone-900">{restaurant.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate(dashboardPath)}
                className="w-full py-3.5 bg-[#801B2C] hover:bg-[#681523] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>الذهاب إلى لوحة التحكم</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  toast.success('تم تسجيل الخروج. يمكنك الآن تسجيل مطعم جديد.');
                }}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج لتسجيل مطعم جديد</span>
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full py-2 text-stone-500 hover:text-stone-800 text-xs transition-colors cursor-pointer"
              >
                العودة للصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              تفعيل معتمد عبر فواتيرك
            </span>
            <Link to="/login" className="flex items-center gap-1 text-[#801B2C] hover:underline">
              لديك حساب بالفعل؟ تسجيل الدخول
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Intro */}
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-[#1C1612] tracking-tight mb-2">
            ابدأ تشغيل مطعمك على منصة طاولة
          </h1>
          <p className="text-sm text-[#5C524C]">
            أنشئ حسابك وابدأ في إدارة المنيو والطلبات والطاولات وخدمة الزبائن فوراً.
          </p>

          {invoiceId && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-900 rounded-full text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>مرتبط بفاتورة سداد معتمدة: #{invoiceId}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Right Column: Steps (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Plan Selection */}
            {!invoiceId && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">1</span>
                    خطة البدء ونوع الاشتراك
                  </h2>

                  {/* Monthly / Annual Toggle */}
                  <div className="flex items-center p-1 bg-[#FAF8F5] rounded-2xl border border-zinc-200/80">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        billingCycle === 'monthly'
                          ? 'bg-[#801B2C] text-white shadow-sm'
                          : 'text-[#5C524C] hover:text-[#1C1612]'
                      }`}
                    >
                      اشتراك شهري
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        billingCycle === 'annual'
                          ? 'bg-[#801B2C] text-white shadow-sm'
                          : 'text-[#5C524C] hover:text-[#1C1612]'
                      }`}
                    >
                      <span>اشتراك سنوي</span>
                      {maxSavingsPercent > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold ${
                          billingCycle === 'annual' ? 'bg-amber-400 text-amber-950' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          وفر {maxSavingsPercent}%
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Trial Plan */}
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
                        <h3 className="font-bold text-sm text-emerald-950">تجربة {trialDays} يوماً</h3>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'trial' ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300'}`}>
                          {formData.plan === 'trial' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="text-lg font-extrabold text-emerald-700">مجاناً بالكامل</div>
                      <p className="text-[11px] text-[#5C524C]">بدون بطاقة ائتمان أو دفع مسبق</p>
                    </div>
                  </div>

                  {/* Basic Plan */}
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
                        <span className="text-lg font-extrabold text-[#1C1612] font-mono">
                          {billingCycle === 'annual' ? basicAnnual.toLocaleString('en-US') : basicMonthly.toLocaleString('en-US')}
                        </span>
                        <span className="text-xs text-[#5C524C]">
                          {billingCycle === 'annual' ? 'ج.م / سنة' : 'ج.م / شهر'}
                        </span>
                        {billingCycle === 'annual' && basicSavingsPercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md mr-auto">
                            وفر {basicSavingsPercent}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5C524C]">للكافيهات والمطاعم الناشئة</p>
                    </div>
                  </div>

                  {/* Pro Plan */}
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
                        <h3 className="font-bold text-sm text-[#801B2C]">
                          المتقدمة Pro
                        </h3>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'pro' ? 'border-[#801B2C] bg-[#801B2C]' : 'border-zinc-300'}`}>
                          {formData.plan === 'pro' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-[#801B2C] font-mono">
                          {billingCycle === 'annual' ? proAnnual.toLocaleString('en-US') : proMonthly.toLocaleString('en-US')}
                        </span>
                        <span className="text-xs text-[#5C524C]">
                          {billingCycle === 'annual' ? 'ج.م / سنة' : 'ج.م / شهر'}
                        </span>
                        {billingCycle === 'annual' && proSavingsPercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md mr-auto">
                            وفر {proSavingsPercent}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5C524C]">شاملة كامل المميزات وبلا حدود</p>
                    </div>
                  </div>
                </div>

                {/* 30-Day Auto Purge Policy Disclosure */}
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950 mb-0.5">سياسة حفظ وحذف البيانات (النسخ التجريبية vs المشتركون الفعليون):</span>
                    <span>
                      الحساب التجريبي مجاني وصالح للاختبار لمدة {trialDays} يوماً. في حال عدم الاشتراك في أي باقة مدفوعة خلال <strong>شهر (30 يوماً)</strong> من إنشاء الحساب، يتم حذف الحساب وكامل بياناته تلقائياً وبشكل نهائي ولا يمكن استرجاعها. بينما بيانات <strong>المشتركين الفعليين (باقة Basic أو Pro)</strong> محفوظة ومحمية بشكل دائم وأبدي ولن تُحذف أبداً حتى بعد انتهاء الاشتراك.
                    </span>
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
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">رابط المنيو الرقمي (Slug) *</label>
                  <div className="relative" dir="ltr">
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      placeholder="fox-burger"
                      className="w-full pl-3 pr-24 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm font-mono outline-none transition-all text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-mono select-none">
                      tawla.site/
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">اسم المدير أو المسؤول *</label>
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

                {/* Email with OTP Verification */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#1C1612]">
                      البريد الإلكتروني لتأكيد الحساب والإيصالات *
                    </label>
                    {emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        تم تأكيد البريد بنجاح
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-medium">
                        يتطلب تأكيد البريد عبر كود OTP
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                        setEmailVerified(false);
                        setVerificationToken('');
                        handleInputChange(e);
                      }}
                      name="email"
                      dir="ltr"
                      placeholder="owner@example.com"
                      className={`w-full pr-10 pl-28 py-2.5 rounded-xl border ${
                        emailVerified
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'border-zinc-200 focus:border-[#801B2C]'
                      } focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all text-right`}
                    />
                    <button
                      type="button"
                      disabled={isSendingOtp || cooldown > 0 || !formData.email || emailVerified}
                      onClick={handleSendOtp}
                      className={`absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        emailVerified
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : cooldown > 0
                          ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                          : 'bg-[#801B2C] text-white hover:bg-[#5E1422] shadow-sm'
                      }`}
                    >
                      {isSendingOtp ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : emailVerified ? (
                        'مؤكد ✓'
                      ) : cooldown > 0 ? (
                        `إعادة (${cooldown}s)`
                      ) : (
                        'تأكيد البريد'
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#5C524C]/80 mt-1">
                    سنرسل كود تأكيد مكون من 6 أرقام إلى هذا الإيميل للتحقق من ملكيتك له وضمان وصول إيصالات الدفع.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Admin Credentials */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">3</span>
                بيانات الدخول للوحة التحكم
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#1C1612]">اسم المستخدم (Username) *</label>
                    {usernameStatus.checking ? (
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        جاري الفحص...
                      </span>
                    ) : usernameStatus.checked ? (
                      usernameStatus.available ? (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> متاح
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> محجوز
                        </span>
                      )
                    ) : null}
                  </div>

                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => {
                        handleInputChange(e);
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
                    </Link>
                    ، و
                    <Link to="/privacy" target="_blank" className="text-[#801B2C] font-bold hover:underline">
                      سياسة الخصوصية
                    </Link>{' '}
                    (بما يشمل الموافقة الصريحة على حذف الحساب التجريبي وبياناته نهائياً بعد 30 يوماً في حال عدم الاشتراك).
                  </span>
                </label>
              </div>
            </div>

            {/* Step 4: Payment Methods (Only for paid plans) */}
            {formData.plan !== 'trial' && !invoiceId && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">4</span>
                    طريقة السداد وتأكيد الاشتراك
                  </h2>
                  <span className="text-xs font-bold text-[#801B2C] bg-[#801B2C]/5 px-3 py-1 rounded-full border border-[#801B2C]/10">
                    المبلغ: {currentPrice.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Option 1: Vodafone Cash & Smart Wallets */}
                  <div
                    onClick={() => setPaymentMethod('vodafone_cash')}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      paymentMethod === 'vodafone_cash'
                        ? 'border-[#801B2C] bg-[#801B2C]/[0.03] shadow-sm'
                        : 'border-zinc-200 hover:border-[#801B2C]/40 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                            paymentMethod === 'vodafone_cash'
                              ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#1C1612]">فودافون كاش والمحافظ الإلكترونية</span>
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                              مفعّل للتأكيد الفوري
                            </span>
                          </div>
                          <p className="text-xs text-[#5C524C] mt-0.5 leading-relaxed">
                            فودافون كاش، أورانج كاش، إي آند، ووي باي، وكافة المحافظ الذكية.
                          </p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        checked={paymentMethod === 'vodafone_cash'}
                        onChange={() => setPaymentMethod('vodafone_cash')}
                        className="accent-[#801B2C] w-4 h-4 mt-1"
                      />
                    </div>

                    {paymentMethod === 'vodafone_cash' && (
                      <div className="mt-4 pt-4 border-t border-[#801B2C]/15 space-y-4 animate-in fade-in duration-200">
                        <div className="bg-[#801B2C]/5 rounded-2xl p-4 border border-[#801B2C]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold text-[#5C524C] block">رقم فودافون كاش المعتمد للتحويل:</span>
                            <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
                              <span className="text-xl font-black font-mono text-[#801B2C] tracking-wider dir-ltr inline-block">
                                01005023649
                              </span>
                              <span className="text-xs font-extrabold text-[#1C1612]">
                                (باسم: كريم ا.... ع.... ع.... ا....)
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy('01005023649', 'vodafone');
                            }}
                            className="px-4 py-2 bg-white border border-[#801B2C]/25 hover:bg-[#801B2C] hover:text-white text-[#801B2C] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            {copiedKey === 'vodafone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedKey === 'vodafone' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                          </button>
                        </div>

                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1.5">
                          <p className="font-bold">خطوات التحويل والتأكيد:</p>
                          <ol className="list-decimal list-inside space-y-1 text-[#5C524C] text-[11px] pr-1 leading-relaxed">
                            <li>قم بتحويل مبلغ الاشتراك (<strong className="text-[#801B2C] font-mono">{currentPrice.toLocaleString('ar-EG')} ج.م</strong>) إلى الرقم أعلاه عبر محفظة فودافون كاش أو أي محفظة ذكية.</li>
                            <li>تأكد من ظهور اسم المستلم: <strong className="text-[#1C1612]">كريم ا.... ع.... ع.... ا....</strong>.</li>
                            <li>سجّل رقم المحفظة المُرسل منها وكود التحويل بالأسفل لتوثيق وتفعيل الاشتراك فوراً.</li>
                          </ol>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-bold text-[#1C1612] mb-1">رقم المحفظة المُرسل منها *</label>
                            <input
                              type="tel"
                              value={senderContact}
                              onChange={(e) => setSenderContact(e.target.value)}
                              placeholder="مثال: 01012345678"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-xs outline-none transition-all bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#1C1612] mb-1">رقم العملية / كود التحويل *</label>
                            <input
                              type="text"
                              value={senderReference}
                              onChange={(e) => setSenderReference(e.target.value)}
                              placeholder="كود العملية من إشعار أو رسالة التحويل"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-xs outline-none transition-all bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: InstaPay */}
                  <div
                    onClick={() => setPaymentMethod('instapay')}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      paymentMethod === 'instapay'
                        ? 'border-[#801B2C] bg-[#801B2C]/[0.03] shadow-sm'
                        : 'border-zinc-200 hover:border-[#801B2C]/40 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                            paymentMethod === 'instapay'
                              ? 'bg-[#502479] text-white shadow-md shadow-[#502479]/30'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#1C1612]">إنستاباي (InstaPay) - تحويل بنكي لحظي</span>
                            <span className="text-[10px] bg-purple-700 text-white font-bold px-2 py-0.5 rounded-full">
                              مباشر ولحظي
                            </span>
                          </div>
                          <p className="text-xs text-[#5C524C] mt-0.5 leading-relaxed">
                            تحويل فوري عبر تطبيق إنستاباي من كافة الحسابات والبطاقات البنكية المصرية والمحافظ.
                          </p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        checked={paymentMethod === 'instapay'}
                        onChange={() => setPaymentMethod('instapay')}
                        className="accent-[#801B2C] w-4 h-4 mt-1"
                      />
                    </div>

                    {paymentMethod === 'instapay' && (
                      <div className="mt-4 pt-4 border-t border-[#801B2C]/15 space-y-4 animate-in fade-in duration-200">
                        <div className="bg-[#801B2C]/5 rounded-2xl p-4 border border-[#801B2C]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold text-[#5C524C] block">رقم حساب إنستاباي المعتمد للتحويل:</span>
                            <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
                              <span className="text-xl font-black font-mono text-[#801B2C] tracking-wider dir-ltr inline-block">
                                01066980953
                              </span>
                              <span className="text-xs font-extrabold text-[#1C1612]">
                                (باسم: ابراهيم م.... ع.... م....)
                              </span>
                            </div>
                            <span className="text-[11px] text-[#5C524C] block mt-1 font-medium">
                              المبلغ المطلوب: <strong className="text-[#801B2C] font-mono">{currentPrice.toLocaleString('ar-EG')} ج.م</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy('01066980953', 'instapay');
                            }}
                            className="px-4 py-2 bg-white border border-[#801B2C]/25 hover:bg-[#801B2C] hover:text-white text-[#801B2C] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            {copiedKey === 'instapay' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedKey === 'instapay' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                          </button>
                        </div>

                        <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-3.5 text-xs text-purple-950 space-y-1.5">
                          <p className="font-bold text-purple-900">خطوات التحويل عبر InstaPay:</p>
                          <ol className="list-decimal list-inside space-y-1 text-[#5C524C] text-[11px] pr-1 leading-relaxed">
                            <li>افتح تطبيق إنستاباي (InstaPay) واختر "إرسال نقود" إلى رقم الهاتف: <strong className="font-mono text-[#801B2C]">01066980953</strong>.</li>
                            <li>تأكد من ظهور اسم المستلم: <strong className="text-[#1C1612]">ابراهيم م.... ع.... م....</strong>.</li>
                            <li>أرسل المبلغ المحدد (<strong className="text-[#801B2C] font-mono">{currentPrice.toLocaleString('ar-EG')} ج.م</strong>)، ثم اكتب رقم حسابك/هاتفك المحول منه ورقم العملية المرجعي بالأسفل.</li>
                          </ol>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-bold text-[#1C1612] mb-1">رقم حساب أو هاتف إنستاباي الخاص بك *</label>
                            <input
                              type="text"
                              value={senderContact}
                              onChange={(e) => setSenderContact(e.target.value)}
                              placeholder="مثال: 010xxxxxxxx أو username@instapay"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-xs outline-none transition-all bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#1C1612] mb-1">الرقم المرجعي للعملية (Reference Number) *</label>
                            <input
                              type="text"
                              value={senderReference}
                              onChange={(e) => setSenderReference(e.target.value)}
                              placeholder="الرقم المرجعي من إشعار نجاح المعاملة في إنستاباي"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-xs outline-none transition-all bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 3: PayPal */}
                  <div
                    onClick={() => setPaymentMethod('paypal')}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      paymentMethod === 'paypal'
                        ? 'border-[#801B2C] bg-[#801B2C]/[0.03] shadow-sm'
                        : 'border-zinc-200 hover:border-[#801B2C]/40 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                            paymentMethod === 'paypal'
                              ? 'bg-[#003087] text-white shadow-md shadow-[#003087]/20'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#1C1612]">بايبال (PayPal)</span>
                            <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                              دولي بالدولار (USD)
                            </span>
                          </div>
                          <p className="text-xs text-[#5C524C] mt-0.5 leading-relaxed">
                            الدفع السريع والمباشر لحساب PayPal أو عبر بطاقات الائتمان الدولية.
                          </p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        checked={paymentMethod === 'paypal'}
                        onChange={() => setPaymentMethod('paypal')}
                        className="accent-[#801B2C] w-4 h-4 mt-1"
                      />
                    </div>

                    {paymentMethod === 'paypal' && (
                      <div className="mt-4 pt-4 border-t border-[#801B2C]/15 space-y-4 animate-in fade-in duration-200">
                        <div className="bg-[#801B2C]/5 rounded-2xl p-4 border border-[#801B2C]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold text-[#5C524C] block">حساب بايبال المعتمد (PayPal Username):</span>
                            <span className="text-xl font-black font-mono text-[#801B2C] tracking-wider dir-ltr inline-block mt-0.5">
                              @Ibrahimx66
                            </span>
                            <span className="text-[11px] text-[#5C524C] block mt-0.5 font-medium">
                              المبلغ المعادل: تقريباً <strong className="text-[#801B2C] font-mono">~${Math.round(currentPrice / 50)} USD</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href="https://paypal.me/Ibrahimx66"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3.5 py-2 bg-[#003087] hover:bg-[#002266] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>فتح رابط السداد</span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy('@Ibrahimx66', 'paypal');
                              }}
                              className="px-3.5 py-2 bg-white border border-[#801B2C]/25 hover:bg-[#801B2C] hover:text-white text-[#801B2C] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              {copiedKey === 'paypal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedKey === 'paypal' ? 'تم النسخ!' : 'نسخ الحساب'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1.5">
                          <p className="font-bold">خطوات التحويل عبر PayPal:</p>
                          <ol className="list-decimal list-inside space-y-1 text-[#5C524C] text-[11px] pr-1 leading-relaxed">
                            <li>قم بفتح رابط الدفع <a href="https://paypal.me/Ibrahimx66" target="_blank" rel="noopener noreferrer" className="text-[#801B2C] font-bold underline dir-ltr inline-block">paypal.me/Ibrahimx66</a> أو أرسل إلى <strong className="font-mono">@Ibrahimx66</strong>.</li>
                            <li>أرسل المبلغ المطلوب، ثم اكتب بريدك في بايبال ورقم المعاملة (Transaction ID) بالأسفل.</li>
                          </ol>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-bold text-[#1C1612] mb-1">بريدك الإلكتروني في بايبال *</label>
                            <input
                              type="email"
                              value={senderContact}
                              onChange={(e) => setSenderContact(e.target.value)}
                              placeholder="your-paypal@email.com"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-xs outline-none transition-all bg-white dir-ltr text-right"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#1C1612] mb-1">رقم المعاملة في بايبال (Transaction ID) *</label>
                            <input
                              type="text"
                              value={senderReference}
                              onChange={(e) => setSenderReference(e.target.value)}
                              placeholder="كود العملية من إيصال بايبال"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-xs outline-none transition-all bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 4: Fawaterk Gateway */}
                  <div
                    onClick={() => setPaymentMethod('fawaterk')}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      paymentMethod === 'fawaterk'
                        ? 'border-[#801B2C] bg-[#801B2C]/[0.03] shadow-sm'
                        : 'border-zinc-200 hover:border-[#801B2C]/40 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                            paymentMethod === 'fawaterk'
                              ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#1C1612]">بوابة فواتيرك (Fawaterk)</span>
                            <span className="text-[10px] bg-zinc-700 text-white font-bold px-2 py-0.5 rounded-full">
                              بطاقات بنكية وفيزا
                            </span>
                          </div>
                          <p className="text-xs text-[#5C524C] mt-0.5 leading-relaxed">
                            الدفع المباشر عبر البطاقات البنكية المعتمدة أونلاين (فيزا، ماستركارد، ميزة).
                          </p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        checked={paymentMethod === 'fawaterk'}
                        onChange={() => setPaymentMethod('fawaterk')}
                        className="accent-[#801B2C] w-4 h-4 mt-1"
                      />
                    </div>

                    {paymentMethod === 'fawaterk' && (
                      <div className="mt-4 pt-4 border-t border-[#801B2C]/15 animate-in fade-in duration-200">
                        <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 text-xs text-[#5C524C] leading-relaxed">
                          💳 سيتم توجيهك فور النقر على زر المتابعة إلى بوابة الدفع المشفرة والآمنة (فواتيرك) لإدخال بيانات بطاقتك البنكية وإتمام السداد فوراً.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Left Column: Summary Card & Action Button (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] pb-4 border-b border-zinc-100">
                ملخص التسجيل والاشتراك
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#1C1612]">
                    {formData.plan === 'trial' ? 'باقة التجربة المجانية (Trial)' : formData.plan === 'pro' ? 'الباقة المتقدمة Pro' : 'الباقة الأساسية'}
                  </span>
                  <span className="font-bold font-mono text-[#1C1612]">
                    {formData.plan === 'trial' ? '0 ج.م' : `${currentPrice.toLocaleString('ar-EG')} ج.م`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C524C]">
                  <span>دورة الفوترة والصلاحية</span>
                  <span className="font-bold text-[#1C1612]">
                    {formData.plan === 'trial' ? `${trialDays} يوماً تجريبية كاملة` : billingCycle === 'annual' ? 'اشتراك سنوي (365 يوماً)' : 'اشتراك شهري (30 يوماً)'}
                  </span>
                </div>

                {formData.plan !== 'trial' && billingCycle === 'annual' && currentSavingsPercent > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <span>خصم الاشتراك السنوي</span>
                    <span className="font-bold">وفرت {currentSavingsPercent}%</span>
                  </div>
                )}

                {formData.plan !== 'trial' && !invoiceId && (
                  <div className="flex items-center justify-between text-xs text-[#5C524C] pt-2 border-t border-zinc-100">
                    <span>طريقة السداد</span>
                    <span className="font-bold text-[#801B2C]">
                      {paymentMethod === 'vodafone_cash' ? 'فودافون كاش ومحافظ' :
                       paymentMethod === 'instapay' ? 'إنستاباي (InstaPay)' :
                       paymentMethod === 'paypal' ? 'بايبال (PayPal)' : 'فواتيرك / بطاقة بنكية'}
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-100 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-[#1C1612]">المستحق للدفع الآن</span>
                  <div className="text-left" dir="ltr">
                    <span className="text-2xl font-black text-[#801B2C] font-mono">
                      {formData.plan === 'trial' || invoiceId ? '0.00' : currentPrice.toLocaleString('en-US')}
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
                ) : formData.plan === 'trial' || invoiceId ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>تأكيد التسجيل وبدء التجربة المجانية</span>
                    <ChevronLeft className="w-4 h-4" />
                  </>
                ) : paymentMethod === 'vodafone_cash' ? (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>تأكيد تحويل فودافون كاش ({currentPrice.toLocaleString('ar-EG')} ج.م)</span>
                    <ChevronLeft className="w-4 h-4" />
                  </>
                ) : paymentMethod === 'instapay' ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>تأكيد تحويل إنستاباي ({currentPrice.toLocaleString('ar-EG')} ج.م)</span>
                    <ChevronLeft className="w-4 h-4" />
                  </>
                ) : paymentMethod === 'paypal' ? (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>تأكيد تحويل بايبال ({currentPrice.toLocaleString('ar-EG')} ج.م)</span>
                    <ChevronLeft className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>المتابعة للدفع عبر فواتيرك ({currentPrice.toLocaleString('ar-EG')} ج.م)</span>
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
                    <span>حماية مشفرة وبوابة دفع معتمدة عبر فواتيرك</span>
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

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-zinc-100 text-center space-y-6 relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute left-4 top-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-[#801B2C]/10 rounded-2xl flex items-center justify-center mx-auto text-[#801B2C]">
              <Mail className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#1C1612]">
                تأكيد البريد الإلكتروني
              </h3>
              <p className="text-xs text-[#5C524C] leading-relaxed">
                أدخل كود التحقق المكون من 6 أرقام المرسل إلى:
                <br />
                <span className="font-bold text-[#801B2C] font-mono dir-ltr inline-block mt-1">
                  {formData.email}
                </span>
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center text-3xl font-mono font-black tracking-[10px] py-3.5 rounded-2xl border-2 border-[#801B2C]/30 focus:border-[#801B2C] focus:ring-4 focus:ring-[#801B2C]/10 outline-none transition-all text-[#1C1612]"
                dir="ltr"
              />

              <button
                type="button"
                disabled={isVerifyingOtp || otpCode.length < 6}
                onClick={handleVerifyOtp}
                className="w-full py-3.5 bg-[#801B2C] hover:bg-[#5E1422] text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifyingOtp ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد الكود والمتابعة</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-[#5C524C]">
              <span>لم يصلك الكود؟</span>
              <button
                type="button"
                disabled={cooldown > 0 || isSendingOtp}
                onClick={handleSendOtp}
                className="text-[#801B2C] font-bold hover:underline disabled:text-zinc-400 disabled:no-underline"
              >
                {cooldown > 0 ? `إعادة الإرسال بعد (${cooldown} ثانية)` : 'إعادة إرسال كود جديد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
