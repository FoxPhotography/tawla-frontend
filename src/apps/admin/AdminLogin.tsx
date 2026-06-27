import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Lock, Mail, ShieldAlert } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';

export default function AdminLogin() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { email, password });
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.user.role !== 'admin') {
        toast.error('عذراً، هذا الحساب غير مصرح له كمدير للنظام.');
        return;
      }
      toast.success('تم تسجيل الدخول بنجاح كمدير!');
      loginStore(data.accessToken, data.user, data.restaurant);
      navigate('/admin');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تسجيل دخول المدير. تأكد من البيانات.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى كتابة البريد وكلمة المرور.');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-right" dir="rtl">
      <Toaster position="top-center" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-500">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">بوابة مدير النظام</h2>
        <p className="mt-2 text-center text-sm text-dark-400">
          إدارة المنيو، الترابيزات، المبيعات والتحليلات
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glassmorphism-card py-8 px-6 rounded-3xl shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">بريد المدير الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@restaurant.com"
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary-500 transition-colors text-right"
                />
                <Mail className="absolute right-4 top-3.5 w-5 h-5 text-dark-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary-500 transition-colors text-right"
                />
                <Lock className="absolute right-4 top-3.5 w-5 h-5 text-dark-500" />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-primary-500 text-dark-950 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-50"
              >
                {loginMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>دخول لوحة التحكم</span>
                )}
              </button>
            </div>
          </form>
          
          <div className="text-center text-xs text-dark-400 mt-4">
            ليس لديك مطعم مسجل؟{' '}
            <Link to="/register" className="text-primary-500 hover:underline font-bold">
              سجل مطعمك الآن
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
