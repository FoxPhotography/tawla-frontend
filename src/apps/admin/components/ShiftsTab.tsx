import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Clock, Search, Printer, UserCheck, RefreshCw, AlertCircle, CheckCircle2, TrendingDown, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../../shared/store/authStore';
import { printReceiptIframe } from '../../staff/components/ReceiptPrintTemplate';

export default function ShiftsTab() {
  const { restaurant } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: shiftsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-shifts-history'],
    queryFn: async () => {
      const res = await api.get('/shifts/history');
      return res.data.data || [];
    },
  });

  const shifts = shiftsData || [];

  const filteredShifts = shifts.filter((s: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (s.cashierName || '').toLowerCase().includes(q);
  });

  // Calculate aggregated stats
  const totalShiftsCount = shifts.length;
  const totalHandedToManager = shifts.reduce((sum: number, s: any) => sum + (s.cashHandedToManager || 0), 0);
  const totalNetVariance = shifts.reduce((sum: number, s: any) => sum + (s.variance || 0), 0);

  const handlePrintZReport = (shift: any) => {
    const zReportOrder = {
      id: 'Z-REPORT-' + (shift.cashierName || 'STAFF'),
      tableNumber: 0,
      type: 'z_report',
      customerName: `تقفيل شيفت - ${shift.cashierName || 'الستاف'}`,
      createdAt: shift.endTime || shift.createdAt || new Date().toISOString(),
      shiftDetails: shift,
      items: [],
      totalAmount: (shift.totalCashSales || 0) + (shift.totalCardSales || 0) + (shift.totalWalletSales || 0)
    };

    printReceiptIframe(zReportOrder, restaurant);
    toast.success(`جاري إعادة طباعة تقرير Z-Report لشيفت ${shift.cashierName}...`);
  };

  return (
    <div className="space-y-6 dir-rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#801B2C]/10 border border-[#801B2C]/20 flex items-center justify-center text-[#801B2C]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-900">سجل الورديات وعهد الكاشير (Shift History)</h1>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              مراجعة الورديات السابقة، عهد الدرج، المبالغ المسلمة للمدير، وطباعة تقارير Z-Report
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Shifts */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>إجمالي الورديات المسجلة</span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-zinc-900 font-mono">
            {totalShiftsCount} <span className="text-xs font-normal text-zinc-500 font-sans">شيفت</span>
          </div>
        </div>

        {/* Total Handed to Manager */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 bg-amber-50/30 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>المبالغ المسلّمة للمدير</span>
            <UserCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {totalHandedToManager.toLocaleString('en-US')} <span className="text-xs font-normal text-amber-800 font-sans">ج.م</span>
          </div>
        </div>

        {/* Total Net Variance */}
        <div className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
          totalNetVariance >= 0 
            ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950' 
            : 'bg-red-50/40 border-red-200 text-red-950'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span>صافي مطابقة الخزينة (العجز/الزيادة)</span>
            {totalNetVariance >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
          </div>
          <div className="text-2xl font-black font-mono">
            {totalNetVariance >= 0 ? `+${totalNetVariance.toLocaleString('en-US')}` : totalNetVariance.toLocaleString('en-US')} <span className="text-xs font-normal font-sans">ج.م</span>
          </div>
        </div>

      </div>

      {/* Controls & Search */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم الكاشير..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/20 rounded-xl pr-10 pl-4 py-2.5 text-xs text-zinc-900 outline-none transition-all placeholder:text-zinc-400"
          />
        </div>
        <div className="text-xs text-zinc-500 font-bold">
          عدد الورديات المعروضة: <span className="text-zinc-900 font-mono">{filteredShifts.length}</span>
        </div>
      </div>

      {/* Shifts History Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-zinc-400 font-bold">جاري تحميل سجل الورديات...</div>
        ) : filteredShifts.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 font-bold">لا يوجد ورديات مسجلة حتى الآن.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200/80 text-zinc-600 font-bold">
                <tr>
                  <th className="p-4">الكاشير</th>
                  <th className="p-4">فترة الشيفت</th>
                  <th className="p-4">عهدة البداية</th>
                  <th className="p-4">مبيعات الكاش</th>
                  <th className="p-4">فيزا / محافظ</th>
                  <th className="p-4">إجمالي كاش الدرج</th>
                  <th className="p-4">مسلم للمدير</th>
                  <th className="p-4">عهدة متبقية</th>
                  <th className="p-4">المطابقة</th>
                  <th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                {filteredShifts.map((shift: any) => {
                  const sTime = shift.startTime ? new Date(shift.startTime).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '---';
                  const eTime = shift.endTime ? new Date(shift.endTime).toLocaleTimeString('ar-EG', { hour12: true }) : 'نشط الآن';
                  const isClosed = shift.status === 'closed';
                  const variance = shift.variance || 0;
                  const digitalSales = (shift.totalCardSales || 0) + (shift.totalWalletSales || 0);

                  return (
                    <tr key={shift._id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="p-4 font-bold text-zinc-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-[11px]">
                            {shift.cashierName?.[0] || 'C'}
                          </div>
                          <span>{shift.cashierName || 'الكاشير'}</span>
                        </div>
                      </td>

                      <td className="p-4 text-zinc-500 whitespace-nowrap">
                        <div className="text-[11px] font-mono">{sTime}</div>
                        <div className="text-[10px] text-zinc-400 font-sans">إغلاق: {eTime}</div>
                      </td>

                      <td className="p-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {(shift.startingCash || 0).toLocaleString('en-US')} ج.م
                      </td>

                      <td className="p-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                        {(shift.totalCashSales || 0).toLocaleString('en-US')} ج.م
                      </td>

                      <td className="p-4 font-mono text-zinc-600 whitespace-nowrap">
                        {digitalSales.toLocaleString('en-US')} ج.م
                      </td>

                      <td className="p-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                        {isClosed ? `${(shift.actualEndingCash || 0).toLocaleString('en-US')} ج.م` : 'قيد التشغيل'}
                      </td>

                      <td className="p-4 font-mono font-bold text-amber-800 whitespace-nowrap">
                        {(shift.cashHandedToManager || 0).toLocaleString('en-US')} ج.م
                      </td>

                      <td className="p-4 font-mono font-bold text-purple-900 whitespace-nowrap">
                        {(shift.carriedOverCash !== undefined ? shift.carriedOverCash : ((shift.actualEndingCash || 0) - (shift.cashHandedToManager || 0))).toLocaleString('en-US')} ج.م
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {!isClosed ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            شيفت مفتوح
                          </span>
                        ) : variance === 0 ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>مطابق (0)</span>
                          </span>
                        ) : variance > 0 ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full w-fit font-mono">
                            زيادة (+${variance} ج)
                          </span>
                        ) : (
                          <span className="bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit font-mono">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            <span>عجز (${variance} ج)</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        {isClosed && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handlePrintZReport(shift)}
                            className="inline-flex items-center gap-1.5 bg-[#801B2C]/10 hover:bg-[#801B2C] text-[#801B2C] hover:text-white font-bold text-[11px] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة Z-Report</span>
                          </motion.button>
                        )}
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
  );
}
