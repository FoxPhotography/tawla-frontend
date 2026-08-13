import { motion } from 'framer-motion';
import { Coffee, Activity, Key, Sparkles } from 'lucide-react';

interface StatsGridProps {
  restaurantsCount: number;
  activeSubscriptionsCount: number;
  totalSerialsCount: number;
  unusedSerialsCount: number;
  loadingRest: boolean;
  loadingSerials: boolean;
}

export default function StatsGrid({
  restaurantsCount,
  activeSubscriptionsCount,
  totalSerialsCount,
  unusedSerialsCount,
  loadingRest,
  loadingSerials
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
      icon: Sparkles, 
      color: 'text-amber-400', 
      bg: 'from-amber-500/5 to-transparent', 
      border: 'border-amber-500/10' 
    }
  ];

  return (
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
  );
}
