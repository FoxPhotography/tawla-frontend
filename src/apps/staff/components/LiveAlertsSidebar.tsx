import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CreditCard, Clock, X, ArrowLeft } from 'lucide-react';
import { staffAudio } from '../services/staffAudio';

export interface LiveAlert {
  id: string;
  type: 'call_waiter' | 'bill';
  tableNumber: number;
  totalAmount?: number;
  time: Date;
}

interface LiveAlertsSidebarProps {
  alerts: LiveAlert[];
  onDismissAlert: (id: string) => void;
  onSetActiveTab: (tab: 'orders' | 'tables') => void;
}

const formatAlertTime = (date: Date | string) => {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = hours.toString().padStart(2, '0');
  return `${formattedHours}:${minutes} ${ampm}`;
};

export default function LiveAlertsSidebar({ alerts, onDismissAlert, onSetActiveTab }: LiveAlertsSidebarProps) {
  return (
    <div className="w-full flex flex-col gap-4 flex-shrink-0" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 font-cairo">
          <div className="relative">
            <Bell className="w-4 h-4 text-[#801B2C]" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#801B2C] rounded-full animate-ping" />
            )}
          </div>
          <span>التنبيهات والنداءات</span>
        </h2>
        
        {alerts.length > 0 && (
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#801B2C] text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full shadow-xs"
          >
            {alerts.length} نداء
          </motion.span>
        )}
      </div>

      {/* Alerts Container */}
      <div className="flex-1 min-h-[140px] lg:min-h-0 overflow-y-auto space-y-3 bg-white border border-zinc-200/80 rounded-3xl p-4 scrollbar-hide relative shadow-sm">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <motion.div 
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ repeat: Infinity, repeatType: "mirror", duration: 3, ease: "easeInOut" }}
              className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-3 text-zinc-400"
            >
              <Bell className="w-5 h-5" />
            </motion.div>
            <p className="text-xs text-zinc-700 font-black font-cairo">كل شيء هادئ ومستقر</p>
            <p className="text-[10px] text-zinc-400 font-bold font-body mt-1">ستظهر نداءات الويتر وطلبات الحساب هنا فوراً</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {alerts.map((alert) => {
                const isBill = alert.type === 'bill';
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      scale: 1, 
                      transition: { type: "spring", stiffness: 400, damping: 28 } 
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: -50, 
                      scale: 0.9, 
                      transition: { duration: 0.18 } 
                    }}
                    whileHover={{ scale: 1.02 }}
                    key={alert.id}
                    className={`bg-white border rounded-2xl p-4 space-y-3 relative overflow-hidden transition-all hover:shadow-md ${
                      isBill 
                        ? 'border-r-4 border-r-emerald-500 border-zinc-200/90' 
                        : 'border-r-4 border-r-[#801B2C] border-zinc-200/90'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-black px-3 py-1 rounded-xl inline-flex items-center gap-1.5 font-body ${
                        isBill 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-[#801B2C]/10 text-[#801B2C] border border-[#801B2C]/20'
                      }`}>
                        {isBill ? (
                          <><CreditCard className="w-3.5 h-3.5 text-emerald-600" /> طلب حساب</>
                        ) : (
                          <><Bell className="w-3.5 h-3.5 text-[#801B2C] animate-bounce" /> نداء ويتر</>
                        )}
                      </span>

                      <button 
                        onClick={() => {
                          staffAudio.play('click');
                          onDismissAlert(alert.id);
                        }} 
                        className="text-zinc-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="إلغاء التنبيه"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-sm text-zinc-900 font-bold font-body">
                      طاولة رقم <span className="font-black text-zinc-950 text-xl font-mono mx-1">#{alert.tableNumber}</span>
                      {isBill && alert.totalAmount && (
                        <span> بمبلغ <strong className="font-black text-emerald-700 font-mono text-base">{alert.totalAmount} ج.م</strong></span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-100 text-[10px] text-zinc-400 font-body">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 font-cairo">
                        <Clock className="w-3.5 h-3.5 text-[#801B2C]" />
                        <span>{formatAlertTime(alert.time)}</span>
                      </span>
                      <button 
                        onClick={() => {
                          staffAudio.play('click');
                          onSetActiveTab('tables');
                        }}
                        className="text-[#801B2C] hover:underline font-black flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>عرض الطاولة</span>
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
