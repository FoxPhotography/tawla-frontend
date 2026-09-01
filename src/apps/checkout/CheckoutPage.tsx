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
  MapPin,
  Zap,
  ChevronLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import logoImg from '../../assets/TAWLA_Logo.png';
import { api } from '../../shared/services/api.js';

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
      'إرسال طلبات فوري للمطبخ والويترات',
      'لوحة تحكم الكاشير والمشرفين',
      'دعم فني وتدريب مجاني على الواتساب',
    ],
  },
  basic: {
    id: 'basic',
    name: 'الباقة الأساسية (Basic)',
    monthlyPrice: 1500,
    annualPrice: 15000, // 2 months free
    description: 'مثالية للمطاعم والكافيهات الناشئة الراغبة في تشغيل الخدمة الرقمية والـ QR فوراً.',
    features: [
      'منيو تفاعلي بـ QR لا نهائي للأصناف',
      'إرسال طلبات فوري للمطبخ والويترات',
      'استدعاء الويتر وطلب الحساب',
      'دعم حتى 30 طاولة ذكية',
      'إضافة حتى 200 منتج بالمنيو',
      'تقسيم المنيو حتى 15 أقسام/تصنيفات',
      'تقارير مبيعات متقدمة ومؤشرات أداء',
    ],
  },
  pro: {
    id: 'pro',
    name: 'الباقة المتقدمة (Pro)',
    badge: 'الأكثر طلباً',
    monthlyPrice: 3000,
    annualPrice: 30000, // 2 months free
    description: 'للإدارة والتحكم الكامل للفروع، الإيصالات المخصصة، الفواتير، ودعم الضريبة والخدمة.',
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
    ownerName: '',
    phone: '',
    email: '',
    city: 'الدقهلية',
    address: '',
    notes: '',
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
    if (!agreedToTerms) {
      toast.error('يرجى الموافقة على الشروط والأحكام وسياسة الاسترجاع للمتابعة.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedPlanId === 'trial') {
        // Free trial registration direct navigation
        toast.success('🎉 مرحباً بك في طاولة! تم تفعيل تجربتك المجانية لمدة 14 يوماً.');
        setTimeout(() => {
          navigate(`/register?plan=trial&restaurant=${encodeURIComponent(formData.restaurantName)}&email=${encodeURIComponent(formData.email)}`);
        }, 800);
        return;
      }

      // Prepared API Request Payload for Fawaterk & Backend
      const payload = {
        restaurantName: formData.restaurantName,
        ownerName: formData.ownerName,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        address: formData.address,
        plan: selectedPlanId,
        billingCycle,
        amount: price,
        currency: 'EGP',
        paymentGateway: 'fawaterk',
        redirectUrls: {
          successUrl: `${window.location.origin}/checkout?status=paid&plan=${selectedPlanId}`,
          failUrl: `${window.location.origin}/checkout?status=failed&plan=${selectedPlanId}`,
          pendingUrl: `${window.location.origin}/checkout?status=pending&plan=${selectedPlanId}`,
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
      let msg = 'تعذر إنشاء فاتورة الدفع عبر فواتيرك. يرجى المحاولة لاحقاً.';
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
        {/* Status Banners (Return from Fawaterk) */}
        {searchParams.get('status') === 'paid' && (
          <div className="mb-8 p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl">✓</div>
              <div>
                <h3 className="font-extrabold text-base text-emerald-900">تمت عملية الدفع بنجاح!</h3>
                <p className="text-xs text-emerald-800 mt-0.5">شكراً لاشتراكك في منصة طاولة. يمكنك الآن إكمال تسجيل بيانات حساب المطعم للبدء فوراً.</p>
              </div>
            </div>
            <Link to={`/register?plan=${selectedPlanId}`} className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold whitespace-nowrap shadow-sm">
              إكمال تسجيل الحساب ←
            </Link>
          </div>
        )}

        {searchParams.get('status') === 'failed' && (
          <div className="mb-8 p-6 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg">✕</div>
            <div>
              <h3 className="font-extrabold text-sm text-rose-900">تعذر إتمام عملية الدفع</h3>
              <p className="text-xs text-rose-800 mt-0.5">يرجى التأكد من رصيد البطاقة أو المحفظة الإلكترونية والمحاولة مجدداً، أو التواصل معنا للدعم.</p>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="mb-10 text-center sm:text-right">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#801B2C]/10 text-[#801B2C] text-xs font-bold mb-2">
            <CreditCard className="w-3.5 h-3.5" /> إتمام الاشتراك وتفعيل النظام
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1C1612]" style={{ fontFamily: '"Tajawal", sans-serif' }}>
            اختر باقتك وسجل مطعمك في دقائق
          </h1>
          <p className="text-sm text-[#5C524C] mt-2">
            انضم لمئات المطاعم والكافيهات التي تثق في طاولة لتقديم تجربة ضيافة رقمية استثنائية.
          </p>
        </div>

        <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT/MAIN: Plan Selector & Customer Information Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Step 1: Choose Plan */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">1</span>
                  اختيار باقة الاشتراك
                </h2>

                {/* Monthly / Annual Toggle */}
                {selectedPlanId !== 'trial' && (
                  <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#801B2C]/10 text-xs">
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

            {/* Step 2: Restaurant & Owner Details */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">2</span>
                بيانات المطعم والمسؤول
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
                      onChange={handleInputChange}
                      required
                      placeholder="مثال: كافيه السلطان"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">اسم المدير أو صاحب النشاط *</label>
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

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">البريد الإلكتروني لتفعيل الحساب *</label>
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

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">المحافظة / المدينة</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all bg-white"
                    >
                      <option value="الدقهلية">الدقهلية (بلقاس / المنصورة)</option>
                      <option value="القاهرة">القاهرة</option>
                      <option value="الجيزة">الجيزة</option>
                      <option value="الإسكندرية">الإسكندرية</option>
                      <option value="الشرقية">الشرقية</option>
                      <option value="الغربية">الغربية (طنطا / المحلة)</option>
                      <option value="دمياط">دمياط</option>
                      <option value="بورسعيد">بورسعيد</option>
                      <option value="أخرى">محافظة أخرى</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1612] mb-1.5">العنوان بالتفصيل (اختياري)</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="الشارع / المنطقة"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment Gateway Selector */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/10 shadow-[0_4px_25px_rgba(28,22,18,0.03)] space-y-6">
              <h2 className="text-lg font-bold text-[#1C1612] flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#801B2C] text-white text-xs flex items-center justify-center font-bold">3</span>
                طريقة الدفع المعتمدة
              </h2>

              {selectedPlanId === 'trial' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950">تجربة مجانية بالكامل (0 ج.م)</h4>
                    <p className="text-xs text-emerald-850 mt-1 leading-relaxed">
                      لا يلزم إدخال أية بيانات دفع الآن. ستحصل على صلاحيات النظام لمدة 14 يوماً مجاناً، ويمكنك الترقية للباقات المدفوعة لاحقاً.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Fawaterk Gateway Option */}
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
                      <div className="w-5 h-5 rounded-full bg-[#801B2C] text-white flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Logos of Supported Egyptian Payment Channels */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#801B2C]/10 text-[11px] text-[#5C524C]">
                      <span className="px-2 py-1 bg-white rounded-md border border-zinc-200 font-semibold">💳 Visa / Mastercard</span>
                      <span className="px-2 py-1 bg-white rounded-md border border-zinc-200 font-semibold">💳 Meeza ميزة</span>
                      <span className="px-2 py-1 bg-white rounded-md border border-zinc-200 font-semibold text-rose-600">📱 فودافون كاش والمحافظ</span>
                      <span className="px-2 py-1 bg-white rounded-md border border-zinc-200 font-semibold text-purple-700">⚡ إنستاباي InstaPay</span>
                      <span className="px-2 py-1 bg-white rounded-md border border-zinc-200 font-semibold text-amber-700">🟡 أمان وفوري</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR: Order Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#801B2C]/15 shadow-[0_6px_30px_rgba(128,27,44,0.06)] space-y-6">
              <h3 className="text-lg font-bold text-[#1C1612] pb-3 border-b border-zinc-100 flex items-center justify-between">
                <span>ملخص الاشتراك</span>
                <span className="text-xs font-normal text-[#5C524C]">العملة: جنيه مصري (EGP)</span>
              </h3>

              {/* Plan Box */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10 space-y-3">
                <div className="flex items-center justify-between font-bold text-sm">
                  <span className="text-[#1C1612]">{selectedPlan.name}</span>
                  <span className="text-[#801B2C]">{isAnnual ? 'اشتراك سنوي' : 'اشتراك شهري'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#5C524C]">
                  {selectedPlan.features.slice(0, 4).map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price Calculation */}
              <div className="space-y-2 text-sm text-[#5C524C] pt-2">
                <div className="flex items-center justify-between">
                  <span>سعر الباقة الأساسي</span>
                  <span className="font-mono font-bold text-[#1C1612]">
                    {selectedPlanId === 'trial' ? '0 ج.م' : `${price.toLocaleString()} ج.م`}
                  </span>
                </div>

                {isAnnual && annualSavings > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-semibold text-xs">
                    <span>خصم الدفع السنوي (شهرين مجاناً)</span>
                    <span className="font-mono">-{annualSavings.toLocaleString()} ج.م</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span>ضريبة القيمة المضافة / المصاريف</span>
                  <span className="text-emerald-700 font-semibold">شاملة ومجانية</span>
                </div>

                <hr className="border-zinc-200 my-2" />

                <div className="flex items-center justify-between text-base sm:text-lg font-bold text-[#1C1612] pt-1">
                  <span>الإجمالي المستحق للدفع:</span>
                  <div className="text-left">
                    <div className="font-mono text-[#801B2C] text-xl">
                      {selectedPlanId === 'trial' ? '0 ج.م' : `${price.toLocaleString()} ج.م`}
                    </div>
                    {selectedPlanId === 'trial' && (
                      <span className="text-[11px] text-[#5C524C] font-normal block">تجدد بعد 14 يوم أو تلغى مجاناً</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms & Policies Checkbox */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#5C524C] leading-relaxed">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#801B2C] focus:ring-[#801B2C] border-zinc-300"
                  />
                  <span>
                    أوافق على{' '}
                    <Link to="/terms" target="_blank" className="text-[#801B2C] font-bold underline">الشروط والأحكام</Link>
                    {' '}و{' '}
                    <Link to="/refund" target="_blank" className="text-[#801B2C] font-bold underline">سياسة الاسترجاع (14 يوماً تجربة)</Link>
                    {' '}و{' '}
                    <Link to="/privacy" target="_blank" className="text-[#801B2C] font-bold underline">سياسة الخصوصية</Link>.
                  </span>
                </label>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#801B2C] hover:bg-[#5E1422] text-white py-4 px-6 rounded-2xl font-bold text-sm sm:text-base shadow-[0_6px_25px_rgba(128,27,44,0.25)] hover:shadow-[0_8px_30px_rgba(128,27,44,0.35)] transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري معالجة الطلب...</span>
                  </div>
                ) : selectedPlanId === 'trial' ? (
                  <>
                    <Zap className="w-5 h-5 text-amber-300" />
                    <span>ابدأ تجربتك المجانية 14 يوماً</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>إتمام الدفع الآمن عبر فواتيرك</span>
                  </>
                )}
              </button>

              {/* Guarantees Box */}
              <div className="text-[11px] text-[#5C524C]/80 text-center space-y-1.5 pt-2">
                <p className="flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  معالجة مشفرة بالكامل ومعتمدة من البنك المركزي المصري
                </p>
                <p>الدعم الفني والتدريب متوفر مجاناً على مدار الساعة</p>
              </div>
            </div>

            {/* Official Support Info Box */}
            <div className="p-4 rounded-2xl bg-[#F4EFEB] border border-[#801B2C]/10 text-xs text-[#5C524C] space-y-2">
              <div className="font-bold text-[#1C1612]">هل تحتاج لمساعدة في الدفع أو استفسار؟</div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#801B2C]" />
                <span dir="ltr" className="font-mono text-[#801B2C]">support.tawla@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#801B2C]" />
                <span>مركز بلقاس - الدقهلية - مصر</span>
              </div>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}
