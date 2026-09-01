import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Zap, Store, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { api } from '../../shared/services/api';
import toast from 'react-hot-toast';

export default function FawaterkSandboxPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId') || `INV_${Date.now()}`;
  const amount = searchParams.get('amount') || '1500';
  const currency = searchParams.get('currency') || 'EGP';
  const plan = searchParams.get('plan') || 'الباقة الأساسية';
  const customer = searchParams.get('customer') || 'عميل تجريبي';
  const email = searchParams.get('email') || 'support.tawla@gmail.com';
  const successUrl = searchParams.get('successUrl') || '/checkout?status=paid';
  const failUrl = searchParams.get('failUrl') || '/checkout?status=failed';

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet' | 'instapay' | 'fawry'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  // Card Inputs state
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardHolder, setCardHolder] = useState(customer);
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [walletPhone, setWalletPhone] = useState('01066980953');

  const handleSimulatePayment = async (status: 'paid' | 'failed') => {
    setIsProcessing(true);
    toast.loading(status === 'paid' ? 'جاري معالجة الدفع التجريبي...' : 'جاري تسجيل فشل العملية...', { id: 'sandbox-process' });

    try {
      if (status === 'paid') {
        // Trigger simulated backend webhook if available
        try {
          await api.post('/webhooks/fawaterk', {
            invoice_id: invoiceId,
            status: 'paid',
            amount: Number(amount),
            customer_email: email,
            customer_name: customer,
          });
        } catch {
          // Webhook processed or ignored
        }

        toast.success('تمت عملية الدفع بنجاح! جاري التوجيه...', { id: 'sandbox-process' });
        setTimeout(() => {
          window.location.href = successUrl;
        }, 1000);
      } else {
        toast.error('تم رفض العملية (محاكاة فشل الدفع).', { id: 'sandbox-process' });
        setTimeout(() => {
          window.location.href = failUrl;
        }, 1000);
      }
    } catch {
      window.location.href = status === 'paid' ? successUrl : failUrl;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-zinc-900 font-sans py-8 px-4 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-xl">
        {/* Sandbox Badge */}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-2xl mb-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="font-extrabold">بوابة دفع فواتيرك (بيئة تجريبية Sandbox Simulator)</span>
          </div>
          <span className="text-[10px] bg-amber-200/60 font-mono px-2 py-0.5 rounded-lg">TEST MODE</span>
        </div>

        {/* Main Payment Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden">
          {/* Header */}
          <div className="bg-[#1A2634] text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-black tracking-tight text-white">FAWATERK</span>
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">بوابة آمنة</span>
              </div>
              <p className="text-xs text-zinc-300">منصة طاولة لإدارة المطاعم - {plan}</p>
              <p className="text-[11px] text-zinc-400 font-mono mt-1">فاتورة #{invoiceId}</p>
            </div>

            <div className="text-left sm:text-right bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-sm border border-white/10">
              <span className="text-[10px] text-zinc-300 block">المبلغ المطلوب سداده</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {Number(amount).toLocaleString()} <span className="text-xs font-sans text-white">{currency}</span>
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="p-6 sm:p-8">
            <label className="text-xs font-bold text-zinc-600 block mb-3">اختر وسيلة الدفع:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'card'
                    ? 'border-[#1A2634] bg-zinc-900 text-white shadow-md'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-[11px] font-bold">بطاقة بنكية</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'wallet'
                    ? 'border-[#1A2634] bg-zinc-900 text-white shadow-md'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-[11px] font-bold">محفظة إلكترونية</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'instapay'
                    ? 'border-[#1A2634] bg-zinc-900 text-white shadow-md'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Zap className="w-5 h-5" />
                <span className="text-[11px] font-bold">إنستاباي</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('fawry')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'fawry'
                    ? 'border-[#1A2634] bg-zinc-900 text-white shadow-md'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Store className="w-5 h-5" />
                <span className="text-[11px] font-bold">فوري / أمان</span>
              </button>
            </div>

            {/* Card Form */}
            {paymentMethod === 'card' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 bg-zinc-50 p-5 rounded-2xl border border-zinc-200 mb-6"
              >
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">رقم البطاقة (Card Number)</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-left focus:border-zinc-800 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 block mb-1">تاريخ الانتهاء</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-center focus:border-zinc-800 focus:outline-none"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 block mb-1">رمز الأمان (CVV)</label>
                    <input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-center focus:border-zinc-800 focus:outline-none"
                      maxLength={3}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">اسم حامل البطاقة</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:border-zinc-800 focus:outline-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Wallet Form */}
            {paymentMethod === 'wallet' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 bg-zinc-50 p-5 rounded-2xl border border-zinc-200 mb-6"
              >
                <label className="text-[11px] font-bold text-zinc-600 block">رقم المحفظة (فودافون كاش / أورنج / اتصالات / وي)</label>
                <input
                  type="text"
                  value={walletPhone}
                  onChange={(e) => setWalletPhone(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-left focus:border-zinc-800 focus:outline-none"
                  dir="ltr"
                />
                <p className="text-[11px] text-zinc-500">سيتم إرسال طلب السداد للمحفظة لتأكيد الدفع بالرقم السري.</p>
              </motion.div>
            )}

            {/* InstaPay Form */}
            {paymentMethod === 'instapay' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 mb-6 text-center space-y-2"
              >
                <Zap className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-xs font-extrabold text-zinc-800">الدفع عبر تطبيق إنستاباي InstaPay</h4>
                <p className="text-[11px] text-zinc-500">عنوان الدفع المعتمد: <span className="font-mono font-bold text-zinc-900">tawla@instapay</span></p>
              </motion.div>
            )}

            {/* Fawry Form */}
            {paymentMethod === 'fawry' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 mb-6 text-center space-y-2"
              >
                <Store className="w-8 h-8 text-blue-600 mx-auto" />
                <h4 className="text-xs font-extrabold text-zinc-800">كود الدفع عبر فوري / أمان</h4>
                <div className="bg-white border-2 border-dashed border-blue-400 py-2.5 px-4 rounded-xl inline-block font-mono text-base font-black text-blue-700 tracking-widest">
                  982 716 409
                </div>
                <p className="text-[11px] text-zinc-500">صالح لمدة 48 ساعة في أي منفذ فوري.</p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSimulatePayment('paid')}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>إتمام الدفع التجريبي بنجاح ({Number(amount).toLocaleString()} {currency})</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSimulatePayment('failed')}
                className="w-full py-3 bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-600 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 border border-zinc-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>محاكاة فشل العملية (Simulate Failure)</span>
              </button>
            </div>

            {/* Security Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
              <Lock className="w-3.5 h-3.5" />
              <span>معاملة مشفرة 256-bit SSL متوافقة مع معايير PCI-DSS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
