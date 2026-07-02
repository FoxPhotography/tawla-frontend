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
      badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      label: 'PRO'
    },
    basic: {
      borderClass: 'border-l-blue-500',
      badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      label: 'BASIC'
    },
    trial: {
      borderClass: 'border-l-amber-500',
      badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      label: 'TRIAL'
    }
  };

  const currentPlan = planStyles[plan] || planStyles.trial;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`bg-admin-bg-elevated border border-admin-border ${currentPlan.borderClass} border-l-4 rounded-xl p-6 shadow-admin-card transition-all duration-300 cursor-pointer flex flex-col justify-between h-full group hover:shadow-admin-elevated hover:border-admin-accent/35 outline-none`}
    >
      <div className="space-y-5">
        {/* Header: Title and Plan Badge */}
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1 text-right">
            <h3 className="font-extrabold text-admin-text-primary text-base tracking-tight truncate group-hover:text-admin-accent transition-colors font-sans">
              {rest.name}
            </h3>
            <span className="text-xs text-admin-text-muted font-bold flex items-center gap-1 mt-1.5 truncate" dir="ltr">
              <Globe className="w-3.5 h-3.5 text-admin-accent/70 flex-shrink-0 group-hover:rotate-12 transition-transform" />
              <span>/{rest.slug}</span>
            </span>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider flex-shrink-0 border ${currentPlan.badgeClass}`}>
            {currentPlan.label}
          </span>
        </div>

        {/* Manager Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs border-t border-admin-border pt-4.5">
          <div className="text-right space-y-1">
            <span className="text-admin-text-muted font-bold block">المدير المشرف</span>
            <span className="font-black text-admin-text-secondary truncate block text-xs group-hover:text-admin-text-primary transition-colors">
              {rest.adminName || 'غير معين'}
            </span>
          </div>
          <div className="text-right space-y-1">
            <span className="text-admin-text-muted font-bold block">اسم المستخدم</span>
            <span className="font-mono text-xs text-admin-accent truncate block font-bold">
              @{rest.adminUsername || 'لا يوجد'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Expiration and Status Badge */}
      <div className="flex justify-between items-center border-t border-admin-border pt-4 mt-5 text-xs">
        <div className="text-right">
          <span className="text-admin-text-muted block font-bold mb-1">تاريخ الانتهاء</span>
          <span className={`font-mono font-black text-xs ${isExpired ? 'text-red-500' : 'text-emerald-650'}`}>
            {expires.toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
          </span>
        </div>

        {/* Status indicator */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
          isExpired 
            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
          <span>{isExpired ? 'منتهي' : 'نشط'}</span>
        </span>
      </div>
    </motion.div>
  );
}
