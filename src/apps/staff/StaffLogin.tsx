import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User as UserIcon, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';
import logoImg from '../../assets/logo.png';

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
    <div className="min-h-screen bg-staff-bg-base text-staff-text-primary flex items-center justify-center relative overflow-hidden noise" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#141720', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.08)' }
      }} />

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="glow-blob bg-staff-accent-glow top-1/4 -left-1/4 w-[500px] h-[500px]" />
        <div className="glow-blob bg-staff-accent-soft bottom-1/4 -right-1/4 w-[400px] h-[400px] animation-delay-2000" />
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
          <div className="mx-auto mb-5 flex items-center justify-center">
            <img src={logoImg} alt="Tawla Logo" className="max-h-16 object-contain animate-none" />
          </div>
          <h1 className="text-3xl font-extrabold text-staff-text-primary mb-2">تسجيل دخول الموظفين</h1>
          <p className="text-staff-text-muted text-sm font-medium">داشبورد إدارة الكاشير والويتر والطلب</p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-staff-bg-elevated border border-staff-border rounded-xl p-8 space-y-6 shadow-staff-card"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-staff-text-secondary">اسم المستخدم</label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="اسم المستخدم الخاص بك"
                  className="w-full bg-staff-bg-base border border-staff-border text-staff-text-primary rounded-xl px-4 py-3.5 pr-11 text-right text-sm transition-all focus:border-staff-accent focus:outline-none placeholder:text-staff-text-muted"
                />
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-staff-text-muted group-focus-within:text-staff-accent transition-colors" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-staff-text-secondary">كلمة المرور</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-staff-bg-base border border-staff-border text-staff-text-primary rounded-xl px-4 py-3.5 pr-11 pl-11 text-right text-sm transition-all focus:border-staff-accent focus:outline-none placeholder:text-staff-text-muted"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-staff-text-muted group-focus-within:text-staff-accent transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-staff-text-muted hover:text-staff-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loginMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-staff-accent text-white font-bold rounded-xl flex items-center justify-center gap-2.5 shadow-staff-accent hover:opacity-95 transition-opacity"
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
          <a href="/admin/login" className="text-xs text-staff-text-muted hover:text-staff-text-primary transition-colors font-semibold">
            دخول كمدير النظام ←
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
