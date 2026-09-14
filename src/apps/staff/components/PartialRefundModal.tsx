import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, X, Check, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import { printReceiptIframe } from './ReceiptPrintTemplate';
import { staffAudio } from '../services/staffAudio';
import CustomSelect from '../../admin/components/CustomSelect';

export interface PartialRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  restaurant: any;
}

const reasonOptions = [
  { value: 'staff_error', label: 'خطأ ويتر في الطلب' },
  { value: 'quality_issue', label: 'جودة الطعام / ملاحظة عميل' },
  { value: 'customer_cancel', label: 'إلغاء زبون بعد التحضير' },
  { value: 'waste', label: 'تالف / هالك (Mishap)' },
  { value: 'other', label: 'سبب آخر' },
];

export default function PartialRefundModal({
  isOpen,
  onClose,
  order,
  restaurant,
}: PartialRefundModalProps) {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Record<number, { selected: boolean; qty: number; reason: string }>>({});

  if (!isOpen || !order) return null;

  const items = order.items || [];

  const handleToggleItem = (index: number) => {
    staffAudio.play('click');
    setSelectedItems(prev => {
      const current = prev[index] || { selected: false, qty: 1, reason: 'staff_error' };
      return {
        ...prev,
        [index]: { ...current, selected: !current.selected }
      };
    });
  };

  const handleQtyChange = (index: number, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(maxQty, qty));
    setSelectedItems(prev => {
      const current = prev[index] || { selected: true, qty: 1, reason: 'staff_error' };
      return {
        ...prev,
        [index]: { ...current, qty: validQty, selected: true }
      };
    });
  };

  const handleReasonChange = (index: number, reason: string) => {
    setSelectedItems(prev => {
      const current = prev[index] || { selected: true, qty: 1, reason: 'staff_error' };
      return {
        ...prev,
        [index]: { ...current, reason }
      };
    });
  };

  // Calculate live total refund
  let totalRefundAmount = 0;
  const itemsToRefundPayload: any[] = [];

  Object.entries(selectedItems).forEach(([idxStr, state]) => {
    const idx = Number(idxStr);
    const item = items[idx];
    if (state.selected && item) {
      const qty = Math.min(item.quantity, Math.max(1, state.qty));
      const refundAmt = (item.price || 0) * qty;
      totalRefundAmount += refundAmt;
      itemsToRefundPayload.push({
        name: item.name,
        quantity: qty,
        refundAmount: refundAmt,
        reason: reasonOptions.find(r => r.value === state.reason)?.label || 'إرجاع صنف'
      });
    }
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/orders/' + order._id + '/refund', {
        itemsToRefund: itemsToRefundPayload,
      });
      return res.data;
    },
    onSuccess: () => {
      staffAudio.play('action');
      toast.success('تم إرجاع الأصناف وخصم المبلغ بنجاح.');

      // Print Refund Ticket
      const refundTicket = {
        id: 'REFUND-' + (order.id || order._id).slice(-6),
        tableNumber: order.tableNumber || 0,
        type: 'refund_receipt',
        customerName: 'إيصال مرتجع - ' + (order.customerName || 'عميل'),
        createdAt: new Date().toISOString(),
        items: itemsToRefundPayload,
        totalAmount: totalRefundAmount,
        originalOrderId: order.id || order._id,
      };

      printReceiptIframe(refundTicket, restaurant);

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل إرجاع الأصناف.');
    },
  });

  const handleSubmitRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsToRefundPayload.length === 0) {
      toast.error('يرجى تحديد صنف واحد على الأقل لإرجاعه.');
      return;
    }
    refundMutation.mutate();
  };

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
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-red-50/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900">إرجاع أصناف من الطلب #{order.id?.slice(-6) || order._id?.slice(-6)}</h2>
                <p className="text-xs text-zinc-500 font-medium">تحديد الأصناف وسبب المرتجع لخصمه من الحساب</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-200/60 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmitRefund} className="p-6 space-y-4 overflow-y-auto">
            
            <div className="text-xs font-bold text-zinc-800">اختر الأصناف المراد إرجاعها:</div>

            {/* Items Selection List */}
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {items.map((item: any, idx: number) => {
                const itemState = selectedItems[idx] || { selected: false, qty: 1, reason: 'staff_error' };
                const isSelected = itemState.selected;

                return (
                  <div
                    key={idx}
                    className={'p-3.5 rounded-2xl border transition-all space-y-2.5 ' + (
                      isSelected ? 'bg-red-50/30 border-red-200 shadow-sm' : 'bg-zinc-50/60 border-zinc-200/80 hover:bg-zinc-100/60'
                    )}
                  >
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => handleToggleItem(idx)}>
                      <div className="flex items-center gap-2.5">
                        <div className={'w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ' + (
                          isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-300 bg-white'
                        )}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900">{item.name}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            السعر: {item.price} ج.م | المتاح: {item.quantity}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-mono font-black text-red-950">
                        {isSelected ? ((item.price || 0) * itemState.qty) + ' ج.م' : ''}
                      </div>
                    </div>

                    {/* Quantity & Reason Controls when Selected */}
                    {isSelected && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-red-100/80">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">كمية المرتجع:</label>
                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={itemState.qty}
                            onChange={(e) => handleQtyChange(idx, Number(e.target.value), item.quantity)}
                            className="w-full bg-white border border-red-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-900 text-left dir-ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">سبب الإرجاع:</label>
                          <CustomSelect
                            value={itemState.reason}
                            onChange={(val) => handleReasonChange(idx, val)}
                            options={reasonOptions}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Refund Banner */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs font-bold">
              <span className="text-red-900">إجمالي المبلغ المسترد للزبون:</span>
              <span className="text-base font-mono font-black text-red-950">
                {totalRefundAmount.toLocaleString('en-US')} ج.م
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={refundMutation.isPending || itemsToRefundPayload.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{refundMutation.isPending ? 'جاري الإرجاع...' : 'تأكيد إرجاع الأصناف واسترداد المبلغ'}</span>
            </motion.button>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>يتم طباعة إيصال مرتجع حراري تلقائياً</span>
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
