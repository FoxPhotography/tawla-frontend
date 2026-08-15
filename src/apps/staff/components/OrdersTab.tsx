import { useState, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
  LayoutGrid, List, Printer, XCircle, CloudOff, Play, Check, CheckCheck, AlertCircle,
  Bike, User, Phone, MapPin, FileText, Search, X, RotateCcw, Clock
} from 'lucide-react';
import type { Order } from '../../../shared/types';
import { staffAudio } from '../services/staffAudio';

interface OrdersTabProps {
  orders: Order[];
  orderFilter: 'active' | 'archived';
  onSetOrderFilter: (filter: 'active' | 'archived') => void;
  onPrintReceipt: (order: any) => void;
  onUpdateStatus: (orderId: string, nextStatus: string) => void;
  isStatusPending: boolean;
  onUpdateOrder: (orderId: string, items: any[], status?: string) => Promise<void>;
  isUpdatePending: boolean;
  isDeliveryEnabled?: boolean;
}

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 350, damping: 26 }
  }
};

const formatOrderTime = (dateString: string | Date) => {
  const d = new Date(dateString);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = hours.toString().padStart(2, '0');
  return `${formattedHours}:${minutes} ${ampm}`;
};

const getStatusBadgeClass = (status: Order['status']) => {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-900 border-amber-200/80';
    case 'accepted': return 'bg-[#801B2C]/10 text-[#801B2C] border-[#801B2C]/20';
    case 'preparing': return 'bg-[#801B2C] text-white border-[#801B2C] shadow-xs';
    case 'ready': return 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
    case 'delivered': return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    case 'cancelled': return 'bg-rose-50 text-rose-800 border-rose-200';
    default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
};

