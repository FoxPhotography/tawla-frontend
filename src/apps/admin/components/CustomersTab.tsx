import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit3, User, Phone, MapPin, Trophy, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../../shared/store/authStore';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  orderCount: number;
  totalSpent: number;
  loyaltyPoints?: number;
}

export default function CustomersTab() {
  const queryClient = useQueryClient();
  const { restaurant } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data.data;
    }
  });

  // Edit customer mutation
  const editCustomerMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; phone: string; address: string }) => {
      const res = await api.put(`/customers/${payload.id}`, {
        name: payload.name,
        phone: payload.phone,
        address: payload.address
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('تم تحديث بيانات العميل بنجاح');
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء تحديث بيانات العميل.');
    }
  });

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditAddress(customer.address || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) {
      return toast.error('الاسم ورقم الهاتف مطلوبين.');
    }
    if (editingCustomer) {
      editCustomerMutation.mutate({
        id: editingCustomer.id,
        name: editName,
        phone: editPhone,
        address: editAddress
      });
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const loyaltySettings = restaurant?.loyaltySettings;
  const loyaltyTarget = loyaltySettings?.targetOrderCount || 10;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-admin-text-primary">قاعدة بيانات العملاء</h2>
          <p className="text-xs text-admin-text-secondary mt-1">عرض وتعديل بيانات العملاء وتتبع نقاط الهدايا والجوائز الخاصة بهم.</p>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 bg-admin-bg-elevated border border-admin-border p-4 rounded-xl shadow-sm">
          <div className="text-center px-4 border-l border-admin-border/50">
            <span className="text-[10px] text-admin-text-muted font-bold block mb-1">إجمالي العملاء</span>
            <span className="text-lg font-black text-admin-accent">{customers.length}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] text-admin-text-muted font-bold block mb-1">عملاء مميزين (5+ طلبات)</span>
            <span className="text-lg font-black text-amber-500">
              {customers.filter(c => c.orderCount >= 5).length}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="h-4 w-4 text-admin-text-muted" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          className="w-full bg-admin-bg-elevated border border-admin-border text-admin-text-primary text-xs rounded-xl pr-10 pl-3 py-3 focus:border-admin-accent focus:outline-none transition-colors shadow-sm"
        />
      </div>

      {/* Customers Table / Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-8 h-8 border-4 border-admin-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-admin-text-secondary font-bold">جاري تحميل بيانات العملاء...</span>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-16 text-center shadow-admin-card">
          <User className="w-12 h-12 text-admin-text-muted mx-auto mb-4 opacity-40" />
          <h3 className="font-extrabold text-admin-text-primary text-sm">لا يوجد عملاء مطابقين</h3>
          <p className="text-xs text-admin-text-secondary mt-1">لم يتم العثور على أي بيانات مسجلة في النظام.</p>
        </div>
      ) : (
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl overflow-hidden shadow-admin-card">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-admin-bg-base/40 text-admin-text-secondary font-black border-b border-admin-border/80">
                  <th className="p-4">العميل</th>
                  <th className="p-4">رقم الموبايل</th>
                  <th className="p-4">العنوان الرئيسي</th>
                  <th className="p-4 text-center">عدد الطلبات</th>
                  <th className="p-4 text-center">إجمالي الإنفاق</th>
                  {loyaltySettings?.enabled && <th className="p-4 text-center">نقاط نظام الهدايا</th>}
                  <th className="p-4 text-center">الخيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border/50 text-admin-text-primary font-bold">
                {filteredCustomers.map((customer) => {
                  const points = customer.loyaltyPoints !== undefined ? customer.loyaltyPoints : (customer.orderCount % loyaltyTarget);
                  const isEligible = loyaltySettings?.enabled && points >= loyaltyTarget;
                  const isVIP = customer.orderCount >= 10;

                  return (
                    <tr key={customer.id} className="hover:bg-admin-bg-base/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                            isVIP ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-admin-accent/10 text-admin-accent'
                          }`}>
                            {customer.name[0]}
                          </div>
                          <div>
                            <div className="font-black flex items-center gap-1.5">
                              <span>{customer.name}</span>
                              {isVIP && (
                                <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>مميز (VIP)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-left" dir="ltr">{customer.phone}</td>
                      <td className="p-4 max-w-xs truncate text-admin-text-secondary">{customer.address || '—'}</td>
                      <td className="p-4 text-center text-sm font-black">{customer.orderCount}</td>
                      <td className="p-4 text-center font-mono text-admin-accent text-sm font-black">
                        {customer.totalSpent.toLocaleString()} ج.م
                      </td>
                      {loyaltySettings?.enabled && (
                        <td className="p-4">
                          <div className="flex flex-col items-center gap-1.5">
                            {isEligible ? (
                              <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-black animate-pulse">
                                <Trophy className="w-3 h-3" />
                                <span>جاهز للمكافأة!</span>
                              </span>
                            ) : (
                              <div className="w-24 bg-admin-bg-base border border-admin-border/50 h-2 rounded-full overflow-hidden relative">
                                <div 
                                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, (points / loyaltyTarget) * 100)}%` }}
                                />
                              </div>
                            )}
                            <span className="text-[10px] text-admin-text-secondary font-bold">
                              {points} / {loyaltyTarget} طلب
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="p-2 bg-admin-bg-base border border-admin-border hover:border-admin-accent hover:text-admin-accent text-admin-text-secondary rounded-lg transition-colors cursor-pointer"
                          title="تعديل بيانات العميل"
                        >
                          <Edit3 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCustomer(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#18181B] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 text-right overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <User className="w-5 h-5 text-admin-accent" />
                  <span>تعديل بيانات العميل</span>
                </h3>
                <button
                  onClick={() => setEditingCustomer(null)}
                  className="p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-bold block mb-1">اسم العميل بالكامل</label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 w-4.5 h-4.5 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#09090B] border border-white/10 text-white text-xs rounded-xl pr-10 pl-3 py-3 focus:border-admin-accent focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-bold block mb-1">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 w-4.5 h-4.5 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-[#09090B] border border-white/10 text-white text-xs rounded-xl pr-10 pl-3 py-3 focus:border-admin-accent focus:outline-none transition-colors text-left font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-bold block mb-1">العنوان الافتراضي</label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-3 w-4.5 h-4.5 text-zinc-500" />
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="المنطقة، اسم الشارع، رقم البناية..."
                      className="w-full bg-[#09090B] border border-white/10 text-white text-xs rounded-xl pr-10 pl-3 py-3 focus:border-admin-accent focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <motion.button
                    type="submit"
                    disabled={editCustomerMutation.isPending}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-2.5 bg-admin-accent text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-admin-accent"
                  >
                    {editCustomerMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>حفظ التعديلات</span>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
