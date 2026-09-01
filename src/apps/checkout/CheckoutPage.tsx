import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  CreditCard,
  Building2,
  User,
  Phone,
  Mail,
  ChevronLeft,
  Eye,
  EyeOff,
  Globe,
  Check,
  X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import logoImg from '../../assets/TAWLA_Logo.png';
import { api } from '../../shared/services/api.js';
import { useAuthStore } from '../../shared/store/authStore.js';
import { getDeviceFingerprint } from '../../shared/utils/fingerprint.js';

interface PlanDetails {
  id: 'trial' | 'basic' | 'pro';
  name: string;
  badge?: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
}

const DEFAULT_PLANS: Record<string, PlanDetails> = {
  trial: {
    id: 'trial',
    name: 'الباقة التجريبية (Trial)',
    badge: '14 يوماً مجاناً',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'استكشف كافة إمكانيات طاولة دون دفع أية رسوم لمدة أسبوعين كاملين.',
    features: [
      '14 يوماً تجربة مجانية بالكامل',
      'تجربة منيو تفاعلي بـ QR سريع',
      'لوحة تحكم كاملة للمدير والموظفين',
      'إدارة حتى 10 طاولات ذكية',
      'إضافة حتى 20 صنف بالمنيو',
      'دعم واستقبال طلبات الزبائن لحظياً',
      'إلغاء أو ترقية في أي وقت بكل سهولة',
    ],
  },
  basic: {
    id: 'basic',
    name: 'الباقة الأساسية (Basic)',
    badge: 'الأكثر شعبية',
    monthlyPrice: 1500,
    annualPrice: 15000,
    description: 'مثالية للكافيهات والمطاعم الفردية الناشئة الباحثة عن السرعة والاحترافية.',
    features: [
      'منيو رقمي سريع بتصميم فاخر',
      'دعم حتى 25 طاولة ذكية بـ QR Code',
      'إضافة حتى 100 صنف وتعديلها فوراً',
      'تلقي وإدارة الطلبات عبر شاشة الكاشير والويتر',
      'تقارير مبيعات وإحصائيات يومية وأسبوعية',
      'إمكانية العمل بدون إنترنت عند الطوارئ',
      'دعم فني وتحديثات مستمرة مجاناً',
    ],
  },
  pro: {
    id: 'pro',
    name: 'الباقة المتقدمة (Pro)',
    badge: 'شاملة بالكامل',
    monthlyPrice: 3000,
    annualPrice: 30000,
    description: 'الحل الشامل والكامل للمطاعم الكبرى، السلاسل، والبراندات الراقية.',
    features: [
      'كل مميزات الباقة الأساسية بلا استثناء',
      'دعم حتى 60 طاولة ذكية',
      'إضافة منتجات غير محدودة بالمنيو',
      'تقسيم أقسام وتصنيفات غير محدود',
      'تصميم وضبط إيصالات الدفع ولوجو المطعم',
      'تفعيل الضرائب ورسوم الخدمة للفواتير',
      'تلقي طلبات التوصيل / الدليفري الخارجية',
      'سجلات العمليات لتتبع الكاشير والمشرفين',
    ],
  },
};

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const [plans, setPlans] = useState<Record<string, PlanDetails>>(DEFAULT_PLANS);

  // Plan & Billing State
  const initialPlan = (searchParams.get('plan') as 'trial' | 'basic' | 'pro') || 'pro';
  const [selectedPlanId, setSelectedPlanId] = useState<'trial' | 'basic' | 'pro'>(
    DEFAULT_PLANS[initialPlan] ? initialPlan : 'pro'
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Load live system settings pricing if available
  useEffect(() => {
    async function loadLivePricing() {
      try {
        const res = await api.get('/system-settings');
        if (res.data?.data) {
          const sys = res.data.data;
          setPlans((prev) => {
            const basicMonthly = sys.offer?.active && sys.offer?.basicPrice ? sys.offer.basicPrice : (sys.pricing?.basic || 1500);
            const proMonthly = sys.offer?.active && sys.offer?.proPrice ? sys.offer.proPrice : (sys.pricing?.pro || 3000);
            return {
              ...prev,
              basic: {
                ...prev.basic,
                monthlyPrice: basicMonthly,
                annualPrice: basicMonthly * 10,
              },
              pro: {
                ...prev.pro,
                monthlyPrice: proMonthly,
                annualPrice: proMonthly * 10,
              },
            };
          });
        }
      } catch (e) {
        console.warn('Using default pricing in checkout');
      }
    }
    loadLivePricing();
  }, []);

  // Customer / Restaurant Form State
  const [formData, setFormData] = useState({
    restaurantName: '',
    slug: '',
    ownerName: '',
    phone: '',
    email: '',
    city: 'الدقهلية',
    address: '',
    username: '',
    password: '',
    notes: '',
  });

  const [showPassword, setShowPassword] = useState(false);
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

  const [paymentMethod, setPaymentMethod] = useState<'fawaterk' | 'free_trial'>('fawaterk');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Auto-switch payment method to free trial if trial plan selected
  useEffect(() => {
    if (selectedPlanId === 'trial') {
      setPaymentMethod('free_trial');
    } else if (paymentMethod === 'free_trial') {
      setPaymentMethod('fawaterk');
    }
  }, [selectedPlanId]);

  const selectedPlan = plans[selectedPlanId] || DEFAULT_PLANS[selectedPlanId];
  const isAnnual = billingCycle === 'annual' && selectedPlanId !== 'trial';
  const price = isAnnual ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
  const originalAnnualPrice = selectedPlan.monthlyPrice * 12;
  const annualSavings = originalAnnualPrice - selectedPlan.annualPrice;

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
      restaurantName: name,
      slug: prev.slug === '' || prev.slug === prev.restaurantName.toLowerCase().trim().replace(/[\s_]+/g, '-') ? generatedSlug : prev.slug,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.restaurantName.trim()) {
      toast.error('يرجى كتابة اسم المطعم أو الكافيه.');
      return;
    }
    if (!formData.ownerName.trim()) {
      toast.error('يرجى كتابة اسم المسؤول.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      toast.error('يرجى إدخال رقم هاتف صحيح للتواصل وتفعيل الحساب.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }
    if (!formData.username.trim() || formData.username.length < 3) {
      toast.error('اسم المستخدم يجب أن يكون 3 أحرف أو أرقام على الأقل.');
      return;
    }
    if (!/^[a-z0-9_.-]+$/.test(formData.username.toLowerCase().trim())) {
      toast.error('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام فقط.');
      return;
    }
    if (usernameStatus.checked && !usernameStatus.available) {
      toast.error('اسم المستخدم محجوز بالفعل، يرجى اختيار اسم مستخدم آخر.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام.');
      return;
    }
    if (!agreedToTerms) {
      toast.error('يرجى الموافقة على الشروط والأحكام وسياسة الاسترجاع للمتابعة.');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanUsername = formData.username.toLowerCase().trim();
      const cleanSlug = formData.slug.trim() || formData.restaurantName.toLowerCase().trim().replace(/[\s_]+/g, '-');
      const deviceFingerprint = await getDeviceFingerprint();

      // If Free Trial: Directly Register and Auto-login!
      if (selectedPlanId === 'trial') {
        const response = await api.post('/auth/register-restaurant', {
          name: formData.restaurantName.trim(),
          slug: cleanSlug,
          ownerName: formData.ownerName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim() || undefined,
          username: cleanUsername,
          password: formData.password,
          plan: 'trial',
          deviceFingerprint,
        });

        const data = response.data?.data;
        if (data?.accessToken && data?.user && data?.restaurant) {
          toast.success('🎉 مرحباً بك في طاولة! تم تفعيل تجربتك المجانية لمدة 14 يوماً بنجاح.');
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

      // Prepared API Request Payload for Fawaterk & Backend
      const payload = {
        restaurantName: formData.restaurantName,
        slug: cleanSlug,
        ownerName: formData.ownerName,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        address: formData.address,
        username: cleanUsername,
        password: formData.password,
        plan: selectedPlanId,
        billingCycle,
        amount: price,
        currency: 'EGP',
        paymentGateway: 'fawaterk',
        redirectUrls: {
          successUrl: `${window.location.origin}/payment/confirmation?status=success&type=new`,
          failUrl: `${window.location.origin}/payment/confirmation?status=failed&type=new`,
          pendingUrl: `${window.location.origin}/payment/confirmation?status=pending&type=new`,
        },
      };

      const response = await api.post('/subscriptions/checkout', payload);
      if (response.data?.data?.invoiceLink) {
        toast.success('جاري توجيهك لبوابة الدفع الآمنة (فواتيرك)...');
        window.location.href = response.data.data.invoiceLink;
      } else {
        toast.error('تعذر إنشاء رابط الدفع من بوابة فواتيرك.');
      }
    } catch (err: any) {
      const rawError = err.response?.data?.error || err.response?.data?.message;
      let msg = 'تعذر إتمام العملية، يرجى مراجعة البيانات والمحاولة لاحقاً.';
      if (typeof rawError === 'string') {
        msg = rawError;
      } else if (typeof rawError === 'object' && rawError !== null) {
        msg = Object.values(rawError).flat().join(' - ');
      }
      toast.error(msg);
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
              <span className="text-[10px] text-[#5C524C]/70 -mt-1 font-medium">بوابة الاشتراك والدفع الآمن</span>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold text-[#5C524C]">
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              دفع مشفر ومعتمد 100%
            </span>
            <Link to="/" className="flex items-center gap-1 text-[#801B2C] hover:underline">
              الرجوع للرئيسية
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
            إتمام الاشتراك الفوري
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1612] mt-3">
            انضم لمنصة طاولة وارتقِ بتجربة ضيوفك
          </h1>
          <p className="text-xs sm:text-sm text-[#5C524C] mt-1.5">
            قم بتعبئة بياناتك للبدء الفوري أو الانتقال لبوابة الدفع الإلكتروني المعتمدة.
          </p>
        </div>

        <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Right Column: Checkout Steps Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Choose Plan */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">1</span>
                  اختر الباقة المناسبة لمطعمك
                </h2>

                {/* Billing Cycle Toggle */}
                {selectedPlanId !== 'trial' && (
                  <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-zinc-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        billingCycle === 'monthly'
                          ? 'bg-[#801B2C] text-white shadow-sm'
                          : 'text-[#5C524C] hover:text-[#1C1612]'
                      }`}
                    >
                      شهري
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        billingCycle === 'annual'
                          ? 'bg-[#801B2C] text-white shadow-sm'
                          : 'text-[#5C524C] hover:text-[#1C1612]'
                      }`}
                    >
                      سنوي
                      <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-md font-mono">وفر شهرين</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.values(plans).map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#801B2C] bg-[#801B2C]/5 shadow-[0_4px_20px_rgba(128,27,44,0.12)] ring-2 ring-[#801B2C]/20'
                          : 'border-zinc-200 hover:border-[#801B2C]/40 bg-[#FAF8F5]/50'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2.5 right-3 bg-[#801B2C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {plan.badge}
                        </span>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-[#1C1612]">{plan.name}</h3>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#801B2C] bg-[#801B2C]' : 'border-zinc-300'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>

                        <div className="pt-1">
                          {plan.id === 'trial' ? (
                            <div className="text-xl font-extrabold text-[#1C1612]">مجاناً</div>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-extrabold text-[#1C1612] font-mono">{displayPrice.toLocaleString()}</span>
                              <span className="text-xs font-bold text-[#5C524C]">ج.م / {isAnnual ? 'سنة' : 'شهر'}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-[#5C524C] leading-snug">{plan.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Restaurant Details */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">2</span>
                بيانات المطعم / الفرع
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">اسم المطعم أو الكافيه *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="restaurantName"
                      value={formData.restaurantName}
                      onChange={handleNameChange}
                      required
                      placeholder="مثال: كافيه السلطان"
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
                      name="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                      required
                      placeholder="sultan-cafe"
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
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      required
                      placeholder="مثال: أحمد محمود"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">رقم الهاتف / الواتساب *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      dir="ltr"
                      placeholder="010XXXXXXXX"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all text-right"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">البريد الإلكتروني للتواصل والإشعارات *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      dir="ltr"
                      placeholder="name@restaurant.com"
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
                بيانات حساب تسجيل الدخول للمدير (Admin)
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
                      name="username"
                      value={formData.username}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
                        setFormData(prev => ({ ...prev, username: val }));
                        setUsernameStatus({ checked: false, available: true, checking: false, message: '' });
                      }}
                      onBlur={handleUsernameBlur}
                      required
                      placeholder="admin_sultan"
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
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
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
            </div>

            {/* Step 4: Payment Gateway Selector */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">4</span>
                طريقة الدفع والتفعيل
              </h2>

              {selectedPlanId === 'trial' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950">تجربة مجانية بالكامل (0 ج.م)</h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      لا يلزم إدخال أية بيانات دفع الآن. ستحصل على صلاحيات النظام لمدة 14 يوماً مجاناً، ويمكنك الترقية للباقات المدفوعة لاحقاً.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="relative flex flex-col p-4 rounded-2xl border-2 border-[#801B2C] bg-[#801B2C]/5 cursor-pointer transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#801B2C] text-white flex items-center justify-center">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#1C1612]">بوابة فواتيرك (Fawaterk)</span>
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">دفع فوري آمن</span>
                          </div>
                          <p className="text-xs text-[#5C524C]">فيزا، ماستركارد، ميزة، فودافون كاش والمحافظ، إنستاباي، وفوري</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        checked={paymentMethod === 'fawaterk'}
                        onChange={() => setPaymentMethod('fawaterk')}
                        className="accent-[#801B2C] w-4 h-4"
                      />
                    </div>
                  </label>
                </div>
              )}

              {/* Terms Checkbox */}
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
                      سياسة الاسترجاع والترقية
                    </Link>
                    .
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Left Column: Order Summary & Guarantee (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] pb-4 border-b border-zinc-100">
                ملخص الاشتراك
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#1C1612]">{selectedPlan.name}</span>
                  <span className="font-bold font-mono text-[#1C1612]">
                    {price === 0 ? '0 ج.م' : `${price.toLocaleString()} ج.م`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C524C]">
                  <span>دورة الفوترة</span>
                  <span className="font-bold">
                    {selectedPlanId === 'trial' ? '14 يوماً مجاناً' : isAnnual ? 'سنوي (مقدم)' : 'شهري'}
                  </span>
                </div>

                {isAnnual && annualSavings > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl">
                    <span>خصم الدفع السنوي (شهرين مجاناً)</span>
                    <span className="font-bold font-mono">-{annualSavings.toLocaleString()} ج.م</span>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-100 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-[#1C1612]">الإجمالي المستحق الآن</span>
                  <div className="text-left" dir="ltr">
                    <span className="text-2xl font-black text-[#801B2C] font-mono">
                      {price === 0 ? '0.00' : price.toLocaleString()}
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
                    <span>
                      {selectedPlanId === 'trial' ? 'تأكيد التسجيل وبدء التجربة المجانية' : 'المتابعة للدفع الآمن عبر فواتيرك'}
                    </span>
                    <ChevronLeft className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Features List in Selected Plan */}
              <div className="pt-6 border-t border-zinc-100 space-y-3">
                <h4 className="text-xs font-bold text-[#1C1612]">المميزات المضمنة في هذه الباقة:</h4>
                <ul className="space-y-2 text-xs text-[#5C524C]">
                  {selectedPlan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security Seal */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-center gap-4 text-zinc-400 text-[11px] font-medium">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  تشفير SSL آمن 256-bit
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#801B2C]" />
                  بوابة معتمدة من البنك المركزي
                </span>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
