import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, X, DollarSign, CreditCard, Wallet, Printer, Lock, ArrowDownRight, RefreshCw, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import { printReceiptIframe } from './ReceiptPrintTemplate';
import { staffAudio } from '../services/staffAudio';

export interface ShiftManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: any;
}

export default function ShiftManagementModal({
  isOpen,
  onClose,
  restaurant,
}: ShiftManagementModalProps) {
  const queryClient = useQueryClient();
  const [actualEndingCash, setActualEndingCash] = useState<string>('');
  const [cashHandedToManager, setCashHandedToManager] = useState<string>('0');
  const [shiftNotes, setShiftNotes] = useState<string>('');

  // Fetch Current Shift Data
  const { data: shiftData } = useQuery({
    queryKey: ['current-shift'],
    queryFn: async () => {
      const res = await api.get('/shifts/current');
      return res.data.data;
    },
    enabled: isOpen,
  });

  const currentShift = shiftData?.shift;
  const liveStats = shiftData?.liveStats || {
    totalOrdersCount: 0,
    totalCashSales: 0,
    totalCardSales: 0,
    totalWalletSales: 0,
    expectedEndingCash: 0,
    totalSales: 0,
  };

  // Pre-fill expected cash when modal opens or stats change
  useEffect(() => {
    if (liveStats.expectedEndingCash !== undefined && actualEndingCash === '') {
      setActualEndingCash(String(liveStats.expectedEndingCash));
    }
  }, [liveStats.expectedEndingCash]);

  // Close Shift Mutation
  const closeShiftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/shifts/close', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      staffAudio.play('success');
      toast.success('تم تقفيل الشيفت وتسليم العهدة بنجاح.');

      // Print Z-Report
      const closedShift = data.data;
      if (closedShift) {
        const zReportOrder = {
          id: 'Z-REPORT-' + closedShift.cashierName,
          tableNumber: 0,
          type: 'z_report',
          customerName: `تقفيل شيفت - ${closedShift.cashierName}`,
          createdAt: closedShift.endTime || new Date().toISOString(),
          shiftDetails: closedShift,
          items: [],
          totalAmount: closedShift.totalCashSales + closedShift.totalCardSales + closedShift.totalWalletSales
        };
        printReceiptIframe(zReportOrder, restaurant);
      }

      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تقفيل الشيفت.');
    },
  });

  if (!isOpen) return null;

  const actualNum = Number(actualEndingCash) || 0;
  const handedNum = Math.min(actualNum, Math.max(0, Number(cashHandedToManager) || 0));
  const carriedOverNum = Math.max(0, actualNum - handedNum);

  const handleHandoverAllToManager = () => {
    staffAudio.play('click');
    setCashHandedToManager(String(actualNum));
    toast.success('تم تحديد تسليم كامل المبلغ للمدير (تفريغ الدرج).');
  };

  const handleKeepAllInDrawer = () => {
    staffAudio.play('click');
    setCashHandedToManager('0');
    toast('تم تحديد ترك المبلغ بالكامل بالدرج للشيفت القادم.', { icon: '🔄' });
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (actualEndingCash === '' || Number(actualEndingCash) < 0) {
      toast.error('يرجى إدخال المبلغ الفعلي للنقدية بالدرج.');
      return;
    }
    closeShiftMutation.mutate({
      actualEndingCash: actualNum,
      cashHandedToManager: handedNum,
      carriedOverCash: carriedOverNum,
      notes: shiftNotes,
    });
  };

  const variance = actualNum - liveStats.expectedEndingCash;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 via-white to-zinc-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#801B2C]/10 border border-[#801B2C]/20 flex items-center justify-center text-[#801B2C]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  إدارة وتقفيل الشيفت وتسليم العهدة
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Z-Report
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 font-medium">
                  الكاشير: <strong className="text-zinc-800">{currentShift?.cashierName || 'الستاف'}</strong> | عهدة البداية: <strong className="text-emerald-700">{currentShift?.startingCash || 0} ج.م</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            
            {/* Live Payment Method Breakdown Grid */}
            <div className="grid grid-cols-3 gap-3">
              
              {/* Cash Sales */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
                  <span>نقدي (Cash)</span>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-lg font-mono font-black text-emerald-950">
                  {liveStats.totalCashSales.toLocaleString('en-US')} <span className="text-[10px] font-sans">ج.م</span>
                </div>
              </div>

              {/* Card Sales */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-blue-800 text-xs font-bold">
                  <span>فيزا (Card)</span>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-lg font-mono font-black text-blue-950">
                  {liveStats.totalCardSales.toLocaleString('en-US')} <span className="text-[10px] font-sans">ج.م</span>
                </div>
              </div>

              {/* Mobile Wallet Sales */}
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-purple-800 text-xs font-bold">
                  <span>محافظ (Wallet)</span>
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="text-lg font-mono font-black text-purple-950">
                  {liveStats.totalWalletSales.toLocaleString('en-US')} <span className="text-[10px] font-sans">ج.م</span>
                </div>
              </div>

            </div>

            {/* Expected Cash Summary Banner */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-center justify-between text-xs font-bold">
              <div className="space-y-0.5">
                <div className="text-zinc-500">النقدية المتوقعة بالدرج (Expected Cash):</div>
                <div className="text-zinc-900 font-normal">عهدة بداية الشيفت ({currentShift?.startingCash || 0} ج) + مبيعات الكاش ({liveStats.totalCashSales} ج)</div>
              </div>
              <div className="text-lg font-mono font-black text-[#801B2C]">
                {liveStats.expectedEndingCash.toLocaleString('en-US')} ج.م
              </div>
            </div>

            {/* Shift Closure Form */}
            <form onSubmit={handleCloseShift} className="space-y-4 border-t border-zinc-100 pt-4">
              
              {/* Step 1: Actual Cash Entry */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  المبلغ الفعلي الموجود بالدرج الآن (ج.م) *
                </label>
                <input
                  type="number"
                  value={actualEndingCash}
                  onChange={(e) => setActualEndingCash(e.target.value)}
                  placeholder="أدخل المبلغ النقدي المتبقي بعد عد النقدية..."
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-sm font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C]"
                  required
                />
              </div>

              {/* Step 2: Cash Handover Options (Manager vs Carried Over) */}
              <div className="border border-purple-100 bg-purple-50/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-purple-700" />
                    <span>توزيع نقدية الدرج (تسليم للمدير / عهدة متبقية للشيفت القادم):</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleHandoverAllToManager}
                    className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>تسليم المبلغ بالكامل للمدير 👔 (تفريغ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleKeepAllInDrawer}
                    className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ترك المبلغ بالدرج للشيفت القادم 🔄</span>
                  </button>
                </div>

                {/* Handover & Carried Over Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                      تم تسليمه للمدير (ج.م):
                    </label>
                    <input
                      type="number"
                      value={cashHandedToManager}
                      onChange={(e) => setCashHandedToManager(e.target.value)}
                      min="0"
                      max={actualNum}
                      className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-purple-950 focus:outline-none focus:border-purple-600 text-left dir-ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                      عهدة متبقية بالدرج للشيفت القادم:
                    </label>
                    <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-950 text-left dir-ltr">
                      {carriedOverNum.toLocaleString('en-US')} ج.م
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Variance Calculation Banner */}
              {actualEndingCash !== '' && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
                  variance === 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : variance > 0
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  <span>نتيجة المطابقة:</span>
                  <span className="font-mono font-black text-sm">
                    {variance === 0 ? 'مطابق تماماً (لا يوجد عجز)' : variance > 0 ? `زيادة بالنقدية: +${variance} ج.م` : `عجز بالنقدية: ${variance} ج.م`}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">ملاحظات الشيفت (اختياري)</label>
                <textarea
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  rows={2}
                  placeholder="أضف أي ملاحظات أو تفاصيل تسليم العهدة..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#801B2C]"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={closeShiftMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-[#801B2C] hover:bg-[#962436] text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-[#801B2C]/20 transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{closeShiftMutation.isPending ? 'جاري التقفيل...' : 'تقفيل الشيفت وإصدار تقرير Z-Report وطباعته'}</span>
              </motion.button>
            </form>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>يتم طباعة تقرير Z-Report تلقائياً عند التقفيل</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
