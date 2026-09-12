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
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
  },
  accepted: {
    label: 'تم القبول',
    icon: Package,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
  },
  preparing: {
    label: 'جاري التحضير',
    icon: ChefHat,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
  },
  ready: {
    label: 'جاهز للاستلام',
    icon: Truck,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/25',
  },
  delivered: {
    label: 'تم التسليم ✓',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  cancelled: {
    label: 'ملغي',
    icon: AlertCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/25',
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
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Drawer Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-[430px] bg-[#0F0F12] border-t border-white/10 rounded-t-[28px] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-white font-body"
        >
          {/* Top Grab Handle */}
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />

          {/* Header */}
          <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center flex-shrink-0 bg-[#16161B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#801B2C]/20 border border-[#801B2C]/40 flex items-center justify-center text-[#B8973E]">
                <Receipt className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white font-cairo">طلباتي</h3>
                  {tableNumber ? (
                    <span className="text-[10px] bg-[#801B2C]/40 border border-[#801B2C]/60 text-rose-200 px-2 py-0.5 rounded-full font-bold">
                      طاولة {tableNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full font-bold">
                      طلب خارجي
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 font-medium">سجل جميع طلباتك في هذه الجلسة</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cumulative Total Bar */}
          <div className="px-5 py-3 bg-gradient-to-r from-[#801B2C]/25 via-rose-950/20 to-transparent border-b border-white/5 flex justify-between items-center flex-shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">إجمالي الحساب التراكمي</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black font-mono text-white leading-none">
                  {totalAccumulated}
                </span>
                <span className="text-xs font-bold text-rose-400">ج.م</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold bg-white/10 border border-white/15 text-zinc-200 px-2.5 py-1 rounded-xl">
                {orders.length} {orders.length === 1 ? 'طلب' : 'طلبات'}
              </span>
            </div>
          </div>

          {/* Orders Scroll Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
            {orders.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-zinc-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-zinc-300">لا توجد طلبات مسجلة بعد</h4>
                <p className="text-xs text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
                  اختر ما يروق لك من قائمة المنيو واطلب الآن للبدء في التحضير!
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
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
                    className="bg-[#18181F] border border-white/10 rounded-2xl p-4 space-y-3 hover:border-white/20 transition-all shadow-sm"
                  >
                    {/* Order Item Header */}
                    <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                          #{order.id.slice(-4).toUpperCase()}
                        </span>
                        {order.createdAt && (
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-600" />
                            <span>{formatOrderTime(order.createdAt)}</span>
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusMeta.label}</span>
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {order.items?.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex justify-between items-start text-xs">
                          <div className="space-y-0.5 max-w-[70%]">
                            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                              <span className="font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded text-[11px]">
                                {item.quantity}×
                              </span>
                              <span className="line-clamp-1">{item.name}</span>
                            </div>
                            {/* Selected Options / Modifiers */}
                            {((item.selectedOptions && item.selectedOptions.length > 0) || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                              <p className="text-[10px] text-zinc-400 line-clamp-1 pr-6">
                                {[
                                  ...(item.selectedOptions?.map(o => o.value) || []),
                                  ...(item.selectedModifiers?.map(m => m.value) || [])
                                ].join(' • ')}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-[10px] text-amber-400/80 pr-6">ملاحظة: {item.notes}</p>
                            )}
                          </div>

                          <span className="font-mono font-bold text-zinc-300">
                            {(item.price * item.quantity).toFixed(0)} ج.م
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order Subtotal */}
                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[11px] text-zinc-400 font-medium">
                      <span>إجمالي هذا الطلب:</span>
                      <span className="font-mono font-black text-rose-300 text-xs">
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
            <div className="p-4 bg-[#141418] border-t border-white/10 flex gap-2.5 flex-shrink-0">
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
                  className={`py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer ${
                    isReadOnly ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>ويتر</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer"
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
