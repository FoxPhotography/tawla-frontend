import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Printer, 
  ArrowLeft, 
  CreditCard, 
  Crown, 
  ShieldCheck, 
  Calendar,
  Building2,
  RefreshCw
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api.js';
import { useAuthStore } from '../../shared/store/authStore.js';
import logoImg from '../../assets/TAWLA_Logo.png';

interface PaymentDetails {
  status: 'paid' | 'pending' | 'failed' | 'invalid';
  invoiceId: string;
  referenceNumber?: string;
  plan?: 'trial' | 'basic' | 'pro';
  billingCycle?: 'monthly' | 'annual';
  amount?: number;
  restaurantName?: string;
  ownerName?: string;
  phone?: string;
  expiresAt?: string;
  paidAt?: string;
  message?: string;
}

export default function PaymentConfirmationPage() {
  const [searchParams] = useSearchParams();
  const { user, restaurant } = useAuthStore();

  const invoiceId = searchParams.get('invoice_id') || searchParams.get('invoiceId') || '';
  const initialType = searchParams.get('type') || 'renewal';

  const [loading, setLoading] = useState<boolean>(true);
  const [paymentData, setPaymentData] = useState<PaymentDetails | null>(null);

  const verifyInvoice = async (retryCount = 0) => {
    if (!invoiceId) {
      setLoading(false);
      setPaymentData({
        status: 'invalid',
        invoiceId: '',
        message: 'لم يتم تزويد رقم فاتورة صالح. لا يمكن استعراض هذه الصفحة مباشرة منعاً للتلاعب.'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/subscriptions/verify-payment?invoiceId=${encodeURIComponent(invoiceId)}`);
      const data = response.data?.data;

      if (data && (data.status === 'paid' || data.status === 'success' || data.status === 'captured')) {
        setPaymentData({
          status: 'paid',
          invoiceId,
          referenceNumber: data.referenceNumber || `TWL-2026-${invoiceId}`,
          plan: data.plan || 'pro',
          billingCycle: data.billingCycle || 'monthly',
          amount: data.amount,
          restaurantName: data.restaurantName || restaurant?.name || 'مطعمنا العزيز',
          ownerName: data.ownerName || user?.name || 'إدارة المطعم',
          phone: data.phone || restaurant?.phone,
          expiresAt: data.expiresAt,
          paidAt: data.paidAt || new Date().toISOString(),
          message: 'تم التحقق من الفاتورة وسدادها بنجاح عبر بوابة فواتيرك.'
        });
        setLoading(false);
      } else if (data?.status === 'pending' && retryCount < 3) {
        // Auto-retry in 2 seconds to allow Fawaterk gateway and webhook to finalize
        setTimeout(() => {
          verifyInvoice(retryCount + 1);
        }, 2000);
      } else {
        setPaymentData({
          status: 'failed',
          invoiceId,
          message: 'لم يتم تأكيد السداد لهذه الفاتورة حتى الآن أو تم إلغاء العملية.'
        });
        setLoading(false);
      }
    } catch (error: any) {
      if (retryCount < 2) {
        setTimeout(() => {
          verifyInvoice(retryCount + 1);
        }, 2000);
      } else {
        console.error('[Verify Payment Page Error]:', error);
        setPaymentData({
          status: 'failed',
          invoiceId,
          message: error.response?.data?.message || 'تعذر التحقق من الفاتورة من خوادم الدفع.'
        });
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    verifyInvoice();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const planTitle = paymentData?.plan === 'pro' 
    ? 'الباقة المتقدمة (Pro)' 
    : paymentData?.plan === 'basic' 
      ? 'الباقة الأساسية (Basic)' 
      : 'الباقة التجريبية (Trial)';

  const formattedExpiry = paymentData?.expiresAt 
    ? new Date(paymentData.expiresAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  const formattedPaidAt = paymentData?.paidAt 
    ? new Date(paymentData.paidAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('ar-EG');

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1612] font-sans antialiased selection:bg-[#801B2C]/20" dir="rtl">
      <Toaster position="top-center" />

      {/* Top Header */}
      <header className="bg-white border-b border-[#801B2C]/10 py-4 px-6 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImg} alt="طاولة - Tawla" className="h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#5C524C] font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>نظام التحقق المشفر من الفواتير (Tawla Verified)</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 print:p-0 print:max-w-full">
        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-[#801B2C]/15 rounded-3xl p-12 text-center shadow-xl space-y-4">
            <div className="w-14 h-14 border-4 border-[#801B2C]/20 border-t-[#801B2C] rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-[#1C1612]">جاري التحقق الأمني من حالة المعاملة...</h2>
            <p className="text-xs text-[#5C524C]">يتم مطابقة التوقيع المشفر وتأكيد السداد من خوادم بوابة فواتيرك وتحديث بيانات الاشتراك.</p>
          </div>
        )}

        {/* Invalid Access / Tamper Prevention */}
        {!loading && paymentData?.status === 'invalid' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-amber-300 rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6"
          >
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-[#1C1612]">معاملة غير معتمدة أو مفقودة</h2>
              <p className="text-xs text-[#5C524C] leading-relaxed max-w-md mx-auto">
                {paymentData.message}
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/checkout" className="px-6 py-3 bg-[#801B2C] text-white rounded-xl text-xs font-bold hover:bg-[#5E1422] transition-colors">
                الانتقال لصفحة الاشتراك والدفع
              </Link>
              <Link to="/" className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">
                العودة للرئيسية
              </Link>
            </div>
          </motion.div>
        )}

        {/* Failed Payment State */}
        {!loading && paymentData?.status === 'failed' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-rose-200 rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6"
          >
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-rose-950">تعذر تأكيد عملية الدفع</h2>
              <p className="text-xs text-rose-800 leading-relaxed max-w-md mx-auto">
                {paymentData.message || 'لم يتم تأكيد السداد من جهة البنك أو تم إلغاء المعاملة من فواتيرك.'}
              </p>
              <div className="p-3 bg-rose-50 rounded-xl font-mono text-xs text-rose-900 inline-block mt-2">
                رقم الفاتورة: #{paymentData.invoiceId}
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => verifyInvoice(0)} 
                className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة التحقق من الحالة</span>
              </button>
              <Link to="/checkout" className="px-6 py-3 bg-[#801B2C] text-white rounded-xl text-xs font-bold hover:bg-[#5E1422] transition-colors">
                إعادة المحاولة عبر صفحة الدفع
              </Link>
            </div>
          </motion.div>
        )}

        {/* Success & Verified Official Digital Receipt */}
        {!loading && paymentData?.status === 'paid' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-7 relative overflow-hidden print:border-none print:shadow-none print:p-0"
          >
            {/* Top Glow Bar */}
            <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

            {/* Header Badge */}
            <div className="text-center space-y-3 pt-2">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-300 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100/80 text-emerald-900 font-extrabold px-3.5 py-1 rounded-full font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  معاملة مسددة ومحققة 100%
                </span>
                <h1 className="text-2xl font-black text-[#1C1612]">إيصال سداد وتجديد اشتراك رسمي</h1>
                <p className="text-xs text-[#5C524C]">شكراً لثقتكم بمنصة طاولة • تم تفعيل وتمديد الصلاحيات في النظام تلقائياً.</p>
              </div>
            </div>

            {/* Official Tax / Subscription Receipt Card */}
            <div className="bg-[#FAF8F5] border border-[#801B2C]/15 rounded-2xl p-6 space-y-4 text-right">
              {/* Reference Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#801B2C]/10 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-[#73675F] block">الرقم المرجعي المعتمد (Reference No):</span>
                  <span className="font-mono font-black text-sm text-[#801B2C] select-all">
                    {paymentData.referenceNumber || `TWL-2026-${paymentData.invoiceId}`}
                  </span>
                </div>
                <div className="text-left" dir="ltr">
                  <span className="text-[11px] font-bold text-[#73675F] block text-right sm:text-left">Invoice ID:</span>
                  <span className="font-mono font-bold text-xs text-zinc-700 bg-white px-2.5 py-1 rounded-md border border-zinc-200 inline-block">
                    #{paymentData.invoiceId}
                  </span>
                </div>
              </div>

              {/* Data Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs pt-1">
                <div className="flex justify-between sm:flex-col sm:justify-start gap-1 pb-2 sm:pb-0 border-b sm:border-b-0 border-zinc-200/60">
                  <span className="text-[#73675F]">اسم المطعم / المنشأة:</span>
                  <span className="font-extrabold text-[#1C1612] text-sm flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#801B2C]" />
                    {paymentData.restaurantName}
                  </span>
                </div>

                <div className="flex justify-between sm:flex-col sm:justify-start gap-1 pb-2 sm:pb-0 border-b sm:border-b-0 border-zinc-200/60">
                  <span className="text-[#73675F]">اسم المسؤول / المالك:</span>
                  <span className="font-bold text-[#1C1612] text-sm">
                    {paymentData.ownerName}
                  </span>
                </div>

                <div className="flex justify-between sm:flex-col sm:justify-start gap-1 pb-2 sm:pb-0 border-b sm:border-b-0 border-zinc-200/60">
                  <span className="text-[#73675F]">الباقة المفعلة:</span>
                  <span className="font-extrabold text-[#801B2C] text-sm flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    {planTitle}
                  </span>
                </div>

                <div className="flex justify-between sm:flex-col sm:justify-start gap-1 pb-2 sm:pb-0 border-b sm:border-b-0 border-zinc-200/60">
                  <span className="text-[#73675F]">دورة الفوترة:</span>
                  <span className="font-bold text-[#1C1612] text-sm">
                    {paymentData.billingCycle === 'annual' ? 'سنوي (12 شهر)' : 'شهري (30 يوماً)'}
                  </span>
                </div>

                <div className="flex justify-between sm:flex-col sm:justify-start gap-1 pb-2 sm:pb-0 border-b sm:border-b-0 border-zinc-200/60">
                  <span className="text-[#73675F]">المبلغ المسدد:</span>
                  <span className="font-black text-[#1C1612] text-sm">
                    {paymentData.amount ? `${paymentData.amount} ج.م (EGP)` : 'مسدد'}
                  </span>
                </div>

                {formattedExpiry && (
                  <div className="flex justify-between sm:flex-col sm:justify-start gap-1 pb-2 sm:pb-0 border-b sm:border-b-0 border-zinc-200/60">
                    <span className="text-[#73675F]">تاريخ انتهاء الصلاحية الجديد:</span>
                    <span className="font-extrabold text-emerald-700 text-sm flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      {formattedExpiry}
                    </span>
                  </div>
                )}

                <div className="flex justify-between sm:flex-col sm:justify-start gap-1 pb-2 sm:pb-0 border-b sm:border-b-0 border-zinc-200/60">
                  <span className="text-[#73675F]">بوابة الدفع والتحقق:</span>
                  <span className="font-bold text-[#1C1612] text-xs flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-[#801B2C]" />
                    فواتيرك (Fawaterk Hosted Gateway)
                  </span>
                </div>

                <div className="flex justify-between sm:flex-col sm:justify-start gap-1">
                  <span className="text-[#73675F]">تاريخ ووقت السداد:</span>
                  <span className="font-bold text-zinc-700 text-xs">
                    {formattedPaidAt}
                  </span>
                </div>
              </div>

              {/* Security Seal Note */}
              <div className="pt-3 border-t border-[#801B2C]/10 text-center">
                <p className="text-[10px] text-[#73675F] flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>معاملة مشفرة وموثقة إلكترونياً بسجلات منصة طاولة لتقنية نظم الضيافة.</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-1 print:hidden">
              {user?.role === 'admin' ? (
                <Link 
                  to="/admin?tab=subscription" 
                  className="w-full py-4 bg-[#801B2C] hover:bg-[#5E1422] text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#801B2C]/20 transition-all text-sm"
                >
                  <span>الدخول المباشر للوحة تحكم المطعم (Dashboard)</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              ) : initialType === 'new' ? (
                <Link 
                  to={`/register?invoice_id=${paymentData.invoiceId}&plan=${paymentData.plan || 'pro'}`}
                  className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all text-sm"
                >
                  <Building2 className="w-4 h-4" />
                  <span>إكمال إعداد حساب المطعم والدخول فوراً</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              ) : (
                <Link 
                  to="/login" 
                  className="w-full py-4 bg-[#801B2C] hover:bg-[#5E1422] text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#801B2C]/20 transition-all text-sm"
                >
                  <span>تسجيل الدخول للمنظومة</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              )}

              <div className="flex items-center justify-center gap-4 pt-2">
                <button 
                  onClick={handlePrint}
                  className="px-5 py-2.5 bg-white border border-[#801B2C]/20 text-[#5C524C] hover:text-[#801B2C] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الفاتورة</span>
                </button>
                <Link 
                  to="/"
                  className="px-5 py-2.5 text-xs text-[#5C524C] hover:text-[#1C1612] font-semibold transition-colors"
                >
                  العودة للصفحة الرئيسية
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
