import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

interface CartFABProps {
  cartCount: number;
  cartTotal: number;
  onClick: () => void;
}

const fabVariants = {
  hidden: { y: 50, opacity: 0, scale: 0.85 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 26,
    }
  },
  exit: {
    y: 40,
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

export default function CartFAB({ cartCount, cartTotal, onClick }: CartFABProps) {
  return (
    <div className="fixed bottom-[92px] inset-x-0 px-4 z-[45] pointer-events-none flex justify-center">
      <motion.button
        variants={fabVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className="pointer-events-auto flex items-center justify-between gap-4 bg-orange-600 text-white rounded-2xl p-4 shadow-[0_12px_32px_rgba(255,85,0,0.25)] border border-orange-500/20 hover:bg-orange-500 transition-colors w-full max-w-[396px] cursor-pointer"
      >
        {/* Left Side: Counter & Icon */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-black/15 flex items-center justify-center text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            
            <AnimatePresence mode="popLayout">
              <motion.span
                key={cartCount}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="absolute -top-1.5 -right-1.5 bg-black text-orange-500 text-[10px] font-black rounded-lg min-w-[20px] h-5 px-1.5 flex items-center justify-center border border-orange-600 shadow-md"
              >
                {cartCount}
              </motion.span>
            </AnimatePresence>
          </div>
          
          <div className="text-right">
            <span className="block text-[10px] text-orange-100 font-bold uppercase tracking-wider">سلة المشتريات</span>
            <span className="block text-xs font-black text-white">عرض السلة وتأكيد الطلب</span>
          </div>
        </div>

        {/* Right Side: Total & Arrow */}
        <div className="flex items-center gap-2 bg-black/10 rounded-xl py-1.5 px-3">
          <span className="text-sm font-extrabold text-white font-mono">
            {cartTotal} <span className="text-[10px] font-bold text-orange-100">ج.م</span>
          </span>
          <ArrowLeft className="w-4 h-4 text-white animate-pulse" />
        </div>
      </motion.button>
    </div>
  );
}
