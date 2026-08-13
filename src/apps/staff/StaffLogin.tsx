import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User as UserIcon, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';
import logoImg from '../../assets/newlogo.svg';

export default function StaffLogin() {
  const navigate = useNavigate();
  const loginStore = useAuthStore(state => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تسجيل الدخول. تأكد من البيانات.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('يرجى ملء جميع الحقول.');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#09090B] flex items-center justify-center relative overflow-hidden noise" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#ffffff', color: '#09090B', border: '1px solid rgba(0,0,0,0.08)' }
      }} />

      {/* Floating Animated Light Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 -left-1/4 w-[450px] h-[450px] rounded-full bg-[#801B2C]/5 blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -30, 30, 0],
            y: [0, 40, -30, 0]
          }}
          transition={{
            duration: 18,
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
        {/* Brand Header */}
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="mx-auto mb-4 w-14 h-14 rounded-2xl overflow-hidden border border-zinc-200/80 flex items-center justify-center transition-all duration-300 bg-white shadow-sm"
          >
            <img src={logoImg} className="w-full h-full object-contain" alt="Logo" />
          </motion.div>
          <h1 className="text-2xl font-black text-[#09090B] tracking-tight font-cairo">تسجيل الدخول</h1>
          <p className="text-zinc-500 text-xs font-bold mt-1.5 font-body">نظام إدارة المطاعم والكافيهات الذكي - طاولة</p>
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
        </div>
      </motion.div>
    </div>
  );
}
