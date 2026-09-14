import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, X, FileText, HelpCircle, Sparkles, Wifi, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { printReceiptIframe } from './ReceiptPrintTemplate';
import { staffAudio } from '../services/staffAudio';

export interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: any;
}

export default function PrinterSettingsModal({
  isOpen,
  onClose,
  restaurant,
}: PrinterSettingsModalProps) {
  const [printerIp, setPrinterIp] = useState<string>(() => {
    return localStorage.getItem('tawla_printer_ip') || '';
  });

  const [autoPrintNewOrders, setAutoPrintNewOrders] = useState<boolean>(() => {
    return localStorage.getItem('tawla_auto_print_new_orders') === 'true';
  });

  const [autoPrintAcceptOrders, setAutoPrintAcceptOrders] = useState<boolean>(() => {
    return localStorage.getItem('tawla_auto_print_accept_orders') === 'true';
  });

  if (!isOpen) return null;

  const handleSavePrinterIp = (val: string) => {
    const trimmed = val.trim();
    setPrinterIp(trimmed);
    localStorage.setItem('tawla_printer_ip', trimmed);
  };

  const handleToggleAutoPrintNew = (val: boolean) => {
    setAutoPrintNewOrders(val);
    localStorage.setItem('tawla_auto_print_new_orders', val ? 'true' : 'false');
    staffAudio.play('click');
    if (val) {
      toast.success('تم تفعيل الطباعة التلقائية عند استلام طلب جديد.');
    } else {
      toast('تم إيقاف الطباعة التلقائية عند استلام طلب جديد.', { icon: 'ℹ️' });
    }
  };

  const handleToggleAutoPrintAccept = (val: boolean) => {
    setAutoPrintAcceptOrders(val);
    localStorage.setItem('tawla_auto_print_accept_orders', val ? 'true' : 'false');
    staffAudio.play('click');
    if (val) {
      toast.success('تم تفعيل الطباعة التلقائية عند قبول الطلب.');
    } else {
      toast('تم إيقاف الطباعة التلقائية عند قبول الطلب.', { icon: 'ℹ️' });
    }
  };

  const handleTestPrint = () => {
    staffAudio.play('action');
    const sampleOrder = {
      id: 'ORD-TEST-' + Math.floor(1000 + Math.random() * 9000),
      tableNumber: 5,
      type: 'dine_in',
      customerName: 'فاتورة تجريبية (Test)',
      createdAt: new Date().toISOString(),
      items: [
        {
          name: 'بيتزا مشكل جبن (كبير)',
          quantity: 1,
          price: 130,
          originalPrice: 130,
          selectedOptions: [{ name: 'الحجم', value: 'كبير' }],
          selectedModifiers: [{ name: 'إكسترا جبنة', value: 'موتزاريلا إضافية' }],
          notes: 'تسوية مقرمشة'
        },
        {
          name: 'عصير برتقال فريش',
          quantity: 2,
          price: 35,
          originalPrice: 35
        }
      ],
      discountAmount: 0,
      totalAmount: 200
    };

    printReceiptIframe(sampleOrder, restaurant);
    toast.success('جاري إرسال الفاتورة التجريبية إلى الطابعة...');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#801B2C]/10 text-[#801B2C] flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900">إعدادات طابعة الفواتير</h2>
                <p className="text-xs text-zinc-500 font-medium font-sans">ضبط الطابعة الشبكية والطباعة التلقائية</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-200/60 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto">
            
            {/* Tablet Wi-Fi / Network Printer IP */}
            <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900">طابعة الشبكة (Wi-Fi / LAN IP)</h3>
                  <p className="text-[11px] text-zinc-500">عنوان IP الخاص بالطابعة الحرارية الموصولة بالشبكة المحلية</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="مثال: 192.168.1.200"
                  value={printerIp}
                  onChange={(e) => handleSavePrinterIp(e.target.value)}
                  className="flex-1 bg-white border border-zinc-300 focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/20 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition-all placeholder:text-zinc-400 font-mono text-left dir-ltr"
                />
                {printerIp && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl">
                    <Check className="w-3.5 h-3.5" />
                    <span>محفوظ</span>
                  </span>
                )}
              </div>
            </div>

            {/* Auto-Print Toggles */}
            <div className="border border-zinc-200 rounded-2xl p-4 space-y-3 bg-white">
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-[#801B2C]" />
                <span>خيارات الطباعة التلقائية (Auto-Print)</span>
              </h3>

              {/* Toggle 1 */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 hover:bg-zinc-100/60 transition-colors cursor-pointer">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-zinc-800">طباعة الفاتورة تلقائياً عند استلام أي طلب جديد</div>
                  <div className="text-[11px] text-zinc-500">تُرسل الفاتورة للطابعة فور وصول الطلب من العميل أو الطاولة تلقائياً</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPrintNewOrders}
                  onChange={(e) => handleToggleAutoPrintNew(e.target.checked)}
                  className="w-5 h-5 accent-[#801B2C] cursor-pointer"
                />
              </label>

              {/* Toggle 2 */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 hover:bg-zinc-100/60 transition-colors cursor-pointer">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-zinc-800">طباعة الفاتورة تلقائياً عند قبول الطلب</div>
                  <div className="text-[11px] text-zinc-500">تُطبع الفاتورة تلقائياً عند الضغط على زر قبول الطلب وبدء التجهيز</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPrintAcceptOrders}
                  onChange={(e) => handleToggleAutoPrintAccept(e.target.checked)}
                  className="w-5 h-5 accent-[#801B2C] cursor-pointer"
                />
              </label>
            </div>

            {/* Test Print Card */}
            <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-700" />
                <div>
                  <div className="text-xs font-bold text-amber-950">اختبار وتجربة الطباعة الآن</div>
                  <div className="text-[11px] text-amber-800/80">اطبع إيصال تجريبي للتأكد من مظهره</div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleTestPrint}
                className="flex items-center gap-2 bg-[#801B2C] hover:bg-[#962436] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-[#801B2C]/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة فاتورة تجريبية</span>
              </motion.button>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>مقاس الورق الافتراضي المدعوم: 80mm Roll Paper</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
