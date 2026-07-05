import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { MapPin, User, Printer, PlusCircle, Clock, XCircle, CheckCheck } from 'lucide-react';
import type { Table, Order } from '../../../shared/types';

interface TablesTabProps {
  tables: Table[];
  orders: Order[];
  onEmptyTable: (tableId: string, paymentMethod: 'cash' | 'card' | 'wallet') => void;
  isEmptyTablePending: boolean;
  onStartOrderForTable: (tableNumber: number) => void;
  onPrintReceipt: (order: any) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const cardVariants: Variants = {
  hidden: { y: 15, opacity: 0, scale: 0.96 },
  show: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 } 
  }
};

export default function TablesTab({
  tables,
  orders,
  onEmptyTable,
  isEmptyTablePending,
  onStartOrderForTable,
  onPrintReceipt
}: TablesTabProps) {
  const [checkoutTable, setCheckoutTable] = useState<Table | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 pb-12"
    >
      {tables.length === 0 ? (
        <motion.div 
          variants={cardVariants}
          className="col-span-full bg-staff-bg-elevated border border-staff-border rounded-2xl p-16 text-center shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-staff-bg-panel border border-staff-border flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7 text-staff-text-muted" />
          </div>
          <p className="text-staff-text-secondary font-bold text-sm">لا توجد طاولات مضافة للنظام</p>
          <p className="text-xs text-staff-text-muted mt-1">تواصل مع مدير النظام لإضافة طاولات للمطعم.</p>
        </motion.div>
      ) : (
        tables.map((table: Table) => {
          const isOccupied = table.status === 'occupied';
          const isWaitingBill = table.status === 'waitingBill';
          const isEmpty = table.status === 'empty';
          
          // Find active order associated with this table (only if table is not empty)
          const activeOrder = !isEmpty ? orders.find(o => 
            (table.currentOrderId && o.id === table.currentOrderId) || 
            (o.tableNumber === table.number && ['pending', 'accepted', 'preparing', 'ready'].includes(o.status))
          ) : undefined;

          let cardBorder = 'border-staff-border';
          let statusBadge = 'bg-staff-bg-panel text-staff-text-secondary border-staff-border';
          let statusText = 'متاحة';
          
          if (isOccupied) {
            cardBorder = 'border-t-4 border-t-staff-text-primary shadow-sm';
            statusBadge = 'bg-staff-text-primary/10 text-staff-text-primary border-staff-text-primary/10 font-black';
            statusText = 'مشغولة';
          } else if (isWaitingBill) {
            cardBorder = 'border-t-4 border-t-staff-accent shadow-sm shadow-staff-accent/5';
            statusBadge = 'bg-staff-accent-soft text-staff-accent border-staff-accent-glow font-black animate-pulse';
            statusText = '💳 طلب الحساب';
          }

          // Calculate elapsed minutes since order creation
          const elapsedMins = activeOrder 
            ? Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / (60 * 1000))
            : 0;

          return (
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4, boxShadow: "0 12px 28px -5px rgba(0, 0, 0, 0.06)" }}
              key={table.id}
              className={`bg-staff-bg-elevated border ${cardBorder} rounded-2xl p-5 flex flex-col justify-between gap-5 transition-shadow relative overflow-hidden`}
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-staff-text-primary text-xl font-mono leading-none">طاولة {table.number}</h3>
                    {table.label && (
                      <p className="text-xs text-staff-text-muted mt-1.5 font-bold">{table.label}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusBadge}`}>
                    {statusText}
                  </span>
                </div>

                {/* Occupied Details Container */}
                {activeOrder ? (
                  <div className="mt-4 space-y-3.5">
                    {/* Order summary info */}
                    <div className="flex justify-between items-center text-[10px] text-staff-text-muted border-b border-staff-border/40 pb-2">
                      <span className="font-mono font-bold">#{activeOrder.id.slice(-6).toUpperCase()}</span>
                      <span className="font-mono font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {elapsedMins} دقيقة
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="bg-staff-bg-panel/50 border border-staff-border/60 rounded-xl p-3 space-y-2 max-h-[120px] overflow-y-auto scrollbar-hide">
                      {activeOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs font-bold font-body">
                          <span className="text-staff-text-secondary line-clamp-1">{item.name}</span>
                          <span className="text-staff-text-primary font-mono bg-staff-bg-panel px-1.5 py-0.5 rounded border border-staff-border/30 text-[10px]">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total Price display */}
                    <div className="flex justify-between items-center bg-staff-bg-panel px-3 py-2 rounded-xl border border-staff-border/40 font-body">
                      <span className="text-[10px] font-bold text-staff-text-secondary">الحساب الإجمالي:</span>
                      <span className="font-mono font-black text-staff-accent text-sm">{activeOrder.totalAmount} ج.م</span>
                    </div>
                  </div>
                ) : (
                  !isEmpty && (
                    <div className="mt-4 p-3 bg-staff-bg-panel rounded-xl text-center text-xs text-staff-text-secondary font-bold font-body">
                      لا توجد تفاصيل طلب نشطة
                    </div>
                  )
                )}

                {/* Available Status badge */}
                {isEmpty && (
                  <div className="flex items-center gap-2.5 mt-5">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10 font-bold font-body">
                      <User className="w-3.5 h-3.5 text-emerald-500" />
                      <span>متاحة للعملاء</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {!isEmpty ? (
                  <div className="flex gap-2">
                    {/* Print bill icon button */}
                    <motion.button
                      onClick={() => onPrintReceipt(activeOrder)}
                      whileTap={{ scale: 0.92 }}
                      className="p-3 rounded-lg border border-staff-border bg-staff-bg-panel text-staff-text-primary hover:bg-staff-text-primary hover:text-white hover:border-staff-text-primary transition-all shadow-sm flex items-center justify-center flex-shrink-0"
                      title="طباعة الفاتورة"
                    >
                      <Printer className="w-4 h-4" />
                    </motion.button>

                    {/* Add / Edit Order to Table */}
                    <motion.button
                      onClick={() => onStartOrderForTable(table.number)}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 bg-staff-accent-soft hover:bg-staff-accent text-staff-accent hover:text-white border border-staff-accent-glow hover:border-staff-accent text-xs font-black py-2.5 px-4 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 font-body"
                    >
                      <span>تسجيل طلب</span>
                      <PlusCircle className="w-4 h-4" />
                    </motion.button>

                    {/* Empty table checkout button */}
                    <motion.button
                      onClick={() => setCheckoutTable(table)}
                      disabled={isEmptyTablePending}
                      whileTap={{ scale: 0.92 }}
                      className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm flex items-center justify-center flex-shrink-0 cursor-pointer animate-pulse"
                      title="تسوية الحساب وتفريغ الطاولة"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    onClick={() => onStartOrderForTable(table.number)}
                    whileTap={{ scale: 0.96 }}
                    className="w-full bg-staff-accent hover:bg-staff-accent/90 text-white font-black py-3 rounded-lg shadow-sm text-xs flex items-center justify-center gap-2 cursor-pointer border border-staff-accent-glow font-body"
                  >
                    <span>فتح طلب جديد</span>
                    <PlusCircle className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })
      )}

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutTable && (() => {
          const activeOrder = orders.find(o => 
            (checkoutTable.currentOrderId && o.id === checkoutTable.currentOrderId) || 
            (o.tableNumber === checkoutTable.number && ['pending', 'accepted', 'preparing', 'ready'].includes(o.status))
          );
          
          return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-[#0C0C0D] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden text-right shadow-2xl"
              >
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#09090B]">
                  <h3 className="text-sm font-black text-white font-body flex items-center gap-2">
                    <span className="text-staff-accent">💵</span>
                    <span>تسوية حساب طاولة {checkoutTable.number}</span>
                  </h3>
                  <button
                    onClick={() => setCheckoutTable(null)}
                    className="w-8 h-8 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                  {/* Order Total Display */}
                  <div className="bg-[#161618] border border-white/5 rounded-2xl p-5 text-center space-y-1">
                    <span className="text-[10px] font-black text-zinc-400 font-body block">إجمالي المبلغ المطلوب دفعه</span>
                    <span className="font-mono font-black text-3xl text-lime-400 leading-none">
                      {activeOrder ? activeOrder.totalAmount : 0} <span className="text-xs font-bold">ج.م</span>
                    </span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-400 font-body">طريقة الدفع المستلمة:</label>
                    <div className="grid grid-cols-3 gap-2 bg-[#161618] p-1.5 rounded-xl border border-white/5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`py-3 text-xs font-black rounded-lg transition-all cursor-pointer font-body border flex flex-col items-center gap-1.5 ${
                          paymentMethod === 'cash'
                            ? 'bg-staff-accent/10 text-staff-accent border-staff-accent/40 shadow-md font-bold shadow-staff-accent/5'
                            : 'text-zinc-400 hover:text-white border-transparent'
                        }`}
                      >
                        <span className="text-base">💵</span>
                        <span>نقدي Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`py-3 text-xs font-black rounded-lg transition-all cursor-pointer font-body border flex flex-col items-center gap-1.5 ${
                          paymentMethod === 'card'
                            ? 'bg-staff-accent/10 text-staff-accent border-staff-accent/40 shadow-md font-bold shadow-staff-accent/5'
                            : 'text-zinc-400 hover:text-white border-transparent'
                        }`}
                      >
                        <span className="text-base">💳</span>
                        <span>فيزا Visa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('wallet')}
                        className={`py-3 text-xs font-black rounded-lg transition-all cursor-pointer font-body border flex flex-col items-center gap-1.5 ${
                          paymentMethod === 'wallet'
                            ? 'bg-staff-accent/10 text-staff-accent border-staff-accent/40 shadow-md font-bold shadow-staff-accent/5'
                            : 'text-zinc-400 hover:text-white border-transparent'
                        }`}
                      >
                        <span className="text-base">📱</span>
                        <span>محفظة Wallet</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-white/5 bg-[#09090B] flex gap-3">
                  <button
                    onClick={() => setCheckoutTable(null)}
                    className="flex-1 bg-[#161618] border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white font-black py-3 rounded-lg transition-all text-xs cursor-pointer font-body"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      if (activeOrder) {
                        onPrintReceipt(activeOrder);
                      }
                      onEmptyTable(checkoutTable.id, paymentMethod);
                      setCheckoutTable(null);
                    }}
                    disabled={isEmptyTablePending}
                    className="flex-1 bg-staff-accent hover:bg-staff-accent/90 text-white font-black py-3 rounded-lg transition-all text-xs cursor-pointer font-body border border-staff-accent shadow-lg shadow-staff-accent/10"
                  >
                    {isEmptyTablePending ? 'جاري الإنهاء...' : 'تأكيد الدفع وإتاحة الطاولة'}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
