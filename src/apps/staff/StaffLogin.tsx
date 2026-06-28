import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Mail, Lock, Coffee, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';

export default function StaffLogin() {
  const navigate = useNavigate();
  const loginStore = useAuthStore(state => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { email, password });
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success('تم تسجيل الدخول بنجاح!');
      loginStore(data.accessToken, data.user, data.restaurant);
      
      // Redirect based on role
      if (data.user.role === 'admin') {
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
    if (!email || !password) {
      toast.error('يرجى ملء جميع الحقول.');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center relative overflow-hidden noise" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#ffffff', color: '#1c1917', border: '1px solid rgba(120,113,108,0.15)' }
      }} />

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="glow-blob bg-emerald-200 top-1/4 -left-1/4 w-[500px] h-[500px]" />
        <div className="glow-blob bg-orange-200 bottom-1/4 -right-1/4 w-[400px] h-[400px] animation-delay-2000" />
        <div className="absolute inset-0 dot-pattern" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5 shadow-sm">
            <Coffee className="w-8 h-8 text-emerald-800" />
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 mb-2">تسجيل دخول الموظفين</h1>
          <p className="text-stone-600 text-sm font-medium">داشبورد إدارة الكاشير والويتر والطلب</p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="organic-card rounded-3xl p-8 space-y-6"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-stone-700">البريد الإلكتروني</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  className="input-premium pr-11 text-right"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-emerald-700 transition-colors" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-stone-700">كلمة المرور</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-premium pr-11 pl-11 text-right"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-emerald-700 transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
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
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2.5"
            >
              {loginMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Admin link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center mt-6"
        >
          <a href="/admin/login" className="text-xs text-stone-500 hover:text-stone-750 transition-colors font-semibold">
            دخول كمدير النظام →
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
