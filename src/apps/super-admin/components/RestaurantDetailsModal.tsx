import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Coffee, Sliders, Lock, Users, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import CustomDateTimePicker from '../CustomDateTimePicker';
import CustomSelect from '../CustomSelect';

interface RestaurantDetailsModalProps {
  rest: any;
  onClose: () => void;
}

export default function RestaurantDetailsModal({ rest, onClose }: RestaurantDetailsModalProps) {
  const queryClient = useQueryClient();

  // Form states
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerUsername, setEditOwnerUsername] = useState('');
  const [editPlan, setEditPlan] = useState<'trial' | 'basic' | 'pro'>('basic');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Initializing state
  useEffect(() => {
    if (rest) {
      setEditName(rest.name || '');
      setEditSlug(rest.slug || '');
      setEditPhone(rest.phone || '');
      setEditAddress(rest.address || '');
      setEditOwnerName(rest.adminName || '');
      setEditOwnerUsername(rest.adminUsername || '');
      setEditPlan(rest.subscription?.plan || 'basic');
      
      if (rest.subscription?.expiresAt) {
        const d = new Date(rest.subscription.expiresAt);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setEditExpiresAt(`${year}-${month}-${day}`);
      } else {
        setEditExpiresAt('');
      }
      setNewPassword('');
    }
  }, [rest]);

  // Query for staff
  const { data: restStaff = [], isLoading: loadingRestStaff } = useQuery({
    queryKey: ['super-admin-restaurant-staff', rest?.id],
    queryFn: async () => {
      if (!rest?.id) return [];
      const response = await api.get(`/super-admin/restaurants/${rest.id}/staff`);
      return response.data.data;
    },
    enabled: !!rest?.id,
  });

  // Mutations
  const updateRestMutation = useMutation({
    mutationFn: async () => {
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
      return api.put(`/super-admin/restaurants/${rest.id}`, payload);
    },
    onSuccess: () => {
      toast.success('تم تعديل بيانات المطعم واشتراكه بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تعديل بيانات المطعم.');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const targetId = rest?.adminUserId;
      if (!targetId) return;
      return api.put(`/super-admin/restaurants/${targetId}/password`, { password: newPassword });
    },
    onSuccess: () => {
      toast.success(`تم تحديث كلمة المرور لـ ${editOwnerName} بنجاح!`);
      setNewPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تحديث كلمة المرور.');
    },
  });

  const deleteRestMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/super-admin/restaurants/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف المطعم وجميع بياناته بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حذف المطعم.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editSlug || !editExpiresAt) {
      toast.error('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    updateRestMutation.mutate();
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error('يرجى إدخال كلمة مرور صالحة (4 حروف أو أكثر).');
      return;
    }
    resetPasswordMutation.mutate();
  };

  const handleDelete = () => {
    if (confirm(`هل أنت متأكد تماماً من حذف مطعم "${rest.name}"؟\nسيؤدي هذا إلى حذف المطعم وجميع مستخدميه وأقسامه ومنتجاته وطلباته نهائياً ولا يمكن استرجاع البيانات!`)) {
      deleteRestMutation.mutate(rest.id);
    }
  };

  const editPlanOptions = [
    { value: 'trial', label: 'TRIAL (تجريبية)' },
    { value: 'basic', label: 'BASIC (أساسية)' },
    { value: 'pro', label: 'PRO (احترافية)' }
  ];

  if (!rest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-right my-8 flex flex-col overflow-hidden outline-none"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">{editName || rest.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-indigo-400 font-mono font-bold" dir="ltr">/{editSlug || rest.slug}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-650" />
                <span className="text-[10px] text-slate-500 font-black">ID: {rest.id}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl font-black text-xs cursor-pointer outline-none focus:outline-none flex items-center justify-center w-8 h-8"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          
          {/* 1. Main Edit Form */}
          <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-5">
            <h4 className="text-sm font-black text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>تعديل معلومات المطعم وباقة الترخيص</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-300">اسم الكافيه أو المطعم *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-300">رابط الـ QR الفريد (Slug) *</label>
                <input
                  type="text"
                  required
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors font-mono outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-300">رقم الهاتف</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-300">العنوان بالتفصيل</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-850">
              <div className="space-y-2">
                <CustomSelect
                  value={editPlan}
                  onChange={(val) => setEditPlan(val as any)}
                  options={editPlanOptions}
                  label="نوع باقة العميل *"
                />
              </div>
              <div className="space-y-2">
                <CustomDateTimePicker
                  value={editExpiresAt}
                  onChange={(val) => setEditExpiresAt(val)}
                  type="date"
                  label="تاريخ انتهاء الاشتراك *"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateRestMutation.isPending}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer border border-indigo-500/30 hover:border-indigo-500/50 outline-none focus:outline-none flex items-center justify-center gap-1.5"
              >
                {updateRestMutation.isPending && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>حفظ تعديلات المطعم والترخيص</span>
              </button>
            </div>
          </form>

          {/* 2. Admin Credentials & Reset Password */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-5">
            <h4 className="text-sm font-black text-indigo-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-500" />
              <span>بيانات مدير النظام المشرف للمطعم</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-300">الاسم الكامل للمدير</label>
                <input
                  type="text"
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-300">اسم المستخدم للمدير (Username)</label>
                <input
                  type="text"
                  value={editOwnerUsername}
                  onChange={(e) => setEditOwnerUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors font-mono outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2 border-t border-slate-850">
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-300">رمز مرور جديد للمدير</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="اتركها فارغة لعدم التغيير"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors outline-none font-bold"
                />
              </div>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={!newPassword || newPassword.length < 4 || resetPasswordMutation.isPending}
                className="py-2.5 px-5 bg-indigo-650 hover:bg-indigo-550 active:scale-98 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer h-10 flex items-center justify-center gap-1.5 outline-none focus:outline-none shadow-md border border-indigo-500/30 hover:border-indigo-500/50"
              >
                {resetPasswordMutation.isPending && (
                  <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-transparent rounded-full animate-spin" />
                )}
                <span>تحديث كلمة مرور المالك</span>
              </button>
            </div>
          </div>

          {/* 3. Restaurant Staff */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-5">
            <h4 className="text-sm font-black text-indigo-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>موظفي الكافيه (Staff Users)</span>
              </span>
              <span className="text-xs font-black bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">
                {restStaff.length} موظف
              </span>
            </h4>

            {loadingRestStaff ? (
              <div className="py-6 flex justify-center items-center">
                <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
            ) : restStaff.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 font-bold">
                لم يقم مالك الكافيه بإضافة أي موظفين بالنظام حتى الآن.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {restStaff.map((staff: any) => (
                  <div key={staff.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center">
                    <div className="text-right">
                      <span className="font-black text-white text-xs block">{staff.name}</span>
                      <span className="font-mono text-[10px] text-slate-500 mt-0.5 block">@{staff.username}</span>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850">
                      موظف
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteRestMutation.isPending}
            className="py-2.5 px-4 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/20 hover:border-red-500 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none shadow-md"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف المطعم من الشبكة نهائياً</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none"
          >
            إغلاق
          </button>
        </div>

      </motion.div>
    </div>
  );
}
