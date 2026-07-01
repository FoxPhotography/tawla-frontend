import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, CookingPot, BellRing, Printer, AlertTriangle, User } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Order } from '../../../shared/types';

interface KDSTabProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled') => void;
  isStatusPending: boolean;
}

export default function KDSTab({ orders, onUpdateStatus, isStatusPending }: KDSTabProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update timer every second for live elapsed clock calculations
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders for kitchen view (only pending, accepted, or preparing states)
  const kdsOrders = orders.filter(o => ['pending', 'accepted', 'preparing'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const getElapsedTime = (createdAtString: string) => {
    const created = new Date(createdAtString);
    const diffMs = currentTime.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return { mins: diffMins, secs: diffSecs, totalMins: diffMins };
  };

  const getDelayColorClass = (totalMins: number) => {
    if (totalMins >= 20) return 'bg-red-500/10 border-red-500/30 text-red-500';
    if (totalMins >= 10) return 'bg-amber-500/10 border-amber-500/30 text-amber-500';
    return 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400';
  };



  return (
    <div className="flex flex-col h-full text-right" dir="rtl">
      {/* Header Stat row */}
      <div className="flex items-center justify-between mb-4 bg-white p-4 border border-zinc-200 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-sm font-black text-zinc-900">شاشة عرض المطبخ (KDS)</h2>
          <p className="text-[10px] text-zinc-500 font-bold mt-1">تتبع وتحضير الطلبات النشطة بشكل مباشر</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black bg-zinc-100 text-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200">
            إجمالي تحت التحضير: {kdsOrders.length} طلبات
          </span>
          <span className="text-[10px] font-black bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100">
            متأخر (20د+): {kdsOrders.filter(o => getElapsedTime(o.createdAt).totalMins >= 20).length}
          </span>
        </div>
      </div>

      {/* Grid of Kitchen Order Cards */}
      {kdsOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-200 rounded-2xl py-24 bg-white shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-4">
            <CookingPot className="w-7 h-7 text-zinc-400" />
          </div>
          <p className="text-sm font-bold text-zinc-500">المطبخ هادئ الآن، لا توجد طلبات نشطة</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-4 h-full items-start" style={{ minWidth: 'max-content' }}>
            <AnimatePresence>
              {kdsOrders.map((order) => {
                const elapsed = getElapsedTime(order.createdAt);
                const delayColor = getDelayColorClass(elapsed.totalMins);

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
                    className="w-72 bg-[#09090B] border border-white/5 rounded-2xl flex flex-col max-h-[calc(100vh-230px)] shadow-lg overflow-hidden flex-shrink-0"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 bg-zinc-900/30 flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-md mb-2 inline-block ${
                          order.type === 'dine_in' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {order.type === 'dine_in' ? `طاولة ${order.tableNumber}` : order.type === 'takeaway' ? 'تيك أواي' : 'توصيل'}
                        </span>
                        <h4 className="text-xs font-black text-zinc-300">طلب #{order.id.slice(-4).toUpperCase()}</h4>
                        {order.customerName && (
                          <div className="text-[10px] font-bold text-zinc-400 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-500" />
                            <span>العميل: {order.customerName}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Timer */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs font-black ${delayColor}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{String(elapsed.mins).padStart(2, '0')}:{String(elapsed.secs).padStart(2, '0')}</span>
                      </div>
                    </div>

                    {/* Content Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-hide">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start gap-2">
                            <span className="w-6 h-6 rounded-md bg-zinc-900 border border-white/5 text-zinc-300 text-xs font-black flex items-center justify-center flex-shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="font-extrabold text-xs text-white flex-1">{item.name}</span>
                          </div>

                          {/* Selected Customizations */}
                          {((item.selectedOptions && item.selectedOptions.length > 0) || 
                            (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                            <div className="flex flex-wrap gap-1 mt-1.5 mr-8 text-[10px] text-zinc-400 font-semibold">
                              {item.selectedOptions?.map((opt, i) => (
                                <span key={i} className="bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded text-zinc-400">
                                  {opt.name}: {opt.value}
                                </span>
                              ))}
                              {item.selectedModifiers?.map((mod, i) => (
                                <span key={i} className="bg-orange-950/20 text-orange-400 border border-orange-500/10 px-1.5 py-0.5 rounded">
                                  {mod.value}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.notes && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-500 mr-8 mt-1.5 font-bold">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>ملاحظة: {item.notes}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {order.specialNotes && (
                        <div className="bg-amber-950/10 border border-amber-900/20 p-2.5 rounded-xl text-[10px] text-amber-400 font-bold mt-2">
                          توجيهات عامة: {order.specialNotes}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="p-3 bg-zinc-900/30 border-t border-white/5 flex gap-2 flex-shrink-0">
                      {order.status === 'pending' && (
                        <button
                          disabled={isStatusPending}
                          onClick={() => onUpdateStatus(order.id, 'accepted')}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 font-black text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-white/5 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>قبول الطلب</span>
                        </button>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          disabled={isStatusPending}
                          onClick={() => onUpdateStatus(order.id, 'preparing')}
                          className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <CookingPot className="w-4 h-4 animate-pulse" />
                          <span>بدء التحضير</span>
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          disabled={isStatusPending}
                          onClick={() => onUpdateStatus(order.id, 'ready')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <BellRing className="w-4 h-4" />
                          <span>جاهز للتسليم</span>
                        </button>
                      )}
                      
                      {/* Print Split ticket */}
                      <button
                        onClick={() => {
                          toast.success('تم إرسال أمر الطباعة لبون المطبخ');
                          console.log('Simulated printing split order ticket for order:', order.id);
                        }}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/5 hover:text-white rounded-xl transition-colors cursor-pointer"
                        title="طباعة بون المطبخ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
