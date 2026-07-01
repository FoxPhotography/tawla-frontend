import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Eye, EyeOff, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';

export default function StaffTab() {
  const queryClient = useQueryClient();

  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [showStaffPass, setShowStaffPass] = useState(false);

  // Fetch staff list
  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      const response = await api.get('/auth/staff');
      return response.data.data;
    },
  });

  const resetStaffForm = () => {
    setEditingStaffId(null);
    setStaffName('');
    setStaffUsername('');
    setStaffPassword('');
    setShowStaffPass(false);
  };

  // Create / Update Staff Mutation
  const staffMutation = useMutation({
    mutationFn: async () => {
      if (editingStaffId) {
        const payload: any = { name: staffName, username: staffUsername };
        if (staffPassword) payload.password = staffPassword;
        await api.put(`/auth/staff/${editingStaffId}`, payload);
      } else {
        await api.post('/auth/staff', {
          name: staffName,
          username: staffUsername,
          password: staffPassword,
        });
      }
    },
    onSuccess: () => {
      toast.success(editingStaffId ? 'تم تحديث بيانات الموظف بنجاح!' : 'تم إنشاء حساب الموظف بنجاح!');
      resetStaffForm();
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ بيانات الموظف.');
    }
  });

  // Delete Staff Mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/auth/staff/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف حساب الموظف.');
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
  });

  // Toggle Staff Active/Inactive Mutation
  const toggleStaffActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await api.put(`/auth/staff/${id}/status`, { isActive: active });
    },
    onSuccess: () => {
      toast.success('تم تعديل حالة الحساب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تعديل حالة الموظف.');
    }
  });

  const submitStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffUsername.trim()) return toast.error('يرجى إدخال الحقول المطلوبة.');
    staffMutation.mutate();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-admin-text-primary">إدارة حسابات الموظفين (الكاشير والويتر)</h2>
        <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">
          {staffList.length} موظفين مسجلين
        </span>
      </div>

      {/* Create / Edit Staff Form */}
      <form onSubmit={submitStaff} className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 space-y-5 max-w-2xl shadow-admin-card">
        <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-admin-accent" />
          <span>{editingStaffId ? 'تعديل بيانات الموظف المحدد' : 'إضافة حساب موظف جديد'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs text-admin-text-secondary font-bold">اسم الموظف *</label>
            <input
              type="text"
              required
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="مثال: أحمد محمد"
              className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-admin-text-secondary font-bold">اسم المستخدم للدخول (Username) *</label>
            <input
              type="text"
              required
              value={staffUsername}
              onChange={(e) => setStaffUsername(e.target.value)}
              placeholder="مثال: ahmed_staff"
              className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted text-left font-mono"
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-1.5 max-w-md">
          <label className="block text-xs text-admin-text-secondary font-bold">
            {editingStaffId ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور *'}
          </label>
          <div className="relative group">
            <input
              type={showStaffPass ? 'text' : 'password'}
              required={!editingStaffId}
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              placeholder={editingStaffId ? '••••••••' : 'اكتب كلمة مرور قوية'}
              className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 pr-4 pl-11 text-right text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
            />
            <button
              type="button"
              onClick={() => setShowStaffPass(!showStaffPass)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-admin-text-muted hover:text-admin-text-primary transition-colors cursor-pointer"
            >
              {showStaffPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <motion.button
            type="submit"
            disabled={staffMutation.isPending}
            whileTap={{ scale: 0.97 }}
            className="py-3 px-6 rounded-lg bg-admin-accent text-white font-bold text-xs hover:opacity-95 transition-opacity cursor-pointer"
          >
            {staffMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              editingStaffId ? 'حفظ التعديلات' : 'إضافة الموظف'
            )}
          </motion.button>
          {editingStaffId && (
            <button
              type="button"
              onClick={resetStaffForm}
              className="bg-admin-bg-subtle text-admin-text-secondary border border-admin-border py-2.5 px-5 rounded-lg text-xs font-medium hover:bg-admin-bg-base transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {/* Staff List */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-admin-text-muted" />
          <span>الموظفون الحاليون</span>
        </h3>
        <div className="bg-admin-bg-elevated border border-admin-border rounded-lg overflow-hidden shadow-admin-card">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-admin-bg-subtle border-b border-admin-border">
                  <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider">الاسم</th>
                  <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider">اسم المستخدم</th>
                  <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider">الصلاحية</th>
                  <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider text-left">التحكم</th>
                </tr>
              </thead>
              <tbody>
                {loadingStaff ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10">
                      <div className="w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-xs text-admin-text-muted font-medium">
                      لا يوجد موظفون مسجلون حالياً.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staffMember: any, idx: number) => (
                    <motion.tr
                      key={staffMember.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-admin-border hover:bg-admin-bg-subtle/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="font-bold text-admin-text-primary block text-sm">{staffMember.name}</span>
                      </td>
                      <td className="px-5 py-4 text-admin-text-secondary font-mono text-xs" dir="ltr">
                        @{staffMember.username}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 bg-admin-accent-light text-admin-accent border border-admin-accent/20 text-[10px] px-2.5 py-0.5 rounded-full font-black">
                          {staffMember.role === 'cashier' ? 'كاشير / صالة' : staffMember.role === 'waiter' ? 'ويتر' : 'مدير'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-left">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => toggleStaffActiveMutation.mutate({ id: staffMember.id, active: !staffMember.isActive })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              staffMember.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-750'
                            }`}
                          >
                            {staffMember.isActive ? 'نشط' : 'معطل'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingStaffId(staffMember.id);
                              setStaffName(staffMember.name);
                              setStaffUsername(staffMember.username);
                              setStaffPassword('');
                            }}
                            className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-accent transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => { if (confirm('حذف هذا الحساب نهائياً؟')) deleteStaffMutation.mutate(staffMember.id); }} 
                            className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-red-650 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
