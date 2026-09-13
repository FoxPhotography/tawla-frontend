import { motion } from 'framer-motion';
import { Coffee, Activity, Key, KeyRound } from 'lucide-react';

interface StatsGridProps {
  restaurantsCount: number;
  activeSubscriptionsCount: number;
  totalSerialsCount: number;
  unusedSerialsCount: number;
  loadingRest: boolean;
  loadingSerials: boolean;
  pendingTxCount?: number;
  onOpenTransactions?: () => void;
}

export default function StatsGrid({
  restaurantsCount,
  activeSubscriptionsCount,
  totalSerialsCount,
  unusedSerialsCount,
  loadingRest,
  loadingSerials,
  pendingTxCount = 0,
  onOpenTransactions
}: StatsGridProps) {
  const stats = [
    { 
      label: 'إجمالي الكافيهات والمطاعم', 
      value: restaurantsCount, 
      icon: Coffee, 
      color: 'text-[#801B2C]', 
      bg: 'from-[#801B2C]/5 to-transparent', 
      border: 'border-[#801B2C]/10' 
    },
    { 
      label: 'الاشتراكات النشطة حالياً', 
      value: activeSubscriptionsCount, 
      icon: Activity, 
      color: 'text-emerald-400', 
      bg: 'from-emerald-500/5 to-transparent', 
      border: 'border-emerald-500/10' 
    },
    { 
      label: 'أكواد التفعيل المصدرة', 
      value: totalSerialsCount, 
      icon: Key, 
      color: 'text-[#962436]', 
      bg: 'from-[#801B2C]/5 to-transparent', 
      border: 'border-[#801B2C]/10' 
    },
    { 
      label: 'أكواد تفعيل غير مستخدمة', 
      value: unusedSerialsCount, 
      icon: KeyRound, 
      color: 'text-amber-400', 
      bg: 'from-amber-500/5 to-transparent', 
      border: 'border-amber-500/10' 
    }
  ];

  return (
    <div className="space-y-4">
      {/* Clickable Pending Transactions Alert Banner */}
      {pendingTxCount > 0 && onOpenTransactions && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onOpenTransactions}
          className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/15 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-sm animate-pulse">
              {pendingTxCount}
            </div>
            <div className="text-right">
              <h4 className="text-xs font-black text-amber-950 dark:text-amber-100">
                يوجد {pendingTxCount} معاملة دفع وتحويل بنكي/محافظ بانتظار المراجعة والاعتماد!
              </h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-0.5 font-medium">
                اضغط هنا فوراً لفتح تبويب "المدفوعات والتحويلات" لمراجعة تفاصيل السداد واعتماد تفعيل الاشتراك بنقرة واحدة.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTransactions();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            مراجعة المعاملات الآن ←
          </button>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const isLoading = stat.icon === Coffee || stat.icon === Activity ? loadingRest : loadingSerials;

        return (
          <motion.div 
            key={idx}
            whileHover={{ y: -2, scale: 1.01, transition: { duration: 0.15 } }}
            className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-admin-card flex items-center justify-between group transition-all duration-300 hover:shadow-admin-elevated cursor-pointer"
          >
            <div className="space-y-1.5 text-right">
              <span className="text-xs font-bold text-admin-text-secondary block">{stat.label}</span>
              <span className="text-2xl font-black text-admin-text-primary tracking-tight block font-mono">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  stat.value
                )}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-admin-accent/10 border border-admin-accent/5 flex items-center justify-center text-admin-accent group-hover:scale-105 transition-transform shadow-sm flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          </motion.div>
        );
      })}
      </motion.div>
    </div>
  );
}
