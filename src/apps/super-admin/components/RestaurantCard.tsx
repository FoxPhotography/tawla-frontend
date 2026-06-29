import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

interface RestaurantCardProps {
  rest: any;
  onClick: () => void;
}

export default function RestaurantCard({ rest, onClick }: RestaurantCardProps) {
  const expires = new Date(rest.subscription.expiresAt);
  const isExpired = expires < new Date() || rest.subscription.status === 'expired';
  const plan = rest.subscription.plan as 'trial' | 'basic' | 'pro';

  const planStyles = {
    pro: {
      borderClass: 'border-l-purple-500',
      badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      label: 'PRO'
    },
    basic: {
      borderClass: 'border-l-blue-500',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      label: 'BASIC'
    },
    trial: {
      borderClass: 'border-l-amber-500',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      label: 'TRIAL'
    }
  };

  const currentPlan = planStyles[plan] || planStyles.trial;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`bg-slate-900/50 border border-slate-800/80 ${currentPlan.borderClass} border-l-4 rounded-2xl p-6 shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between h-full group hover:shadow-[0_8px_32px_rgba(99,102,241,0.06)] hover:border-indigo-500/30 outline-none`}
    >
      <div className="space-y-5">
        {/* Header: Title and Plan Badge */}
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1 text-right">
            <h3 className="font-black text-white text-base tracking-tight truncate group-hover:text-indigo-400 transition-colors">
              {rest.name}
            </h3>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-1.5 truncate" dir="ltr">
              <Globe className="w-3.5 h-3.5 text-indigo-500/70 flex-shrink-0 group-hover:rotate-12 transition-transform" />
              <span>/{rest.slug}</span>
            </span>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-wider flex-shrink-0 border ${currentPlan.badgeClass}`}>
            {currentPlan.label}
          </span>
        </div>

        {/* Manager Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs border-t border-slate-800/40 pt-4.5">
          <div className="text-right space-y-1">
            <span className="text-slate-400 font-bold block">المدير المشرف</span>
            <span className="font-black text-slate-200 truncate block text-xs group-hover:text-white transition-colors">
              {rest.adminName || 'غير معين'}
            </span>
          </div>
          <div className="text-right space-y-1">
            <span className="text-slate-400 font-bold block">اسم المستخدم</span>
            <span className="font-mono text-xs text-indigo-400 truncate block font-bold">
              @{rest.adminUsername || 'لا يوجد'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Expiration and Status Badge */}
      <div className="flex justify-between items-center border-t border-slate-800/40 pt-4 mt-5 text-xs">
        <div className="text-right">
          <span className="text-slate-400 block font-bold mb-1">تاريخ الانتهاء</span>
          <span className={`font-mono font-black text-xs ${isExpired ? 'text-rose-455' : 'text-emerald-400'}`}>
            {expires.toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
          </span>
        </div>

        {/* Status indicator */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
          isExpired 
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
          <span>{isExpired ? 'منتهي' : 'نشط'}</span>
        </span>
      </div>
    </motion.div>
  );
}
