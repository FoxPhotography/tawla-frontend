import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Package, ChefHat, Truck, PartyPopper } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import type { Order } from '../../shared/types';

const STATUS_STEPS = [
  { key: 'pending', label: 'قيد الانتظار', desc: 'تم إرسال طلبك ومستني الكاشير يقبله', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500' },
  { key: 'accepted', label: 'تم القبول', desc: 'الكاشير قبل الطلب وتم إرساله للمطبخ', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500' },
  { key: 'preparing', label: 'جاري التحضير', desc: 'الشيف بيجهز طلبك دلوقتي', icon: ChefHat, color: 'text-violet-400', bg: 'bg-violet-500' },
  { key: 'ready', label: 'جاهز للاستلام', desc: 'طلبك جاهز والويتر هيوصله لترابيزتك', icon: Truck, color: 'text-teal-400', bg: 'bg-teal-500' },
  { key: 'delivered', label: 'تم التوصيل', desc: 'بالهنا والشفا! تم توصيل الطلب بنجاح', icon: PartyPopper, color: 'text-emerald-400', bg: 'bg-emerald-500' }
];

export default function OrderTrack() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-track', orderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${orderId}/public`);
      return response.data.data as Order;
    },
    enabled: !!orderId,
    refetchInterval: 15000,
  });

  // Socket.io
  useEffect(() => {
    if (!orderId) return;

    const handleConnect = () => {
      console.log('Socket connected, joining order room:', orderId);
      socket.emit('join_order', orderId);
    };

    socket.on('connect', handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    socket.on('order_status_updated', (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId) {
        queryClient.setQueryData(['order-track', orderId], (oldData: any) => {
          if (!oldData) return oldData;
          return { ...oldData, status: data.status };
        });
        const matchedStep = STATUS_STEPS.find(s => s.key === data.status);
        if (matchedStep) {
          toast.success(`تحديث الطلب: ${matchedStep.label}`, { icon: '🔔', duration: 5000 });
        }
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('order_status_updated');
    };
  }, [orderId, queryClient]);

  const activeIndex = STATUS_STEPS.findIndex(step => step.key === order?.status);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center">
        <div className="w-14 h-14 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-dark-400 text-sm animate-pulse">جاري تحميل حالة الطلب...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-center px-6" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">الطلب غير موجود</h2>
        <p className="text-dark-400 text-sm mb-6">عذراً، لم نتمكن من العثور على تفاصيل الطلب.</p>
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع للمنيو</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 p-4 pb-20 relative overflow-hidden" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.1)' }
      }} />

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary-500/[0.02] blur-3xl" />
        <div className="absolute inset-0 dot-pattern opacity-50" />
      </div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center py-4 mb-6">
          <div>
            <h1 className="text-lg font-bold text-white">تتبع طلبك</h1>
            <p className="text-xs text-dark-500 mt-0.5">
              طلب رقم: <span className="font-mono text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded-md">#{order.id.slice(-6).toUpperCase()}</span>
            </p>
          </div>
          <motion.button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['order-track', orderId] })}
            whileTap={{ scale: 0.9, rotate: 180 }}
            className="btn-icon"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Status Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 text-center space-y-5 mb-6"
        >
          <div className="relative w-24 h-24 mx-auto">
            {/* Pulsing rings */}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <>
                <div className="absolute inset-0 rounded-full border border-primary-500/30 animate-ping-slow" />
                <div className="absolute inset-2 rounded-full border border-primary-500/20 animate-ping-slow" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
              order.status === 'cancelled' ? 'bg-red-500/10 border border-red-500/20' :
              order.status === 'delivered' ? 'bg-emerald-500/10 border border-emerald-500/20' :
              'bg-primary-500/10 border border-primary-500/20'
            }`}>
              {order.status === 'cancelled' ? (
                <AlertCircle className="w-10 h-10 text-red-400" />
              ) : order.status === 'delivered' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <PartyPopper className="w-10 h-10 text-emerald-400" />
                </motion.div>
              ) : (
                <Clock className="w-10 h-10 text-primary-500 animate-pulse" />
              )}
            </div>
          </div>

          {order.status === 'cancelled' ? (
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-1">تم إلغاء الطلب</h2>
              <p className="text-xs text-dark-500">تم إلغاء هذا الطلب من قبل الإدارة.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                {STATUS_STEPS[activeIndex]?.label || 'جاري المراجعة'}
              </h2>
              <p className="text-sm text-dark-400">
                {STATUS_STEPS[activeIndex]?.desc || 'طلبك قيد المراجعة حالياً.'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Order Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 mb-6"
        >
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            تفاصيل الفاتورة
          </h3>
          <div className="space-y-2.5 border-b border-dark-800/30 pb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-dark-300">
                  {item.name} <span className="text-primary-500 font-bold">x{item.quantity}</span>
                </span>
                <span className="font-medium text-white">{item.price * item.quantity} ج.م</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-dark-300 font-medium">الإجمالي</span>
            <span className="text-xl font-bold text-gradient-gold">{order.totalAmount} ج.م</span>
          </div>
        </motion.div>

        {/* Stepper */}
        {order.status !== 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="space-y-0 relative">
              {/* Vertical line */}
              <div className="absolute right-[19px] top-6 bottom-6 w-[2px] bg-dark-800/40 z-0" />
              
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx < activeIndex;
                const isActive = idx === activeIndex;
                const StepIcon = step.icon;

                return (
                  <motion.div 
                    key={step.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className={`flex gap-4 items-start relative z-10 ${idx < STATUS_STEPS.length - 1 ? 'pb-8' : ''}`}
                  >
                    {/* Circle */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      isCompleted 
                        ? `${step.bg} text-white shadow-lg` 
                        : isActive 
                        ? `bg-dark-900 ${step.color} border-2 border-current animate-pulse-glow`
                        : 'bg-dark-800/40 text-dark-600 border border-dark-700/30'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      ) : (
                        <StepIcon className="w-4.5 h-4.5" />
                      )}
                    </div>

                    <div className="flex-1 pt-1.5">
                      <h4 className={`text-sm font-bold transition-colors ${
                        isCompleted || isActive ? 'text-white' : 'text-dark-600'
                      }`}>
                        {step.label}
                      </h4>
                      <p className={`text-xs mt-1 leading-relaxed transition-colors ${
                        isActive ? 'text-dark-300' : 'text-dark-600'
                      }`}>
                        {step.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
