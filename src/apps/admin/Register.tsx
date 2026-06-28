import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, User, Coffee, Link as LinkIcon, Eye, EyeOff, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';

export default function Register() {
  const navigate = useNavigate();

  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const fields = [
    {
      label: 'اسم المطعم / الكافيه',
      icon: Coffee,
      type: 'text',
      value: restaurantName,
      onChange: (v: string) => {
        setRestaurantName(v);
        setSlug(v.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '-'));
      },
      placeholder: 'مثال: جراند كافيه',
      required: true,
    },
    {
      label: 'رابط المطعم (Slug)',
      icon: LinkIcon,
      type: 'text',
      value: slug,
      onChange: setSlug,
      placeholder: 'مثال: grand-cafe',
      required: true,
      dir: 'ltr' as const,
      hint: 'سيصبح الرابط: /menu/your-slug/table/1',
      mono: true,
    },
    {
      label: 'اسم المدير المسؤول',
      icon: User,
      type: 'text',
      value: ownerName,
      onChange: setOwnerName,
      placeholder: 'الاسم الثنائي أو الثلاثي',
      required: true,
    },
    {
      label: 'البريد الإلكتروني',
      icon: Mail,
      type: 'email',
      value: email,
      onChange: setEmail,
      placeholder: 'admin@restaurant.com',
      required: true,
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center relative overflow-hidden" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.1)' }
      }} />

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/3 -left-1/4 w-[700px] h-[700px] rounded-full bg-accent-emerald/[0.02] blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary-500/[0.03] blur-3xl" />
        <div className="absolute inset-0 dot-pattern" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg mx-4 my-8"
      >
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-emerald/20 to-accent-emerald/5 border border-accent-emerald/20 flex items-center justify-center mb-5">
            <ShieldCheck className="w-8 h-8 text-accent-emerald" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">تسجيل مطعم جديد</h1>
          <p className="text-dark-400 text-sm flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span>ابدأ منصة الـ QR الخاصة بك في دقائق معدودة</span>
          </p>
        </motion.div>

        {/* Register Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass-card rounded-3xl p-8 space-y-6"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field, idx) => (
              <motion.div
                key={field.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.05, duration: 0.4 }}
                className="space-y-1.5"
              >
                <label className="block text-sm font-medium text-dark-300">{field.label}</label>
                <div className="relative group">
                  <input
                    type={field.type}
                    required={field.required}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    dir={field.dir}
                    className={`input-premium pr-11 ${field.dir === 'ltr' ? 'text-left font-mono text-sm' : 'text-right'}`}
                  />
                  <field.icon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
                </div>
                {field.hint && (
                  <p className="text-[11px] text-dark-500 mr-1">{field.hint}</p>
                )}
              </motion.div>
            ))}

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="space-y-1.5"
            >
              <label className="block text-sm font-medium text-dark-300">كلمة المرور</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-premium pr-11 pl-11 text-right"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={registerMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full py-3.5 mt-2 flex items-center justify-center gap-2.5"
            >
              {registerMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>إنشاء الحساب والمطعم</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-dark-800/60" />
            <span className="text-xs text-dark-500">أو</span>
            <div className="flex-1 h-px bg-dark-800/60" />
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-dark-400">
              لديك مطعم بالفعل؟{' '}
              <Link to="/admin/login" className="text-primary-500 hover:text-primary-400 font-bold transition-colors">
                تسجيل دخول المدير
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
