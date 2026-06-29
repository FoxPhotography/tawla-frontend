import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { QrCode } from 'lucide-react';

export default function Register() {
  return (
    <div className="min-h-screen bg-admin-bg-base text-admin-text-primary flex items-center justify-center relative overflow-hidden" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#ffffff', color: '#0f0f10', border: '1px solid rgba(0,0,0,0.08)' }
      }} />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 dot-pattern-dark opacity-60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4 my-8"
      >
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-[#B8973E]/10 border border-[#B8973E]/30 flex items-center justify-center transition-all duration-300">
            <QrCode className="w-9 h-9 text-[#B8973E]" />
          </div>
          <h1 className="text-2xl font-extrabold text-admin-text-primary mb-2">التسجيل المباشر غير متاح</h1>
          <p className="text-admin-text-secondary text-sm font-medium">
            Tawla OS - نظام إدارة المطاعم الذكي
          </p>
        </motion.div>

        {/* Register Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-admin-bg-elevated border border-admin-border rounded-xl p-8 space-y-6 shadow-admin-card text-center"
        >
          <p className="text-sm text-admin-text-primary leading-relaxed">
            عذراً، التسجيل العام للمطاعم والكافيهات مغلق حالياً. لا يمكن إنشاء حسابات جديدة إلا من خلال المشرف العام للنظام.
          </p>
          
          <div className="p-4 bg-admin-bg-base border border-admin-border rounded-lg text-xs text-admin-text-secondary leading-relaxed">
            إذا كنت تريد تسجيل مطعمك أو كافيه جديد، يرجى التواصل مع الإدارة الفنية لتفعيل حسابك فوراً وتجهيز لوحة التحكم الخاصة بك.
          </div>

          <div className="pt-4 border-t border-admin-border">
            <Link to="/admin/login" className="inline-flex w-full py-3.5 bg-admin-accent text-white font-bold rounded-lg items-center justify-center gap-2 shadow-admin-accent hover:opacity-95 transition-opacity text-sm">
              العودة لتسجيل الدخول
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
