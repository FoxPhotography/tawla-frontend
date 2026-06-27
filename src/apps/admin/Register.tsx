import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, Mail, Lock, User, Coffee, Link as LinkIcon } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';

export default function Register() {
  const navigate = useNavigate();

  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/register', {
        name: restaurantName,
        slug: slug.toLowerCase().trim().replace(/\s+/g, '-'),
        ownerName,
        email,
        password
      });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('تم تسجيل المطعم وحساب المدير بنجاح! يمكنك الآن تسجيل الدخول.');
      setTimeout(() => {
        navigate('/admin/login');
      }, 2000);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تسجيل المطعم. تأكد من البيانات أو أن الرابط مستخدم بالفعل.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName || !slug || !ownerName || !email || !password) {
      toast.error('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-right" dir="rtl">
      <Toaster position="top-center" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-500">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">تسجيل مطعم جديد</h2>
        <p className="mt-2 text-center text-sm text-dark-400">
          ابدأ منصة الـ QR الخاصة بك في دقائق معدودة
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glassmorphism-card py-8 px-6 rounded-3xl shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">اسم المطعم / الكافيه</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => {
                    setRestaurantName(e.target.value);
                    // Auto-slugify
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '-'));
                  }}
                  placeholder="مثال: جراند كافيه"
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary-500 transition-colors text-right"
                />
                <Coffee className="absolute right-4 top-3.5 w-5 h-5 text-dark-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">رابط المطعم (Slug)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="مثال: grand-cafe"
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary-500 transition-colors text-left font-mono"
                  dir="ltr"
                />
                <LinkIcon className="absolute right-4 top-3.5 w-5 h-5 text-dark-500" />
              </div>
              <p className="text-[10px] text-dark-500 mt-1 text-right">سيصبح الرابط: /menu/your-slug/table/1</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">اسم المدير المسؤول</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="الاسم الثنائي أو الثلاثي"
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary-500 transition-colors text-right"
                />
                <User className="absolute right-4 top-3.5 w-5 h-5 text-dark-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">البريد الإلكتروني</label>
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
              <label className="block text-sm font-medium text-dark-300 mb-1.5">كلمة المرور</label>
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
                disabled={registerMutation.isPending}
                className="w-full bg-primary-500 text-dark-950 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-50"
              >
                {registerMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>إنشاء الحساب والمطعم</span>
                )}
              </button>
            </div>
          </form>

          <div className="text-center text-xs text-dark-400">
            لديك مطعم بالفعل؟{' '}
            <Link to="/admin/login" className="text-primary-500 hover:underline font-bold">
              تسجيل دخول المدير
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
