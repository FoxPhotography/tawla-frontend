import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User as UserIcon, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';
import logoImg from '../../assets/TAWLA_Logo.png';
import ForgotPasswordModal from './components/ForgotPasswordModal';

export default function StaffLogin() {
  const navigate = useNavigate();
  const { token, user, restaurant, logout } = useAuthStore();
  const loginStore = useAuthStore(state => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { username, password });
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success('تم تسجيل الدخول بنجاح!');
      loginStore(data.accessToken, data.user, data.restaurant);
      
      // Redirect based on role
      if (data.user.role === 'super_admin') {
        navigate('/super-admin');
      } else if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
    },
    onError: (error: any) => {
      const data = error.response?.data;
      let msg = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.error && typeof data.error === 'string') {
        msg = data.error;
      } else if (data?.message && typeof data.message === 'string') {
        msg = data.message;
      } else if (data?.error?.message && typeof data.error.message === 'string') {
        msg = data.error.message;
      } else if (error.message && typeof error.message === 'string') {
        msg = error.message;
      }
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    loginMutation.mutate();
  };

  // ══════════════════════════════════════════════════════════════
  // ACTIVE SESSION GUARD: If already logged in, prevent duplicate/conflicting login
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
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center relative overflow-hidden font-cairo" dir="rtl">
        <Toaster position="top-center" />

        {/* Luxury subtle background glow & dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-[#801B2C]/8 blur-[100px]" 
          />
          <div className="absolute inset-0 dot-pattern opacity-10" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 25 }}
          className="relative z-10 w-full max-w-[450px] mx-4"
        >
          <div className="bg-white/95 backdrop-blur-md border border-[#801B2C]/15 rounded-3xl p-8 shadow-[0_20px_50px_rgba(128,27,44,0.08)] text-center">
            <Link to="/" className="inline-block mb-4">
              <img src={logoImg} alt="طاولة" className="h-14 mx-auto object-contain hover:scale-105 transition-transform" />
            </Link>

            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-stone-900 mb-2">أنت مسجل دخولك بالفعل</h2>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              جلسة عملك نشطة حالياً. لتجنب تداخل الحسابات أو مشاكل الصلاحيات، يرجى التوجه للوحة التحكم أو تسجيل الخروج أولاً قبل التبديل لحساب آخر.
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
                  <span className="text-stone-500 font-medium">المطعم:</span>
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
                  toast.success('تم تسجيل الخروج بنجاح. يمكنك تسجيل الدخول الآن.');
                }}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج للتبديل بحساب آخر</span>
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full py-2 text-stone-500 hover:text-stone-800 text-xs transition-colors cursor-pointer"
              >
                العودة للصفحة الرئيسية
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center relative overflow-hidden font-cairo" dir="rtl">
      <Toaster position="top-center" />

      {/* Luxury subtle background glow & dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.35, 0.55, 0.35]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-[#801B2C]/8 blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.25, 0.45, 0.25]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full bg-[#801B2C]/5 blur-[90px]" 
        />
        <div className="absolute inset-0 dot-pattern opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: { type: "spring", stiffness: 280, damping: 25 }
        }}
        className="relative z-10 w-full max-w-[420px] mx-4"
      >
        {/* Brand Banner Header */}
        <div className="text-center mb-6">
          <motion.div 
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mx-auto mb-3 flex items-center justify-center max-w-[320px] cursor-pointer select-none"
          >
            <img 
              src={logoImg} 
              className="w-full max-h-28 object-contain filter drop-shadow-sm transition-transform duration-300" 
              alt="طاولة - Tawla" 
            />
          </motion.div>
          <h1 className="text-2xl font-black text-[#09090B] tracking-tight font-cairo">تسجيل الدخول</h1>
          <p className="text-zinc-500 text-xs font-bold mt-1 font-body">نظام إدارة المطاعم والكافيهات الذكي</p>
        </div>

        {/* Clean Light Card */}
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden text-zinc-800">
          
          {/* Subtle top brand orange bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#801B2C]" />

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest font-body">اسم المستخدم</label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="اسم المستخدم الخاص بك"
                  className="w-full bg-[#F8F9FA] border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3.5 pr-11 text-right text-xs transition-all focus:border-[#801B2C] focus:ring-1 focus:ring-[#801B2C]/25 focus:outline-none placeholder:text-zinc-400 font-bold"
                />
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#801B2C] transition-colors" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest font-body">كلمة المرور</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F8F9FA] border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3.5 pr-11 pl-11 text-right text-xs transition-all focus:border-[#801B2C] focus:ring-1 focus:ring-[#801B2C]/25 focus:outline-none placeholder:text-zinc-400 font-bold"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#801B2C] transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-[11px] font-bold text-[#801B2C] hover:underline cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loginMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-[#801B2C] hover:bg-[#801B2C]/95 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#801B2C]/10 active:scale-[0.98] transition-all text-xs cursor-pointer font-body border border-[#801B2C] mt-2"
            >
              {loginMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  <span>تسجيل الدخول للمنظومة</span>
                </>
              )}
            </motion.button>
          </form>

          {/* New Restaurant Onboarding Link */}
          <div className="pt-4 mt-2 border-t border-zinc-100 text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5 font-bold">
            <span>مطعم جديد؟</span>
            <Link to="/register" className="text-[#801B2C] hover:underline">
              سجل حسابك الآن وابدأ مجاناً ←
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
    </div>
  );
}
