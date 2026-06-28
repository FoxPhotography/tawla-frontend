import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, Plus, Copy, Check, LogOut, RefreshCw, 
  Coffee, ShieldAlert, Sliders, Calendar, Globe, Eye, EyeOff
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';
import type { SerialKey } from '../../shared/types';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'restaurants' | 'serials'>('restaurants');

  // Form states - Create Restaurant
  const [restName, setRestName] = useState('');
  const [restSlug, setRestSlug] = useState('');
  const [restPhone, setRestPhone] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Form states - Generate Serial
  const [serialPlan, setSerialPlan] = useState<'trial' | 'basic' | 'pro'>('basic');
  const [serialDuration, setSerialDuration] = useState('30');
  const [customDays, setCustomDays] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Form states - Reset Password Modal
  const [resettingUser, setResettingUser] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Copy helper state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Redirect if not super_admin
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-bold">غير مصرح لك بدخول هذه الصفحة</h1>
        <button onClick={() => navigate('/admin/login')} className="mt-4 px-6 py-2 bg-indigo-600 rounded-lg">
          ذهاب لتسجيل الدخول
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Queries
  const { data: restaurants = [], isLoading: loadingRest } = useQuery({
    queryKey: ['super-admin-restaurants'],
    queryFn: async () => {
      const response = await api.get('/super-admin/restaurants');
      return response.data.data;
    },
  });

  const { data: serialKeys = [], isLoading: loadingSerials } = useQuery({
    queryKey: ['super-admin-serials'],
    queryFn: async () => {
      const response = await api.get('/super-admin/serials');
      return response.data.data as SerialKey[];
    },
  });

  // Mutations
  const createRestMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: restName,
        slug: restSlug.toLowerCase().trim().replace(/\s+/g, '-'),
        phone: restPhone,
        address: restAddress,
        ownerName,
        username: ownerUsername.toLowerCase().trim(),
        password: ownerPassword,
      };
      return api.post('/super-admin/restaurants', payload);
    },
    onSuccess: () => {
      toast.success('تم تسجيل المطعم الجديد وإنشاء الحساب بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      // Reset form
      setRestName('');
      setRestSlug('');
      setRestPhone('');
      setRestAddress('');
      setOwnerName('');
      setOwnerUsername('');
      setOwnerPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل إضافة المطعم. تأكد من البيانات.');
    },
  });

  const generateSerialMutation = useMutation({
    mutationFn: async () => {
      const days = serialDuration === 'custom' ? Number(customDays) : Number(serialDuration);
      return api.post('/super-admin/serials/generate', { plan: serialPlan, durationDays: days });
    },
    onSuccess: (res) => {
      toast.success('تم توليد كود التفعيل بنجاح!');
      setGeneratedKey(res.data.data.key);
      queryClient.invalidateQueries({ queryKey: ['super-admin-serials'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل توليد الكود.');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resettingUser) return;
      return api.put(`/super-admin/restaurants/${resettingUser.id}/password`, { password: newPassword });
    },
    onSuccess: () => {
      toast.success(`تم تحديث كلمة المرور لـ ${resettingUser?.name} بنجاح!`);
      setResettingUser(null);
      setNewPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تحديث كلمة المرور.');
    },
  });

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('تم نسخ الكود للحافظة.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateRest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName || !restSlug || !ownerName || !ownerUsername || !ownerPassword) {
      toast.error('يرجى ملء جميع الحقول المطلوبة لإنشاء المطعم.');
      return;
    }
    createRestMutation.mutate();
  };

  const handleGenerateSerial = (e: React.FormEvent) => {
    e.preventDefault();
    const days = serialDuration === 'custom' ? Number(customDays) : Number(serialDuration);
    if (!days || days <= 0) {
      toast.error('يرجى تحديد مدة اشتراك صالحة بالأيام.');
      return;
    }
    generateSerialMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.08)' }
      }} />

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex justify-between items-center sticky top-0 z-35 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wide text-indigo-400">لوحة تحكم المشرف العام</h1>
            <p className="text-xs text-slate-400">إدارة التراخيص، الاشتراكات والمطاعم لـ Tably OS</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="p-2.5 rounded-xl border border-slate-850 bg-slate-900 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors shadow-sm"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Nav */}
        <aside className="lg:col-span-1 space-y-2">
          {[
            { key: 'restaurants' as const, label: 'إشتركات المطاعم والكافيهات', icon: Coffee },
            { key: 'serials' as const, label: 'مولد أكواد التفعيل (Serials)', icon: Key }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setGeneratedKey(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all border ${
                activeTab === tab.key
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-100 hover:border-slate-750'
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
          
          <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-xl mt-6 text-xs text-indigo-300 leading-relaxed">
            <h4 className="font-bold flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>تعليمات الترخيص</span>
            </h4>
            <p>
              يتم تفعيل المطعم تلقائياً كـ Trial عند الإنشاء لمدة 30 يوماً. لتحديث الباقة أو تمديدها، قم بتوليد كود التفعيل وأرسله للعميل ليضعه في نظامه.
            </p>
          </div>
        </aside>

        {/* Content area */}
        <main className="lg:col-span-3 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* RESTAURANTS TAB */}
              {activeTab === 'restaurants' && (
                <div className="space-y-6">
                  {/* Create Restaurant Form */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                    <h2 className="text-base font-extrabold text-white mb-5 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-indigo-400" />
                      <span>تسجيل مطعم / كافيه جديد في النظام</span>
                    </h2>
                    
                    <form onSubmit={handleCreateRest} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-400">اسم المطعم / الكافيه *</label>
                          <input
                            type="text"
                            required
                            value={restName}
                            onChange={(e) => {
                              setRestName(e.target.value);
                              setRestSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '-'));
                            }}
                            placeholder="مثال: وايت كورت كافيه"
                            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-400">الرابط الفريد للـ QR (Slug) *</label>
                          <input
                            type="text"
                            required
                            value={restSlug}
                            onChange={(e) => setRestSlug(e.target.value)}
                            placeholder="مثال: white-court"
                            className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600 text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-400">رقم الهاتف (اختياري)</label>
                          <input
                            type="text"
                            value={restPhone}
                            onChange={(e) => setRestPhone(e.target.value)}
                            placeholder="مثال: 01012345678"
                            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-400">العنوان بالتفصيل (اختياري)</label>
                          <input
                            type="text"
                            value={restAddress}
                            onChange={(e) => setRestAddress(e.target.value)}
                            placeholder="الشارع، المدينة"
                            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-4 mt-2">
                        <h3 className="text-xs font-black text-indigo-400 mb-3">بيانات حساب المدير المسؤول (صاحب الكافيه)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400">اسم المدير *</label>
                            <input
                              type="text"
                              required
                              value={ownerName}
                              onChange={(e) => setOwnerName(e.target.value)}
                              placeholder="الاسم الثلاثي"
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400">اسم المستخدم للوجين *</label>
                            <input
                              type="text"
                              required
                              value={ownerUsername}
                              onChange={(e) => setOwnerUsername(e.target.value)}
                              placeholder="مثال: admin_court"
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400">كلمة مرور الحساب *</label>
                            <div className="relative group">
                              <input
                                type={showPass ? 'text' : 'password'}
                                required
                                value={ownerPassword}
                                onChange={(e) => setOwnerPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 pr-4 pl-10 text-sm focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-350 transition-colors"
                              >
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={createRestMutation.isPending}
                        className="mt-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                      >
                        {createRestMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>إنشاء المطعم وتفعيل حساب المدير</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Restaurants list */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md overflow-hidden">
                    <h2 className="text-base font-extrabold text-white mb-5 flex justify-between items-center">
                      <span>سجل المطاعم المشتركة</span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full">{restaurants.length} مطعم</span>
                    </h2>

                    {loadingRest ? (
                      <div className="py-12 flex justify-center items-center">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      </div>
                    ) : restaurants.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">لا توجد مطاعم مسجلة بالنظام بعد.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-bold text-xs">
                              <th className="pb-3 pr-2">اسم المنشأة / الرابط</th>
                              <th className="pb-3">المدير المسؤول</th>
                              <th className="pb-3">الباقة الحالية</th>
                              <th className="pb-3">تاريخ انتهاء الصلاحية</th>
                              <th className="pb-3 pl-2">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {restaurants.map((rest: any) => {
                              const expires = new Date(rest.subscription.expiresAt);
                              const isExpired = expires < new Date() || rest.subscription.status === 'expired';
                              const status = rest.subscription.status;

                              return (
                                <tr key={rest.id} className="hover:bg-slate-850/30 transition-colors">
                                  <td className="py-4 pr-2">
                                    <h4 className="font-extrabold text-white text-sm">{rest.name}</h4>
                                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                                      <Globe className="w-3.5 h-3.5" />
                                      <span>/{rest.slug}</span>
                                    </span>
                                  </td>
                                  <td>
                                    <div className="font-semibold text-slate-200">{rest.adminName}</div>
                                    <div className="text-xs text-slate-500">مستخدم: {rest.adminUsername}</div>
                                  </td>
                                  <td>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                      rest.subscription.plan === 'pro' 
                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                        : rest.subscription.plan === 'basic' 
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {rest.subscription.plan === 'pro' && 'PRO احترافية'}
                                      {rest.subscription.plan === 'basic' && 'BASIC أساسية'}
                                      {rest.subscription.plan === 'trial' && 'TRIAL تجريبية'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`font-mono text-xs font-bold ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                                      {expires.toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                                    </span>
                                    <span className={`block text-[10px] font-semibold ${isExpired ? 'text-red-500/80' : 'text-slate-500'}`}>
                                      {isExpired ? 'منتهي الصلاحية' : status === 'active' ? 'نشط' : 'معطل'}
                                    </span>
                                  </td>
                                  <td className="py-4 pl-2">
                                    <button
                                      onClick={() => setResettingUser({ id: rest.adminUserId, name: rest.adminName })}
                                      disabled={!rest.adminUserId}
                                      className="text-xs border border-slate-700 bg-slate-900 text-slate-300 px-3 py-1.5 rounded-lg hover:border-indigo-500 hover:text-white transition-colors"
                                    >
                                      تعديل الباسورد
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SERIALS TAB */}
              {activeTab === 'serials' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    
                    {/* Serial Key Generator */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md self-start">
                      <h2 className="text-base font-extrabold text-white mb-5 flex items-center gap-2">
                        <Key className="w-5 h-5 text-indigo-400" />
                        <span>توليد كود تفعيل جديد</span>
                      </h2>

                      <form onSubmit={handleGenerateSerial} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-400">باقة الاشتراك *</label>
                          <select
                            value={serialPlan}
                            onChange={(e) => setSerialPlan(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          >
                            <option value="trial">TRIAL (فترة تجريبية)</option>
                            <option value="basic">BASIC (الباقة الأساسية)</option>
                            <option value="pro">PRO (الباقة الاحترافية)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-400">مدة الترخيص بالأيام *</label>
                          <select
                            value={serialDuration}
                            onChange={(e) => setSerialDuration(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          >
                            <option value="30">30 يوماً (شهر)</option>
                            <option value="90">90 يوماً (3 أشهر)</option>
                            <option value="180">180 يوماً (6 أشهر)</option>
                            <option value="365">365 يوماً (سنة كاملة)</option>
                            <option value="custom">تحديد مدة مخصصة بالخلف...</option>
                          </select>
                        </div>

                        {serialDuration === 'custom' && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400">أدخل عدد الأيام المخصصة *</label>
                            <input
                              type="number"
                              required
                              value={customDays}
                              onChange={(e) => setCustomDays(e.target.value)}
                              placeholder="عدد الأيام، مثال: 15"
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                            />
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={generateSerialMutation.isPending}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
                        >
                          {generateSerialMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Key className="w-4 h-4" />
                              <span>توليد كود التفعيل</span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Generated Key Panel */}
                      {generatedKey && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-6 p-4 bg-slate-950 border border-indigo-500/30 rounded-xl text-center space-y-3"
                        >
                          <span className="text-[10px] text-slate-400 font-bold block">كود التفعيل جاهز للإرسال</span>
                          <span className="text-base font-mono font-black text-indigo-400 tracking-wider block bg-slate-900 border border-slate-850 px-3 py-2 rounded-lg select-all">
                            {generatedKey}
                          </span>
                          <button
                            onClick={() => copyToClipboard(generatedKey)}
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-bold hover:text-white transition-colors"
                          >
                            {copiedKey === generatedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === generatedKey ? 'تم النسخ!' : 'نسخ الكود'}</span>
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {/* Generated Keys Logs */}
                    <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                      <h2 className="text-base font-extrabold text-white mb-5 flex justify-between items-center">
                        <span>سجل الأكواد المصدرة</span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full">{serialKeys.length} كود</span>
                      </h2>

                      {loadingSerials ? (
                        <div className="py-12 flex justify-center items-center">
                          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                        </div>
                      ) : serialKeys.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">لم تقم بتوليد أي أكواد بعد.</p>
                      ) : (
                        <div className="overflow-y-auto max-h-[460px] pr-1">
                          <div className="space-y-3">
                            {serialKeys.map((item) => (
                              <div
                                key={item.id}
                                className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors ${
                                  item.isUsed 
                                    ? 'bg-slate-950/20 border-slate-850 opacity-60' 
                                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-slate-200 text-sm">{item.key}</span>
                                    <button 
                                      onClick={() => copyToClipboard(item.key)}
                                      className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                                      title="نسخ"
                                    >
                                      {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-semibold">
                                    <span className="flex items-center gap-1">
                                      <Sliders className="w-3.5 h-3.5 text-slate-550" />
                                      <span>الباقة: {item.plan === 'pro' ? 'PRO' : item.plan === 'basic' ? 'BASIC' : 'TRIAL'}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-slate-550" />
                                      <span>المدة: {item.durationDays} يوماً</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="text-left font-semibold">
                                  {item.isUsed ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-800">
                                        مستخدم
                                      </span>
                                      <span className="block text-[11px] text-slate-350">
                                        بواسطة: <span className="text-indigo-400 font-bold">{item.usedByRestaurantName || 'مطعم مجهول'}</span>
                                      </span>
                                      {item.usedAt && (
                                        <span className="block text-[10px] text-slate-500">
                                          بتاريخ: {new Date(item.usedAt).toLocaleDateString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      فعال وغير مستخدم
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* RESET PASSWORD MODAL */}
      <AnimatePresence>
        {resettingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-right"
            >
              <div className="pb-2 border-b border-slate-800">
                <h3 className="font-extrabold text-white text-base">تغيير كلمة المرور لمدير المطعم</h3>
                <p className="text-xs text-slate-400 mt-0.5">اسم المدير: {resettingUser.name}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400">كلمة المرور الجديدة *</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل 6 خانات أو أكثر"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setResettingUser(null); setNewPassword(''); }}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 font-bold text-xs hover:border-slate-500 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => resetPasswordMutation.mutate()}
                  disabled={!newPassword || newPassword.length < 4 || resetPasswordMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10"
                >
                  {resetPasswordMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>تحديث الباسورد</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
