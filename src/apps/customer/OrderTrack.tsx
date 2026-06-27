import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import type { Order } from '../../shared/types';

const STATUS_STEPS = [
  { key: 'pending', label: 'قيد الانتظار', desc: 'تم إرسال طلبك ومستني الكاشير يقبله' },
  { key: 'accepted', label: 'تم القبول', desc: 'الكاشير قبل الطلب وتم إرساله للمطبخ' },
  { key: 'preparing', label: 'جاري التحضير', desc: 'الشيف بيجهز طلبك دلوقتي' },
  { key: 'ready', label: 'جاهز للاستلام', desc: 'طلبك جاهز والويتر هيوصله لترابيزتك' },
  { key: 'delivered', label: 'تم التوصيل', desc: 'بالهنا والشفا! تم توصيل الطلب بنجاح' }
];

export default function OrderTrack() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch Order Details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-track', orderId],
    queryFn: async () => {
      // Unauthenticated endpoint or tenant-configured fetch
      const response = await api.get(`/orders/${orderId}`);
      return response.data.data as Order;
    },
    enabled: !!orderId,
    refetchInterval: 15000, // Fallback pooling every 15s
  });

  // 2. Setup Socket.io Event Listeners
  useEffect(() => {
    if (!orderId) return;

    // Connect socket if not connected
    if (!socket.connected) {
      socket.connect();
    }

    // Join order room
    socket.emit('join_order', orderId);

    // Listen to updates
    socket.on('order_status_updated', (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId) {
        // Optimistically update query client state
        queryClient.setQueryData(['order-track', orderId], (oldData: any) => {
          if (!oldData) return oldData;
          return { ...oldData, status: data.status };
        });

        // Trigger toast update notification
        const matchedStep = STATUS_STEPS.find(s => s.key === data.status);
        if (matchedStep) {
          toast.success(`تحديث الطلب: ${matchedStep.label}`, {
            icon: '🔔',
            duration: 5000,
          });
        }
      }
    });

    return () => {
      socket.off('order_status_updated');
    };
  }, [orderId, queryClient]);

  const activeIndex = STATUS_STEPS.findIndex(step => step.key === order?.status);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-950 text-dark-300">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>جاري تحميل حالة الطلب...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-950 text-center px-4" dir="rtl">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">الطلب غير موجود</h2>
        <p className="text-dark-400 mb-6">عذراً، لم نتمكن من العثور على تفاصيل الطلب المطلوبة.</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-dark-900 border border-dark-800 text-white hover:bg-dark-850 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>الرجوع للمنيو</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 p-4 pb-20" dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="max-w-md mx-auto flex justify-between items-center py-4 border-b border-dark-800 mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">تتبع طلبك</h1>
          <p className="text-xs text-dark-400">طلب رقم: <span className="font-mono text-primary-500">#{order.id.slice(-6).toUpperCase()}</span></p>
        </div>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['order-track', orderId] })}
          className="p-2 bg-dark-900 border border-dark-800 rounded-xl hover:bg-dark-850 active:scale-95 transition-all text-dark-300"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Status card card */}
        <div className="glassmorphism-card p-6 rounded-3xl text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center bg-primary-500/10 border border-primary-500/20 rounded-full">
            <div className="absolute inset-0 rounded-full border border-primary-500 animate-ping-slow opacity-30"></div>
            {order.status === 'cancelled' ? (
              <AlertCircle className="w-10 h-10 text-red-500" />
            ) : order.status === 'delivered' ? (
              <CheckCircle2 className="w-10 h-10 text-primary-500" />
            ) : (
              <Clock className="w-10 h-10 text-primary-500 animate-pulse" />
            )}
          </div>
          <div>
            {order.status === 'cancelled' ? (
              <div>
                <h2 className="text-xl font-bold text-red-500 mb-1">تم إلغاء الطلب</h2>
                <p className="text-xs text-dark-400">تم إلغاء هذا الطلب من قبل الإدارة.</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {STATUS_STEPS[activeIndex]?.label || 'جاري المراجعة'}
                </h2>
                <p className="text-xs text-dark-400">
                  {STATUS_STEPS[activeIndex]?.desc || 'طلبك قيد المراجعة حالياً.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Accordion */}
        <div className="bg-dark-900 border border-dark-800/80 rounded-2xl p-4">
          <h3 className="font-bold text-white text-sm mb-3">تفاصيل الفاتورة</h3>
          <div className="space-y-2 border-b border-dark-800 pb-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-dark-300">
                  {item.name} <span className="text-xs text-primary-500 font-bold">x{item.quantity}</span>
                </span>
                <span className="font-semibold text-white">{item.price * item.quantity} ج.م</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 text-base font-bold">
            <span className="text-dark-200">الإجمالي</span>
            <span className="text-primary-500">{order.totalAmount} ج.م</span>
          </div>
        </div>

        {/* Tracker Stepper */}
        {order.status !== 'cancelled' && (
          <div className="bg-dark-900 border border-dark-800/80 rounded-2xl p-6 relative">
            <div className="absolute right-9 top-9 bottom-9 w-0.5 bg-dark-800 z-0"></div>
            
            <div className="space-y-6 relative z-10">
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx < activeIndex;
                const isActive = idx === activeIndex;
                const isFuture = idx > activeIndex;

                return (
                  <div key={step.key} className="flex gap-4 items-start">
                    {/* Circle icon marker */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      isCompleted 
                        ? 'bg-primary-500 text-dark-950 ring-4 ring-primary-500/10'
                        : isActive 
                        ? 'bg-dark-950 text-primary-500 border border-primary-500 ring-4 ring-primary-500/20'
                        : 'bg-dark-850 text-dark-600 border border-dark-800'
                    }`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>

                    <div className="flex-1">
                      <h4 className={`text-sm font-bold transition-colors ${
                        isFuture ? 'text-dark-500' : 'text-white'
                      }`}>
                        {step.label}
                      </h4>
                      <p className={`text-xs mt-1 transition-colors leading-relaxed ${
                        isActive ? 'text-dark-300' : 'text-dark-500'
                      }`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
