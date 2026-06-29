import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, QrCode } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';

export default function AdminLogin() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { username, password });
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.user.role === 'super_admin') {
        toast.success('تم تسجيل الدخول بنجاح كمدير النظام!');
        loginStore(data.accessToken, data.user, null as any);
        navigate('/super-admin');
      } else if (data.user.role === 'admin') {
        toast.success('تم تسجيل الدخول بنجاح كمدير!');
        loginStore(data.accessToken, data.user, data.restaurant);
        navigate('/admin');
      } else {
        toast.success('تم تسجيل الدخول بنجاح كموظف!');
        loginStore(data.accessToken, data.user, data.restaurant);
        navigate('/staff');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تسجيل دخول المدير. تأكد من البيانات.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('يرجى كتابة اسم المستخدم وكلمة المرور.');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-admin-bg-base text-admin-text-primary flex items-center justify-center relative overflow-hidden" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#ffffff', color: '#0f0f10', border: '1px solid rgba(0,0,0,0.08)' }
      }} />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 dot-pattern-dark opacity-60" />
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
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-[#B8973E]/10 border border-[#B8973E]/30 flex items-center justify-center transition-all duration-300">
            <QrCode className="w-9 h-9 text-[#B8973E]" />
          </div>
          <h1 className="text-3xl font-extrabold text-admin-text-primary mb-2">بوابة المدير</h1>
          <p className="text-admin-text-secondary text-sm font-medium">إدارة المنيو، الطاولات، المبيعات والتحليلات</p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-admin-bg-elevated border border-admin-border rounded-xl p-8 space-y-6 shadow-admin-card"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-admin-text-secondary">اسم المستخدم</label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="superadmin أو اسم مستخدم المطعم"
                  className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3.5 pr-11 text-right text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                />
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-admin-text-muted group-focus-within:text-admin-accent transition-colors" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-admin-text-secondary">كلمة المرور</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3.5 pr-11 pl-11 text-right text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-admin-text-muted group-focus-within:text-admin-accent transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-admin-text-muted hover:text-admin-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loginMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-admin-accent text-white font-bold rounded-lg flex items-center justify-center gap-2.5 shadow-admin-accent hover:opacity-95 transition-opacity"
            >
              {loginMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  <span>دخول لوحة التحكم</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-admin-border" />
            <span className="text-xs text-admin-text-muted">أو</span>
            <div className="flex-1 h-px bg-admin-border" />
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-xs text-admin-text-secondary font-medium">
              التسجيل متاح فقط من خلال إدارة النظام. لتسجيل مطعم أو كافيه جديد يرجى التواصل مع مسؤول الخدمة.
            </p>
          </div>
        </motion.div>

        {/* Staff Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center mt-6"
        >
          <Link to="/staff/login" className="text-xs text-admin-text-muted hover:text-admin-text-primary transition-colors font-semibold">
            دخول كموظف (كاشير / ويتر) →
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
