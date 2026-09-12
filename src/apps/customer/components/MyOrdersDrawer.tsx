import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Receipt, Clock, CheckCircle2, ShoppingBag, 
  ChefHat, Package, Truck, Bell, Plus, AlertCircle 
} from 'lucide-react';
import type { Order } from '../../../shared/types';

interface MyOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  totalAccumulated: number;
  tableNumber?: string | number;
  onRequestBill?: () => void;
  onCallWaiter?: () => void;
  isReadOnly?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending: {
    label: 'قيد الانتظار',
    icon: Clock,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200/80',
  },
  accepted: {
    label: 'تم القبول',
    icon: Package,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200/80',
  },
  preparing: {
    label: 'جاري التحضير',
    icon: ChefHat,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200/80',
  },
  ready: {
    label: 'جاهز للاستلام',
    icon: Truck,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200/80',
  },
  delivered: {
    label: 'تم التسليم ✓',
    icon: CheckCircle2,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
  },
  cancelled: {
    label: 'ملغي',
    icon: AlertCircle,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200/80',
  },
};

export default function MyOrdersDrawer({
  isOpen,
  onClose,
  orders = [],
  totalAccumulated = 0,
  tableNumber,
  onRequestBill,
  onCallWaiter,
  isReadOnly = false,
}: MyOrdersDrawerProps) {
  if (!isOpen) return null;

  const formatOrderTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        />

        {/* Drawer Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-[430px] bg-white border-t border-zinc-200/80 rounded-t-[32px] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-zinc-900 font-body"
        >
          {/* Top Grab Handle */}
          <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />

          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center flex-shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#801B2C]/10 border border-[#801B2C]/20 flex items-center justify-center text-[#801B2C]">
                <Receipt className="w-5 h-5 text-[#801B2C]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-zinc-900 font-cairo">طلباتي</h3>
                  {tableNumber ? (
                    <span className="text-[10px] bg-[#801B2C]/10 border border-[#801B2C]/20 text-[#801B2C] px-2.5 py-0.5 rounded-full font-bold">
                      طاولة {tableNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full font-bold">
                      طلب خارجي
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 font-medium">سجل جميع طلباتك في هذه الجلسة</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200/70 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cumulative Total Bar */}
          <div className="px-6 py-3.5 bg-gradient-to-l from-[#801B2C]/10 via-[#801B2C]/5 to-zinc-50 border-b border-[#801B2C]/10 flex justify-between items-center flex-shrink-0">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-500 tracking-wider block font-body">إجمالي الحساب التراكمي</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black font-mono text-[#801B2C] leading-none">
                  {totalAccumulated}
                </span>
                <span className="text-xs font-bold text-[#801B2C]">ج.م</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-1 rounded-xl shadow-xs">
                {orders.length} {orders.length === 1 ? 'طلب' : 'طلبات'}
              </span>
            </div>
          </div>

          {/* Orders Scroll Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-zinc-50/40 scrollbar-thin scrollbar-thumb-zinc-200">
            {orders.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-zinc-100 border border-zinc-200/80 mx-auto flex items-center justify-center text-zinc-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-black text-zinc-800">لا توجد طلبات مسجلة بعد</h4>
                <p className="text-xs text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
                  اختر ما يروق لك من قائمة المنيو واطلب الآن للبدء في التحضير فوراً!
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#801B2C] hover:bg-[#801B2C]/15 bg-[#801B2C]/10 border border-[#801B2C]/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تصفح المنيو الآن</span>
                </button>
              </div>
            ) : (
              orders.map((order, idx) => {
                const statusMeta = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusMeta.icon;

                return (
                  <motion.div
                    key={order.id || idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-3 hover:border-[#801B2C]/30 transition-all shadow-xs"
                  >
                    {/* Order Item Header */}
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-lg">
                          #{order.id.slice(-4).toUpperCase()}
                        </span>
                        {order.createdAt && (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>{formatOrderTime(order.createdAt)}</span>
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusMeta.label}</span>
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {order.items?.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex justify-between items-start text-xs">
                          <div className="space-y-0.5 max-w-[72%]">
                            <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                              <span className="font-mono text-[#801B2C] bg-[#801B2C]/10 px-1.5 py-0.5 rounded text-[11px] font-black">
                                {item.quantity}×
                              </span>
                              <span className="line-clamp-1">{item.name}</span>
                            </div>
                            {/* Selected Options / Modifiers */}
                            {((item.selectedOptions && item.selectedOptions.length > 0) || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                              <p className="text-[10px] text-zinc-500 line-clamp-1 pr-6">
                                {[
                                  ...(item.selectedOptions?.map(o => o.value) || []),
                                  ...(item.selectedModifiers?.map(m => m.value) || [])
                                ].join(' • ')}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block mt-0.5">
                                ملاحظة: {item.notes}
                              </p>
                            )}
                          </div>

                          <span className="font-mono font-bold text-zinc-900 text-xs">
                            {(item.price * item.quantity).toFixed(0)} ج.م
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order Subtotal */}
                    <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-[11px] text-zinc-500 font-medium">
                      <span>إجمالي هذا الطلب:</span>
                      <span className="font-mono font-black text-[#801B2C] text-xs">
                        {order.totalAmount} ج.م
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Bottom Actions Footer */}
          {tableNumber && orders.length > 0 && (
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex gap-2.5 flex-shrink-0">
              {onRequestBill && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestBill();
                  }}
                  disabled={isReadOnly}
                  className={`flex-1 py-3.5 px-3 bg-[#801B2C] hover:bg-[#962436] text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md shadow-[#801B2C]/20 cursor-pointer ${
                    isReadOnly ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>طلب الحساب ({totalAccumulated} ج.م)</span>
                </button>
              )}

              {onCallWaiter && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCallWaiter();
                  }}
                  disabled={isReadOnly}
                  className={`py-3.5 px-4 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer shadow-xs ${
                    isReadOnly ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <Bell className="w-4 h-4 text-[#801B2C]" />
                  <span>ويتر</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="py-3.5 px-4 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 font-bold rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer shadow-xs"
              >
                <span>إغلاق</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
