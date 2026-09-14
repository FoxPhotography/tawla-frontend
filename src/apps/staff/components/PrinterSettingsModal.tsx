import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, X, CheckCircle2, Download, Zap, FileText, 
  HelpCircle, Monitor, Tablet, Sparkles 
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
  const [autoPrintNewOrders, setAutoPrintNewOrders] = useState<boolean>(() => {
    return localStorage.getItem('tawla_auto_print_new_orders') === 'true';
  });

  const [autoPrintAcceptOrders, setAutoPrintAcceptOrders] = useState<boolean>(() => {
    return localStorage.getItem('tawla_auto_print_accept_orders') === 'true';
  });

  if (!isOpen) return null;

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

  const handleDownloadBat = () => {
    staffAudio.play('click');
    const batLines = [
      '@echo off',
      'chcp 65001 >nul',
      ':: ========================================================',
      ':: مشغل طاولة - نظام الطباعة المباشرة السريعة (Silent POS Printing)',
      ':: يعمل في الخلفية ويطبع الفواتير فوراً بدون فتح نافذة البرينت',
      ':: ========================================================',
      'title طاولة - نقطة البيع والطباعة المباشرة',
      '',
      'echo جاري تشغيل شاشة الكاشير بنظام الطباعة المباشرة...',
      '',
      ':: 1. تجربة Google Chrome',
      'if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (',
      '    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app="https://www.tawla.site/staff"',
      '    exit',
      ')',
      'if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (',
      '    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app="https://www.tawla.site/staff"',
      '    exit',
      ')',
      'if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (',
      '    start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app="https://www.tawla.site/staff"',
      '    exit',
      ')',
      '',
      ':: 2. تجربة Microsoft Edge',
      'if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (',
      '    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --app="https://www.tawla.site/staff"',
      '    exit',
      ')',
      'if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (',
      '    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --app="https://www.tawla.site/staff"',
      '    exit',
      ')',
      '',
      'echo.',
      'echo [تنبيه] لم يتم العثور على متصفح Google Chrome أو Microsoft Edge على جهازك!',
      'echo يرجى التأكد من تثبيت أحدهما لتشغيل وضع الطباعة المباشرة.',
      'echo.',
      'pause'
    ];

    const blob = new Blob([batLines.join('\r\n')], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'تشغيل_طاولة_طباعة_مباشرة.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('تم تحميل مشغل الطباعة المباشرة بنجاح.');
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 via-white to-zinc-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#801B2C]/10 border border-[#801B2C]/20 flex items-center justify-center text-[#801B2C]">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900 font-heading flex items-center gap-2">
                  إعدادات طابعة الفواتير والطباعة المباشرة
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    80mm Thermal
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  دعم كامل لجميع أجهزة التابلت (بما فيها هواوي) والكمبيوتر بدون نوافذ منبثقة
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            
            
            {/* Tablet Wi-Fi / IP Network Printer Card */}
            <div className="bg-gradient-to-br from-purple-50/60 via-purple-50/20 to-white border border-purple-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-purple-600/20">
                  <Tablet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-purple-950">
                      طابعات شبكة الواي فاي للتابلت (Wi-Fi / LAN Network Printer)
                    </h3>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                      No PC Required
                    </span>
                  </div>
                  <p className="text-[11.5px] text-purple-900/90 leading-relaxed">
                    إذا أردت إلغاء الكمبيوتر تماماً والطباعة لاسلكياً من التابلت، يمكنك توصيل طابعة حرارية (Wi-Fi أو كابل نت بالراوتر) وتحديد عنوان الـ IP الخاص بها لترسل لها التابلت الفواتير وبونات الشيفت مباشرة عبر الشبكة المحلية.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-purple-200/60">
                <label className="text-xs font-bold text-zinc-700 whitespace-nowrap">عنوان الـ IP للطابعة الشبكية:</label>
                <input
                  type="text"
                  placeholder="مثال: 192.168.1.200"
                  defaultValue={localStorage.getItem('tawla_printer_ip') || ''}
                  onChange={(e) => localStorage.setItem('tawla_printer_ip', e.target.value.trim())}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            {/* Tablet Huawei Fix Status Card */}
            <div className="bg-gradient-to-br from-emerald-50/60 via-emerald-50/30 to-white border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-600/20">
                <Tablet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-emerald-950">
                    حل مشكلة تابلت هواوي (Huawei Tablet)
                  </h3>
                  <span className="text-[10px] bg-emerald-200/60 text-emerald-800 font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> تم الإصلاح بنجاح
                  </span>
                </div>
                <p className="text-[11.5px] text-emerald-800/90 leading-relaxed">
                  تم بناء محرك طباعة حراري مستقل ومعزول (Isolated Thermal Engine). الآن تابلت هواوي وأي جهاز لوحي يطبع فقط إيصال الفاتورة بدقة 80mm ولا يطبع الصفحة أو واجهة البرنامج إطلاقاً.
                </p>
              </div>
            </div>

            {/* Silent Printing on PC Card */}
            <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-600/20">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                      الطباعة المباشرة في الخلفية على الكمبيوتر (بدون نافذة برينت)
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                        Silent Kiosk
                      </span>
                    </h3>
                    <p className="text-[11.5px] text-zinc-600 leading-relaxed mt-1">
                      إذا كان الكمبيوتر متصلاً بطابعة فواتير، يمكنك جعل المتصفح يطبع فوراً في أجزاء من الثانية دون إظهار نافذة إعدادات الطباعة الخاصة بالويندوز نهائياً.
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps Guide */}
              <div className="bg-white rounded-xl p-3.5 border border-zinc-200/80 text-[11px] space-y-2 text-zinc-700">
                <div className="flex items-center gap-2 font-bold text-zinc-900">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>خطوات تشغيل الطباعة الصامتة على الكاشير:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-600 pr-1">
                  <li>تأكد من تعيين طابعة الفواتير كـ <strong>الطابعة الافتراضية (Default Printer)</strong> في الويندوز.</li>
                  <li>اضغط على الزر أدناه لتحميل ملف التشغيل السريع <strong>(.bat)</strong>.</li>
                  <li>ضع الملف على سطح المكتب وشغّل البرنامج منه دائماً ليطبع فوراً بدون شاشة برينت!</li>
                </ol>
              </div>

              {/* Download Launcher Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadBat}
                className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل مشغل طاولة للطباعة المباشرة السريعة (Windows .bat)</span>
              </motion.button>
            </div>

            {/* Automation Settings (Toggles) */}
            <div className="border border-zinc-200 rounded-2xl p-5 space-y-3 bg-white">
              <h3 className="text-xs font-black text-zinc-900 flex items-center gap-1.5 mb-2">
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
                  <div className="text-xs font-bold text-amber-950">اختبار وتجربة الطابعة الآن</div>
                  <div className="text-[11px] text-amber-800/80">اطبع إيصال تجريبي للتأكد من مظهر الورقة والطباعة المباشرة</div>
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
