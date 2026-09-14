import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  DollarSign, Plus, Download, Trash2, FileText, 
  TrendingUp, TrendingDown, Users, Home, Zap, Wrench, Package, MoreHorizontal, Filter, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import CustomSelect from './CustomSelect';

const categoryOptions = [
  { value: 'supplies', label: 'خامات ومشتريات (Supplies)' },
  { value: 'salaries', label: 'مرتبات وعمالة (Salaries)' },
  { value: 'rent', label: 'إيجار المكان (Rent)' },
  { value: 'utilities', label: 'كهرباء ومرافق (Utilities)' },
  { value: 'maintenance', label: 'صيانة ومعدات (Maintenance)' },
  { value: 'other', label: 'مصاريف نثرية (Other)' },
];

const filterCategoryOptions = [
  { value: 'all', label: 'جميع التصنيفات' },
  { value: 'supplies', label: 'خامات ومشتريات' },
  { value: 'salaries', label: 'مرتبات وعمالة' },
  { value: 'rent', label: 'إيجار المكان' },
  { value: 'utilities', label: 'كهرباء ومرافق' },
  { value: 'maintenance', label: 'صيانة ومعدات' },
  { value: 'other', label: 'مصاريف نثرية' },
];

const filterTypeOptions = [
  { value: 'month', label: '📅 تصفية حسب الشهر' },
  { value: 'day', label: '📆 تصفية بيوم محدد' },
  { value: 'custom', label: '⏳ فترة مخصصة' },
  { value: 'all', label: '🌐 كل الأوقات' },
];

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const val = `${yr}-${mo}`;
    const label = `${monthNames[d.getMonth()]} ${yr}`;
    options.push({ value: val, label });
  }
  return options;
};

