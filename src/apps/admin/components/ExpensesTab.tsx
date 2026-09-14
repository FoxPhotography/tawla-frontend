import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  DollarSign, Plus, Trash2, Download, TrendingUp, TrendingDown, 
  PieChart, Users, Home, Zap, ShoppingBag, Wrench, FileText, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';

export default function ExpensesTab() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'salaries' | 'rent' | 'utilities' | 'supplies' | 'maintenance' | 'other'>('supplies');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch Expenses
  const { data: expensesData, isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses', selectedCategory, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/expenses?${params.toString()}`);
      return res.data.data;
    },
  });

  // Fetch Net Profit Report
  const { data: reportData } = useQuery({
    queryKey: ['net-profit-report', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/expenses/net-profit?${params.toString()}`);
      return res.data.data;
    },
  });

  // Add Expense Mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/expenses', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('تمت إضافة المصروف بنجاح.');
      setTitle('');
      setAmount('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['net-profit-report'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل إضافة المصروف.');
    },
  });

  // Delete Expense Mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/expenses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('تم حذف المصروف بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['net-profit-report'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حذف المصروف.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) {
      toast.error('يرجى إدخال عنوان المصروف والمبلغ بشكل صحيح.');
      return;
    }
    addExpenseMutation.mutate({
      title: title.trim(),
      category,
      amount: Number(amount),
      date,
      notes: notes.trim(),
    });
  };

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/expenses/export-excel?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('فشل تنزيل ملف الإكسيل');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tawla_Expenses_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('تم تصدير شيت الإكسيل بنجاح.');
    } catch (err) {
      toast.error('حدث خطأ أثناء تصدير شيت الإكسيل.');
    }
  };

  const categoryNames: Record<string, { label: string; icon: any; color: string }> = {
    salaries: { label: 'مرتبات وعمالة', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    rent: { label: 'إيجار المكان', icon: Home, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    utilities: { label: 'كهرباء ومرافق', icon: Zap, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    supplies: { label: 'خامات ومشتريات', icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    maintenance: { label: 'صيانة ومعدات', icon: Wrench, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    other: { label: 'مصاريف نثرية', icon: FileText, color: 'bg-zinc-50 text-zinc-700 border-zinc-200' },
  };

  const netProfit = reportData?.netProfit ?? 0;
  const totalSales = reportData?.totalSales ?? 0;
  const totalExpenses = reportData?.totalExpenses ?? 0;

  return (
    <div className="space-y-6 font-body" dir="rtl">
      
      {/* Header & Excel Download */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-zinc-900 font-heading flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#801B2C]" />
            <span>إدارة المصروفات والتكاليف وتحديد صافي الربح</span>
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            تسجيل كافة التكاليف التشغيلية وحساب صافي الربح الفعلي للمكان مع تصدير شيت إكسيل مجمع.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>تصدير شيت إكسيل (Excel)</span>
        </motion.button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales Card */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">إجمالي المبيعات (Sales)</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-700">
            {totalSales.toLocaleString('en-US')} <span className="text-xs font-body font-bold text-zinc-500">ج.م</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">الطلبات المسلمة والمسواة فقط</div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">إجمالي المصروفات (Expenses)</span>
            <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-red-600">
            {totalExpenses.toLocaleString('en-US')} <span className="text-xs font-body font-bold text-zinc-500">ج.م</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">مجموع التكاليف التشغيلية المدخلة</div>
        </div>

        {/* Net Profit Card */}
        <div className={`border rounded-3xl p-5 shadow-xs space-y-2 ${
          netProfit >= 0 ? 'bg-gradient-to-br from-emerald-950 via-[#801B2C] to-zinc-900 text-white border-[#801B2C]' : 'bg-red-950 text-white border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-80">صافي الربح الفعلي (Net Profit)</span>
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black">
            {netProfit.toLocaleString('en-US')} <span className="text-xs font-body font-bold opacity-80">ج.م</span>
          </div>
          <div className="text-[11px] opacity-70 font-medium">المبيعات - المصروفات</div>
        </div>
      </div>

      {/* Add Expense Form & Filters Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Add New Expense Form */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-zinc-900 font-heading flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#801B2C]" />
            <span>تسجيل مصروف جديد</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">عنوان المصروف</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: فاتورة كهرباء شهر سبتمبر / خامات وافل"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#801B2C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">التصنيف</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#801B2C]"
              >
                <option value="supplies">خامات ومشتريات (Supplies)</option>
                <option value="salaries">مرتبات وعمالة (Salaries)</option>
                <option value="rent">إيجار المكان (Rent)</option>
                <option value="utilities">كهرباء ومرافق (Utilities)</option>
                <option value="maintenance">صيانة ومعدات (Maintenance)</option>
                <option value="other">مصاريف نثرية (Other)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">المبلغ (ج.م)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[#801B2C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">التاريخ</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#801B2C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">ملاحظات (اختياري)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="أضف تفاصيل أخرى..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#801B2C]"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={addExpenseMutation.isPending}
              className="w-full bg-[#801B2C] hover:bg-[#962436] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md shadow-[#801B2C]/20 transition-all cursor-pointer"
            >
              {addExpenseMutation.isPending ? 'جاري الحفظ...' : 'إضافة المصروف'}
            </motion.button>
          </form>
        </div>

        {/* Expenses List & Filter */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-bold text-zinc-800">تصفية المصروفات:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-700"
              >
                <option value="all">جميع التصنيفات</option>
                <option value="supplies">خامات ومشتريات</option>
                <option value="salaries">مرتبات وعمالة</option>
                <option value="rent">إيجار</option>
                <option value="utilities">كهرباء ومرافق</option>
                <option value="maintenance">صيانة</option>
                <option value="other">نثرية</option>
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-700"
              />
              <span className="text-xs text-zinc-400">إلى</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-700"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[420px] scrollbar-thin scrollbar-thumb-zinc-200">
            {isExpensesLoading ? (
              <div className="text-center py-10 text-xs text-zinc-400">جاري تحميل المصروفات...</div>
            ) : !expensesData?.expenses || expensesData.expenses.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-zinc-300" />
                <p className="text-xs font-bold">لا يوجد مصروفات مسجلة للفترة المحددة.</p>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100">
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">العنوان</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3 text-left">المبلغ</th>
                    <th className="p-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {expensesData.expenses.map((exp: any) => {
                    const catInfo = categoryNames[exp.category] || categoryNames.other;
                    const CatIcon = catInfo.icon;
                    return (
                      <tr key={exp._id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="p-3 text-zinc-500 font-mono text-[11px]">
                          {new Date(exp.date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="p-3 font-bold text-zinc-800">
                          {exp.title}
                          {exp.notes && <div className="text-[10px] text-zinc-400 font-normal">{exp.notes}</div>}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border ${catInfo.color}`}>
                            <CatIcon className="w-3 h-3" />
                            <span>{catInfo.label}</span>
                          </span>
                        </td>
                        <td className="p-3 text-left font-mono font-black text-zinc-900">
                          {exp.amount.toLocaleString('en-US')} ج.م
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if (confirm('هل أنت تأكد من حذف هذا المصروف؟')) {
                                deleteExpenseMutation.mutate(exp._id);
                              }
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
