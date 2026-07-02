import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  QrCode, Coffee, Bell, TrendingUp, Receipt,
  Laptop, Check, ArrowLeft,
  ChevronDown, Send, Sparkles, Menu, X,
  Lock, ShoppingBag, Plus, Trash2, CloudOff
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import logoImg from '../../assets/newlogo.svg';

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
  limits: {
    trial: number;
    basic: number;
    pro: number;
    tables?: { trial: number; basic: number; pro: number };
    products?: { trial: number; basic: number; pro: number };
    categories?: { trial: number; basic: number; pro: number };
  };
}

// Custom Hook for scroll reveal
function useReveal(margin = "-100px") {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: margin as any });
  return { ref, isInView };
}

// CountUp Component for stats
function CountUp({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useReveal();
  
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(Math.round(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);
  
  return <span ref={ref} className="tabular-nums font-bold">{count}{suffix}</span>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings>({
    pricing: { basic: 1000, pro: 1500 },
    offer: { active: false, title: '', basicPrice: 0, proPrice: 0 },
    limits: { trial: 5, basic: 10, pro: 20 }
  });
  const [pulsePricing, setPulsePricing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Interactive Simulator States
  const [simCart, setSimCart] = useState<Array<{ name: string; price: number; qty: number }>>([]);
  const [simWaiterCalled, setSimWaiterCalled] = useState(false);
  const [simBillRequested, setSimBillRequested] = useState(false);
  
  const timerRef = useRef<any>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll controls for header and effects
  const { scrollY } = useScroll();
  const headerBg = useTransform(scrollY, [0, 50], ["rgba(250, 248, 245, 0)", "rgba(250, 248, 245, 0.85)"]);
  const headerBorder = useTransform(scrollY, [0, 50], ["rgba(184, 151, 62, 0)", "rgba(184, 151, 62, 0.08)"]);
  const headerHeight = useTransform(scrollY, [0, 50], ["76px", "60px"]);

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
          background: '#FFFFFF',
          color: '#1C1612',
          border: '1px solid rgba(184, 151, 62, 0.3)',
          borderRadius: '12px',
          fontFamily: '"IBM Plex Sans Arabic", sans-serif',
          boxShadow: '0 10px 30px rgba(184,151,62,0.1)'
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

  // Interactive Simulator Functions
  const addToSimCart = (itemName: string, price: number) => {
    setSimCart(prev => {
      const existing = prev.find(i => i.name === itemName);
      if (existing) {
        return prev.map(i => i.name === itemName ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { name: itemName, price, qty: 1 }];
    });
    toast.success(`تمت إضافة ${itemName} إلى الطلب التجريبي`, {
      icon: '🛒',
      style: {
        background: '#FAF8F5',
        color: '#1C1612',
        border: '1px solid rgba(184,151,62,0.2)'
      }
    });
  };

  const clearSimCart = () => {
    setSimCart([]);
    toast.error('تم إفراغ الطلب التجريبي', {
      style: {
        background: '#FAF8F5',
        color: '#1C1612'
      }
    });
  };

  const toggleSimWaiter = () => {
    setSimWaiterCalled(prev => !prev);
    if (!simWaiterCalled) {
      toast.success('تم إرسال استدعاء الويتر في الماكيت', {
        icon: '🔔'
      });
    }
  };

  const toggleSimBill = () => {
    setSimBillRequested(prev => !prev);
    if (!simBillRequested) {
      toast.success('تم إرسال طلب الفاتورة في الماكيت', {
        icon: '💵'
      });
    }
  };



  const features = [
    {
      title: "منيو تفاعلي بدون تحميل تطبيق",
      desc: "منيو رقمي فاخر وسريع جداً. يمسح العميل الكود ويظهر له قائمة طعام قائمة على الويب بصور جذابة وتحديثات فورية للأسعار.",
      icon: Coffee,
      badge: "تفاعلي"
    },
    {
      title: "طلب الويتر والـ Checkout الفوري",
      desc: "يتيح للعملاء إرسال طلبات سريعة كطلب الفاتورة أو استدعاء الويتر بلمسة زر، لتصل فوراً كتنبيهات حية.",
      icon: Bell,
      badge: "فوري"
    },
    {
      title: "لوحة تحكم للمدير متكاملة وسلسة",
      desc: "إضافة وحذف وتعديل المكونات والأصناف، تفعيل أو إخفاء أي طبق لحظة نفاذه، ومتابعة الطلبات الجارية.",
      icon: QrCode,
      badge: "إدارة شاملة"
    },
    {
      title: "تقارير مبيعات متقدمة",
      desc: "استمتع بإحصائيات دقيقة وأرباح يومية وأسبوعية. اعرف الأصناف الأكثر شعبية لاتخاذ قرارات أفضل.",
      icon: TrendingUp,
      badge: "ذكاء أعمال"
    },
    {
      title: "تخصيص الفواتير والإيصالات",
      desc: "صمّم مظهر إيصالاتك وضبط لوجو الكافيه، مع التحكم في نسب الخدمة والضرائب وطباعة الفاتورة.",
      icon: Receipt,
      badge: "تخصيص كامل"
    },
    {
      title: "دعم العمل بدون إنترنت (أوفلاين)",
      desc: "سيستم محمي ومستقر تماماً في حال انقطاع الشبكة. يتم حفظ طلبيات الويتر محلياً مع طباعة فواتيره، وتُرفع تلقائياً للسيرفر فور عودة الاتصال.",
      icon: CloudOff,
      badge: "حصري ومبتكر"
    }
  ];

  const basicTablesLimit = settings.limits?.tables?.basic ?? settings.limits?.basic ?? 10;
  const basicProductsLimit = settings.limits?.products?.basic ?? 50;
  const basicCategoriesLimit = settings.limits?.categories?.basic ?? 15;

  const proTablesLimit = settings.limits?.tables?.pro ?? settings.limits?.pro ?? 20;
  const proProductsLimit = settings.limits?.products?.pro ?? 9999;
  const proCategoriesLimit = settings.limits?.categories?.pro ?? 9999;

  const pricingFeaturesBasic = [
    "منيو تفاعلي بـ QR لا نهائي للأصناف",
    "إرسال طلبات فوري للمطبخ والويترات",
    "استدعاء الويتر وطلب الحساب",
    `دعم حتى ${basicTablesLimit} طاولات ذكية`,
    `إضافة حتى ${basicProductsLimit} منتجات بالمنيو`,
    `تقسيم المنيو حتى ${basicCategoriesLimit} أقسام/تصنيفات`,
  ];

  const pricingFeaturesPro = [
    "كل مميزات الباقة الأساسية بلا استثناء",
    proTablesLimit >= 9999 ? "دعم طاولات ذكية غير محدود" : `دعم حتى ${proTablesLimit} طاولة ذكية`,
    proProductsLimit >= 9999 ? "إضافة منتجات غير محدودة بالمنيو" : `إضافة حتى ${proProductsLimit} منتج بالمنيو`,
    proCategoriesLimit >= 9999 ? "تقسيم أقسام وتصنيفات غير محدود" : `تقسيم المنيو حتى ${proCategoriesLimit} قسم/تصنيف`,
    "تصميم وضبط إيصالات الدفع ولوجو المطعم",
    "تفعيل الضرائب ورسوم الخدمة للفواتير",
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1612] overflow-x-hidden selection:bg-[#B8973E]/20 selection:text-[#1C1612] relative antialiased" dir="rtl" style={{ fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif' }}>
      <Toaster position="top-center" />
      
      {/* Premium Font Pairing and Custom Styling */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Playfair+Display+SC:wght@400;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        
        .luxury-card {
          background: #FFFFFF;
          border: 1px solid rgba(184, 151, 62, 0.12);
          box-shadow: 0 12px 35px -10px rgba(184, 151, 62, 0.04);
        }
        
        .luxury-card-hover:hover {
          box-shadow: 0 16px 45px -8px rgba(184, 151, 62, 0.08);
          border-color: rgba(184, 151, 62, 0.3) !important;
          transform: translateY(-4px);
        }
        
        .luxury-btn-gold {
          background: linear-gradient(135deg, #C5A85C 0%, #B8973E 100%);
          color: #FFFFFF;
        }
        .luxury-btn-gold:hover {
          background: linear-gradient(135deg, #D4B86A 0%, #C5A85C 100%);
          box-shadow: 0 6px 20px rgba(184, 151, 62, 0.25);
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #FAF8F5;
        }
        ::-webkit-scrollbar-thumb {
          background: #E8E5DF;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #CFCBC2;
        }
      `}</style>

      {/* ═══════════════════════ NOISE & GOLD SHADOW BG OVERLAYS ═══════════════════════ */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.012]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
      }} />

      {/* Luxury glowing mesh blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[800px] rounded-full opacity-[0.07] blur-[150px] pointer-events-none" style={{ background: 'radial-gradient(circle, #B8973E 0%, transparent 80%)' }} />
      <div className="absolute top-[35%] left-[-15%] w-[50vw] h-[50vw] max-w-[650px] rounded-full opacity-[0.05] blur-[130px] pointer-events-none" style={{ background: 'radial-gradient(circle, #2D5B46 0%, transparent 80%)' }} />
      <div className="absolute bottom-[8%] right-[5%] w-[55vw] h-[55vw] max-w-[750px] rounded-full opacity-[0.06] blur-[140px] pointer-events-none" style={{ background: 'radial-gradient(circle, #B8973E 0%, transparent 80%)' }} />

      {/* ═══════════════════════ HEADER NAVIGATION ═══════════════════════ */}
      <motion.header 
        style={{ backgroundColor: headerBg, borderColor: headerBorder, height: headerHeight }}
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-all duration-300 flex items-center"
      >
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:scale-110 bg-white border border-[#B8973E]/20">
              <img src={logoImg} alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="text-[20px] text-[#1C1612] font-semibold tracking-tight" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              طاولة
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-10">
            {[
              { label: "المميزات", href: "#features" },
              { label: "شرح الماكيت", href: "#how-it-works" },
              { label: "الباقات", href: "#pricing" },
              { label: "الأسئلة الشائعة", href: "#faq" },
            ].map((link) => (
              <a 
                key={link.href} 
                href={link.href} 
                className="text-[13px] text-[#5C524C] hover:text-[#B8973E] transition-all duration-300 font-medium tracking-wide"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-[13px] text-[#5C524C] hover:text-[#1C1612] transition-colors py-2 px-4 font-medium"
            >
              تسجيل دخول
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="luxury-btn-gold font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all duration-300 cursor-pointer transform active:scale-95"
            >
              ابدأ مجاناً
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#5C524C] hover:text-[#1C1612]"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.header>

      {/* Custom Mobile Navigation Sidebar Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop Overlay with blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#1C1612]/30 backdrop-blur-xs z-50 md:hidden"
            />
            
            {/* Slide-out Sidebar Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 right-0 w-[290px] max-w-[85vw] bg-[#FAF8F5] border-l border-[#B8973E]/15 z-50 md:hidden flex flex-col shadow-[0_0_50px_rgba(28,22,18,0.15)]"
            >
              {/* Header inside drawer */}
              <div className="p-6 border-b border-[#B8973E]/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-[#B8973E]/20">
                    <img src={logoImg} alt="Logo" className="w-full h-full object-contain p-0.5" />
                  </div>
                  <span className="text-[18px] text-[#1C1612] font-semibold tracking-tight font-serif">
                    طاولة
                  </span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-[#5C524C] hover:text-[#1C1612] rounded-lg hover:bg-[#B8973E]/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links inside drawer */}
              <div className="flex-1 overflow-y-auto py-6 px-6 flex flex-col gap-6 text-right">
                {[
                  { label: "المميزات", href: "#features" },
                  { label: "شرح الماكيت", href: "#how-it-works" },
                  { label: "الباقات", href: "#pricing" },
                  { label: "الأسئلة الشائعة", href: "#faq" },
                ].map((link) => (
                  <a 
                    key={link.href} 
                    href={link.href} 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-[15px] font-bold text-[#5C524C] hover:text-[#B8973E] pb-2.5 border-b border-black/[0.02] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {/* CTA / Action Buttons at bottom of drawer */}
              <div className="p-6 border-t border-[#B8973E]/10 flex flex-col gap-3">
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                  className="w-full text-center text-[14px] text-[#5C524C] hover:text-[#1C1612] py-3 border border-[#B8973E]/15 rounded-xl font-bold bg-white hover:bg-[#B8973E]/5 transition-colors"
                >
                  تسجيل دخول
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}
                  className="w-full text-center luxury-btn-gold font-bold text-[14px] py-3.5 rounded-xl transition-all shadow-sm"
                >
                  ابدأ مجاناً
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════ HERO SECTION ═══════════════════════ */}
      <section ref={heroRef} className="relative min-h-[92vh] pt-28 pb-16 flex items-center justify-center overflow-hidden">
        {/* Fine gold outline frame overlay */}
        <div className="absolute top-[120px] right-[4%] w-px h-[280px] bg-gradient-to-b from-[#B8973E]/30 via-[#B8973E]/5 to-transparent hidden xl:block" />
        <div className="absolute bottom-[12%] left-[4%] w-[180px] h-px bg-gradient-to-r from-[#B8973E]/20 to-transparent hidden xl:block" />
        
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(rgba(184,151,62,0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10 w-full">
          {/* Right Column: Text & Hero Badges */}
          <div className="lg:col-span-6 text-right space-y-8 lg:pr-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-[#B8973E]/8 border border-[#B8973E]/20 rounded-full px-4.5 py-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B8973E]" />
              <span className="text-[11px] text-[#A08130] font-bold tracking-wide">
                منظومة طلبات سحابية راقية للمطاعم والكافيهات
              </span>
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-[clamp(36px,5.2vw,70px)] font-medium leading-[1.12] tracking-tight text-[#1C1612]" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                أرقى تجربة ضيافة
                <br />
                <span className="relative inline-block bg-gradient-to-l from-[#1C1612] via-[#A08130] to-[#B8973E] bg-clip-text text-transparent">
                  من خلال منيو الـ QR
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                    className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-[#B8973E]/40"
                    style={{ transformOrigin: 'right' }}
                  />
                </span>
              </h1>
              
              <p className="text-[15px] sm:text-[16px] text-[#5C524C] leading-[1.85] max-w-[560px] ml-auto">
                امنح ضيوفك الرفاهية الكاملة لتصفح قائمة طعام تفاعلية، طلب الويتر، واستلام الحساب فورا بمسح كود طاولة الـ QR. وفر الجهد الورقي وأشرف على عملياتك لحظياً بكامل كفاءتها.
              </p>
            </div>

            {/* Micro-visual key values inside luxury light capsules */}
            <div className="grid grid-cols-2 gap-4 max-w-[480px] ml-auto pt-2">
              <div className="bg-white border border-[#B8973E]/12 p-3.5 rounded-2xl text-right flex items-center gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/8 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-[#2D5B46]" />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold text-[#1C1612]">تأكيد طلب فوري</h4>
                  <p className="text-[10px] text-[#5C524C]/60 mt-0.5">اتصال مباشر بالمطبخ</p>
                </div>
              </div>

              <div className="bg-white border border-[#B8973E]/12 p-3.5 rounded-2xl text-right flex items-center gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-[#B8973E]/8 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-[#A08130]" />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold text-[#1C1612]">+28% زيادة مبيعات</h4>
                  <p className="text-[10px] text-[#5C524C]/60 mt-0.5">سرعة إعادة الطلب والإضافات</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row-reverse items-center justify-start gap-4 pt-2">
              <button
                onClick={handleWhatsappContact}
                className="group w-full sm:w-auto luxury-btn-gold font-bold text-[14px] px-8 py-4 rounded-xl flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                تواصل للاشتراك الفوري
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  const element = document.getElementById('how-it-works');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto text-[#5C524C] hover:text-[#1C1612] border border-[#B8973E]/20 hover:border-[#B8973E]/45 font-semibold text-[14px] px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 bg-white/40"
              >
                شاهد محاكاة الماكيت
              </button>
            </div>

            <div className="text-[11px] text-[#5C524C]/50 tracking-wide font-medium">
              تفعيل المنظومة خلال ٤٨ ساعة • باقة تجريبية مجانية شهر كامل • دعم فني مخصص
            </div>
          </div>

          {/* Left Column: Visual Mockup Stand in Light Theme */}
          <div className="lg:col-span-6 flex justify-center relative mt-6 lg:mt-0">
            {/* Ambient gold glow behind mockups */}
            <div className="absolute w-[350px] h-[350px] bg-[#B8973E]/10 rounded-full blur-[80px] pointer-events-none" />

            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-[410px]"
            >
              {/* Back Card: Real-time notification */}
              <div className="absolute top-[-30px] right-[-20px] bg-white border border-[#B8973E]/15 rounded-2xl p-4 shadow-[0_20px_40px_rgba(184,151,62,0.06)] w-[210px] text-right z-20 hidden sm:block" style={{ animation: 'bounce 4.5s infinite ease-in-out' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                  <span className="text-[10px] text-green-600 font-bold">تنبيه فوري حقيقي</span>
                </div>
                <h4 className="text-[11.5px] font-bold text-[#1C1612] mb-0.5">طلب ويتر - طاولة ١٢</h4>
                <p className="text-[9.5px] text-[#5C524C]">مطلوب استدعاء عاجل</p>
              </div>

              {/* Front Card: Stats overlay */}
              <div className="absolute bottom-[-15px] left-[-30px] bg-white border border-[#B8973E]/15 rounded-2xl p-4.5 shadow-[0_20px_40px_rgba(184,151,62,0.06)] w-[220px] text-right z-20 hidden sm:block" style={{ animation: 'bounce 4.5s infinite ease-in-out 2.2s' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9.5px] text-[#5C524C]/60 font-mono">تقرير المبيعات</span>
                  <TrendingUp className="w-3.5 h-3.5 text-[#B8973E]" />
                </div>
                <h4 className="text-[15px] font-bold text-[#1C1612] tracking-tight">٤,٨٥٠ ج.م مبيعات اليوم</h4>
                <div className="w-full bg-[#FAF8F5] h-1.5 rounded-full mt-2.5 overflow-hidden border border-[#B8973E]/10">
                  <div className="bg-[#B8973E] h-full w-[78%] rounded-full" />
                </div>
              </div>

              {/* Main Showcase Device: QR Table Stand Mockup */}
              <div className="bg-gradient-to-b from-white to-[#FAF8F5] border border-[#B8973E]/15 rounded-3xl p-6 shadow-[0_30px_60px_-15px_rgba(184,151,62,0.12)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#B8973E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                {/* Visual Stand Card Details */}
                <div className="relative border border-[#B8973E]/10 bg-white rounded-2xl p-6 text-center space-y-6 shadow-sm">
                  {/* Restaurant Logo Area */}
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#B8973E]/15 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-[#B8973E]" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-[15px] font-bold text-[#1C1612]">كافيه ومطعم الأندلس</h3>
                    <p className="text-[11px] text-[#5C524C]">امسح لمشاهدة المنيو والطلب الفوري</p>
                  </div>

                  {/* High fidelity QR Code representation */}
                  <div className="mx-auto w-36 h-36 bg-white border border-[#B8973E]/15 rounded-xl p-2.5 flex items-center justify-center relative shadow-sm">
                    {/* Corner accents */}
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-2 border-r-2 border-[#B8973E]" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-2 border-l-2 border-[#B8973E]" />
                    
                    {/* Simulated vector QR patterns */}
                    <div className="w-full h-full opacity-90 relative">
                      <QrCode className="w-full h-full text-[#1C1612]" strokeWidth={1.5} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-lg bg-[#1C1612] border-2 border-white flex items-center justify-center">
                          <Coffee className="w-4 h-4 text-[#B8973E]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table details */}
                  <div className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border border-[#B8973E]/15 px-4.5 py-1.5 rounded-full text-[#B8973E] font-mono text-[12px] font-bold">
                    طاولة رقم : ١٢
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ STATS BANNER ═══════════════════════ */}
      <section className="relative bg-gradient-to-r from-[#C5A85C] via-[#B8973E] to-[#A08130] py-8 overflow-hidden shadow-md">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
          backgroundSize: '12px 12px'
        }} />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-white/20 divide-x-reverse">
            {[
              { value: <CountUp target={35} suffix="%+" />, label: "زيادة في سرعة تلبية الطلبات" },
              { value: "0 خطأ", label: "في استقبال المطبخ للطلبات" },
              { value: "30 يوم", label: "باقة تجريبية مجانية بالكامل للفرع" },
            ].map((stat, i) => (
              <div key={i} className="text-center pt-4 md:pt-0 first:pt-0">
                <div className="text-[34px] lg:text-[40px] font-bold text-white leading-none font-serif" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                  {stat.value}
                </div>
                <div className="text-[11.5px] lg:text-[12px] text-white/80 font-bold mt-2 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS SECTION (INTERACTIVE SIMULATOR) ═══════════════════════ */}
      <section id="how-it-works" className="relative py-32 bg-[#FAF8F5] border-b border-[#B8973E]/10">
        {/* Soft radial grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#B8973E_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-[0.15] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-20 space-y-4">
            <span className="text-[11px] text-[#B8973E] font-bold tracking-[0.25em] uppercase block">
              ماكيت تفاعلي حي
            </span>
            <h2 className="text-[32px] sm:text-[44px] font-medium text-[#1C1612] tracking-tight" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              كيف تتكامل تجربة طاولة الضيف؟
            </h2>
            <p className="text-[14.5px] text-[#5C524C] max-w-lg mx-auto leading-relaxed">
              <strong>جرب الماكيت بنفسك:</strong> اضغط على إضافة طبق أو اطلب الويتر في واجهة الهاتف (يسار)، وشاهد التحديث الفوري على شاشة الكنترول (يمين) فوراً!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-stretch">
            
            {/* RIGHT COLUMN: Mobile Smartphone Simulator (Interactive Client Menu) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[340px] flex flex-col h-full">
                {/* Smartphone visual frame */}
                <div className="bg-[#1C1612] rounded-t-3xl px-6 pt-5 pb-2 text-center text-white text-[10px] font-bold tracking-widest relative">
                  {/* Notch design */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-black rounded-full" />
                  <div className="flex justify-between items-center text-white/50 text-[9px] font-mono px-1">
                    <span>9:41</span>
                    <span className="text-[#B8973E] font-bold font-serif">Al-Andalus Menu</span>
                    <span className="flex items-center gap-1">5G 📶 🔋</span>
                  </div>
                </div>

                <div className="bg-white border-x-4 border-b-4 border-[#1C1612] rounded-b-3xl p-4.5 space-y-4 min-h-[460px] flex flex-col justify-between shadow-2xl relative">
                  <div className="space-y-3.5">
                    {/* Menu Header inside phone */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.04] text-right">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-[#B8973E]" />
                        <span className="text-[11.5px] font-bold text-[#1C1612]">طاولة الأندلس</span>
                      </div>
                      <span className="text-[9.5px] font-bold px-2 py-0.5 bg-[#B8973E]/12 text-[#B8973E] rounded-md font-mono">طاولة رقم ١٢</span>
                    </div>

                    {/* Smartphone food items catalog list */}
                    <div className="space-y-2">
                      {[
                        { id: "capp", emoji: "☕", name: "كابوتشينو دبل شوت", desc: "رغوة حليب طازجة غنية", price: 75 },
                        { id: "mango", emoji: "🥤", name: "عصير مانجو فريش", desc: "طبيعي ١٠٠٪ بدون سكر مضاف", price: 55 },
                        { id: "crois", emoji: "🥐", name: "كرواسون زبدة فرنسي", desc: "طازج مخبوز بعناية فجر اليوم", price: 65 }
                      ].map((item) => {
                        const qty = simCart.find(i => i.name === item.name)?.qty || 0;
                        return (
                          <div 
                            key={item.id} 
                            className="bg-[#FAF8F5] rounded-xl p-3 border border-[#B8973E]/10 flex items-center justify-between gap-2.5 transition-all hover:border-[#B8973E]/30 relative overflow-hidden group text-right"
                          >
                            <div className="flex flex-col items-start gap-1 shrink-0">
                              <span className="text-[11.5px] font-bold text-[#B8973E] font-mono leading-none">{item.price} ج.م</span>
                              <button 
                                onClick={() => addToSimCart(item.name, item.price)}
                                className="mt-1 p-1 bg-white border border-[#B8973E]/20 text-[#B8973E] hover:bg-[#B8973E] hover:text-white rounded-lg transition-colors flex items-center justify-center"
                                style={{ width: '26px', height: '26px' }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="flex items-center gap-1.5 justify-end">
                                {qty > 0 && (
                                  <span className="text-[9px] bg-[#B8973E] text-white px-1.5 py-0.5 rounded-full font-bold font-mono">
                                    {qty}
                                  </span>
                                )}
                                <h4 className="text-[11px] font-bold text-[#1C1612] truncate">{item.name}</h4>
                              </div>
                              <p className="text-[9.5px] text-[#5C524C]/70 truncate mt-0.5">{item.desc}</p>
                            </div>
                            <div className="w-9 h-9 bg-white border border-[#B8973E]/10 rounded-lg flex items-center justify-center text-lg shrink-0 select-none">
                              {item.emoji}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Smartphone Waiter and Check Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/[0.04]">
                      <button 
                        onClick={toggleSimWaiter}
                        className={`py-2 px-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          simWaiterCalled 
                            ? 'bg-red-500/10 border-red-500/20 text-red-600' 
                            : 'bg-[#FAF8F5] border-[#B8973E]/15 text-[#5C524C] hover:bg-[#B8973E]/5'
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5 shrink-0" />
                        {simWaiterCalled ? 'إلغاء طلب ويتر' : 'استدعاء الويتر'}
                      </button>

                      <button 
                        onClick={toggleSimBill}
                        className={`py-2 px-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          simBillRequested 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
                            : 'bg-[#FAF8F5] border-[#B8973E]/15 text-[#5C524C] hover:bg-[#B8973E]/5'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5 shrink-0" />
                        {simBillRequested ? 'إلغاء الفاتورة' : 'طلب الحساب'}
                      </button>
                    </div>
                  </div>

                  {/* Smartphone Cart Drawer Footer */}
                  <div className="pt-2 border-t border-black/[0.04] space-y-2">
                    {simCart.length > 0 ? (
                      <div className="flex justify-between items-center text-[10px] text-[#5C524C] px-1 font-mono">
                        <button onClick={clearSimCart} className="text-red-500 flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                          مسح الكل
                        </button>
                        <span>الإجمالي: {simCart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0)} ج.م</span>
                      </div>
                    ) : (
                      <p className="text-[9.5px] text-[#5C524C]/60 text-center italic py-1">سجل طلبات الطاولة فارغ حالياً</p>
                    )}
                    
                    <button 
                      disabled={simCart.length === 0}
                      onClick={() => {
                        toast.success('تمت محاكاة إرسال الطلبات للوحة التحكم بنجاح!', {
                          icon: '🚀'
                        });
                      }}
                      className={`w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${
                        simCart.length > 0 
                          ? 'luxury-btn-gold shadow-md' 
                          : 'bg-zinc-100 text-zinc-300 border border-zinc-200 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      إرسال الطلبات للمطبخ
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* LEFT COLUMN: Control Dashboard Simulator (Real-time admin update) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="w-full bg-white border border-[#B8973E]/15 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden flex flex-col min-h-[460px] justify-between">
                
                {/* Glowing light indicator inside Dashboard */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#B8973E]/5 rounded-full blur-xl pointer-events-none" />

                <div className="space-y-5">
                  {/* Dashboard Header tab */}
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4.5 h-4.5 text-[#B8973E]" />
                      <span className="text-[13px] font-bold text-[#1C1612]">لوحة إشراف المطبخ (Dashboard)</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#B8973E]/15 px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                      <span className="text-[9.5px] text-[#A08130] font-bold font-mono">متصل بالفرع</span>
                    </div>
                  </div>

                  {/* Dynamic Alert Banner based on smartphone interaction */}
                  <div className="space-y-3">
                    
                    {/* Simulated Notifications Feed */}
                    <AnimatePresence>
                      {simCart.length === 0 && !simWaiterCalled && !simBillRequested && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border border-dashed border-[#B8973E]/20 bg-[#FAF8F5] rounded-2xl p-8 text-center text-[#5C524C]/60 flex flex-col items-center justify-center space-y-3 min-h-[220px]"
                        >
                          <QrCode className="w-10 h-10 text-[#B8973E]/30 animate-pulse" />
                          <h4 className="text-[13px] font-bold">بانتظار تفاعلات الطاولة التجريبية...</h4>
                          <p className="text-[11px] max-w-[280px]">اضغط على الأزرار في محاكي الهاتف يساراً لتظهر الإشعارات الفورية هنا في أجزاء من الثانية.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Waiter Alert Notification */}
                    <AnimatePresence>
                      {simWaiterCalled && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4.5 text-right flex items-center justify-between shadow-sm relative overflow-hidden"
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500" />
                          <div className="flex gap-2">
                            <button onClick={toggleSimWaiter} className="text-[9.5px] bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 px-3 py-1 rounded-lg text-red-600 font-bold">تلبية الطلب</button>
                          </div>
                          <div className="flex items-center gap-3.5 pr-2.5">
                            <div className="text-right">
                              <h4 className="text-[12.5px] font-bold text-red-700">🚨 استدعاء عاجل: طاولة رقم ١٢</h4>
                              <p className="text-[10px] text-red-500/70 font-mono mt-0.5">طلب استدعاء الويتر للخدمة</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                              <Bell className="w-4.5 h-4.5" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bill Alert Notification */}
                    <AnimatePresence>
                      {simBillRequested && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4.5 text-right flex items-center justify-between shadow-sm relative overflow-hidden"
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500" />
                          <div className="flex gap-2">
                            <button onClick={toggleSimBill} className="text-[9.5px] bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/25 px-3 py-1 rounded-lg text-amber-600 font-bold">تحصيل وطباعة</button>
                          </div>
                          <div className="flex items-center gap-3.5 pr-2.5">
                            <div className="text-right">
                              <h4 className="text-[12.5px] font-bold text-amber-700">💵 طلب الفاتورة: طاولة رقم ١٢</h4>
                              <p className="text-[10px] text-amber-500/70 font-mono mt-0.5">طلب الحساب والدفع</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                              <Receipt className="w-4.5 h-4.5" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Dynamic Food Order Alert */}
                    <AnimatePresence>
                      {simCart.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 15, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 15, scale: 0.98 }}
                          className="bg-[#B8973E]/5 border border-[#B8973E]/20 rounded-2xl p-4.5 space-y-3.5 shadow-sm relative overflow-hidden text-right"
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#B8973E]" />
                          
                          <div className="flex items-center justify-between pr-2">
                            <span className="text-[10px] text-[#A08130]/70 font-mono">منذ ثوانٍ قليلة</span>
                            <h4 className="text-[12.5px] font-bold text-[#1C1612]">🔔 أصناف جديدة مضافة للطلب: طاولة ١٢</h4>
                          </div>

                          <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-2">
                            {simCart.map((item, idx) => (
                              <div key={idx} className="bg-white border border-[#B8973E]/10 rounded-xl px-4.5 py-2.5 flex items-center justify-between text-[11.5px]">
                                <span className="font-bold text-[#B8973E] font-mono">{item.price * item.qty} ج.م</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-zinc-500">عدد: {item.qty}</span>
                                  <span className="text-[#1C1612] font-semibold">{item.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pr-2.5 pt-1.5">
                            <button onClick={clearSimCart} className="text-[10px] bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg font-bold">
                              رفض الطلب
                            </button>
                            <button onClick={() => {
                              toast.success('تم قبول وتوصيل الطلب التجريبي للمطبخ!', { icon: '🧑‍🍳' });
                              setSimCart([]);
                            }} className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 px-5 py-2 rounded-lg font-bold">
                              قبول وإرسال للمطبخ
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                </div>

                {/* Simulated notification bell helper */}
                <div className="pt-4 border-t border-black/[0.04] text-[11px] text-[#5C524C]/50 text-center flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#B8973E] rounded-full animate-ping" />
                  <span>تظهر الطلبات والاستدعاءات هنا فورا بدون أي تأخير.</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FEATURES GRID ═══════════════════════ */}
      <section id="features" className="relative py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Header Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-20 items-end">
            <div className="lg:col-span-7 text-right">
              <span className="text-[11px] text-[#B8973E] font-bold tracking-[0.25em] uppercase block mb-4">
                المزايا الذكية للمنظومة
              </span>
              <h2 className="text-[32px] sm:text-[46px] font-medium leading-[1.15] text-[#1C1612]" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                كل ما تحتاجه للريادة
                <br />
                في إدارة
                <span className="text-[#B8973E]"> المطاعم والكافيهات</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 text-right lg:pb-2">
              <p className="text-[14px] text-[#5C524C] leading-[1.75]">
                منظومة سحابية متكاملة تمنحك تحكماً فورياً، وترفع كفاءة التشغيل، وتوفر تجربة ضيافة عصرية فاخرة لعملائك تضمن عودتهم إليك مجدداً.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="bg-[#FAF8F5] border border-[#B8973E]/12 p-8 rounded-2xl text-right relative group transition-all duration-300 hover:border-[#B8973E]/30 luxury-card-hover"
              >
                {/* Decorative glow badge */}
                <div className="absolute top-5 left-5">
                  <span className="text-[8px] bg-white border border-[#B8973E]/12 text-[#A08130] px-2.5 py-1 rounded-md font-mono tracking-wider font-semibold">
                    {feat.badge}
                  </span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8973E]/10 to-transparent border border-[#B8973E]/20 flex items-center justify-center mb-8 group-hover:border-[#B8973E]/50 group-hover:from-[#B8973E]/25 transition-all duration-300">
                  <feat.icon className="w-5 h-5 text-[#B8973E]" />
                </div>

                <div className="space-y-3">
                  <h3 className="text-[17px] font-bold text-[#1C1612] group-hover:text-[#B8973E] transition-colors duration-300">
                    {feat.title}
                  </h3>
                  <p className="text-[13px] text-[#5C524C] leading-[1.8]">
                    {feat.desc}
                  </p>
                </div>

                {/* Subtle bottom line */}
                <div className="absolute bottom-0 right-8 left-8 h-px bg-gradient-to-r from-transparent via-[#B8973E]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════════════════ PRICING SECTION ═══════════════════════ */}
      <section id="pricing" className="relative py-32 bg-[#FAF8F5] border-t border-[#B8973E]/10">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-20 space-y-4">
            <span className="text-[11px] text-[#B8973E] font-bold tracking-[0.25em] uppercase block">
              باقات الاشتراك
            </span>
            <h2 className="text-[32px] sm:text-[46px] font-medium text-[#1C1612] tracking-tight" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              خطط تناسب حجم أعمالك
            </h2>
            <p className="text-[14px] text-[#5C524C]">
              جميع الباقات تأتي بـ 30 يوم تجربة مجانية بالكامل للتحقق من جودة وموثوقية النظام.
            </p>
          </div>

          {/* Promotional Offer Countdown Banner */}
          <AnimatePresence>
            {settings.offer.active && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="max-w-3xl mx-auto mb-16 bg-white border border-[#B8973E]/20 rounded-2xl p-6 flex flex-col md:flex-row-reverse items-center justify-between gap-6 relative overflow-hidden shadow-sm backdrop-blur-md"
              >
                {/* Gold light overlay */}
                <div className="absolute -top-12 -left-12 w-28 h-28 bg-[#B8973E]/5 rounded-full blur-2xl" />

                <div className="flex items-center gap-3 text-right">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#B8973E] animate-ping" />
                  <div>
                    <span className="text-[13px] text-[#A08130] font-bold block">{settings.offer.title}</span>
                    <span className="text-[10.5px] text-[#5C524C]/60 mt-0.5 block">ينتهي هذا العرض الحصري قريباً، اشترك الآن!</span>
                  </div>
                </div>

                {timeLeft ? (
                  <div className="flex items-center gap-3 font-mono text-[13px]" dir="ltr">
                    <div className="flex flex-col items-center">
                      <div className="bg-[#FAF8F5] border border-[#B8973E]/20 text-[#A08130] px-3 py-2 rounded-xl text-[16px] font-bold min-w-[45px] text-center tabular-nums shadow-sm">
                        {String(timeLeft.days).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] text-[#5C524C]/40 uppercase tracking-widest mt-1">Days</span>
                    </div>
                    <span className="text-[#B8973E] font-bold text-[20px] mb-4">:</span>
                    <div className="flex flex-col items-center">
                      <div className="bg-[#FAF8F5] border border-[#B8973E]/20 text-[#1C1612] px-3 py-2 rounded-xl text-[16px] font-bold min-w-[45px] text-center tabular-nums shadow-sm">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] text-[#5C524C]/40 uppercase tracking-widest mt-1">Hrs</span>
                    </div>
                    <span className="text-[#B8973E] font-bold text-[20px] mb-4">:</span>
                    <div className="flex flex-col items-center">
                      <div className="bg-[#FAF8F5] border border-[#B8973E]/20 text-[#1C1612] px-3 py-2 rounded-xl text-[16px] font-bold min-w-[45px] text-center tabular-nums shadow-sm">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] text-[#5C524C]/40 uppercase tracking-widest mt-1">Min</span>
                    </div>
                    <span className="text-[#B8973E] font-bold text-[20px] mb-4">:</span>
                    <div className="flex flex-col items-center">
                      <div className="bg-[#FAF8F5] border border-[#B8973E]/20 text-[#A08130] px-3 py-2 rounded-xl text-[16px] font-bold min-w-[45px] text-center tabular-nums shadow-sm">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] text-[#5C524C]/40 uppercase tracking-widest mt-1">Sec</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[12px] text-[#5C524C]/40 font-mono uppercase">عرض لفترة محدودة</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Basic Card */}
            <div className="bg-white border border-[#B8973E]/12 rounded-3xl p-8 lg:p-10 flex flex-col justify-between text-right relative overflow-hidden shadow-lg transition-all duration-300 hover:border-[#B8973E]/25">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-[#B8973E]/10 border border-[#B8973E]/20 text-[#A08130] px-3 py-1 rounded-lg font-mono font-semibold">
                    BASIC PLAN
                  </span>
                  <h3 className="text-[18px] font-bold text-[#1C1612]">الباقة الأساسية</h3>
                </div>

                <p className="text-[13px] text-[#5C524C] leading-relaxed">
                  مثالية للمطاعم والكافيهات الناشئة الراغبة في تشغيل الخدمة الرقمية والـ QR فوراً.
                </p>

                {/* Price Display */}
                <div className={`py-2 border-y border-[#B8973E]/10 flex items-center justify-start gap-4 transition-all duration-500 ${pulsePricing ? 'scale-105 border-[#B8973E]/40' : ''}`}>
                  {settings.offer.active ? (
                    <div>
                      <div className="flex items-baseline gap-1.5 text-[#1C1612]" dir="ltr">
                        <span className="text-[40px] font-medium tracking-tight font-mono">{settings.offer.basicPrice}</span>
                        <span className="text-[12px] opacity-60">ج.م / شهرياً</span>
                      </div>
                      <p className="text-[11px] text-[#5C524C]/50 line-through mt-0.5 text-right">
                        السعر الأصلي: {settings.pricing.basic} جنيه
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 text-[#1C1612]" dir="ltr">
                      <span className="text-[40px] font-medium tracking-tight font-mono">{settings.pricing.basic}</span>
                      <span className="text-[12px] opacity-60">ج.م / شهرياً</span>
                    </div>
                  )}
                </div>

                {/* Limits & Features list */}
                <ul className="space-y-4 pt-2">
                  {pricingFeaturesBasic.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[13px] text-[#5C524C] leading-relaxed">
                      <Check className="w-4 h-4 text-[#B8973E] mt-[3px] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={handleWhatsappContact}
                className="w-full mt-10 py-3.5 bg-[#FAF8F5] border border-[#B8973E]/20 hover:border-[#B8973E] hover:text-[#B8973E] rounded-xl text-[13px] font-bold text-[#5C524C] transition-all duration-300 cursor-pointer text-center"
              >
                اطلب الباقة الأساسية
              </button>
            </div>

            {/* Pro Card (Recommended) */}
            <div className="bg-white border-2 border-[#B8973E] rounded-3xl p-8 lg:p-10 flex flex-col justify-between text-right relative overflow-hidden shadow-xl">
              {/* Gold light leak effect */}
              <div className="absolute -top-[30%] -left-[30%] w-[160%] h-[160%] opacity-[0.04] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, #B8973E 0%, transparent 60%)' }} />

              {/* Recommended Top Badge */}
              <div className="absolute top-5 left-5">
                <span className="text-[9px] bg-[#B8973E] text-white px-3.5 py-1 rounded-full font-bold tracking-wider">
                  الباقة الموصى بها
                </span>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-[#B8973E]/10 border border-[#B8973E]/20 text-[#A08130] px-3 py-1 rounded-lg font-mono font-semibold">
                    PRO PLAN
                  </span>
                  <h3 className="text-[18px] font-bold text-[#B8973E]">الباقة المتقدمة</h3>
                </div>

                <p className="text-[13px] text-[#5C524C] leading-relaxed">
                  للإدارة والتحكم الكامل للفروع، الإيصالات المخصصة، الفواتير، ودعم الضريبة والخدمة.
                </p>

                {/* Price Display */}
                <div className={`py-2 border-y border-[#B8973E]/10 flex items-center justify-start gap-4 transition-all duration-500 ${pulsePricing ? 'scale-105 border-[#B8973E]/40' : ''}`}>
                  {settings.offer.active ? (
                    <div>
                      <div className="flex items-baseline gap-1.5 text-[#B8973E]" dir="ltr">
                        <span className="text-[40px] font-medium tracking-tight font-mono">{settings.offer.proPrice}</span>
                        <span className="text-[12px] opacity-60">ج.م / شهرياً</span>
                      </div>
                      <p className="text-[11px] text-[#5C524C]/50 line-through mt-0.5 text-right">
                        السعر الأصلي: {settings.pricing.pro} جنيه
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 text-[#B8973E]" dir="ltr">
                      <span className="text-[40px] font-medium tracking-tight font-mono">{settings.pricing.pro}</span>
                      <span className="text-[12px] opacity-60">ج.م / شهرياً</span>
                    </div>
                  )}
                </div>

                {/* Features list */}
                <ul className="space-y-4 pt-2">
                  {pricingFeaturesPro.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[13px] text-[#5C524C] leading-relaxed">
                      <Check className="w-4 h-4 text-[#B8973E] mt-[3px] shrink-0" />
                      <span className="font-semibold">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={handleWhatsappContact}
                className="w-full mt-10 py-3.5 luxury-btn-gold rounded-xl text-[13px] font-bold transition-all duration-300 cursor-pointer text-center relative z-10"
              >
                اطلب الباقة المتقدمة
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════ FAQ SECTION (ACCORDION) ═══════════════════════ */}
      <section id="faq" ref={faqRef} className="relative bg-white py-28 px-6 text-right overflow-hidden border-t border-[#B8973E]/10">
        <div className="max-w-3xl mx-auto relative z-10">
          
          <div className="mb-16 space-y-4 text-center">
            <span className="text-[11px] text-[#B8973E] font-bold tracking-[0.25em] uppercase block">
              الأسئلة الشائعة
            </span>
            <h2 className="text-[32px] sm:text-[44px] font-medium text-[#1C1612] tracking-tight" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              لديك استفسارات؟
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "هل أحتاج إلى شراء أجهزة خاصة للبدء؟",
                a: "لا تماماً! كل ما تحتاج إليه هو هاتف ذكي أو تابلت أو كمبيوتر متصل بالإنترنت لإدارة الطلبات عبر لوحة التحكم. عملاؤك سيستخدمون هواتفهم الخاصة لمسح كود الـ QR وتصفح القائمة بدون تنزيل أي برامج أو تطبيقات."
              },
              {
                q: "كيف تتم طريقة سداد قيمة اشتراك باقتي Basic و Pro؟",
                a: "تقوم باختيار الباقة المناسبة والاشتراك معنا عبر الواتساب. تمنحك المنصة شهراً كاملاً لتجربة المنظومة مجاناً. يمكنك إيقاف الخدمة أو ترقيتها في أي وقت دون شروط معقدة."
              },
              {
                q: "هل أستطيع تعديل المنيو والأسعار بنفسي لحظياً؟",
                a: "نعم وبكل سهولة. لوحة المشرف تتيح لك إضافة أقسام جديدة، تعديل صور وأسعار الأطباق، وتفعيل أو إخفاء أي صنف بنقرة واحدة، لتنعكس التعديلات فوراً على هواتف العملاء."
              },
              {
                q: "ماذا يحدث عند تخطي الحد الأقصى للطاولات المسموح؟",
                a: "عند الوصول للحد الأقصى المسموح لباقتك، سيقوم النظام بإشعارك. يمكنك ترقية الباقة لـ PRO لرفع الحد فوراً لتغطية كامل طاولاتك."
              },
              {
                q: "هل تدعم الفواتير الضرائب والخدمة الإضافية؟",
                a: "نعم، تدعم باقة PRO تعديل وتخصيص إيصال الحساب بالكامل؛ حيث يمكنك وضع لوجو مطعمك، تحديد نسب الضريبة والخدمة، ليتم حساب الإجماليات بدقة."
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="bg-[#FAF8F5] border border-[#B8973E]/12 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#B8973E]/30"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-right p-5 md:p-6 outline-none cursor-pointer"
                >
                  <span className="text-[14px] sm:text-[15px] font-bold text-[#1C1612] hover:text-[#B8973E] transition-colors duration-300 pr-0 text-right flex-1">
                    {faq.q}
                  </span>
                  <div className={`w-7 h-7 rounded-lg bg-white border border-[#B8973E]/15 flex items-center justify-center shrink-0 ml-4 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 border-[#B8973E]/40' : ''}`}>
                    <ChevronDown className={`w-4 h-4 transition-colors ${openFaq === idx ? 'text-[#B8973E]' : 'text-[#5C524C]/40'}`} />
                  </div>
                </button>
                
                <AnimatePresence initial={false}>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-6 md:px-6 text-[#5C524C] text-[13px] leading-[1.8] border-t border-black/[0.03] pt-4 mx-1">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════════════════ CTA FOOTER BLOCK ═══════════════════════ */}
      <section id="contact" className="relative bg-[#FAF8F5] py-32 px-6 text-center overflow-hidden border-t border-[#B8973E]/10">
        {/* Big decorative QR in background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] pointer-events-none">
          <QrCode className="w-[600px] h-[600px] text-[#B8973E]" strokeWidth={0.3} />
        </div>

        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06] blur-[80px] pointer-events-none" style={{ background: 'radial-gradient(circle, #B8973E 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center space-y-8">
          <h2 className="text-[clamp(32px,5vw,60px)] text-[#1C1612] leading-[1.15] font-medium tracking-tight font-serif" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            جاهز لترقية جودة
            <br />
            <span className="bg-gradient-to-r from-[#A08130] to-[#B8973E] bg-clip-text text-transparent">ضيافتك الرقمية؟</span>
          </h2>

          <p className="text-[#5C524C] text-[14.5px] max-w-md mx-auto leading-relaxed">
            الاشتراك والإطلاق يستغرق دقائق معدودة عبر الواتساب. يسعدنا ترتيب موعد لتدريب فريق عملكم بالكامل مجاناً.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-2">
            <button
              onClick={handleWhatsappContact}
              className="group bg-[#25D366] text-white px-8 py-4 rounded-xl text-[14px] font-bold flex items-center justify-center gap-3 cursor-pointer shadow-[0_8px_30px_rgba(37,211,102,0.18)] hover:shadow-[0_8px_30px_rgba(37,211,102,0.3)] transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
            >
              <Send className="w-4.5 h-4.5" />
              تواصل معنا مباشرة عبر الواتساب
              <span className="text-[12px] opacity-80 font-mono tracking-wider ml-1" dir="ltr">+201066980953</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="py-12 border-t border-[#B8973E]/10 bg-white px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-[12px] text-[#5C524C]/60">
          
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-[#B8973E]/20">
              <img src={logoImg} alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="font-semibold text-[#1C1612] tracking-tight font-serif">
              طاولة © {new Date().getFullYear()}
            </span>
            <span className="text-zinc-300">•</span>
            <p>جميع الحقوق محفوظة — نظام إدارة المطاعم والكافيهات الذكي</p>
          </div>

          <div className="flex items-center gap-6">
            <a 
              href="/login" 
              className="hover:text-[#B8973E] transition-colors flex items-center gap-1.5 font-medium"
            >
              <Lock className="w-3.5 h-3.5" />
              تسجيل الدخول للنظام
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
