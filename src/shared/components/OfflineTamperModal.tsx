import { motion } from 'framer-motion';
import { Clock, WifiOff, ShieldAlert, CreditCard, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OfflineGuardStatus } from '../hooks/useOfflineGuard';

interface OfflineTamperModalProps {
  guardStatus: OfflineGuardStatus;
}

export default function OfflineTamperModal({ guardStatus }: OfflineTamperModalProps) {
  if (guardStatus.isOfflinePermitted && guardStatus.isOnline) {
    return null;
  }

  // If permitted offline (legitimate paying user within grace period), don't block
  if (guardStatus.isOfflinePermitted) {
    return null;
  }

  const isClockTampered = guardStatus.isClockTampered;
  const isTrialExpired = guardStatus.reason === 'trial_offline_expired';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border-2 border-red-500/30 rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-2xl space-y-6"
      >
        {/* Icon Badge */}
        <div className="w-16 h-16 bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
          {isClockTampered ? (
            <Clock className="w-8 h-8" />
          ) : isTrialExpired ? (
            <WifiOff className="w-8 h-8" />
          ) : (
            <ShieldAlert className="w-8 h-8" />
          )}
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-zinc-950">
            {isClockTampered
              ? 'تنبيه: عدم تطابق في ساعة النظام المحلي'
              : isTrialExpired
                ? 'انتهت مهلة العمل بدون إنترنت للتجربة المجانية'
                : 'توقف مؤقت: يتطلب الاتصال بالإنترنت'}
          </h2>

          <p className="text-xs text-zinc-600 leading-relaxed">
            {isClockTampered
              ? 'تم رصد تغيير في ساعة أو تاريخ الجهاز إلى وقت سابق. لحماية سجلات الطلبات والمبيعات من التلاعب، يرجى ضبط ساعة الجهاز تلقائياً وإعادة الاتصال بالإنترنت لمزامنة الخادم.'
              : isTrialExpired
                ? 'تسمح الباقة التجريبية بمهلة عمل أوفلاين مؤقتة تصل إلى 12 ساعة فقط. يرجى توصيل الجهاز بالإنترنت لمزامنة السجلات وتأكيد الحساب، أو الترقية لباقة مدفوعة للاستفادة من وضع أوفلاين ممتد (7 أيام).'
                : 'انتهت صلاحية تصريح العمل المحلي للفرع. يرجى إعادة توصيل شبكة الإنترنت لتجديد التصريح تلقائياً واستئناف العمل.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة فحص الاتصال بالإنترنت</span>
          </button>

          <Link
            to="/checkout"
            className="w-full py-3.5 bg-[#801B2C] hover:bg-[#5E1422] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <CreditCard className="w-4 h-4" />
            <span>ترقية الحساب للباقات المدفوعة (Pro / Basic)</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
