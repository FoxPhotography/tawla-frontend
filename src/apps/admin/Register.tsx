import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Globe, 
  CheckCircle2, 
  ArrowLeft, 
  Sparkles, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api.js';
import { useAuthStore } from '../../shared/store/authStore.js';
import logoImg from '../../assets/TAWLA_Logo.png';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const initialPlan = (searchParams.get('plan') as 'trial' | 'basic' | 'pro') || 'trial';
  const invoiceId = searchParams.get('invoice_id') || searchParams.get('invoiceId') || '';

  const [formData, setFormData] = useState({
    name: searchParams.get('restaurant') || '',
    slug: '',
    ownerName: '',
    phone: '',
    email: searchParams.get('email') || '',
    address: '',
    username: '',
    password: '',
    plan: initialPlan,
    invoiceId: invoiceId,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto generate slug from restaurant name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w\u0621-\u064A-]+/g, '');

    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === prev.name.toLowerCase().trim().replace(/[\s_]+/g, '-') ? generatedSlug : prev.slug,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error('يرجى كتابة اسم المطعم أو الكافيه.');
    if (!formData.slug.trim()) return toast.error('يرجى تحديد الرابط المميز (Slug).');
    if (!formData.ownerName.trim()) return toast.error('يرجى كتابة اسم المدير أو المسؤول.');
    if (!formData.username.trim() || formData.username.length < 3) return toast.error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل.');
    if (!formData.password || formData.password.length < 6) return toast.error('كلمة المرور يجب أن تكون 6 خانات على الأقل.');

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/register-restaurant', {
        name: formData.name.trim(),
        slug: formData.slug.toLowerCase().trim(),
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        username: formData.username.toLowerCase().trim(),
        password: formData.password,
        plan: formData.plan,
        invoiceId: formData.invoiceId || undefined,
      });

      const data = response.data?.data;
      if (data?.accessToken && data?.user && data?.restaurant) {
        toast.success('🎉 تم إنشاء حساب مطعمك وتفعيله بنجاح!');
        loginStore(data.accessToken, data.user, data.restaurant);
        setTimeout(() => {
          navigate('/admin');
        }, 800);
      } else {
        toast.success('تم تسجيل الحساب بنجاح، يمكنك تسجيل الدخول الآن.');
        navigate('/login');
      }
    } catch (err: any) {
      console.error('[Registration Error]:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'تعذر تسجيل الحساب، يرجى مراجعة البيانات.';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1612] flex items-center justify-center relative overflow-hidden py-12 px-4 selection:bg-[#801B2C]/20" dir="rtl">
      <Toaster position="top-center" />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#801B2C]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-xl mx-auto"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-3">
            <img src={logoImg} className="h-12 sm:h-14 w-auto object-contain mx-auto" alt="طاولة - Tawla" />
          </Link>
          <h1 className="text-2xl font-black text-[#1C1612] tracking-tight">
            تسجيل مطعم أو كافيه جديد
          </h1>
          <p className="text-xs text-[#5C524C] mt-1 font-medium">
            أنشئ حسابك خلال 60 ثانية وابدأ في إدارة المنيو والطلبات والطاولات فوراً
          </p>

          {invoiceId && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>مرتبط بفاتورة معتمدة: #{invoiceId}</span>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white border border-[#801B2C]/15 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Restaurant Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 text-xs font-bold text-[#801B2C]">
                <Building2 className="w-4 h-4" />
                <span>بيانات المطعم / الفرع</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Restaurant Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1612]">اسم المطعم أو الكافيه <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="مثال: مطعم شاورما فاخر"
                    className="w-full bg-[#FAF8F5] border border-zinc-200 text-xs rounded-xl px-3.5 py-3 focus:border-[#801B2C] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1612]">رابط المنيو (Slug) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                      placeholder="shawarma-express"
                      className="w-full bg-[#FAF8F5] border border-zinc-200 text-xs rounded-xl px-3.5 py-3 pl-8 text-left font-mono focus:border-[#801B2C] focus:bg-white focus:outline-none transition-all"
                      dir="ltr"
                    />
                    <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1612]">رقم الهاتف للتواصل <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      name="phone"
                      placeholder="01000000000"
                      className="w-full bg-[#FAF8F5] border border-zinc-200 text-xs rounded-xl px-3.5 py-3 pr-9 focus:border-[#801B2C] focus:bg-white focus:outline-none transition-all"
                    />
                    <Phone className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1612]">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      name="email"
                      placeholder="owner@example.com"
                      className="w-full bg-[#FAF8F5] border border-zinc-200 text-xs rounded-xl px-3.5 py-3 pr-9 focus:border-[#801B2C] focus:bg-white focus:outline-none transition-all"
                    />
                    <Mail className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Admin Credentials Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 text-xs font-bold text-[#801B2C]">
                <User className="w-4 h-4" />
                <span>بيانات حساب المدير (Admin)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Owner Name */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="block text-xs font-bold text-[#1C1612]">اسم المسؤول <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    name="ownerName"
                    placeholder="محمد أحمد"
                    className="w-full bg-[#FAF8F5] border border-zinc-200 text-xs rounded-xl px-3.5 py-3 focus:border-[#801B2C] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="block text-xs font-bold text-[#1C1612]">اسم المستخدم <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    name="username"
                    placeholder="admin_shawarma"
                    className="w-full bg-[#FAF8F5] border border-zinc-200 text-xs rounded-xl px-3.5 py-3 font-mono focus:border-[#801B2C] focus:bg-white focus:outline-none transition-all text-left"
                    dir="ltr"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="block text-xs font-bold text-[#1C1612]">كلمة المرور <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      name="password"
                      placeholder="••••••••"
                      className="w-full bg-[#FAF8F5] border border-zinc-200 text-xs rounded-xl px-3.5 py-3 pl-8 focus:border-[#801B2C] focus:bg-white focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Selector (if not tied to invoice) */}
            {!invoiceId && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-[#1C1612]">خطة البدء</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, plan: 'trial' }))}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.plan === 'trial'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600 font-bold'
                        : 'border-zinc-200 bg-[#FAF8F5] text-[#5C524C] hover:border-zinc-300'
                    }`}
                  >
                    <span className="block text-xs">تجربة 14 يوماً</span>
                    <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">مجاناً بالكامل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, plan: 'basic' }))}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.plan === 'basic'
                        ? 'border-[#801B2C] bg-[#801B2C]/5 text-[#801B2C] ring-1 ring-[#801B2C] font-bold'
                        : 'border-zinc-200 bg-[#FAF8F5] text-[#5C524C] hover:border-zinc-300'
                    }`}
                  >
                    <span className="block text-xs">الباقة الأساسية</span>
                    <span className="block text-[10px] opacity-70 mt-0.5">1,500 ج.م/شهر</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, plan: 'pro' }))}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.plan === 'pro'
                        ? 'border-[#801B2C] bg-[#801B2C]/5 text-[#801B2C] ring-1 ring-[#801B2C] font-bold'
                        : 'border-zinc-200 bg-[#FAF8F5] text-[#5C524C] hover:border-zinc-300'
                    }`}
                  >
                    <span className="block text-xs">الباقة المتقدمة Pro</span>
                    <span className="block text-[10px] opacity-70 mt-0.5">3,000 ج.م/شهر</span>
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-[#801B2C] hover:bg-[#5E1422] text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#801B2C]/20 text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>تأكيد التسجيل والدخول للوحة التحكم</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-[#5C524C]">
            <span>لديك حساب بالفعل؟</span>
            <Link to="/login" className="font-bold text-[#801B2C] hover:underline">
              تسجيل الدخول من هنا ←
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