const categoryNames: Record<string, { label: string; icon: any; color: string }> = {
  supplies: { label: 'خامات ومشتريات', icon: Package, color: 'bg-blue-50 text-blue-800 border-blue-200' },
  salaries: { label: 'مرتبات وعمالة', icon: Users, color: 'bg-purple-50 text-purple-800 border-purple-200' },
  rent: { label: 'إيجار المكان', icon: Home, color: 'bg-amber-50 text-amber-800 border-amber-200' },
  utilities: { label: 'كهرباء ومرافق', icon: Zap, color: 'bg-amber-50 text-amber-800 border-amber-200' },
  maintenance: { label: 'صيانة ومعدات', icon: Wrench, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  other: { label: 'مصاريف نثرية', icon: MoreHorizontal, color: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
};

export default function ExpensesTab() {
  const queryClient = useQueryClient();
  
  // Expense Entry Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('supplies');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Dynamic Filters State
  const [filterType, setFilterType] = useState<'month' | 'day' | 'custom' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  });
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const monthOptions = generateMonthOptions();

  // Fetch Expenses & Aggregated Summary
  const { data: expensesData, isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses', filterType, selectedMonth, singleDate, startDate, endDate, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      if (filterType === 'month' && selectedMonth) {
        params.append('month', selectedMonth);
      } else if (filterType === 'day' && singleDate) {
        params.append('startDate', singleDate);
        params.append('endDate', singleDate);
      } else if (filterType === 'custom') {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      const res = await api.get('/expenses?' + params.toString());
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
      toast.success('تم تسجيل المصروف بنجاح.');
      setTitle('');
      setAmount('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تسجيل المصروف.');
    },
  });

  // Delete Expense Mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete('/expenses/' + id);
      return res.data;
    },
    onSuccess: () => {
      toast.success('تم حذف المصروف.');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حذف المصروف.');
    },
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    addExpenseMutation.mutate({
      title,
      amount: Number(amount),
      category,
      notes,
      date,
    });
  };

  const handleExportExcel = async () => {
    try {
      toast.loading('جاري تحميل شيت الإكسيل...');
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (filterType === 'month' && selectedMonth) {
        params.append('month', selectedMonth);
      } else if (filterType === 'day' && singleDate) {
        params.append('startDate', singleDate);
        params.append('endDate', singleDate);
      } else if (filterType === 'custom') {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      const response = await api.get('/expenses/export-excel?' + params.toString(), { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'تقرير_المصروفات_' + new Date().toISOString().split('T')[0] + '.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.dismiss();
      toast.success('تم تحميل شيت الإكسيل بنجاح.');
    } catch (err) {
      toast.dismiss();
      toast.error('فشل تصدير ملف الإكسيل.');
    }
  };

  const totalSales = expensesData?.summary?.totalSales ?? expensesData?.totalSales ?? 0;
  const totalExpenses = expensesData?.summary?.totalExpenses ?? expensesData?.totalExpenses ?? 0;
  const netProfit = expensesData?.summary?.netProfit ?? expensesData?.netProfit ?? 0;

  return (
    <div className="space-y-6 dir-rtl">
      
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Sales */}
        <div className="bg-white border border-emerald-200/80 rounded-3xl p-5 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-600">
            <span>إجمالي مبيعات الفترة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-950">
            {totalSales.toLocaleString('en-US')} <span className="text-xs font-sans font-bold text-emerald-700">ج.م</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            إجمالي المبيعات الفعلية للفترة المحددة
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-red-200/80 rounded-3xl p-5 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-600">
            <span>إجمالي التكاليف والمصروفات</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-red-950">
            {totalExpenses.toLocaleString('en-US')} <span className="text-xs font-sans font-bold text-red-700">ج.م</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            مجموع تكاليف التشغيل والخامات والمشتريات
          </div>
        </div>

        {/* Net Profit - Luxury Tawla Brand Burgundy Gradient Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#801B2C] via-[#962436] to-[#5C1320] text-white p-5 rounded-3xl border border-[#801B2C]/30 shadow-lg shadow-[#801B2C]/20 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-bold text-amber-200 tracking-wide bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              صافي الأرباح الفعلي (Net Profit)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <DollarSign className="w-4 h-4 text-amber-300" />
            </div>
          </div>
          <div className="z-10 text-2xl font-mono font-black text-white">
            {netProfit.toLocaleString('en-US')} <span className="text-xs font-sans font-bold text-amber-200">ج.م</span>
          </div>
          <div className="z-10 text-[11px] text-zinc-200/80 font-medium">
            {netProfit >= 0 ? 'ربح صافي للفترة بعد خصم كافة التكاليف' : 'عجز / خسارة صافية للفترة المحددة'}
          </div>
        </div>

      </div>

      {/* Dynamic Filters Control Bar */}
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#801B2C]" />
            <span className="text-xs font-black text-zinc-900">فلترة البيانات وحسابات الفترة:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Mode Selector */}
            <div className="w-48">
              <CustomSelect
                value={filterType}
                onChange={(val) => setFilterType(val as any)}
                options={filterTypeOptions}
              />
            </div>

            {/* Month Selector */}
            {filterType === 'month' && (
              <div className="w-44">
                <CustomSelect
                  value={selectedMonth}
                  onChange={(val) => setSelectedMonth(val)}
                  options={monthOptions}
                />
              </div>
            )}

            {/* Specific Day Selector */}
            {filterType === 'day' && (
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-zinc-800 outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Custom Date Range Selector */}
            {filterType === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 outline-none"
                  placeholder="من تاريخ"
                />
                <span className="text-xs text-zinc-400 font-bold">إلى</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 outline-none"
                  placeholder="إلى تاريخ"
                />
              </div>
            )}

            {/* Category Filter */}
            <div className="w-44">
              <CustomSelect
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                options={filterCategoryOptions}
              />
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير إكسيل</span>
            </button>

          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Expense Entry Form */}
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs space-y-4 h-fit">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Plus className="w-5 h-5 text-[#801B2C]" />
            <h2 className="text-sm font-black text-zinc-900">تسجيل مصروف جديد</h2>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">بيان/عنوان المصروف *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: شراء خضروات، فواتير كهرباء..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#801B2C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">التصنيف *</label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val)}
                options={categoryOptions}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">المبلغ (ج.م) *</label>
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

        {/* Expenses List */}
        <div className="lg:col-span-2 bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-black text-zinc-900">سجل المصروفات والتكاليف المسجلة</h2>
            <span className="text-xs font-bold text-zinc-500">
              العدد: <span className="font-mono text-zinc-900">{expensesData?.expenses?.length || 0}</span>
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[460px] scrollbar-thin scrollbar-thumb-zinc-200">
            {isExpensesLoading ? (
              <div className="text-center py-10 text-xs text-zinc-400 font-bold">جاري تحميل المصروفات...</div>
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
                          <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border ' + catInfo.color}>
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
