import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, Coffee, Send, ChevronRight, CheckCircle2, 
  Sparkles, ShieldCheck, Flame, Bell, TrendingUp, Receipt, Clock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';

interface SystemSettings {
  pricing: {
    basic: number;
    pro: number;
  };
  offer: {
    active: boolean;
    title: string;
    basicPrice: number;
    proPrice: number;
    endsAt?: string;
  };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings>({
    pricing: { basic: 1000, pro: 1500 },
    offer: { active: false, title: '', basicPrice: 0, proPrice: 0 }
  });
  const [pulsePricing, setPulsePricing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  
  const timerRef = useRef<any>(null);

  // Fetch initial system settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get('/system-settings');
        if (res.data && res.data.data) {
          setSettings(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load system settings:', err);
      }
    }
    fetchSettings();
  }, []);

  // Set up socket listener for live pricing updates
  useEffect(() => {
    // Connect socket if not connected
    if (!socket.connected) {
      socket.connect();
    }

    const handleSettingsUpdate = (updatedSettings: SystemSettings) => {
      setSettings(updatedSettings);
      setPulsePricing(true);
      toast.success('🔥 تم تحديث الأسعار والعروض الترويجية الحية الآن!', {
        icon: '🏷️',
        duration: 4000,
        style: {
          background: '#111113',
          color: '#FAFAF9',
          border: '1px solid rgba(212, 168, 83, 0.25)',
        }
      });
      setTimeout(() => setPulsePricing(false), 2000);
    };

    socket.on('system_settings_updated', handleSettingsUpdate);

    return () => {
      socket.off('system_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Countdown timer for promotional offers
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (settings.offer.active && settings.offer.endsAt) {
      const calculateTimeLeft = () => {
        const difference = +new Date(settings.offer.endsAt!) - +new Date();
        if (difference <= 0) {
          setTimeLeft(null);
          return;
        }

        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      };

      calculateTimeLeft();
      timerRef.current = setInterval(calculateTimeLeft, 1000);
    } else {
      setTimeLeft(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [settings.offer]);

  const handleWhatsappContact = () => {
    window.open('https://wa.me/201066980953', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAF9] overflow-x-hidden selection:bg-[#D4A853] selection:text-[#09090B] font-sans relative" dir="rtl">
      <Toaster position="top-center" />
      
      {/* Gradients Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-950/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[600px] left-0 w-[450px] h-[450px] bg-amber-950/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#09090B]/70 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#C9A84C] to-[#E5C158] flex items-center justify-center text-[#09090B] shadow-lg shadow-[#C9A84C]/10 font-bold">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xl font-black bg-gradient-to-l from-[#C9A84C] to-[#E5C158] bg-clip-text text-transparent">
              طاولة
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-400">
            <a href="#features" className="hover:text-[#C9A84C] transition-colors">المميزات</a>
            <a href="#pricing" className="hover:text-[#C9A84C] transition-colors">الباقات والأسعار</a>
            <a href="#contact" className="hover:text-[#C9A84C] transition-colors">اشترك الآن</a>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/admin/login')}
              className="text-xs font-bold text-[#FAFAF9] hover:text-[#C9A84C] px-4 py-2 transition-colors"
            >
              تسجيل دخول
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="text-xs font-black bg-gradient-to-r from-[#C9A84C] to-[#E5C158] text-[#09090B] hover:brightness-105 active:scale-95 px-4.5 py-2.5 rounded-xl transition-all shadow-md shadow-[#C9A84C]/10"
            >
              ابدأ مجاناً
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 md:py-32 px-4 max-w-7xl mx-auto">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#C9A84C] text-[10px] sm:text-xs font-bold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>الحل الذكي والأسرع لإدارة المطاعم والكافيهات بمصر 🇪🇬</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white"
          >
            ماتخليش اللود يوقفك! <br />
            شغّل منيو الـ <span className="bg-gradient-to-l from-[#C9A84C] to-[#E5C158] bg-clip-text text-transparent">QR التفاعلي</span> الذكي
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto"
          >
            وفر تكلفة المنيوهات المطبوعة، وسرّع استقبال الطلبات بضغطة زر. العميل هيمسح الـ QR، هيطلب، والويتر هيجيله إشعار فوري على لوحة التحكم. كل ده في ثواني!
          </motion.p>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <button 
              onClick={handleWhatsappContact}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-black bg-gradient-to-r from-[#C9A84C] to-[#E5C158] text-[#09090B] hover:brightness-105 active:scale-95 px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-[#C9A84C]/10 cursor-pointer"
            >
              <span>تواصل للاشتراك الفوري</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <a 
              href="#pricing"
              className="w-full sm:w-auto flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-8 py-3.5 rounded-xl transition-all"
            >
              شاهد الباقات والعروض
            </a>
          </motion.div>

          {/* Key Value Props */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-3 gap-2 sm:gap-4 max-w-xl mx-auto pt-10 text-[10px] sm:text-xs font-bold text-slate-400"
          >
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>جرب شهر كامل ببلاش</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-white/5">
              <Clock className="w-5 h-5 text-[#C9A84C]" />
              <span>تحديثات حية لحظية</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Flame className="w-5 h-5 text-orange-500" />
              <span>سعر منافس وبدون عمولات</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-white/5 bg-[#09090B]/50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-white">كل اللي هتحتاجه علشان تدير مطعمك باحترافية</h2>
            <p className="text-slate-400 text-xs sm:text-sm">نظام طاولة مصمم علشان يوفرلك وقتك ويريح زباينك ويرفع مبيعاتك.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "منيو الـ QR الأسرع بمصر 🚀",
                desc: "منيو شيك وتفاعلي بدون تحميل تطبيق، العميل بيمسح الكود يظهر المنيو مقسم لأقسام مع صور وأسعار وإمكانية الاختيار والتعديل على الطبق.",
                icon: Coffee,
                color: "text-amber-400"
              },
              {
                title: "استدعاء الويتر وطلب الفاتورة 🔔",
                desc: "مش هتحتاج تنادي على الويتر بصوت عالي! العميل بيبعت تنبيه 'استدعاء ويتر' أو 'طلب الفاتورة' والإشعار بيوصل مباشر على شاشات الموظفين.",
                icon: Bell,
                color: "text-indigo-400"
              },
              {
                title: "لوحة تحكم ذكية وشاملة 💻",
                desc: "إدارة كاملة للأقسام والأصناف، ترتيبها سحب وإفلات، تفعيل أو إخفاء أي طبق خلص فوراً، مع تتبع حالة الطاولات لحظياً بدون أي تأخير.",
                icon: QrCode,
                color: "text-rose-400"
              },
              {
                title: "تقارير وتحليلات مبيعات متقدمة 📊",
                desc: "باقة الـ PRO بتفتحلك تقارير تفصيلية ورسوم بيانية ذكية توضحلك مبيعاتك الأسبوعية والشهرية، واكتشاف الأطباق الأكثر طلباً وربحاً في مطعمك.",
                icon: TrendingUp,
                color: "text-emerald-400"
              },
              {
                title: "تصميم وطباعة فواتير المطعم 🖨️",
                desc: "تحكم كامل في مظهر إيصال الدفع (Receipt). تقدر ترفع لوجو المكان، تعدل أرقام الفواتير، ونسب الضرائب والخدمة وعناوين الفاتورة بمنتهى السهولة.",
                icon: Receipt,
                color: "text-sky-400"
              },
              {
                title: "أمان واستقرار تام 🔒",
                desc: "سيرفرات فائقة السرعة تضمن تشغيل المنيو وتلقي طلبات زباينك في ثوانٍ معدودة، مع دعم فني متواصل وحماية للبيانات بنسبة 100%.",
                icon: ShieldCheck,
                color: "text-violet-400"
              }
            ].map((feat, idx) => (
              <div 
                key={idx} 
                className="bg-slate-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-[#C9A84C]/20 hover:bg-slate-900/40 transition-all group duration-300"
              >
                <div className={`w-11 h-11 rounded-xl bg-slate-950 flex items-center justify-center ${feat.color} mb-4 shadow-inner group-hover:scale-105 transition-transform`}>
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing & Offers Section */}
      <section id="pricing" className="py-20 border-t border-white/5 px-4 relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-white">خطط اشتراك واضحة ومناسبة لمكانك</h2>
            <p className="text-slate-400 text-xs sm:text-sm">ابدأ فوراً وفعّل اشتراكك بعد فترة التجربة المجانية.</p>
            
            {/* Free trial callout */}
            <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-xl px-4 py-2 mt-4 text-[#C9A84C] text-xs font-black">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>شهر كامل تجربة مجانية (1 Month Free Trial) 🎁</span>
            </div>
          </div>

          {/* Active Offer Banner */}
          <AnimatePresence>
            {settings.offer.active && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl mx-auto mb-10 bg-gradient-to-r from-amber-600/20 to-yellow-600/10 border border-[#C9A84C]/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
              >
                {/* Floating shine */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl" />
                
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right relative z-10 justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-[#09090B] text-[10px] font-black">
                      <Flame className="w-3 h-3 fill-current" />
                      عاجل
                    </span>
                    <h3 className="text-base font-extrabold text-white">{settings.offer.title}</h3>
                    <p className="text-xs text-slate-300">عرض حصري ومحدود للغاية، الحق احجز مكانك بالأسعار المخفضة!</p>
                  </div>

                  {timeLeft && (
                    <div className="flex items-center gap-1.5 bg-slate-950/80 border border-white/5 px-3.5 py-2 rounded-xl text-[#C9A84C] font-mono text-sm shadow-inner shrink-0">
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                      <div className="flex gap-1 text-center font-bold text-xs">
                        <div>
                          <span>{String(timeLeft.days).padStart(2, '0')}</span>
                          <span className="text-[9px] block text-slate-500 font-sans font-medium">يوم</span>
                        </div>
                        <span className="text-slate-600">:</span>
                        <div>
                          <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                          <span className="text-[9px] block text-slate-500 font-sans font-medium">ساعة</span>
                        </div>
                        <span className="text-slate-600">:</span>
                        <div>
                          <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                          <span className="text-[9px] block text-slate-500 font-sans font-medium">دقيقة</span>
                        </div>
                        <span className="text-slate-600">:</span>
                        <div>
                          <span className="text-white animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</span>
                          <span className="text-[9px] block text-slate-500 font-sans font-medium">ثانية</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Basic Card */}
            <motion.div 
              animate={pulsePricing ? { scale: [1, 1.02, 1], borderColor: ['rgba(255,255,255,0.05)', '#C9A84C', 'rgba(255,255,255,0.05)'] } : {}}
              transition={{ duration: 0.6 }}
              className="bg-slate-900/20 backdrop-blur-md border border-white/5 rounded-3xl p-8 relative flex flex-col justify-between hover:border-white/10 transition-all shadow-xl"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-white">الباقة الأساسية (BASIC)</h3>
                  {settings.offer.active && (
                    <span className="text-[10px] font-black px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-[#C9A84C] rounded-full">
                      وفر {settings.pricing.basic - settings.offer.basicPrice} ج.م
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs sm:text-sm">مثالية للكافيهات والمطاعم الصغيرة لبدء استقبال الطلبات فوراً بالـ QR.</p>
                
                {/* Price Display */}
                <div className="py-4">
                  {settings.offer.active ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-[#C9A84C]">{settings.offer.basicPrice}</span>
                        <span className="text-xs font-bold text-slate-400">جنيه مصري / شهرياً</span>
                      </div>
                      <div className="text-xs text-slate-500 line-through">
                        السعر الأصلي: {settings.pricing.basic} جنيه
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-white">{settings.pricing.basic}</span>
                      <span className="text-xs font-bold text-slate-400">جنيه مصري / شهرياً</span>
                    </div>
                  )}
                </div>

                {/* Features list */}
                <ul className="space-y-3 pt-4 border-t border-white/5 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>منيو تفاعلي بـ QR لا نهائي للأصناف والأطباق</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>إرسال طلبات فوري للمطبخ والويترات</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>خدمة استدعاء الويتر وطلب الحساب من العميل</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>تعديل قائمة الأطعمة وتفعيل/إخفاء الأطباق لحظياً</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-500 line-through">
                    <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>تحليلات ورسوم بيانية وتقارير مبيعات متقدمة</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button 
                  onClick={handleWhatsappContact}
                  className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>اطلب باقة BASIC الآن</span>
                </button>
              </div>
            </motion.div>

            {/* Pro Card */}
            <motion.div 
              animate={pulsePricing ? { scale: [1, 1.02, 1], borderColor: ['rgba(212,168,83,0.1)', '#C9A84C', 'rgba(212,168,83,0.1)'] } : {}}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-b from-[#C9A84C]/5 to-slate-900/10 backdrop-blur-md border border-[#C9A84C]/25 rounded-3xl p-8 relative flex flex-col justify-between hover:border-[#C9A84C]/45 transition-all shadow-2xl"
            >
              {/* Popular Badge */}
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-[#C9A84C] to-[#E5C158] text-[#09090B] text-[10px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>الباقة الأكثر طلباً ورواجاً</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-white">الباقة المتقدمة (PRO)</h3>
                  {settings.offer.active && (
                    <span className="text-[10px] font-black px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-[#C9A84C] rounded-full">
                      وفر {settings.pricing.pro - settings.offer.proPrice} ج.م
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs sm:text-sm">للإدارة الكاملة مع الفواتير والتقارير المتقدمة لتحليل مبيعاتك وأرباحك.</p>
                
                {/* Price Display */}
                <div className="py-4">
                  {settings.offer.active ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-[#C9A84C]">{settings.offer.proPrice}</span>
                        <span className="text-xs font-bold text-slate-400">جنيه مصري / شهرياً</span>
                      </div>
                      <div className="text-xs text-slate-500 line-through">
                        السعر الأصلي: {settings.pricing.pro} جنيه
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-[#C9A84C]">{settings.pricing.pro}</span>
                      <span className="text-xs font-bold text-slate-400">جنيه مصري / شهرياً</span>
                    </div>
                  )}
                </div>

                {/* Features list */}
                <ul className="space-y-3 pt-4 border-t border-[#C9A84C]/15 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C9A84C] shrink-0" />
                    <span>كل مميزات الباقة الأساسية بلا استثناء</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C9A84C] shrink-0" />
                    <span>شاشة تقارير مبيعات شاملة وأرباح يومية وأسبوعية</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C9A84C] shrink-0" />
                    <span>معرفة الأصناف والأقسام الأكثر شعبية وطلباً</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C9A84C] shrink-0" />
                    <span>تصميم وضبط إيصالات الدفع وتفعيل الضرائب والخدمة</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C9A84C] shrink-0" />
                    <span>دعم فني خاص ذو أولوية على مدار الساعة</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button 
                  onClick={handleWhatsappContact}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E5C158] hover:brightness-105 active:scale-95 text-[#09090B] font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#C9A84C]/10 cursor-pointer"
                >
                  <span>اطلب باقة PRO وتواصل معنا</span>
                </button>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Footer Contact Section */}
      <section id="contact" className="py-20 border-t border-white/5 bg-[#09090B] px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Send className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">جاهز تزود كفاءة ومبيعات مكانك؟</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            الاشتراك يتم فورياً عن طريق التواصل معنا على الواتساب. هنشغل لك حسابك ونولد أكواد التفعيل وتجرب شهر كامل مجاناً بدون التزام!
          </p>
          
          <div className="pt-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleWhatsappContact}
              className="px-8 py-4 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 mx-auto shadow-xl shadow-[#25D366]/10 cursor-pointer"
            >
              {/* Pulsing Green dot */}
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping-slow" />
              <span>اضغط هنا لمراسلتنا عبر الواتساب فوراً</span>
            </motion.button>
            <span className="block text-[10px] text-slate-500 mt-2 font-mono" dir="ltr">wa.me/201066980953</span>
          </div>
        </div>
      </section>

      {/* Lower Footer */}
      <footer className="py-8 border-t border-white/5 bg-[#070708] px-4 text-center text-xs text-slate-650">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-bold">جميع الحقوق محفوظة © {new Date().getFullYear()} - نظام طاولة لإدارة المطاعم</p>
          <div className="flex gap-4 font-bold text-slate-500">
            <a href="/admin/login" className="hover:text-white transition-colors">لوحة تحكم الكافيه</a>
            <span>•</span>
            <a href="/staff/login" className="hover:text-white transition-colors">دخول الموظفين</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
