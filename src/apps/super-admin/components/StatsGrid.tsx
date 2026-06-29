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
      color: 'text-indigo-400', 
      bg: 'from-indigo-500/5 to-transparent', 
      border: 'border-indigo-500/10' 
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
      color: 'text-violet-400', 
      bg: 'from-violet-500/5 to-transparent', 
      border: 'border-violet-500/10' 
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
            className={`bg-slate-900 border ${stat.border} bg-gradient-to-b ${stat.bg} rounded-2xl p-5 shadow-md flex items-center justify-between group transition-all duration-300 hover:shadow-lg`}
          >
            <div className="space-y-1.5 text-right">
              <span className="text-xs font-black text-slate-400 block">{stat.label}</span>
              <span className="text-2xl font-black text-white tracking-tight block font-mono">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  stat.value
                )}
              </span>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-slate-950/60 border ${stat.border} flex items-center justify-center ${stat.color} group-hover:scale-105 transition-transform shadow-inner`}>
              <Icon className="w-5 h-5" />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
