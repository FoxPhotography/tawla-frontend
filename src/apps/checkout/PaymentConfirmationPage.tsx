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
  RefreshCw,
  RotateCcw,
  MessageCircle,
  Loader2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api.js';
import { socket } from '../../shared/services/socket.js';
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
  tip?: string;
  code?: string;
}

export default function PaymentConfirmationPage() {
  const [searchParams] = useSearchParams();
  const { user, restaurant } = useAuthStore();

  const invoiceId = searchParams.get('invoice_id') || searchParams.get('invoiceId') || '';
  const initialType = searchParams.get('type') || 'renewal';

  const [loading, setLoading] = useState<boolean>(true);
  const [paymentData, setPaymentData] = useState<PaymentDetails | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState<string>('201066980953');

  useEffect(() => {
    api.get('/system-settings').then(res => {
      const data = res.data?.data;
      if (data?.supportWhatsapp) setSupportWhatsapp(data.supportWhatsapp);
      else if (data?.supportPhone) setSupportWhatsapp(data.supportPhone);
    }).catch(() => {});
  }, []);

  const urlStatus = (searchParams.get('status') || '').toLowerCase().trim();
  const urlMessage = searchParams.get('message') || searchParams.get('error') || '';

  // 1. Live Instant Confirmation / Rejection Listener via WebSocket
  useEffect(() => {
    if (!invoiceId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_payment_invoice', String(invoiceId).trim());

    const handlePaymentReceived = (data: any) => {
      if (data && String(data.invoiceId || '').trim() === String(invoiceId).trim()) {
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
          message: 'تم تأكيد عملية الدفع بنجاح وتفعيل اشتراكك!'
        });
        setLoading(false);
        toast.success('تم تأكيد عملية الدفع بنجاح وتفعيل الاشتراك!');
      }
    };

    const handlePaymentFailed = (data: any) => {
      if (data && String(data.invoiceId || '').trim() === String(invoiceId).trim()) {
        setPaymentData((prev) => ({
          status: 'failed',
          invoiceId,
          referenceNumber: data.referenceNumber || prev?.referenceNumber || `TWL-2026-${invoiceId}`,
          plan: data.plan || prev?.plan || 'pro',
          billingCycle: data.billingCycle || prev?.billingCycle || 'monthly',
          amount: data.amount || prev?.amount,
          restaurantName: data.restaurantName || prev?.restaurantName,
          ownerName: data.ownerName || prev?.ownerName,
          phone: data.phone || prev?.phone,
          message: data.message || 'تم رفض عملية الدفع من قِبل البنك.',
          tip: data.tip || 'يرجى مراجعة بيانات البطاقة وتوافر رصيد كافٍ أو تجربة وسيلة دفع أخرى.',
          code: data.code,
        }));
        setLoading(false);
        toast.error('تم رفض عملية الدفع من قِبل البنك.');
      }
    };

    socket.on('payment_confirmed', handlePaymentReceived);
    socket.on('payment_received', handlePaymentReceived);
    socket.on('payment_failed', handlePaymentFailed);

    return () => {
      socket.off('payment_confirmed', handlePaymentReceived);
      socket.off('payment_received', handlePaymentReceived);
      socket.off('payment_failed', handlePaymentFailed);
    };
  }, [invoiceId, restaurant, user]);

  // 2. HTTP Polling and API Verification Fallback
  const verifyInvoice = async (retryCount = 0) => {
    if (!invoiceId) {
      setLoading(false);
      setPaymentData({
        status: 'invalid',
        invoiceId: '',
        message: 'لم يتم العثور على رقم فاتورة صالح للتحقق منها.'
      });
      return;
    }

    if (retryCount === 0) {
      setLoading(true);
    }

    const isKnownFailure = urlStatus === 'failed' || urlStatus === 'fail' || urlStatus === 'cancel' || urlStatus === 'declined';

    try {
      const queryUrl = `/subscriptions/verify-payment?invoiceId=${encodeURIComponent(invoiceId)}${isKnownFailure ? '&status=failed' : ''}`;
      const response = await api.get(queryUrl);
      const data = response.data?.data;

      if (data && (data.status === 'paid' || data.status === 'success' || data.status === 'captured')) {
        // If a new registration returned session tokens, log in immediately replacing any old session
        if (data.accessToken && data.user && data.restaurant) {
          try {
            useAuthStore.getState().login(data.accessToken, data.user, data.restaurant, data.offlineLease);
          } catch (e) {
            console.warn('[Auto-Login Warning]:', e);
          }
        }

        setPaymentData({
          status: 'paid',
          invoiceId,
          referenceNumber: data.referenceNumber || `TWL-2026-${invoiceId}`,
          plan: data.plan || 'pro',
          billingCycle: data.billingCycle || 'monthly',
          amount: data.amount,
          restaurantName: data.restaurantName || (initialType === 'new' ? 'مطعمنا الجديد' : (restaurant?.name || 'مطعمنا العزيز')),
          ownerName: data.ownerName || (initialType === 'new' ? 'إدارة المطعم' : (user?.name || 'إدارة المطعم')),
          phone: data.phone || (initialType === 'new' ? undefined : restaurant?.phone),
          expiresAt: data.expiresAt,
          paidAt: data.paidAt || new Date().toISOString(),
          message: 'تم تأكيد عملية الدفع بنجاح وتفعيل اشتراكك!'
        });
        setLoading(false);
      } else if (data && data.status === 'failed') {
        // Explicit failure status returned from API
        setPaymentData({
          status: 'failed',
          invoiceId,
          referenceNumber: data.referenceNumber,
          plan: data.plan || 'pro',
          billingCycle: data.billingCycle || 'monthly',
          amount: data.amount,
          restaurantName: data.restaurantName || restaurant?.name,
          ownerName: data.ownerName || user?.name,
          phone: data.phone,
          message: data.message || data.failureReason || 'تم رفض عملية الدفع من قِبل البنك المصدر.',
          tip: data.tip || 'يرجى التأكد من رصيد البطاقة وصلاحيتها للشراء الإلكتروني أو استخدام بطاقة أخرى.',
          code: data.code,
        });
        setLoading(false);
      } else if (isKnownFailure) {
        // Redirection URL already informed us of failure
        setPaymentData({
          status: 'failed',
          invoiceId,
          referenceNumber: data?.referenceNumber,
          plan: data?.plan || 'pro',
          billingCycle: data?.billingCycle || 'monthly',
          amount: data?.amount,
          message: data?.message || urlMessage || 'تم إلغاء أو رفض عملية الدفع.',
          tip: data?.tip || 'يمكنك إعادة المحاولة واختيار وسيلة دفع أخرى أو التحقق من بيانات البطاقة.',
          code: data?.code,
        });
        setLoading(false);
      } else if ((!data || data.status === 'pending') && retryCount < 3) {
        // Continuous smooth auto-retry every 2.5s (up to 3 times = ~8 seconds max)
        setTimeout(() => {
          verifyInvoice(retryCount + 1);
        }, 2500);
      } else {
        // Stop spinning! Show Pending or Failed state with clear guidance
        setPaymentData({
          status: data?.status === 'pending' ? 'pending' : 'failed',
          invoiceId,
          referenceNumber: data?.referenceNumber,
          plan: data?.plan || 'pro',
          billingCycle: data?.billingCycle || 'monthly',
          amount: data?.amount,
          restaurantName: data?.restaurantName || restaurant?.name,
          ownerName: data?.ownerName || user?.name,
          message: data?.status === 'pending'
            ? 'المعاملة ما زالت قيد المعالجة لدى البنك. إذا تم خصم المبلغ من حسابك، اضغط على زر "تحديث حالة الدفع" أدناه.'
            : (data?.message || 'لم يتم تأكيد السداد لهذه الفاتورة حتى الآن أو تم إلغاء العملية.')
        });
        setLoading(false);
      }
    } catch (error: any) {
      if (retryCount < 2 && !isKnownFailure) {
        setTimeout(() => {
          verifyInvoice(retryCount + 1);
        }, 2500);
      } else {
        console.error('[Verify Payment Page Error]:', error);
        setPaymentData({
          status: 'failed',
          invoiceId,
          message: error.response?.data?.error || 'تعذر تأكيد حالة الدفع من قِبل البنك. يرجى إعادة المحاولة.',
          tip: 'يرجى مراجعة البنك أو استخدام وسيلة دفع بديلة.'
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

  const planTitle = paymentData?.plan === 'pro' ? 'الباقة المتقدمة (Pro)' : 'الباقة الأساسية (Basic)';
  
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
            <span>الدفع الإلكتروني الآمن | منصة طاولة</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 print:p-0 print:max-w-full">
        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-[#801B2C]/15 rounded-3xl p-12 text-center shadow-xl space-y-4">
            <div className="w-14 h-14 border-4 border-[#801B2C]/20 border-t-[#801B2C] rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-[#1C1612]">جاري التحقق من عملية الدفع...</h2>
            <p className="text-xs text-[#5C524C]">يرجى الانتظار بضع ثوانٍ بينما نؤكد إتمام المعاملة مع البنك.</p>
          </div>
        )}

        {/* Invalid Access */}
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
              <h2 className="text-xl font-extrabold text-[#1C1612]">رقم الفاتورة غير صحيح</h2>
              <p className="text-xs text-[#5C524C] leading-relaxed max-w-md mx-auto">
                {paymentData.message}
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/checkout" className="px-6 py-3 bg-[#801B2C] text-white rounded-xl text-xs font-bold hover:bg-[#5E1422] transition-colors">
                الانتقال لصفحة الاشتراك
              </Link>
              <Link to="/" className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">
                العودة للرئيسية
              </Link>
            </div>
          </motion.div>
        )}

        {/* Pending State */}
        {!loading && paymentData?.status === 'pending' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-amber-400/40 rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6"
          >
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto border border-amber-200">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-100 text-amber-900 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                <span>بانتظار تأكيد البنك</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#1C1612]">جاري معالجة عملية الدفع</h2>
              <p className="text-xs text-[#5C524C] leading-relaxed max-w-md mx-auto">
                {paymentData.message || 'تم إرسال طلب السداد وبانتظار التأكيد النهائي من البنك. سيتم تحديث الصفحة وتفعيل اشتراكك تلقائياً فور الاعتماد.'}
              </p>
              <div className="p-3 bg-amber-50 rounded-xl font-mono text-xs text-amber-900 inline-block mt-2 border border-amber-100">
                رقم الفاتورة: #{paymentData.invoiceId}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => verifyInvoice(0)} 
                className="px-6 py-3 bg-[#801B2C] text-white rounded-xl text-xs font-bold hover:bg-[#5E1422] transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#801B2C]/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تحديث حالة الدفع</span>
              </button>
              {initialType === 'new' ? (
                <Link to="/" className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center">
                  العودة للرئيسية
                </Link>
              ) : (
                <Link to="/admin?tab=subscription" className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center">
                  العودة للوحة التحكم
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Failed State */}
        {!loading && paymentData?.status === 'failed' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border-2 border-rose-300 rounded-3xl p-6 sm:p-10 text-center shadow-xl space-y-6"
          >
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-sm">
              <XCircle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs bg-rose-100 text-rose-800 font-extrabold px-3.5 py-1 rounded-full">
                <span>عملية دفع غير مقبولة / مرفوضة</span>
              </div>
              <h1 className="text-2xl font-black text-[#1C1612]">تعذر إتمام عملية الدفع</h1>
              <p className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 p-3.5 rounded-2xl max-w-lg mx-auto leading-relaxed">
                {paymentData.message || 'تم رفض المعاملة من قِبل البنك المصدر للبطاقة أو تم إلغاء العملية.'}
              </p>
              {paymentData.tip && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-xs text-amber-900 max-w-lg mx-auto text-right leading-relaxed flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">إرشادات مقترحة لحل المشكلة:</span>
                    <span>{paymentData.tip}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Brief */}
            {paymentData.invoiceId && (
              <div className="bg-[#FAF8F5] border border-zinc-200/80 rounded-2xl p-4 text-xs space-y-2 max-w-md mx-auto text-right">
                <div className="flex justify-between items-center border-b border-zinc-200/60 pb-2">
                  <span className="text-[#5C524C]">رقم الفاتورة:</span>
                  <span className="font-mono font-bold text-[#1C1612]">#{paymentData.invoiceId}</span>
                </div>
                {paymentData.amount ? (
                  <div className="flex justify-between items-center border-b border-zinc-200/60 pb-2">
                    <span className="text-[#5C524C]">المبلغ المطلوب:</span>
                    <span className="font-bold text-[#801B2C]">{paymentData.amount.toLocaleString()} ج.م</span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center">
                  <span className="text-[#5C524C]">حالة المعاملة:</span>
                  <span className="font-bold text-rose-600">مرفوضة / لم يتم الخصم</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-5 border-t border-zinc-100 flex flex-wrap items-center justify-center gap-3 w-full">
              {/* Primary Action Button: Re-try Payment */}
              {initialType === 'new' ? (
                <Link
                  to={`/register?plan=${paymentData.plan || 'basic'}&billing=${paymentData.billingCycle || 'monthly'}`}
                  className="whitespace-nowrap px-6 py-3 bg-[#801B2C] hover:bg-[#601321] text-white rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#801B2C]/25 hover:shadow-lg active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>إعادة المحاولة ببيانات صحيحة</span>
                </Link>
              ) : (
                <Link
                  to={`/checkout?plan=${paymentData.plan || 'pro'}&billing=${paymentData.billingCycle || 'monthly'}`}
                  className="whitespace-nowrap px-6 py-3 bg-[#801B2C] hover:bg-[#601321] text-white rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#801B2C]/25 hover:shadow-lg active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>إعادة المحاولة ببيانات صحيحة</span>
                </Link>
              )}

              {/* Secondary Action Button: Re-verify Payment if money deducted */}
              <button
                type="button"
                onClick={() => verifyInvoice(0)}
                className="whitespace-nowrap px-6 py-3 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 hover:border-zinc-300 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4 shrink-0 text-zinc-500" />
                <span>إعادة التحقق (في حال تم الخصم)</span>
              </button>

              {/* Support Button */}
              <a 
                href={`https://wa.me/${supportWhatsapp.replace(/\D/g, "") || "201066980953"}`} 
                target="_blank" 
                rel="noreferrer"
                className="whitespace-nowrap px-6 py-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-300/80 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>تواصل مع الدعم الفني</span>
              </a>
            </div>
          </motion.div>
        )}

        {/* Success State */}
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
                  تم الدفع بنجاح 100%
                </span>
                <h1 className="text-2xl font-black text-[#1C1612]">إيصال سداد وتفعيل اشتراك رسمي</h1>
                <p className="text-xs text-[#5C524C]">شكراً لثقتكم بمنصة طاولة — تم تفعيل وتمديد الصلاحيات في النظام تلقائياً.</p>
              </div>
            </div>

            {/* Receipt Card */}
            <div className="bg-[#FAF8F5] border border-[#801B2C]/15 rounded-2xl p-6 space-y-4 text-right">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#801B2C]/10 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-[#73675F] block">الرقم المرجعي المعتمد:</span>
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
                  <span className="text-[#73675F]">دورة الفاتورة:</span>
                  <span className="font-bold text-[#1C1612] text-sm">
                    {paymentData.billingCycle === 'annual' ? 'سنوي (12 شهراً)' : 'شهري (30 يوماً)'}
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
                  <span className="text-[#73675F]">بوابة الدفع والتحصيل:</span>
                  <span className="font-bold text-[#1C1612] text-xs flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-[#801B2C]" />
                    الدفع الإلكتروني المعتمد
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
                  <span>معاملة مشفرة وموثقة إلكترونياً بسجلات منصة طاولة.</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-2 print:hidden">
              <Link 
                to="/admin" 
                className="w-full py-4 px-6 bg-gradient-to-r from-[#801B2C] via-[#6e1625] to-[#55101d] hover:from-[#6e1625] hover:to-[#400b15] text-white font-extrabold rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-[#801B2C]/25 transition-all text-base active:scale-[0.99] group"
              >
                <Building2 className="w-5 h-5 shrink-0 text-rose-200 group-hover:scale-110 transition-transform" />
                <span className="whitespace-nowrap">الانتقال مباشرة إلى لوحة تحكم المطعم (Dashboard)</span>
                <ArrowLeft className="w-5 h-5 shrink-0 rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
              </Link>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button 
                  onClick={handlePrint}
                  className="whitespace-nowrap px-6 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-[#801B2C] rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow-xs"
                >
                  <Printer className="w-4 h-4 shrink-0 text-zinc-500" />
                  <span>طباعة إيصال السداد</span>
                </button>
                <Link 
                  to="/"
                  className="whitespace-nowrap px-6 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-zinc-600 hover:text-[#1C1612] rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2"
                >
                  <span>العودة للصفحة الرئيسية</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
