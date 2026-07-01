import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';

interface OrderConfirmationModalProps {
  order: {
    id: string;
    tableNumber?: number;
    [key: string]: any;
  } | null;
  onTrack: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
} as const;

const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 }
  }
} as const;

const iconCircleVariants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { type: "spring", stiffness: 280, damping: 20 }
  }
} as const;

const checkmarkPathVariants = {
  hidden: { pathLength: 0 },
  visible: {
    pathLength: 1,
    transition: { duration: 0.5, ease: "easeOut", delay: 0.3 }
  }
} as const;

// Generates random directional vectors for burst particles
const particles = [
  { x: -35, y: -35 },
  { x: 35, y: -35 },
  { x: -45, y: 10 },
  { x: 45, y: 10 },
  { x: -20, y: 40 },
  { x: 20, y: 40 },
  { x: 0, y: -50 }
];

export default function OrderConfirmationModal({ order, onTrack }: OrderConfirmationModalProps) {
  if (!order) return null;

  const displayId = order.id.slice(-6).toUpperCase();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="fixed inset-0 bg-zinc-50 z-[100] flex flex-col items-center justify-center p-6 text-zinc-900 text-right overflow-y-auto"
      dir="rtl"
    >
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-1/4 -right-1/4 w-[350px] h-[350px] rounded-full bg-orange-500/5 blur-[100px]" />
        <div className="absolute bottom-1/4 -left-1/4 w-[350px] h-[350px] rounded-full bg-zinc-200/50 blur-[100px]" />
      </div>

      <div className="w-full max-w-[396px] flex flex-col items-center text-center z-10">
        {/* Animated Checkmark and Particles */}
        <div className="relative mb-6">
          {/* Particles Burst */}
          {particles.map((p, idx) => (
            <motion.div
              key={idx}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{ 
                x: p.x, 
                y: p.y, 
                scale: [0, 1.2, 0], 
                opacity: [0, 1, 0] 
              }}
              transition={{ 
                duration: 0.8, 
                ease: "easeOut", 
                delay: 0.45 
              }}
              className="absolute w-2 h-2 rounded-full bg-orange-500 left-1/2 top-1/2 -ml-1 -mt-1"
            />
          ))}

          {/* Core Checkmark Circle */}
          <motion.div
            variants={iconCircleVariants}
            className="w-20 h-20 rounded-full bg-white border border-zinc-200/80 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
          >
            <svg
              className="w-10 h-10 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <motion.path
                variants={checkmarkPathVariants}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
        </div>

        {/* Text Headers */}
        <motion.h2 
          variants={itemVariants} 
          className="text-2xl font-black text-zinc-900 mb-2 font-display tracking-tight"
        >
          تم إرسال طلبك للمطبخ بنجاح!
        </motion.h2>
        
        <motion.p 
          variants={itemVariants} 
          className="text-xs text-zinc-500 font-medium leading-relaxed max-w-[280px] mb-8"
        >
          بدأ فريق العمل في تحضير وجبتك، وسنقوم بإيصالها إليك في أقرب وقت.
        </motion.p>

        {/* Order Identifier Card */}
        <motion.div
          variants={itemVariants}
          className="w-full bg-white border border-zinc-200 rounded-2xl p-5 mb-8 relative overflow-hidden shadow-sm"
        >
          <div className="absolute top-0 right-0 w-24 h-[1px] bg-gradient-to-l from-orange-500 to-transparent" />
          
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">تفاصيل الطلب</span>
            {order.tableNumber ? (
              <span className="text-[10px] bg-orange-600/10 border border-orange-500/20 text-orange-600 font-bold px-2 py-0.5 rounded-lg">
                طاولة {order.tableNumber}
              </span>
            ) : (
              <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-2 py-0.5 rounded-lg">
                توصيل خارجي
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-600 font-bold">رقم التعريف المميز</span>
            <span className="text-xl font-black font-mono text-zinc-900 tracking-widest bg-zinc-50 border border-zinc-200 py-1.5 px-3 rounded-xl shadow-inner">
              #{displayId}
            </span>
          </div>
        </motion.div>

        {/* Status Line Steps */}
        <motion.div 
          variants={itemVariants}
          className="w-full max-w-[260px] flex items-center justify-between gap-2 mb-10"
        >
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-6 h-6 rounded-full bg-orange-600 border border-orange-500 flex items-center justify-center text-[10px] font-black text-white">١</div>
            <span className="text-[9px] font-extrabold text-orange-600">تم الطلب</span>
          </div>
          <div className="h-[2px] bg-zinc-200 flex-1 -mt-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-orange-500 animate-pulse" style={{ width: '40%' }} />
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-6 h-6 rounded-full bg-white border border-zinc-250 flex items-center justify-center text-[10px] font-black text-zinc-400 shadow-sm">٢</div>
            <span className="text-[9px] font-bold text-zinc-500">التحضير</span>
          </div>
          <div className="h-[2px] bg-zinc-200 flex-1 -mt-4" />
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-6 h-6 rounded-full bg-white border border-zinc-250 flex items-center justify-center text-[10px] font-black text-zinc-400 shadow-sm">٣</div>
            <span className="text-[9px] font-bold text-zinc-500">جاهز للتسليم</span>
          </div>
        </motion.div>

        {/* Primary Action Button */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onTrack}
          className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-[0_8px_24px_rgba(255,85,0,0.25)] cursor-pointer"
        >
          <Clock className="w-4 h-4 text-white" />
          <span>متابعة وتتبع حالة الطلب</span>
          <ArrowRight className="w-4 h-4 mr-1 text-orange-100" />
        </motion.button>
      </div>
    </motion.div>
  );
}
