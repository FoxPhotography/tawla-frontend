import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CreditCard, Clock, XCircle } from 'lucide-react';

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

export default function LiveAlertsSidebar({ alerts, onDismissAlert, onSetActiveTab }: LiveAlertsSidebarProps) {
  return (
    <div className="w-full lg:w-80 flex flex-col gap-5 flex-shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black text-staff-text-primary uppercase tracking-widest flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-staff-accent" />
            {alerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-staff-accent rounded-full animate-ping" />
            )}
          </div>
          <span>التنبيهات المباشرة</span>
        </h2>
        {alerts.length > 0 && (
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-staff-accent text-white text-[10px] font-black px-2.5 py-0.5 rounded-full"
          >
            {alerts.length} نداء
          </motion.span>
        )}
      </div>

      <div className="flex-1 min-h-[140px] lg:min-h-0 overflow-y-auto space-y-3 bg-staff-bg-elevated border border-staff-border rounded-2xl p-4 scrollbar-hide relative shadow-sm">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <motion.div 
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ repeat: Infinity, repeatType: "mirror", duration: 2.5, ease: "easeInOut" }}
              className="w-12 h-12 rounded-full bg-staff-bg-panel border border-staff-border flex items-center justify-center mb-3"
            >
              <Bell className="w-5 h-5 text-staff-text-muted" />
            </motion.div>
            <p className="text-xs text-staff-text-muted font-bold">كل شيء هادئ هنا</p>
            <p className="text-[10px] text-staff-text-muted/60 mt-1">ستظهر النداءات المباشرة هنا فوراً</p>
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
                      transition: { type: "spring", stiffness: 380, damping: 30 }
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: -50, 
                      scale: 0.9,
                      transition: { duration: 0.2 }
                    }}
                    whileHover={{ scale: 1.02 }}
                    key={alert.id}
                    className={`bg-staff-bg-elevated border rounded-xl p-4 space-y-3 relative overflow-hidden transition-shadow hover:shadow-md ${
                      isBill 
                        ? 'border-l-4 border-l-emerald-500 border-staff-border' 
                        : 'border-l-4 border-l-staff-accent border-staff-border'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                        isBill 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/15' 
                          : 'bg-staff-accent-soft text-staff-accent border border-staff-accent-glow'
                      }`}>
                        {isBill ? (
                          <><CreditCard className="w-3 h-3" /> طلب حساب</>
                        ) : (
                          <><Bell className="w-3 h-3" /> نداء ويتر</>
                        )}
                      </span>
                      <button 
                        onClick={() => onDismissAlert(alert.id)} 
                        className="text-staff-text-muted hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-500/5"
                        title="إلغاء التنبيه"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-sm text-staff-text-primary font-bold">
                      طاولة رقم <span className="font-black text-staff-text-primary text-xl font-mono mx-1">{alert.tableNumber}</span>
                      {isBill && alert.totalAmount && (
                        <span> بمبلغ <span className="font-extrabold text-emerald-600 font-mono">{alert.totalAmount} ج.م</span></span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-staff-border/40 text-[10px] text-staff-text-muted">
                      <span className="flex items-center gap-1 font-mono font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button 
                        onClick={() => onSetActiveTab('tables')}
                        className="text-staff-accent hover:underline font-bold"
                      >
                        عرض الطاولة ←
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
