import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
  LayoutGrid, Printer, XCircle, CloudOff, Play, Check, CheckCheck, AlertCircle,
  Bike, User, Phone, MapPin, FileText
} from 'lucide-react';
import type { Order } from '../../../shared/types';

interface OrdersTabProps {
  orders: Order[];
  orderFilter: 'active' | 'archived';
  onSetOrderFilter: (filter: 'active' | 'archived') => void;
  onPrintReceipt: (order: any) => void;
  onUpdateStatus: (orderId: string, nextStatus: string) => void;
  isStatusPending: boolean;
  onUpdateOrder: (orderId: string, items: any[], status?: string) => Promise<void>;
  isUpdatePending: boolean;
}

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 }
  }
};

const getStatusBadgeClass = (status: Order['status']) => {
  switch (status) {
    case 'pending': return 'bg-staff-accent-soft text-staff-accent border-staff-accent-glow';
    case 'accepted': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15';
    case 'preparing': return 'bg-amber-500/10 text-amber-400 border-amber-500/15';
    case 'ready': return 'bg-blue-500/10 text-blue-400 border-blue-500/15';
    case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15';
    case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/15';
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/15';
  }
};

const getStatusText = (status: Order['status']) => {
  switch (status) {
    case 'pending': return 'طلب معلق';
    case 'accepted': return 'مقبول';
    case 'preparing': return 'جاري التحضير';
    case 'ready': return 'جاهز للتسليم';
    case 'delivered': return 'مكتمل';
    case 'cancelled': return 'ملغي / مرتجع';
    default: return status;
  }
};

const getNextAction = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return { 
        label: 'قبول الطلب', 
        next: 'accepted', 
        icon: <Check className="w-4 h-4" />,
        actionClass: 'bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-600'
      };
    case 'accepted':
      return { 
        label: 'بدء التحضير', 
        next: 'preparing', 
        icon: <Play className="w-4 h-4" />,
        actionClass: 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600'
      };
    case 'preparing':
      return { 
        label: 'جاهز للتسليم', 
        next: 'ready', 
        icon: <CheckCheck className="w-4 h-4" />,
        actionClass: 'bg-blue-500 hover:bg-blue-600 text-white border border-blue-600'
      };
    case 'ready':
      return { 
        label: 'تسليم وإنهاء', 
        next: 'delivered', 
        icon: <CheckCheck className="w-4 h-4" />,
        actionClass: 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600'
      };
    default:
      return null;
  }
};