const getStatusText = (status: Order['status']) => {
  switch (status) {
    case 'pending': return 'طلب معلق';
    case 'accepted': return 'مقبول';
    case 'preparing': return 'جاري التحضير';
    case 'ready': return 'جاهز للتسليم';
    case 'delivered': return 'مكتمل بنجاح';
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
        actionClass: 'bg-[#801B2C] hover:bg-[#962436] text-white shadow-sm shadow-[#801B2C]/20'
      };
    case 'accepted':
      return { 
        label: 'بدء التحضير', 
        next: 'preparing', 
        icon: <Play className="w-3.5 h-3.5 fill-current" />,
        actionClass: 'bg-[#801B2C] hover:bg-[#962436] text-white shadow-sm shadow-[#801B2C]/20'
      };
    case 'preparing':
      return { 
        label: 'جاهز للتسليم', 
        next: 'ready', 
        icon: <CheckCheck className="w-4 h-4" />,
        actionClass: 'bg-[#801B2C] hover:bg-[#962436] text-white shadow-sm shadow-[#801B2C]/20'
      };
    case 'ready':
      return { 
        label: 'تسليم وإنهاء', 
        next: 'delivered', 
        icon: <CheckCheck className="w-4 h-4" />,
        actionClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
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
  isUpdatePending,
  isDeliveryEnabled = true
}: OrdersTabProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNavTab, setActiveNavTab] = useState<'all_active' | 'dine_in' | 'takeaway' | 'delivery' | 'archived'>('all_active');
  const [archiveViewMode, setArchiveViewMode] = useState<'table' | 'grid'>('table');
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');

  // Modal / Popup States
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnItems, setReturnItems] = useState<{ productId: string; name: string; price: number; quantity: number; notes?: string }[]>([]);

  const handleNavTabClick = (tab: 'all_active' | 'dine_in' | 'takeaway' | 'delivery' | 'archived') => {
    staffAudio.play('click');
    setActiveNavTab(tab);
    if (tab === 'archived') {
      onSetOrderFilter('archived');
    } else {
      onSetOrderFilter('active');
    }
  };

  const archiveStats = useMemo(() => {
    const archived = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
    const delivered = archived.filter(o => o.status === 'delivered');
    const cancelled = archived.filter(o => o.status === 'cancelled');
    const totalRevenue = delivered.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return {
      total: archived.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      revenue: totalRevenue
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Filter by Nav Tab
      if (activeNavTab === 'archived') {
        if (!['delivered', 'cancelled'].includes(o.status)) return false;
        if (archiveStatusFilter === 'delivered' && o.status !== 'delivered') return false;
        if (archiveStatusFilter === 'cancelled' && o.status !== 'cancelled') return false;
      } else {
        const isActive = ['pending', 'accepted', 'preparing', 'ready'].includes(o.status);
        if (!isActive) return false;
        if (activeNavTab !== 'all_active' && o.type !== activeNavTab) return false;
      }

      // 2. Filter by Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchId = o.id.toLowerCase().includes(q);
      const matchTable = o.tableNumber ? String(o.tableNumber).includes(q) : false;
      const matchCustomer = o.customerName ? o.customerName.toLowerCase().includes(q) : false;
      const matchPhone = (o as any).customerPhone ? (o as any).customerPhone.includes(q) : false;
      const matchItem = o.items ? o.items.some(i => i.name.toLowerCase().includes(q)) : false;

      return matchId || matchTable || matchCustomer || matchPhone || matchItem;
    });
  }, [orders, activeNavTab, searchQuery, archiveStatusFilter]);

  return (
    <div className="flex flex-col gap-5 h-full min-h-0 overflow-hidden text-right" dir="rtl">
      
      {/* Top Filter & Search Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between flex-shrink-0">
        
        {/* Navigation Tabs (Light Luxury Pill Bar) */}
        <div className="flex items-center gap-1.5 bg-white border border-zinc-200/80 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide shadow-sm">
          <button
            onClick={() => handleNavTabClick('all_active')}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer font-body whitespace-nowrap flex items-center gap-2 ${
              activeNavTab === 'all_active'
                ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <span>كل النشطة</span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
              activeNavTab === 'all_active' ? 'bg-white/25 text-white' : 'bg-zinc-100 text-zinc-700'
            }`}>
              {orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)).length}
            </span>
          </button>

          <button
            onClick={() => handleNavTabClick('dine_in')}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer font-body whitespace-nowrap flex items-center gap-2 ${
              activeNavTab === 'dine_in'
                ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <span>صالة</span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
              activeNavTab === 'dine_in' ? 'bg-white/25 text-white' : 'bg-zinc-100 text-zinc-700'
            }`}>
              {orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status) && o.type === 'dine_in').length}
            </span>
          </button>

          <button
            onClick={() => handleNavTabClick('takeaway')}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer font-body whitespace-nowrap flex items-center gap-2 ${
              activeNavTab === 'takeaway'
                ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <span>تيك أواي</span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
              activeNavTab === 'takeaway' ? 'bg-white/25 text-white' : 'bg-zinc-100 text-zinc-700'
            }`}>
              {orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status) && o.type === 'takeaway').length}
            </span>
          </button>

          {isDeliveryEnabled && (
            <button
              onClick={() => handleNavTabClick('delivery')}
              className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer font-body whitespace-nowrap flex items-center gap-2 ${
                activeNavTab === 'delivery'
                  ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              <span>دليفري</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
                activeNavTab === 'delivery' ? 'bg-white/25 text-white' : 'bg-zinc-100 text-zinc-700'
              }`}>
                {orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status) && o.type === 'delivery').length}
              </span>
            </button>
          )}

          <button
            onClick={() => handleNavTabClick('archived')}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer font-body whitespace-nowrap flex items-center gap-2 ${
              activeNavTab === 'archived'
                ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/20'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <span>الأرشيف</span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
              activeNavTab === 'archived' ? 'bg-white/25 text-white' : 'bg-zinc-100 text-zinc-700'
            }`}>
              {orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length}
            </span>
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب، رقم الطاولة، اسم العميل..."
            className="w-full bg-white border border-zinc-200/90 text-zinc-900 rounded-2xl pr-10 pl-10 py-2.5 text-xs font-bold transition-all focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 outline-none shadow-sm placeholder:text-zinc-400 font-body"
          />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Archive Metrics & View Controller Sub-bar */}
      {activeNavTab === 'archived' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200/80 rounded-2xl p-3 shadow-xs font-cairo flex-shrink-0">
          {/* Status Sub-filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                staffAudio.play('click');
                setArchiveStatusFilter('all');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                archiveStatusFilter === 'all'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70'
              }`}
            >
              <span>جميع العمليات</span>
              <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.5 rounded-md font-black">{archiveStats.total}</span>
            </button>

            <button
              onClick={() => {
                staffAudio.play('click');
                setArchiveStatusFilter('delivered');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                archiveStatusFilter === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70'
              }`}
            >
              <span>مكتملة</span>
              <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.5 rounded-md font-black">{archiveStats.delivered}</span>
            </button>

            <button
              onClick={() => {
                staffAudio.play('click');
                setArchiveStatusFilter('cancelled');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                archiveStatusFilter === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100/70'
              }`}
            >
              <span>ملغاة</span>
              <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.5 rounded-md font-black">{archiveStats.cancelled}</span>
            </button>
          </div>

          {/* Revenue and View Mode Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
            {/* Total Revenue Pill */}
            <div className="flex items-center gap-1.5 bg-[#801B2C]/5 border border-[#801B2C]/15 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] text-zinc-500 font-bold">إجمالي المبيعات:</span>
              <strong className="text-[#801B2C] font-black font-mono text-xs">
                {archiveStats.revenue.toLocaleString()} ج.م
              </strong>
            </div>

            {/* View Mode Toggle: Table / Cards */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/70">
              <button
                onClick={() => {
                  staffAudio.play('click');
                  setArchiveViewMode('table');
                }}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  archiveViewMode === 'table'
                    ? 'bg-white text-[#801B2C] shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                title="عرض الجدول المنظم"
              >
                <List className="w-4 h-4" />
                <span className="hidden md:inline text-[11px]">جدول</span>
              </button>
              <button
                onClick={() => {
                  staffAudio.play('click');
                  setArchiveViewMode('grid');
                }}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  archiveViewMode === 'grid'
                    ? 'bg-white text-[#801B2C] shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                title="عرض البطاقات"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline text-[11px]">بطاقات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-zinc-200/80 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center mb-4 text-zinc-400 shadow-inner">
            <LayoutGrid className="w-7 h-7" />
          </div>
          <p className="text-zinc-800 font-black text-sm font-cairo">لا توجد طلبات تطابق العرض الحالي</p>
          <p className="text-xs text-zinc-500 mt-1 font-body">ستظهر الطلبات فور تسجيلها في النظام.</p>
        </div>
      ) : activeNavTab === 'archived' && archiveViewMode === 'table' ? (
        /* Luxury Structured Archive Data Table */
        <div className="flex-1 overflow-y-auto bg-white border border-zinc-200/80 rounded-3xl shadow-xs scrollbar-thin scrollbar-thumb-zinc-200 min-h-0">
          <table className="w-full text-right border-collapse font-cairo">
            <thead className="sticky top-0 bg-zinc-50/95 backdrop-blur-xs border-b border-zinc-200/90 text-xs font-black text-zinc-600 z-10">
              <tr>
                <th className="py-3.5 px-4">رقم الطلب</th>
                <th className="py-3.5 px-4">النوع / الطاولة</th>
                <th className="py-3.5 px-4">التوقيت</th>
                <th className="py-3.5 px-4">تفاصيل الأصناف</th>
                <th className="py-3.5 px-4">العميل / العنوان</th>
                <th className="py-3.5 px-4">إجمالي الحساب</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs font-bold text-zinc-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-50/70 transition-colors">
                  {/* Order ID */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-black text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                  </td>

                  {/* Type / Table */}
                  <td className="py-3.5 px-4">
                    {order.type === 'delivery' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-bold">
                        <Bike className="w-3.5 h-3.5 text-rose-600" />
                        <span>دليفري</span>
                      </span>
                    ) : order.tableNumber > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded-md font-black">
                        طاولة {order.tableNumber}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-md font-bold">
                        تيك أواي
                      </span>
                    )}
                  </td>

                  {/* Time */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Clock className="w-3.5 h-3.5 text-[#801B2C]" />
                      <span>{formatOrderTime(order.createdAt)}</span>
                    </div>
                  </td>

                  {/* Items summary */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="bg-zinc-100/90 border border-zinc-200/70 px-2 py-0.5 rounded-md text-[11px] text-zinc-800 font-bold">
                          {item.name} <strong className="font-mono text-[#801B2C]">x{item.quantity}</strong>
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Customer / Address */}
                  <td className="py-3.5 px-4 text-[11px]">
                    {order.customerName ? (
                      <div className="space-y-0.5">
                        <span className="font-bold text-zinc-900 block">{order.customerName}</span>
                        {(order as any).customerPhone && (
                          <span className="font-mono text-zinc-500 block">{(order as any).customerPhone}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-400 font-normal">-</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-black text-[#801B2C] text-sm">
                      {order.totalAmount} <span className="text-[10px] font-bold font-cairo">ج.م</span>
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg border inline-block ${
                      order.status === 'delivered' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {order.status === 'delivered' ? 'مكتمل بنجاح' : 'طلب ملغي'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <motion.button
                        onClick={() => onPrintReceipt(order)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        className="p-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 transition-all cursor-pointer shadow-2xs"
                        title="طباعة الفاتورة"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </motion.button>

                      {order.status === 'delivered' && (
                        <motion.button
                          onClick={() => {
                            staffAudio.play('click');
                            setReturnOrder(order);
                            setReturnItems(order.items.map(item => ({
                              productId: item.productId,
                              name: item.name,
                              price: item.price,
                              quantity: item.quantity,
                              notes: item.notes
                            })));
                          }}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="تعديل المرتجع والأصناف"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>مرتجع</span>
                        </motion.button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 pb-16 scrollbar-thin scrollbar-thumb-zinc-200 min-h-0">
          <motion.div 
            key={activeNavTab}
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start"
          >
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order: Order) => {
              const action = getNextAction(order.status);
              let cardBorderColor = 'border-zinc-200/90 hover:border-zinc-300';
              if (order.status === 'pending') cardBorderColor = 'border-r-4 border-r-amber-500 border-zinc-200/90 shadow-xs';
              else if (order.status === 'accepted') cardBorderColor = 'border-r-4 border-r-[#801B2C] border-zinc-200/90 shadow-xs';
              else if (order.status === 'preparing') cardBorderColor = 'border-r-4 border-r-[#801B2C] border-zinc-200/90 shadow-xs';
              else if (order.status === 'ready') cardBorderColor = 'border-r-4 border-r-emerald-500 border-zinc-200/90 shadow-xs';

              const isOffline = (order as any).isOffline;
              
              return (
                <motion.div
                  key={order.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.92, y: -15 }}
                  className={`bg-white border ${cardBorderColor} rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xs hover:shadow-md relative overflow-hidden`}
                >
                  {isOffline && (
                    <div className="absolute top-0 left-0 bg-[#801B2C] text-white px-2.5 py-0.5 rounded-br-xl text-[9px] font-black font-body flex items-center gap-1 shadow-sm">
                      <CloudOff className="w-3 h-3" />
                      <span>طلب أوفلاين</span>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-zinc-900 text-sm tracking-wide bg-zinc-100 px-2.5 py-0.5 rounded-lg border border-zinc-200">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          {order.type === 'delivery' ? (
                            <span className="text-[10.5px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-lg font-bold font-cairo flex items-center gap-1">
                              <Bike className="w-3.5 h-3.5 text-rose-600" />
                              <span>دليفري</span>
                            </span>
                          ) : order.tableNumber > 0 ? (
                            <span className="text-[10.5px] bg-zinc-100 text-zinc-800 border border-zinc-200 font-cairo px-2.5 py-0.5 rounded-lg font-black">
                              طاولة {order.tableNumber}
                            </span>
                          ) : (
                            <span className="text-[10.5px] bg-zinc-100 text-zinc-700 border border-zinc-200 px-2.5 py-0.5 rounded-lg font-bold font-cairo">
                              تيك أواي
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium pt-0.5">
                          {order.customerName && (
                            <span className="text-zinc-800 font-bold font-cairo flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-[#801B2C]" />
                              <span>{order.customerName}</span>
                            </span>
                          )}
                          <span className="text-xs font-bold text-zinc-700 font-cairo flex items-center gap-1.5 bg-zinc-100/90 border border-zinc-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-[#801B2C]" />
                            <span className="tracking-wide">{formatOrderTime(order.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`text-[11px] font-black px-3 py-1 rounded-xl border font-cairo ${getStatusBadgeClass(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    {/* Items List (Compact & Clean) */}
                    <div className="bg-zinc-50/70 border border-zinc-200/60 rounded-2xl p-3 space-y-1.5 max-h-[130px] overflow-y-auto scrollbar-hide">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs font-bold font-cairo border-b border-zinc-200/40 last:border-0 pb-1.5 last:pb-0">
                          <div className="space-y-0.5 flex-1 pl-2">
                            <span className="text-zinc-800 font-black">{item.name}</span>
                            {item.notes && (
                              <p className="text-[10px] text-[#801B2C] font-bold flex items-center gap-1 mt-0.5">
                                <span>📌</span>
                                <span>{item.notes}</span>
                              </p>
                            )}
                          </div>
                          <span className="text-zinc-900 font-mono font-black bg-white px-2 py-0.5 rounded-md border border-zinc-200 text-[10px] h-fit shadow-xs">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Customer Delivery Details */}
                    {order.type === 'delivery' && (
                      activeNavTab === 'archived' ? (
                        <div className="bg-rose-50/50 border border-rose-100/80 rounded-xl px-2.5 py-1 text-[11px] text-zinc-700 font-bold font-cairo flex items-center justify-between">
                          <span className="flex items-center gap-1 text-zinc-900 font-black">
                            <User className="w-3 h-3 text-rose-500" />
                            <span>{(order as any).customerName || 'عميل دليفري'}</span>
                          </span>
                          {(order as any).customerPhone && (
                            <span className="font-mono text-[10.5px] text-zinc-500">{(order as any).customerPhone}</span>
                          )}
                        </div>
                      ) : (
                        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-3 space-y-1.5 text-xs text-zinc-700 font-bold font-cairo">
                          <div className="flex justify-between border-b border-rose-100/60 pb-1 items-center text-[11px]">
                            <span className="text-zinc-500 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-rose-500" />
                              <span>المستلم:</span>
                            </span>
                            <span className="text-zinc-900 font-black">{(order as any).customerName}</span>
                          </div>
                          <div className="flex justify-between border-b border-rose-100/60 pb-1 items-center text-[11px]">
                            <span className="text-zinc-500 flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-rose-500" />
                              <span>الهاتف:</span>
                            </span>
                            <span className="font-mono font-black text-zinc-900 select-all">{(order as any).customerPhone}</span>
                          </div>
                          <div className="text-zinc-500 text-[11px] space-y-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              <span>العنوان:</span>
                            </span>
                            <span className="block font-medium leading-normal bg-white p-2 rounded-xl border border-rose-100 select-all text-zinc-900">
                              {(order as any).customerAddress}
                            </span>
                          </div>
                        </div>
                      )
                    )}

                    {/* Special Notes & Directives */}
                    {order.specialNotes && (
                      <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-xs text-amber-900 font-bold font-cairo flex items-start gap-1.5">
                        <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-black block text-amber-950 text-[11px]">ملاحظات:</strong>
                          <span className="text-[11px]">{order.specialNotes}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions & Price Section (Ergonomic 2-Row Layout to prevent any overflow) */}
                  <div className="space-y-2.5 pt-3 border-t border-zinc-100 font-cairo">
                    {/* Upper row: Total price & quick utilities (Print, Cancel) */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-baseline gap-1.5 bg-[#801B2C]/5 border border-[#801B2C]/10 px-3 py-1 rounded-xl">
                        <span className="text-[10px] text-zinc-500 font-bold leading-none font-cairo">الحساب:</span>
                        <span className="text-[#801B2C] font-black text-sm font-cairo leading-none">
                          {order.totalAmount} <span className="text-[10px] font-bold">ج.م</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Print Receipt Button */}
                        <motion.button
                          onClick={() => onPrintReceipt(order)}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-8.5 h-8.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 transition-all shadow-2xs cursor-pointer flex items-center justify-center"
                          title="طباعة الفاتورة"
                        >
                          <Printer className="w-4 h-4" />
                        </motion.button>

                        {/* Cancel Button */}
                        {orderFilter === 'active' && (
                          <motion.button
                            onClick={() => {
                              staffAudio.play('click');
                              setCancelOrderId(order.id);
                            }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.92 }}
                            disabled={isStatusPending}
                            className="w-8.5 h-8.5 rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 transition-all shadow-2xs cursor-pointer flex items-center justify-center"
                            title="إلغاء الطلب"
                          >
                            <XCircle className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* Lower row: Primary workflow actions */}
                    {orderFilter === 'active' ? (
                      <div className="flex items-center gap-2 w-full">
                        {/* Primary Step Action Button */}
                        {action && (
                          <motion.button
                            onClick={() => onUpdateStatus(order.id, action.next)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            disabled={isStatusPending}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap font-cairo transition-all cursor-pointer shadow-xs min-h-[36px] ${action.actionClass}`}
                          >
                            <span>{action.label}</span>
                            {action.icon}
                          </motion.button>
                        )}

                        {/* Fast Complete Button (Direct Deliver) */}
                        {action && order.status !== 'ready' && (
                          <motion.button
                            onClick={() => onUpdateStatus(order.id, 'delivered')}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={isStatusPending}
                            className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-600 hover:text-white flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold font-cairo transition-all shadow-xs cursor-pointer min-h-[36px]"
                            title="تسليم فوري"
                          >
                            <span>تم</span>
                            <CheckCheck className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center pt-0.5">
                        <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg border font-cairo ${
                          order.status === 'delivered' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {order.status === 'delivered' ? 'مكتمل بنجاح' : 'طلب ملغي'}
                        </span>
                        {order.status === 'delivered' && (
                          <motion.button
                            onClick={() => {
                              staffAudio.play('click');
                              setReturnOrder(order);
                              setReturnItems(order.items.map(item => ({
                                productId: item.productId,
                                name: item.name,
                                price: item.price,
                                quantity: item.quantity,
                                notes: item.notes
                              })));
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.92 }}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs font-cairo"
                            title="تعديل المرتجع والأصناف"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>مرتجع</span>
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
      )}

      {/* Confirmation Modal: Order Cancellation (Clean Light Luxury) */}
      <AnimatePresence>
        {cancelOrderId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-zinc-200 rounded-3xl w-full max-w-sm overflow-hidden text-right shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center gap-3 text-red-600 justify-start border-b border-zinc-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 font-cairo">تأكيد إلغاء الطلب</h3>
                  <p className="text-[10px] text-zinc-500 font-bold font-body">سيتم تفريغ حساب الطاولة المرتبطة</p>
                </div>
              </div>
              
              <p className="text-xs text-zinc-600 font-bold font-body leading-relaxed">
                هل أنت متأكد من رغبتك في إلغاء هذا الطلب بالكامل؟ سيتم تسجيله كطلب ملغي في الأرشيف وتفريغ حالة الطاولة.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCancelOrderId(null)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black py-3 rounded-xl transition-all text-xs cursor-pointer font-body border border-zinc-200/80"
                >
                  تراجع
                </button>
                <button
                  onClick={async () => {
                    onUpdateStatus(cancelOrderId, 'cancelled');
                    setCancelOrderId(null);
                  }}
                  disabled={isStatusPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl transition-all text-xs cursor-pointer font-body shadow-md shadow-red-600/20"
                >
                  {isStatusPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Itemized Return / Edit Order Items Modal (Clean Light Luxury) */}
      <AnimatePresence>
        {returnOrder && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md overflow-hidden text-right shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#801B2C]/10 flex items-center justify-center text-[#801B2C]">
                    <RotateCcw className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 font-cairo">
                      تعديل أصناف / مرتجع #{returnOrder.id.slice(-6).toUpperCase()}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold font-body">قم بضبط الكميات المسترجعة</p>
                  </div>
                </div>
                <button
                  onClick={() => setReturnOrder(null)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-200/60 text-zinc-400 hover:text-zinc-800 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="p-5 overflow-y-auto space-y-3 flex-1 scrollbar-hide">
                {returnItems.map((item, idx) => {
                  const origItem = returnOrder.items.find(i => i.productId === item.productId);
                  const maxQty = origItem ? origItem.quantity : item.quantity;
                  
                  return (
                    <div key={item.productId} className="flex justify-between items-center bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5">
                      <div>
                        <span className="text-xs font-black text-zinc-900 block">{item.name}</span>
                        <span className="text-[11px] text-[#801B2C] font-black font-mono mt-0.5 block">{item.price} ج.م</span>
                      </div>
                      
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            staffAudio.play('click');
                            const newQty = Math.min(maxQty, item.quantity + 1);
                            setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
                          }}
                          className="w-8 h-8 rounded-xl bg-white hover:bg-zinc-100 text-zinc-800 flex items-center justify-center cursor-pointer border border-zinc-200 font-black text-base shadow-xs"
                        >
                          +
                        </button>
                        <span className="font-mono font-black text-zinc-900 w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            staffAudio.play('click');
                            const newQty = Math.max(0, item.quantity - 1);
                            setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
                          }}
                          className="w-8 h-8 rounded-xl bg-white hover:bg-zinc-100 text-zinc-800 flex items-center justify-center cursor-pointer border border-zinc-200 font-black text-base shadow-xs"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation & Confirm Actions */}
              <div className="p-5 border-t border-zinc-100 bg-zinc-50/70 space-y-4 font-body">
                <div className="flex justify-between items-center bg-white border border-zinc-200 px-4 py-3 rounded-2xl shadow-xs">
                  <span className="text-xs font-black text-zinc-600 font-body">إجمالي الحساب المحدث:</span>
                  <span className="font-mono text-base font-black text-emerald-600">
                    {returnItems.reduce((acc, item) => acc + item.price * item.quantity, 0)} ج.م
                  </span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCancelOrderId(returnOrder.id);
                      setReturnOrder(null);
                    }}
                    className="flex-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-black py-3 rounded-xl transition-all text-xs cursor-pointer border border-red-200 font-body"
                  >
                    إلغاء الطلب كلياً
                  </button>
                  <button
                    onClick={async () => {
                      const filteredItems = returnItems.filter(item => item.quantity > 0);
                      await onUpdateOrder(returnOrder.id, filteredItems, returnOrder.status);
                      setReturnOrder(null);
                    }}
                    disabled={isUpdatePending}
                    className="flex-1 bg-[#801B2C] hover:bg-[#962436] text-white font-black py-3 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-[#801B2C]/20 font-body"
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
