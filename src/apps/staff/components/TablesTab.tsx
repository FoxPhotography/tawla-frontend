import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
  Printer, PlusCircle, Clock, X, CheckCheck, 
  Banknote, CreditCard, Smartphone, Utensils,
  Users
} from 'lucide-react';
import type { Table, Order } from '../../../shared/types';
import { staffAudio } from '../services/staffAudio';

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
      staggerChildren: 0.05
    }
  }
};

const cardVariants: Variants = {
  hidden: { y: 18, opacity: 0, scale: 0.96 },
  show: { 
    y: 0, 
    opacity: 1, 
    scale: 1, 
    transition: { type: "spring", stiffness: 350, damping: 26 } 
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
    <div className="flex-1 overflow-y-auto pr-1 pb-16 scrollbar-thin scrollbar-thumb-zinc-200 min-h-0" dir="rtl">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5.5 items-stretch"
      >
      {tables.length === 0 ? (
        <motion.div 
          variants={cardVariants}
          className="col-span-full bg-white border border-zinc-200/80 rounded-3xl p-16 text-center shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <Utensils className="w-7 h-7 text-[#801B2C]/40" />
          </div>
          <p className="text-zinc-900 font-black text-sm font-cairo">لا توجد طاولات مضافة للنظام</p>
          <p className="text-xs text-zinc-500 mt-1 font-body">تواصل مع مدير النظام لإضافة طاولات جديدة للمطعم.</p>
        </motion.div>
      ) : (
        tables.map((table: Table) => {
          const isOccupied = table.status === 'occupied';
          const isWaitingBill = table.status === 'waitingBill';
          const isEmpty = table.status === 'empty';
          
          // Find active order associated with this table
          const activeOrder = !isEmpty ? orders.find(o => 
            (table.currentOrderId && o.id === table.currentOrderId) || 
            (o.tableNumber === table.number && ['pending', 'accepted', 'preparing', 'ready'].includes(o.status))
          ) : undefined;

          // Elapsed time
          const elapsedMins = activeOrder 
            ? Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / (60 * 1000))
            : 0;

          return (
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -5, boxShadow: "0 16px 32px -6px rgba(0, 0, 0, 0.08)" }}
              key={table.id}
              className={`bg-white rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden border shadow-xs ${
                isWaitingBill
                  ? 'border-amber-300 ring-2 ring-amber-400/20 bg-gradient-to-b from-amber-50/25 to-white'
                  : isOccupied
                  ? 'border-[#801B2C]/30 ring-1 ring-[#801B2C]/10 bg-gradient-to-b from-[#801B2C]/[0.02] to-white'
                  : 'border-zinc-200/90 hover:border-[#801B2C]/30 bg-white'
              }`}
            >
              {/* Top Accent Stripe */}
              <div className={`absolute top-0 inset-x-0 h-1.5 ${
                isWaitingBill 
                  ? 'bg-amber-500 animate-pulse' 
                  : isOccupied 
                  ? 'bg-[#801B2C]' 
                  : 'bg-[#801B2C]/30'
              }`} />

              <div className="space-y-4">
                {/* Header with Luxury Table Motif */}
                <div className="flex justify-between items-center pt-1">
                  
                  {/* Table Graphic Avatar */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {/* 4 chair dots around table */}
                      <span className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-1 rounded-full ${
                        isWaitingBill ? 'bg-amber-400' : isOccupied ? 'bg-[#801B2C]' : 'bg-[#801B2C]/30'
                      }`} />
                      <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-1 rounded-full ${
                        isWaitingBill ? 'bg-amber-400' : isOccupied ? 'bg-[#801B2C]' : 'bg-[#801B2C]/30'
                      }`} />
                      <span className={`absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-2.5 rounded-full ${
                        isWaitingBill ? 'bg-amber-400' : isOccupied ? 'bg-[#801B2C]' : 'bg-[#801B2C]/30'
                      }`} />
                      <span className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-2.5 rounded-full ${
                        isWaitingBill ? 'bg-amber-400' : isOccupied ? 'bg-[#801B2C]' : 'bg-[#801B2C]/30'
                      }`} />

                      {/* Main Table Disk */}
                      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border shadow-inner transition-all ${
                        isWaitingBill
                          ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-amber-200/50'
                          : isOccupied
                          ? 'bg-[#801B2C]/10 border-[#801B2C]/25 text-[#801B2C]'
                          : 'bg-[#801B2C]/5 border-[#801B2C]/15 text-[#801B2C]'
                      }`}>
                        <span className="text-[10px] font-bold opacity-70 leading-none font-body">طاولة</span>
                        <span className="font-mono text-base font-black leading-none mt-0.5">{table.number}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-black text-zinc-900 text-sm font-cairo">
                        {table.label || `طاولة ضيوف #${table.number}`}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold font-body mt-0.5">
                        <Users className="w-3 h-3 text-zinc-400" />
                        <span>طاولة طعام داخلية</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-2xl border font-body flex items-center gap-1.5 ${
                    isWaitingBill
                      ? 'bg-amber-100/90 text-amber-900 border-amber-300 shadow-xs animate-pulse font-black'
                      : isOccupied
                      ? 'bg-[#801B2C]/10 text-[#801B2C] border-[#801B2C]/20 font-black'
                      : 'bg-[#801B2C]/5 text-[#801B2C] border-[#801B2C]/15 font-bold'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      isWaitingBill ? 'bg-amber-500 animate-ping' : isOccupied ? 'bg-[#801B2C]' : 'bg-[#801B2C]/60'
                    }`} />
                    <span>{isWaitingBill ? 'طلب الحساب 💳' : isOccupied ? 'مشغولة' : 'متاحة'}</span>
                  </span>
                </div>

                {/* Occupied Details Container */}
                {activeOrder ? (
                  <div className="space-y-3 pt-1">
                    {/* Live Timing & Order ID */}
                    <div className="flex justify-between items-center text-xs text-zinc-500 border-b border-zinc-100 pb-2 font-body font-bold">
                      <span className="font-mono text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-lg text-[11px]">
                        #{activeOrder.id.slice(-5).toUpperCase()}
                      </span>
                      <span className="font-mono flex items-center gap-1 text-[11px] text-zinc-600">
                        <Clock className={`w-3.5 h-3.5 ${elapsedMins > 45 ? 'text-red-500' : 'text-[#801B2C]'}`} />
                        <span>منذ {elapsedMins} دقيقة</span>
                      </span>
                    </div>

                    {/* Ordered Items Pill Tray */}
                    <div className="bg-zinc-50 border border-zinc-200/70 rounded-2xl p-3 space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-hide">
                      <div className="flex justify-between items-center mb-1 text-[10px] text-zinc-400 font-bold font-body">
                        <span>أصناف الطلب:</span>
                        <span>({activeOrder.items?.length || 0} أصناف)</span>
                      </div>
                      {activeOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs font-bold font-body">
                          <span className="text-zinc-800 line-clamp-1">{item.name}</span>
                          <span className="text-zinc-900 font-mono font-black bg-white px-2 py-0.5 rounded-md border border-zinc-200 text-[10px] shadow-xs">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total Price Banner */}
                    <div className="flex justify-between items-center bg-zinc-50 px-3.5 py-2.5 rounded-2xl border border-zinc-200/80 font-body">
                      <span className="text-xs font-bold text-zinc-600">المبلغ الإجمالي:</span>
                      <span className="font-mono font-black text-[#801B2C] text-sm">{activeOrder.totalAmount} ج.م</span>
                    </div>
                  </div>
                ) : (
                  !isEmpty ? (
                    <div className="p-3.5 bg-zinc-50 rounded-2xl text-center text-xs text-zinc-500 font-bold font-body border border-zinc-100">
                      لا توجد أصناف مسجلة
                    </div>
                  ) : (
                    /* Available Empty State Banner */
                    <div className="py-5 px-3 bg-[#801B2C]/[0.03] rounded-2xl border border-[#801B2C]/10 text-center space-y-1">
                      <p className="text-xs text-[#801B2C] font-bold font-body">
                        طاولة فارغة ومتاحة للعملاء
                      </p>
                      <p className="text-[10px] text-zinc-500 font-bold font-body">جاهزة لاستقبال الزبائن والبدء في تسجيل الطلب</p>
                    </div>
                  )
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-zinc-100">
                {!isEmpty ? (
                  <div className="flex gap-2 items-center">
                    {/* Print bill icon button */}
                    <motion.button
                      onClick={() => {
                        staffAudio.play('action');
                        onPrintReceipt(activeOrder);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-all shadow-xs flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="طباعة الفاتورة"
                    >
                      <Printer className="w-4 h-4" />
                    </motion.button>

                    {/* Add / Edit Order to Table */}
                    <motion.button
                      onClick={() => onStartOrderForTable(table.number)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 bg-[#801B2C]/5 hover:bg-[#801B2C] text-[#801B2C] hover:text-white border border-[#801B2C]/20 hover:border-[#801B2C] text-xs font-bold py-3 px-3.5 rounded-2xl transition-all shadow-xs flex items-center justify-center gap-1.5 font-body cursor-pointer min-h-[42px]"
                    >
                      <span>إضافة طلب</span>
                      <PlusCircle className="w-4 h-4" />
                    </motion.button>

                    {/* Empty table checkout button */}
                    <motion.button
                      onClick={() => {
                        staffAudio.play('click');
                        setCheckoutTable(table);
                      }}
                      disabled={isEmptyTablePending}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      className="p-3 rounded-2xl border border-[#801B2C]/20 bg-[#801B2C]/5 text-[#801B2C] hover:bg-[#801B2C] hover:text-white transition-all shadow-xs flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="تسوية الحساب وتفريغ الطاولة"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    onClick={() => onStartOrderForTable(table.number)}
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 20px -4px rgba(128, 27, 44, 0.25)' }}
                    whileTap={{ scale: 0.96 }}
                    className="w-full bg-[#801B2C] hover:bg-[#962436] text-white font-bold py-3.5 px-5 rounded-2xl shadow-md shadow-[#801B2C]/15 text-xs flex items-center justify-center gap-2 cursor-pointer border border-[#801B2C] font-body min-h-[44px] transition-all"
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
      </motion.div>

      {/* Checkout Modal (Clean Light Luxury Dialog) */}
      <AnimatePresence>
        {checkoutTable && (() => {
          const activeOrder = orders.find(o => 
            (checkoutTable.currentOrderId && o.id === checkoutTable.currentOrderId) || 
            (o.tableNumber === checkoutTable.number && ['pending', 'accepted', 'preparing', 'ready'].includes(o.status))
          );
          
          return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md overflow-hidden text-right shadow-2xl"
              >
                {/* Header */}
                <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#801B2C]/10 flex items-center justify-center text-[#801B2C] border border-[#801B2C]/20">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 font-cairo">
                        تسوية حساب طاولة رقم {checkoutTable.number}
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold font-body">تأكيد طريقة الدفع وإتاحة الطاولة</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCheckoutTable(null)}
                    className="w-8 h-8 rounded-full hover:bg-zinc-200/60 text-zinc-400 hover:text-zinc-800 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                  {/* Order Total Display */}
                  <div className="bg-[#801B2C]/5 border border-[#801B2C]/15 rounded-2xl p-5 text-center space-y-1 shadow-inner">
                    <span className="text-xs font-black text-[#801B2C] font-body block">إجمالي المبلغ المطلوب تحصيله</span>
                    <span className="font-mono font-black text-3xl text-[#801B2C] leading-none inline-block mt-1">
                      {activeOrder ? activeOrder.totalAmount : 0} <span className="text-sm font-bold">ج.م</span>
                    </span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-zinc-700 font-body">طريقة الدفع المستلمة:</label>
                    <div className="grid grid-cols-3 gap-2.5 bg-zinc-50 p-2 rounded-2xl border border-zinc-200/80">
                      
                      {/* Cash */}
                      <button
                        type="button"
                        onClick={() => {
                          staffAudio.play('click');
                          setPaymentMethod('cash');
                        }}
                        className={`py-3.5 px-3 text-xs font-bold rounded-2xl transition-all cursor-pointer font-body border flex flex-col items-center gap-2 ${
                          paymentMethod === 'cash'
                            ? 'bg-white text-[#801B2C] border-[#801B2C] shadow-md shadow-[#801B2C]/10 font-bold'
                            : 'text-zinc-600 hover:text-zinc-950 border-transparent hover:bg-white/60'
                        }`}
                      >
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <span>نقدي Cash</span>
                      </button>

                      {/* Card */}
                      <button
                        type="button"
                        onClick={() => {
                          staffAudio.play('click');
                          setPaymentMethod('card');
                        }}
                        className={`py-3.5 px-3 text-xs font-bold rounded-2xl transition-all cursor-pointer font-body border flex flex-col items-center gap-2 ${
                          paymentMethod === 'card'
                            ? 'bg-white text-[#801B2C] border-[#801B2C] shadow-md shadow-[#801B2C]/10 font-bold'
                            : 'text-zinc-600 hover:text-zinc-950 border-transparent hover:bg-white/60'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <span>فيزا Card</span>
                      </button>

                      {/* Wallet */}
                      <button
                        type="button"
                        onClick={() => {
                          staffAudio.play('click');
                          setPaymentMethod('wallet');
                        }}
                        className={`py-3.5 px-3 text-xs font-bold rounded-2xl transition-all cursor-pointer font-body border flex flex-col items-center gap-2 ${
                          paymentMethod === 'wallet'
                            ? 'bg-white text-[#801B2C] border-[#801B2C] shadow-md shadow-[#801B2C]/10 font-bold'
                            : 'text-zinc-600 hover:text-zinc-950 border-transparent hover:bg-white/60'
                        }`}
                      >
                        <Smartphone className="w-5 h-5 text-purple-600" />
                        <span>محفظة Wallet</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-zinc-100 bg-zinc-50/80 flex gap-3">
                  <button
                    onClick={() => setCheckoutTable(null)}
                    className="flex-1 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold py-3.5 px-4 rounded-2xl transition-all text-xs cursor-pointer font-body"
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
                    className="flex-1 bg-[#801B2C] hover:bg-[#962436] text-white font-bold py-3.5 px-4 rounded-2xl transition-all text-xs cursor-pointer font-body shadow-md shadow-[#801B2C]/20"
                  >
                    {isEmptyTablePending ? 'جاري الإنهاء...' : 'تأكيد الدفع وإتاحة الطاولة'}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