export default function OrdersTab({
  orders,
  orderFilter,
  onSetOrderFilter,
  onPrintReceipt,
  onUpdateStatus,
  isStatusPending,
  onUpdateOrder,
  isUpdatePending
}: OrdersTabProps) {
  // Modal / Popup States
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnItems, setReturnItems] = useState<{ productId: string; name: string; price: number; quantity: number; notes?: string }[]>([]);

  // Filter orders by active vs archived
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'active') {
      return ['pending', 'accepted', 'preparing', 'ready'].includes(o.status);
    } else {
      return ['delivered', 'cancelled'].includes(o.status);
    }
  });

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Tab Filter Toggles */}
      <div className="flex justify-between items-center bg-staff-bg-elevated border border-staff-border p-1.5 rounded-2xl max-w-xs">
        <button
          onClick={() => onSetOrderFilter('active')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer font-body ${
            orderFilter === 'active'
              ? 'bg-staff-accent text-white shadow-sm'
              : 'text-staff-text-secondary hover:text-staff-text-primary'
          }`}
        >
          الطلبات النشطة ({orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)).length})
        </button>
        <button
          onClick={() => onSetOrderFilter('archived')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer font-body ${
            orderFilter === 'archived'
              ? 'bg-staff-accent text-white shadow-sm'
              : 'text-staff-text-secondary hover:text-staff-text-primary'
          }`}
        >
          الأرشيف ({orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length})
        </button>
      </div>

      {/* Orders Grid/List */}
      {filteredOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-staff-bg-elevated border border-staff-border rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-staff-bg-panel border border-staff-border flex items-center justify-center mb-4">
            <LayoutGrid className="w-7 h-7 text-staff-text-muted" />
          </div>
          <p className="text-staff-text-secondary font-bold text-sm font-body">لا توجد طلبات في هذا التبويب</p>
          <p className="text-xs text-staff-text-muted mt-1 font-body">سيتم عرض الطلبات فور إرسالها من العملاء أو الموظفين.</p>
        </div>
      ) : (
        <motion.div 
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-12 overflow-y-auto pr-1"
        >
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order: Order) => {
              const action = getNextAction(order.status);
              let cardBorderColor = 'border-staff-border';
              if (order.status === 'pending') cardBorderColor = 'border-r-staff-accent';
              
              const isOffline = (order as any).isOffline;
              
              return (
                <motion.div
                  key={order.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  className={`bg-staff-bg-elevated border-y border-l ${cardBorderColor} border-r-4 rounded-2xl p-5 flex flex-col justify-between gap-5 transition-shadow relative overflow-hidden`}
                >
                  {isOffline && (
                    <div className="absolute top-0 left-0 bg-staff-accent text-white px-2.5 py-0.5 rounded-br-lg text-[9px] font-black font-body flex items-center gap-1">
                      <CloudOff className="w-3 h-3" />
                      أوفلاين
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-staff-text-primary text-base">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          {order.type === 'delivery' ? (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md font-bold font-body flex items-center gap-1">
                              <Bike className="w-3.5 h-3.5" />
                              <span>دليفري</span>
                            </span>
                          ) : order.tableNumber > 0 ? (
                            <span className="text-[10px] bg-staff-bg-panel text-staff-text-primary border border-staff-border font-mono px-2 py-0.5 rounded-md font-bold">
                              طاولة {order.tableNumber}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold font-body">
                              تيك أواي
                            </span>
                          )}
                        </div>
                        {order.customerName && (
                          <div className="text-xs text-zinc-300 font-extrabold mt-1.5 flex items-center gap-1.5 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md w-fit">
                            <User className="w-3.5 h-3.5 text-staff-accent" />
                            <span>الزبون: {order.customerName}</span>
                          </div>
                        )}
                        <span className="text-[9px] text-staff-text-muted font-mono block mt-1.5">
                          {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border font-body ${getStatusBadgeClass(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="bg-staff-bg-panel/40 border border-staff-border/40 rounded-xl p-3.5 space-y-2.5 max-h-[160px] overflow-y-auto scrollbar-hide">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-bold font-body border-b border-staff-border/20 last:border-0 pb-1.5 last:pb-0">
                          <div className="space-y-0.5">
                            <span className="text-staff-text-secondary">{item.name}</span>
                            {item.notes && (
                              <p className="text-[10px] text-staff-accent font-semibold">ملاحظة: {item.notes}</p>
                            )}
                          </div>
                          <span className="text-staff-text-primary font-mono bg-staff-bg-panel px-1.5 py-0.5 rounded border border-staff-border/30 text-[10px] h-fit">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Customer Delivery Details */}
                    {order.type === 'delivery' && (
                      <div className="bg-rose-500/[0.02] border border-rose-500/10 rounded-xl p-3.5 space-y-2 text-xs text-staff-text-secondary font-bold font-body">
                        <div className="flex justify-between border-b border-staff-border/20 pb-1 items-center">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                            <span>الاسم:</span>
                          </span>
                          <span className="text-staff-text-primary font-black">{(order as any).customerName}</span>
                        </div>
                        <div className="flex justify-between border-b border-staff-border/20 pb-1 items-center">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>الموبايل:</span>
                          </span>
                          <span className="font-mono text-staff-text-primary select-all">{(order as any).customerPhone}</span>
                        </div>
                        <div className="text-zinc-400 space-y-1">
                          <span className="flex items-center gap-1 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                            <span>العنوان:</span>
                          </span>
                          <span className="block font-medium leading-relaxed bg-staff-bg-panel p-2.5 rounded-lg border border-staff-border/40 select-all text-staff-text-primary">{(order as any).customerAddress}</span>
                        </div>
                      </div>
                    )}

                    {/* Notes & Summary */}
                    {order.specialNotes && (
                      <div className="p-3 bg-red-500/[0.02] border border-red-500/10 rounded-xl text-[11px] text-staff-text-secondary font-bold font-body flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>ملاحظة خاصة: {order.specialNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Price */}
                  <div className="flex justify-between items-center border-t border-staff-border/40 pt-4 font-body">
                    <div>
                      <span className="text-[9px] text-staff-text-muted block">الإجمالي:</span>
                      <span className="text-staff-accent font-black font-mono bg-staff-accent-soft px-2 py-0.5 rounded-lg border border-staff-accent-glow text-xs">
                        {order.totalAmount} ج.م
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => onPrintReceipt(order)}
                        whileTap={{ scale: 0.92 }}
                        className="p-3 rounded-xl border border-staff-border bg-staff-bg-panel text-staff-text-primary hover:bg-staff-text-primary hover:text-white hover:border-staff-text-primary transition-all shadow-sm cursor-pointer"
                        title="طباعة الفاتورة"
                      >
                        <Printer className="w-4 h-4" />
                      </motion.button>
                      
                      {orderFilter === 'active' ? (
                        <>
                          <motion.button
                            onClick={() => setCancelOrderId(order.id)}
                            whileTap={{ scale: 0.92 }}
                            disabled={isStatusPending}
                            className="p-3 rounded-xl border border-staff-border bg-staff-bg-panel text-staff-text-secondary hover:text-red-500 hover:border-red-500/20 transition-all shadow-sm cursor-pointer"
                            title="إلغاء الطلب"
                          >
                            <XCircle className="w-4 h-4" />
                          </motion.button>
                          {action && (
                            <motion.button
                              onClick={() => {
                                if (order.type === 'delivery' && action.next === 'delivered') {
                                  onPrintReceipt(order);
                                }
                                onUpdateStatus(order.id, action.next);
                              }}
                              whileTap={{ scale: 0.95 }}
                              disabled={isStatusPending}
                              className={`flex items-center gap-1.5 py-2 px-4.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer ${action.actionClass}`}
                            >
                              {action.icon}
                              <span>{action.label}</span>
                            </motion.button>
                          )}
                          {action && order.status !== 'ready' && (
                            <motion.button
                              onClick={() => {
                                if (order.type === 'delivery') {
                                  onPrintReceipt(order);
                                }
                                onUpdateStatus(order.id, 'delivered');
                              }}
                              whileTap={{ scale: 0.95 }}
                              disabled={isStatusPending}
                              className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 flex items-center gap-1 py-2 px-3.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                              title="إنهاء وتسليم الطلب فوراً"
                            >
                              <CheckCheck className="w-4 h-4" />
                              <span>تم</span>
                            </motion.button>
                          )}
                        </>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <span className={`text-[10px] font-black px-3.5 py-2 rounded-xl border ${
                            order.status === 'delivered' 
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15' 
                              : 'bg-red-500/10 text-red-500 border-red-500/15'
                          }`}>
                            {order.status === 'delivered' ? 'مكتمل بنجاح' : 'طلب ملغي'}
                          </span>
                          {order.status === 'delivered' && (
                            <motion.button
                              onClick={() => {
                                setReturnOrder(order);
                                setReturnItems(order.items.map(item => ({
                                  productId: item.productId,
                                  name: item.name,
                                  price: item.price,
                                  quantity: item.quantity,
                                  notes: item.notes
                                })));
                              }}
                              whileTap={{ scale: 0.92 }}
                              className="px-3.5 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black flex items-center gap-1 cursor-pointer"
                              title="تعديل المرتجع والأصناف"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>مرتجع</span>
                            </motion.button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Custom Confirmation Popup: Order Cancellation */}
      <AnimatePresence>
        {cancelOrderId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0C0C0D] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden text-right shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center gap-3 text-red-500 justify-start border-b border-white/5 pb-4">
                <AlertCircle className="w-6 h-6 animate-pulse" />
                <h3 className="text-sm font-black text-white font-body">تأكيد إلغاء الطلب</h3>
              </div>
              
              <p className="text-xs text-zinc-300 font-bold font-body leading-relaxed">
                هل أنت متأكد من إلغاء هذا الطلب بالكامل؟ سيتم تفريغ حساب الطاولة المرتبطة وتغيير الحالة إلى ملغي.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCancelOrderId(null)}
                  className="flex-1 bg-[#161618] border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white font-black py-3 rounded-xl transition-all text-xs cursor-pointer font-body"
                >
                  تراجع
                </button>
                <button
                  onClick={async () => {
                    onUpdateStatus(cancelOrderId, 'cancelled');
                    setCancelOrderId(null);
                  }}
                  disabled={isStatusPending}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition-all text-xs cursor-pointer font-body border border-red-700 shadow-lg shadow-red-500/10"
                >
                  {isStatusPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Itemized Return / Edit Order Items Modal */}
      <AnimatePresence>
        {returnOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0C0C0D] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden text-right shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#09090B]">
                <h3 className="text-sm font-black text-white font-body flex items-center gap-2">
                  <span className="text-staff-accent">📝</span>
                  <span>تعديل أصناف / مرتجع الطلب #{returnOrder.id.slice(-6).toUpperCase()}</span>
                </h3>
                <button
                  onClick={() => setReturnOrder(null)}
                  className="w-8 h-8 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-hide">
                {returnItems.map((item, idx) => {
                  const origItem = returnOrder.items.find(i => i.productId === item.productId);
                  const maxQty = origItem ? origItem.quantity : item.quantity;
                  
                  return (
                    <div key={item.productId} className="flex justify-between items-center bg-[#161618] border border-white/5 rounded-xl p-4">
                      <div>
                        <span className="text-xs font-bold text-white block">{item.name}</span>
                        <span className="text-[10px] text-staff-accent font-black font-mono mt-1 block">{item.price} ج.م</span>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = Math.min(maxQty, item.quantity + 1);
                            setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
                          }}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center cursor-pointer border border-white/10 font-bold text-lg"
                        >
                          +
                        </button>
                        <span className="font-mono font-black text-white w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = Math.max(0, item.quantity - 1);
                            setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
                          }}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center cursor-pointer border border-white/10 font-bold text-lg"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation & Confirm Actions */}
              <div className="p-5 border-t border-white/5 bg-[#09090B] space-y-4 font-body">
                <div className="flex justify-between items-center bg-[#161618] border border-white/10 px-4 py-3 rounded-xl">
                  <span className="text-[10px] font-black text-zinc-400 font-body">إجمالي الحساب الجديد:</span>
                  <span className="font-mono text-base font-black text-lime-400">
                    {returnItems.reduce((acc, item) => acc + item.price * item.quantity, 0)} ج.م
                  </span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCancelOrderId(returnOrder.id);
                      setReturnOrder(null);
                    }}
                    className="flex-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-3 rounded-xl transition-all text-xs cursor-pointer border border-red-500/20"
                  >
                    إلغاء الطلب بالكامل
                  </button>
                  <button
                    onClick={async () => {
                      const filteredItems = returnItems.filter(item => item.quantity > 0);
                      await onUpdateOrder(returnOrder.id, filteredItems, returnOrder.status);
                      setReturnOrder(null);
                    }}
                    disabled={isUpdatePending}
                    className="flex-1 bg-staff-accent hover:bg-staff-accent/90 text-white font-black py-3 rounded-xl transition-all text-xs cursor-pointer border border-staff-accent shadow-lg shadow-staff-accent/10 font-body"
                  >
                    {isUpdatePending ? 'جاري الحفظ...' : 'تأكيد وحفظ التغيير'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
