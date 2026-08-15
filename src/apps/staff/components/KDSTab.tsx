import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, CookingPot, BellRing, Printer, AlertTriangle, User, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Order } from '../../../shared/types';
import { staffAudio } from '../services/staffAudio';

interface KDSTabProps {
  orders: Order[];
  categories: any[];
  products: any[];
  onUpdateStatus: (id: string, status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled') => void;
  isStatusPending: boolean;
  isDeliveryEnabled?: boolean;
}

export default function KDSTab({ orders, categories, products, onUpdateStatus, isStatusPending, isDeliveryEnabled = true }: KDSTabProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'delivery'>('all');

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

  const getOrderDelayStatus = (order: Order) => {
    const elapsedMins = getElapsedTime(order.createdAt).totalMins;
    let isDelayed = false;
    let isWarning = false;

    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId || p._id === item.productId);
      const category = product ? categories.find(c => c.id === product.categoryId || c._id === product.categoryId) : null;
      const limit = category?.delayLimit !== undefined ? category.delayLimit : 20;

      if (elapsedMins >= limit) {
        isDelayed = true;
      } else if (elapsedMins >= Math.max(1, limit - 5)) {
        isWarning = true;
      }
    });

    if (isDelayed) return 'delayed';
    if (isWarning) return 'warning';
    return 'normal';
  };

  const getDelayColorClass = (status: 'delayed' | 'warning' | 'normal') => {
    if (status === 'delayed') return 'bg-red-50 border-red-200 text-red-700 animate-pulse font-black';
    if (status === 'warning') return 'bg-amber-50 border-amber-200 text-amber-700 font-bold';
    return 'bg-zinc-50 border-zinc-200 text-zinc-700 font-bold';
  };

  const delayedOrdersCount = kdsOrders.filter(o => getOrderDelayStatus(o) === 'delayed').length;

  const filteredKdsOrders = kdsOrders.filter(o => {
    if (typeFilter === 'all') return true;
    return o.type === typeFilter;
  });

  return (
    <div className="flex flex-col h-full text-right" dir="rtl">
      
      {/* Header Stat row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm flex-shrink-0 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#801B2C]/10 flex items-center justify-center text-[#801B2C] border border-[#801B2C]/20 shadow-xs">
            <ChefHat className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900 leading-none font-cairo">شاشة عرض المطبخ (KDS)</h2>
            <p className="text-xs text-zinc-500 font-bold mt-1.5 font-body">تتبع وتحضير وجبات المطبخ بشكل مباشر وفوري</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="flex-1 sm:flex-none text-xs font-black bg-zinc-50 text-zinc-800 px-4 py-2.5 rounded-2xl border border-zinc-200 flex items-center justify-center gap-2 shadow-xs">
            <CookingPot className="w-4 h-4 text-[#801B2C]" />
            <span>تحت التحضير:</span>
            <span className="font-mono text-sm text-[#801B2C] font-black">{kdsOrders.length}</span>
          </span>
          <span className={`flex-1 sm:flex-none text-xs font-black px-4 py-2.5 rounded-2xl border flex items-center justify-center gap-2 shadow-xs transition-all ${
            delayedOrdersCount > 0 
              ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
              : 'bg-zinc-50 text-zinc-600 border-zinc-200'
          }`}>
            <Clock className={`w-4 h-4 ${delayedOrdersCount > 0 ? 'text-red-600' : 'text-zinc-400'}`} />
            <span>المتأخرة:</span>
            <span className={`font-mono text-sm font-black ${delayedOrdersCount > 0 ? 'text-red-700' : 'text-zinc-600'}`}>
              {delayedOrdersCount}
            </span>
          </span>
        </div>
      </div>

      {/* Type Filters Row */}
      <div className="flex items-center gap-1.5 bg-white border border-zinc-200/80 p-1.5 rounded-2xl w-fit overflow-x-auto scrollbar-hide max-w-full mb-4 shadow-sm flex-shrink-0 font-body">
        <button
          onClick={() => {
            staffAudio.play('click');
            setTypeFilter('all');
          }}
          className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-w-fit ${
            typeFilter === 'all'
              ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          كل الطلبات ({kdsOrders.length})
        </button>
        <button
          onClick={() => {
            staffAudio.play('click');
            setTypeFilter('dine_in');
          }}
          className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-w-fit ${
            typeFilter === 'dine_in'
              ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          صالة ({kdsOrders.filter(o => o.type === 'dine_in').length})
        </button>
        <button
          onClick={() => {
            staffAudio.play('click');
            setTypeFilter('takeaway');
          }}
          className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-w-fit ${
            typeFilter === 'takeaway'
              ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          تيك أواي ({kdsOrders.filter(o => o.type === 'takeaway').length})
        </button>
        {isDeliveryEnabled && (
          <button
            onClick={() => {
              staffAudio.play('click');
              setTypeFilter('delivery');
            }}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-w-fit ${
              typeFilter === 'delivery'
                ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            دليفري ({kdsOrders.filter(o => o.type === 'delivery').length})
          </button>
        )}
      </div>

      {/* Grid of Kitchen Order Cards */}
      {filteredKdsOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-200/80 rounded-3xl py-24 bg-white shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-4 text-zinc-400">
            <CookingPot className="w-7 h-7" />
          </div>
          <p className="text-sm font-black text-zinc-800 font-cairo">المطبخ هادئ! لا توجد طلبات نشطة حالياً</p>
          <p className="text-xs text-zinc-500 mt-1 font-body">ستظهر بونات المطبخ فور إرسالها من الصالة أو التوصيل.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-4 h-full items-start" style={{ minWidth: 'max-content' }}>
            <AnimatePresence>
              {filteredKdsOrders.map((order) => {
                const elapsed = getElapsedTime(order.createdAt);
                const delayStatus = getOrderDelayStatus(order);
                const delayColor = getDelayColorClass(delayStatus);

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 26 }}
                    className="w-76 bg-white border border-zinc-200/90 rounded-3xl flex flex-col max-h-[calc(100vh-230px)] shadow-sm hover:shadow-md transition-all overflow-hidden flex-shrink-0"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-zinc-100 bg-zinc-50/70 flex justify-between items-start">
                      <div>
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg mb-2 inline-block font-body ${
                          order.type === 'dine_in' 
                            ? 'bg-[#801B2C]/10 text-[#801B2C] border border-[#801B2C]/20' 
                            : order.type === 'takeaway'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {order.type === 'dine_in' ? `طاولة ${order.tableNumber}` : order.type === 'takeaway' ? 'تيك أواي' : 'توصيل دليفري'}
                        </span>
                        <h4 className="text-xs font-black text-zinc-900 font-mono">بون #{order.id.slice(-4).toUpperCase()}</h4>
                        {order.customerName && (
                          <div className="text-[10px] font-bold text-zinc-600 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3 text-zinc-400" />
                            <span>العميل: {order.customerName}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Timer */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-xs ${delayColor}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{String(elapsed.mins).padStart(2, '0')}:{String(elapsed.secs).padStart(2, '0')}</span>
                      </div>
                    </div>

                    {/* Content Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-hide bg-white">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 text-xs font-black flex items-center justify-center flex-shrink-0 font-mono shadow-xs">
                              {item.quantity}x
                            </span>
                            <span className="font-black text-sm text-zinc-950 flex-1 leading-snug font-body">{item.name}</span>
                          </div>

                          {/* Selected Customizations */}
                          {((item.selectedOptions && item.selectedOptions.length > 0) || 
                            (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                            <div className="flex flex-wrap gap-1.5 mt-2 mr-9 text-[11px] text-zinc-800 font-black">
                              {item.selectedOptions?.map((opt, i) => (
                                <span key={i} className="bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded-md text-zinc-800 shadow-xs">
                                  {opt.name}: {opt.value}
                                </span>
                              ))}
                              {item.selectedModifiers?.map((mod, i) => (
                                <span key={i} className="bg-[#801B2C]/10 text-[#801B2C] border border-[#801B2C]/20 px-2 py-0.5 rounded-md shadow-xs">
                                  {mod.value}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.notes && (
                            <div className="flex items-center gap-1.5 text-xs text-red-700 mr-9 mt-2 font-black bg-red-50 border border-red-200/80 px-2.5 py-1 rounded-xl">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                              <span>ملاحظة: {item.notes}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {order.specialNotes && (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 font-black mt-2 shadow-xs font-body">
                          توجيهات عامة: {order.specialNotes}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="p-3 bg-zinc-50/70 border-t border-zinc-100 flex gap-2 flex-shrink-0">
                      {order.status === 'pending' && (
                        <button
                          disabled={isStatusPending}
                          onClick={() => {
                            staffAudio.play('action');
                            onUpdateStatus(order.id, 'accepted');
                          }}
                          className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-black text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-zinc-200 disabled:opacity-50 cursor-pointer font-body shadow-xs"
                        >
                          <span>قبول الطلب</span>
                          <Check className="w-4 h-4 text-emerald-600" />
                        </button>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          disabled={isStatusPending}
                          onClick={() => {
                            staffAudio.play('action');
                            onUpdateStatus(order.id, 'preparing');
                          }}
                          className="flex-1 bg-[#801B2C] hover:bg-[#962436] text-white font-black text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer font-body shadow-md shadow-[#801B2C]/20"
                        >
                          <span>بدء التحضير</span>
                          <CookingPot className="w-4 h-4 animate-pulse" />
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          disabled={isStatusPending}
                          onClick={() => {
                            staffAudio.play('success');
                            onUpdateStatus(order.id, 'ready');
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer font-body shadow-md shadow-emerald-600/20"
                        >
                          <span>جاهز للتسليم</span>
                          <BellRing className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Print Split ticket */}
                      <button
                        onClick={() => {
                          staffAudio.play('action');
                          toast.success('تم إرسال أمر الطباعة لبون المطبخ');
                        }}
                        className="p-2.5 bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 hover:text-zinc-950 rounded-xl transition-colors cursor-pointer shadow-xs"
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
