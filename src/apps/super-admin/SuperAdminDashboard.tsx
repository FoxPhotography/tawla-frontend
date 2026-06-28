import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, Plus, Copy, Check, LogOut, RefreshCw, 
  Coffee, ShieldAlert, Sliders, Calendar, Globe, Eye, EyeOff,
  Sparkles, Activity, Trash2, Edit3, Lock, ShieldCheck
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

  // Form states - Edit Restaurant Modal
  const [editingRest, setEditingRest] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerUsername, setEditOwnerUsername] = useState('');
  const [editPlan, setEditPlan] = useState<'trial' | 'basic' | 'pro'>('basic');
  const [editExpiresAt, setEditExpiresAt] = useState('');

  // Copy helper state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Redirect if not super_admin
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h1 className="text-xl font-bold">غير مصرح لك بدخول هذه الصفحة</h1>
        <button onClick={() => navigate('/admin/login')} className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors font-bold text-sm">
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

  // Edit Restaurant
  const updateRestMutation = useMutation({
    mutationFn: async () => {
      if (!editingRest) return;
      const payload = {
        name: editName,
        slug: editSlug.toLowerCase().trim().replace(/\s+/g, '-'),
        phone: editPhone,
        address: editAddress,
        adminName: editOwnerName,
        adminUsername: editOwnerUsername.toLowerCase().trim(),
        plan: editPlan,
        expiresAt: editExpiresAt,
      };
      return api.put(`/super-admin/restaurants/${editingRest.id}`, payload);
    },
    onSuccess: () => {
      toast.success('تم تعديل بيانات المطعم واشتراكه بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      setEditingRest(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تعديل بيانات المطعم.');
    },
  });

  // Delete Restaurant
  const deleteRestMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/super-admin/restaurants/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف المطعم وجميع بياناته بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حذف المطعم.');
    },
  });

  const openEditModal = (rest: any) => {
    setEditingRest(rest);
    setEditName(rest.name);
    setEditSlug(rest.slug);
    setEditPhone(rest.phone || '');
    setEditAddress(rest.address || '');
    setEditOwnerName(rest.adminName || '');
    setEditOwnerUsername(rest.adminUsername || '');
    setEditPlan(rest.subscription.plan);
    setEditExpiresAt(formatDateForInput(rest.subscription.expiresAt));
  };

  const handleDeleteRest = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد تماماً من حذف مطعم "${name}"؟\nسيؤدي هذا إلى حذف المطعم وجميع المستخدمين والأقسام والمنتجات والطلبات التابعة له نهائياً ولا يمكن الاسترجاع!`)) {
      deleteRestMutation.mutate(id);
    }
  };

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  const totalRestaurantsCount = restaurants.length;
  const activeSubscriptionsCount = restaurants.filter((r: any) => {
    const expires = new Date(r.subscription?.expiresAt);
    return expires > new Date();
  }).length;
  const totalSerialsCount = serialKeys.length;
  const unusedSerialsCount = serialKeys.filter((k: any) => !k.isUsed).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-indigo-500/30 select-none" dir="rtl">
      {/* Decorative Blur Background Blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-15%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] rounded-full bg-fuchsia-600/5 blur-[120px] pointer-events-none z-0" />

      <Toaster position="top-center" toastOptions={{
        style: { 
          background: '#0f172a', 
          color: '#f8fafc', 
          border: '1px solid rgba(99, 102, 241, 0.15)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px'
        }
      }} />

      {/* Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 py-4.5 px-6 flex justify-between items-center sticky top-0 z-30 shadow-2xl shadow-slate-950/10">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5"
          >
            <Sliders className="w-6 h-6 animate-pulse" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wide bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Tably OS SuperAdmin
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                لوحة تحكم المطور
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">إدارة التراخيص، حسابات الكافيهات، والاشتراكات السنوية والشهرية</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-left pr-3 border-r border-slate-800">
            <span className="text-xs font-bold text-slate-300">{user?.name}</span>
            <span className="text-[10px] text-indigo-400 font-mono">@{user?.username}</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all shadow-md backdrop-blur-xs cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 z-10">
        
        {/* Statistics Grid */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'إجمالي الكافيهات والمطاعم', value: totalRestaurantsCount, icon: Coffee, color: 'text-indigo-400', bg: 'from-indigo-500/5 to-indigo-500/0', border: 'border-indigo-500/10' },
            { label: 'الاشتراكات النشطة حالياً', value: activeSubscriptionsCount, icon: Activity, color: 'text-emerald-400', bg: 'from-emerald-500/5 to-emerald-500/0', border: 'border-emerald-500/10' },
            { label: 'أكواد التفعيل المصدرة', value: totalSerialsCount, icon: Key, color: 'text-violet-400', bg: 'from-violet-500/5 to-violet-500/0', border: 'border-violet-500/10' },
            { label: 'أكواد تفعيل غير مستخدمة', value: unusedSerialsCount, icon: Sparkles, color: 'text-amber-400', bg: 'from-amber-500/5 to-amber-500/0', border: 'border-amber-500/10' }
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`bg-gradient-to-b ${stat.bg} ${stat.border} border bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 shadow-xl flex items-center justify-between group`}
            >
              <div className="space-y-1.5 text-right">
                <span className="text-xs font-bold text-slate-400 block">{stat.label}</span>
                <span className="text-2xl font-black text-white tracking-tight block font-mono">
                  {loadingRest || loadingSerials ? (
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    stat.value
                  )}
                </span>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-slate-950/60 border ${stat.border} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Sidebar Nav */}
          <aside className="lg:col-span-1 space-y-3">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 space-y-1.5 shadow-xl">
              {[
                { key: 'restaurants' as const, label: 'الاشتراكات والمطاعم', icon: Coffee },
                { key: 'serials' as const, label: 'أكواد التفعيل (Serials)', icon: Key }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setGeneratedKey(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black transition-all border relative overflow-hidden group ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div 
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 filter blur-xs"
                    />
                  )}
                  <tab.icon className="w-4.5 h-4.5 flex-shrink-0 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-5 bg-gradient-to-br from-indigo-950/20 to-slate-950/40 border border-indigo-900/40 rounded-2xl text-xs text-indigo-300 leading-relaxed shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <h4 className="font-extrabold flex items-center gap-1.5 mb-2.5 text-white">
                <ShieldAlert className="w-4 h-4 text-indigo-400 animate-bounce" />
                <span>إرشادات المشرف العام</span>
              </h4>
              <p className="text-slate-400 font-medium">
                تأكد دائماً من الرابط الفريد (Slug) للمطعم. يتم منح الباقات الجديدة فترة تجريبية مجانية تلقائياً لمدة 30 يوماً.
              </p>
              <p className="text-slate-400 mt-2 font-medium">
                عند قيام العميل بالتحويل المالي، قم بتوليد كود تفعيل وأرسله له ليضعه في لوحة التحكم الخاصة به لتفعيل الخدمة تلقائياً.
              </p>
            </motion.div>
          </aside>

          {/* Content area */}
          <main className="lg:col-span-3 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                {/* RESTAURANTS TAB */}
                {activeTab === 'restaurants' && (
                  <div className="space-y-6">
                    {/* Create Restaurant Form */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                      <h2 className="text-base font-black text-white mb-5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span>تسجيل مطعم / كافيه جديد</span>
                      </h2>
                      
                      <form onSubmit={handleCreateRest} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-400">اسم المطعم أو الكافيه *</label>
                            <input
                              type="text"
                              required
                              value={restName}
                              onChange={(e) => {
                                setRestName(e.target.value);
                                setRestSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '-'));
                              }}
                              placeholder="مثال: وايت كورت كافيه"
                              className="w-full bg-slate-950/80 border border-slate-800/80 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-400">الرابط الفريد للـ QR (Slug) *</label>
                            <input
                              type="text"
                              required
                              value={restSlug}
                              onChange={(e) => setRestSlug(e.target.value)}
                              placeholder="مثال: white-court"
                              className="w-full bg-slate-950/80 border border-slate-800/80 text-white font-mono rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600 text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-400">رقم الهاتف (اختياري)</label>
                            <input
                              type="text"
                              value={restPhone}
                              onChange={(e) => setRestPhone(e.target.value)}
                              placeholder="مثال: 01012345678"
                              className="w-full bg-slate-950/80 border border-slate-800/80 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-400">العنوان بالتفصيل (اختياري)</label>
                            <input
                              type="text"
                              value={restAddress}
                              onChange={(e) => setRestAddress(e.target.value)}
                              placeholder="الشارع، المدينة"
                              className="w-full bg-slate-950/80 border border-slate-800/80 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                            />
                          </div>
                        </div>

                        <div className="border-t border-slate-800/80 pt-4.5 mt-2">
                          <h3 className="text-xs font-black text-indigo-400 mb-3.5 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span>بيانات حساب المدير المسؤول (صاحب الكافيه)</span>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-black text-slate-400">اسم المدير *</label>
                              <input
                                type="text"
                                required
                                value={ownerName}
                                onChange={(e) => setOwnerName(e.target.value)}
                                placeholder="الاسم الثلاثي"
                                className="w-full bg-slate-950/80 border border-slate-800/80 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-xs font-black text-slate-400">اسم المستخدم للوجين *</label>
                              <input
                                type="text"
                                required
                                value={ownerUsername}
                                onChange={(e) => setOwnerUsername(e.target.value)}
                                placeholder="مثال: admin_court"
                                className="w-full bg-slate-950/80 border border-slate-800/80 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-xs font-black text-slate-400">كلمة مرور الحساب *</label>
                              <div className="relative group">
                                <input
                                  type={showPass ? 'text' : 'password'}
                                  required
                                  value={ownerPassword}
                                  onChange={(e) => setOwnerPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full bg-slate-950/80 border border-slate-800/80 text-white rounded-xl px-4 py-2.5 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600 animate-none"
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

                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          type="submit"
                          disabled={createRestMutation.isPending}
                          className="mt-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                        >
                          {createRestMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>إنشاء المطعم وتفعيل حساب المدير</span>
                            </>
                          )}
                        </motion.button>
                      </form>
                    </div>

                    {/* Restaurants list */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                      <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                      <h2 className="text-base font-black text-white mb-5 flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <Activity className="w-4.5 h-4.5 text-indigo-400" />
                          <span>سجل الكافيهات والمطاعم المسجلة</span>
                        </span>
                        <span className="text-[10px] font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full">{restaurants.length} مطعم</span>
                      </h2>

                      {loadingRest ? (
                        <div className="py-16 flex justify-center items-center">
                          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                        </div>
                      ) : restaurants.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                          <p className="text-sm text-slate-500">لا توجد كافيهات أو مطاعم مسجلة بالنظام بعد.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-sm">
                            <thead>
                              <tr className="border-b border-slate-800/80 text-slate-400 font-bold text-xs">
                                <th className="pb-3 pr-2">اسم الكافيه / الرابط</th>
                                <th className="pb-3">المدير المسؤول</th>
                                <th className="pb-3">الباقة الحالية</th>
                                <th className="pb-3">تاريخ انتهاء الصلاحية</th>
                                <th className="pb-3 pl-2">إجراءات التحكم</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850/50">
                              {restaurants.map((rest: any, idx: number) => {
                                const expires = new Date(rest.subscription.expiresAt);
                                const isExpired = expires < new Date() || rest.subscription.status === 'expired';
                                const status = rest.subscription.status;

                                return (
                                  <motion.tr 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={rest.id} 
                                    className="hover:bg-slate-800/25 transition-colors group"
                                  >
                                    <td className="py-4 pr-2">
                                      <h4 className="font-extrabold text-white text-sm group-hover:text-indigo-400 transition-colors">{rest.name}</h4>
                                      <span className="text-[11px] text-slate-550 font-semibold flex items-center gap-1 mt-0.5" dir="ltr">
                                        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>/{rest.slug}</span>
                                      </span>
                                    </td>
                                    <td className="py-4">
                                      <span className="font-bold text-slate-300 block text-xs">{rest.adminName || 'غير معين'}</span>
                                      <span className="font-mono text-[10px] text-slate-500 block mt-0.5">@{rest.adminUsername || 'لا يوجد'}</span>
                                    </td>
                                    <td className="py-4">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                                        rest.subscription.plan === 'pro' 
                                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm' 
                                          : rest.subscription.plan === 'basic' 
                                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm' 
                                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                                      }`}>
                                        {rest.subscription.plan === 'pro' && 'PRO احترافية'}
                                        {rest.subscription.plan === 'basic' && 'BASIC أساسية'}
                                        {rest.subscription.plan === 'trial' && 'TRIAL تجريبية'}
                                      </span>
                                    </td>
                                    <td className="py-4">
                                      <span className={`font-mono text-xs font-black ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {expires.toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                                      </span>
                                      <span className={`block text-[9px] font-extrabold ${isExpired ? 'text-red-500/80' : 'text-slate-500'}`}>
                                        {isExpired ? 'منتهي الصلاحية' : status === 'active' ? 'نشط' : 'معطل'}
                                      </span>
                                    </td>
                                    <td className="py-4 pl-2">
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => setResettingUser({ id: rest.adminUserId, name: rest.adminName })}
                                          disabled={!rest.adminUserId}
                                          className="text-[10px] font-black border border-slate-800 bg-slate-900/50 hover:bg-slate-850 hover:border-slate-700 text-slate-300 px-2 py-1 rounded-lg transition-all cursor-pointer"
                                          title="تغيير كلمة مرور المدير"
                                        >
                                          الباسورد
                                        </button>
                                        <button
                                          onClick={() => openEditModal(rest)}
                                          className="text-[10px] font-black border border-indigo-950 bg-indigo-950/20 hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                          <span>تعديل</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRest(rest.id, rest.name)}
                                          className="text-[10px] font-black border border-red-950/50 bg-red-950/10 hover:bg-red-950/30 text-red-400 hover:text-red-300 hover:border-red-500/30 px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>حذف</span>
                                        </button>
                                      </div>
                                    </td>
                                  </motion.tr>
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
                      <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden self-start">
                        <div className="absolute top-0 left-0 w-24 h-24 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                        <h2 className="text-base font-black text-white mb-5 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 animate-pulse">
                            <Key className="w-4 h-4" />
                          </div>
                          <span>توليد كود تفعيل جديد</span>
                        </h2>

                        <form onSubmit={handleGenerateSerial} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-400">باقة الاشتراك *</label>
                            <select
                              value={serialPlan}
                              onChange={(e) => setSerialPlan(e.target.value as any)}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                            >
                              <option value="trial">TRIAL (فترة تجريبية)</option>
                              <option value="basic">BASIC (الباقة الأساسية)</option>
                              <option value="pro">PRO (الباقة الاحترافية)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-400">مدة الترخيص بالأيام *</label>
                            <select
                              value={serialDuration}
                              onChange={(e) => setSerialDuration(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
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
                              <label className="block text-xs font-black text-slate-400">أدخل عدد الأيام المخصصة *</label>
                              <input
                                type="number"
                                required
                                value={customDays}
                                onChange={(e) => setCustomDays(e.target.value)}
                                placeholder="عدد الأيام، مثال: 15"
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                              />
                            </div>
                          )}

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={generateSerialMutation.isPending}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                          >
                            {generateSerialMutation.isPending ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Key className="w-4 h-4" />
                                <span>توليد كود التفعيل</span>
                              </>
                            )}
                          </motion.button>
                        </form>

                        {/* Generated Key Panel */}
                        {generatedKey && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-6 p-4.5 bg-slate-950/80 border border-indigo-500/20 rounded-xl text-center space-y-3 shadow-inner"
                          >
                            <span className="text-[10px] text-slate-400 font-extrabold tracking-wide block">كود التفعيل جاهز للإرسال للعميل</span>
                            <span className="text-base font-mono font-black text-indigo-400 tracking-wider block bg-slate-900 border border-slate-850 py-2 rounded-lg select-all">
                              {generatedKey}
                            </span>
                            <button
                              onClick={() => copyToClipboard(generatedKey)}
                              className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-bold hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedKey === generatedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedKey === generatedKey ? 'تم النسخ!' : 'نسخ الكود'}</span>
                            </button>
                          </motion.div>
                        )}
                      </div>

                      {/* Generated Keys Logs */}
                      <div className="lg:col-span-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                        <h2 className="text-base font-black text-white mb-5 flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <Activity className="w-4.5 h-4.5 text-violet-400" />
                            <span>سجل الأكواد المصدرة</span>
                          </span>
                          <span className="text-[10px] font-black bg-violet-500/15 text-violet-300 border border-violet-500/20 px-3 py-1 rounded-full">{serialKeys.length} كود</span>
                        </h2>

                        {loadingSerials ? (
                          <div className="py-16 flex justify-center items-center">
                            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                          </div>
                        ) : serialKeys.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                            <p className="text-sm text-slate-500">لم تقم بتوليد أي أكواد بعد.</p>
                          </div>
                        ) : (
                          <div className="overflow-y-auto max-h-[460px] pr-1 space-y-3">
                            {serialKeys.map((item, idx) => (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                key={item.id}
                                className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all ${
                                  item.isUsed 
                                    ? 'bg-slate-950/20 border-slate-900/80 opacity-60' 
                                    : 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/20'
                                }`}
                              >
                                <div className="space-y-1 text-right">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-slate-200 text-sm tracking-wide">{item.key}</span>
                                    <button 
                                      onClick={() => copyToClipboard(item.key)}
                                      className="p-1 rounded text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                                      title="نسخ"
                                    >
                                      {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-extrabold">
                                    <span className="flex items-center gap-1">
                                      <Sliders className="w-3.5 h-3.5" />
                                      <span>الباقة: {item.plan === 'pro' ? 'PRO' : item.plan === 'basic' ? 'BASIC' : 'TRIAL'}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>المدة: {item.durationDays} يوماً</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="text-left font-semibold">
                                  {item.isUsed ? (
                                    <div className="space-y-0.5 text-left md:text-left">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-slate-800 text-slate-400 border border-slate-800 shadow-sm">
                                        مستخدم
                                      </span>
                                      <span className="block text-[10px] text-slate-400 font-extrabold">
                                        بواسطة: <span className="text-indigo-400 font-black">{item.usedByRestaurantName || 'كافيه مجهول'}</span>
                                      </span>
                                      {item.usedAt && (
                                        <span className="block text-[9px] text-slate-500 font-bold">
                                          تاريخ التفعيل: {new Date(item.usedAt).toLocaleDateString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>فعال وغير مستخدم</span>
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            ))}
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
      </div>

      {/* RESET PASSWORD MODAL */}
      <AnimatePresence>
        {resettingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl p-6 space-y-4 text-right"
            >
              <div className="pb-2.5 border-b border-slate-800">
                <h3 className="font-black text-white text-base">تغيير كلمة المرور لمدير المطعم</h3>
                <p className="text-xs text-slate-400 mt-1">اسم المدير الحالي: <span className="text-indigo-400 font-bold">{resettingUser.name}</span></p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400">كلمة المرور الجديدة *</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل 6 خانات أو أكثر"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setResettingUser(null); setNewPassword(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 font-bold text-xs hover:border-slate-500 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => resetPasswordMutation.mutate()}
                  disabled={!newPassword || newPassword.length < 4 || resetPasswordMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-black text-xs transition-colors flex items-center justify-center gap-1 shadow-md cursor-pointer"
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

      {/* EDIT RESTAURANT MODAL */}
      <AnimatePresence>
        {editingRest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl p-6 space-y-4.5 text-right overflow-y-auto max-h-[90vh]"
            >
              <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-white text-base">تعديل بيانات المطعم والاشتراك</h3>
                  <p className="text-xs text-indigo-400 mt-1 font-bold">تعديل: {editingRest.name}</p>
                </div>
                <button 
                  onClick={() => setEditingRest(null)}
                  className="text-slate-400 hover:text-white font-black text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); updateRestMutation.mutate(); }} className="space-y-4">
                {/* Name and Slug */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-400">اسم المطعم أو الكافيه *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-400">الرابط المميز (Slug) *</label>
                    <input
                      type="text"
                      required
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Phone and Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-400">رقم الهاتف</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-400">العنوان بالتفصيل</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Owner info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-400">اسم المدير المسؤول</label>
                    <input
                      type="text"
                      value={editOwnerName}
                      onChange={(e) => setEditOwnerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-400">اسم مستخدم المدير</label>
                    <input
                      type="text"
                      value={editOwnerUsername}
                      onChange={(e) => setEditOwnerUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Subscription details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-400">نوع الباقة *</label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <option value="trial">TRIAL (تجريبية)</option>
                      <option value="basic">BASIC (أساسية)</option>
                      <option value="pro">PRO (احترافية)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-400">تاريخ انتهاء الاشتراك *</label>
                    <input
                      type="date"
                      required
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingRest(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 font-bold text-xs hover:border-slate-500 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={updateRestMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-850 disabled:to-slate-850 text-white font-black text-xs transition-colors flex items-center justify-center gap-1 shadow-md cursor-pointer"
                  >
                    {updateRestMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>حفظ التعديلات</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
