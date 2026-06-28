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
  { key: 'pending', label: 'قيد الانتظار', desc: 'تم إرسال طلبك ومستني الكاشير يقبله', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-600' },
  { key: 'accepted', label: 'تم القبول', desc: 'الكاشير قبل الطلب وتم إرساله للمطبخ', icon: Package, color: 'text-blue-600', bg: 'bg-blue-600' },
  { key: 'preparing', label: 'جاري التحضير', desc: 'الشيف بيجهز طلبك دلوقتي', icon: ChefHat, color: 'text-violet-600', bg: 'bg-violet-600' },
  { key: 'ready', label: 'جاهز للاستلام', desc: 'طلبك جاهز والويتر هيوصله لترابيزتك', icon: Truck, color: 'text-teal-600', bg: 'bg-teal-600' },
  { key: 'delivered', label: 'تم التوصيل', desc: 'بالهنا والشفا! تم توصيل الطلب بنجاح', icon: PartyPopper, color: 'text-emerald-600', bg: 'bg-emerald-600' }
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

  // Sound Synthesizer for Customer
  const playStatusSound = (status: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      // Play different chimes depending on status success level
      if (status === 'delivered') {
        // High upbeat triplet chime for completion
        playNote(523.25, audioCtx.currentTime, 0.15); // C5
        playNote(659.25, audioCtx.currentTime + 0.12, 0.15); // E5
        playNote(783.99, audioCtx.currentTime + 0.24, 0.35); // G5
      } else {
        // Double sweet note for normal update
        playNote(587.33, audioCtx.currentTime, 0.12); // D5
        playNote(880.00, audioCtx.currentTime + 0.10, 0.25); // A5
      }
    } catch (e) {
      console.warn('Audio Context failed to play:', e);
    }
  };

  // Audio Context unlocker
  useEffect(() => {
    const resumeAudio = () => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    };
    window.addEventListener('click', resumeAudio);
    return () => window.removeEventListener('click', resumeAudio);
  }, []);

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
          playStatusSound(data.status);
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
      <div className="min-h-screen bg-light-100 flex flex-col items-center justify-center">
        <div className="w-14 h-14 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-light-500 text-sm animate-pulse">جاري تحميل حالة الطلب...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-light-100 flex flex-col items-center justify-center text-center px-6" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 border border-red-100 shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-light-950 mb-2">الطلب غير موجود</h2>
        <p className="text-light-600 text-sm mb-6">عذراً، لم نتمكن من العثور على تفاصيل الطلب.</p>
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
    <div className="min-h-screen bg-light-100 text-light-950 p-4 pb-20 relative overflow-hidden noise" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#ffffff', color: '#22201b', border: '1px solid rgba(121,115,101,0.15)' }
      }} />

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="glow-blob bg-primary-200 top-1/4 -right-1/4 w-[600px] h-[600px]" />
        <div className="absolute inset-0 dot-pattern opacity-60" />
      </div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center py-4 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-light-950">تتبع طلبك</h1>
            <p className="text-xs text-light-500 mt-1 font-semibold">
              طلب رقم: <span className="font-mono text-primary-800 bg-primary-100 border border-primary-200/50 px-1.5 py-0.5 rounded-md">#{order.id.slice(-6).toUpperCase()}</span>
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
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="organic-card rounded-3xl p-8 text-center space-y-5 mb-6"
        >
          <div className="relative w-24 h-24 mx-auto">
            {/* Pulsing rings */}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <>
                <div className="absolute inset-0 rounded-full border border-primary-600/30 animate-ping-slow" />
                <div className="absolute inset-2 rounded-full border border-primary-600/20 animate-ping-slow" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
              order.status === 'cancelled' ? 'bg-red-50 border border-red-200' :
              order.status === 'delivered' ? 'bg-emerald-50 border border-emerald-200' :
              'bg-primary-50 border border-primary-200'
            }`}>
              {order.status === 'cancelled' ? (
                <AlertCircle className="w-10 h-10 text-red-600" />
              ) : order.status === 'delivered' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <PartyPopper className="w-10 h-10 text-emerald-600" />
                </motion.div>
              ) : (
                <Clock className="w-10 h-10 text-primary-700 animate-pulse" />
              )}
            </div>
          </div>

          {order.status === 'cancelled' ? (
            <div>
              <h2 className="text-xl font-bold text-red-600 mb-1">تم إلغاء الطلب</h2>
              <p className="text-xs text-light-500">تم إلغاء هذا الطلب من قبل الإدارة.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-extrabold text-light-950 mb-1">
                {STATUS_STEPS[activeIndex]?.label || 'جاري المراجعة'}
              </h2>
              <p className="text-sm text-light-500">
                {STATUS_STEPS[activeIndex]?.desc || 'طلبك قيد المراجعة حالياً.'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Order Details */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="organic-card rounded-3xl p-6 mb-6"
        >
          <h3 className="font-extrabold text-light-950 text-sm mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
            تفاصيل الفاتورة
          </h3>
          <div className="space-y-2.5 border-b border-light-200 pb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-light-700 font-semibold">
                  {item.name} <span className="text-primary-800 font-bold">x{item.quantity}</span>
                </span>
                <span className="font-bold text-light-950">{item.price * item.quantity} ج.م</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-light-700 font-semibold">الإجمالي</span>
            <span className="text-xl font-bold text-primary-800">{order.totalAmount} ج.م</span>
          </div>
        </motion.div>

        {/* Stepper */}
        {order.status !== 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="organic-card rounded-3xl p-6"
          >
            <div className="space-y-0 relative">
              {/* Vertical line */}
              <div className="absolute right-[19px] top-6 bottom-6 w-[2px] bg-light-200 z-0" />
              
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx < activeIndex;
                const isActive = idx === activeIndex;
                const StepIcon = step.icon;

                return (
                  <motion.div 
                    key={step.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className={`flex gap-4 items-start relative z-10 ${idx < STATUS_STEPS.length - 1 ? 'pb-8' : ''}`}
                  >
                    {/* Circle */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      isCompleted 
                        ? `${step.bg} text-white shadow-md` 
                        : isActive 
                        ? `bg-white ${step.color} border-2 border-current shadow-sm`
                        : 'bg-light-200 text-light-400 border border-light-300'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      ) : (
                        <StepIcon className="w-4.5 h-4.5" />
                      )}
                    </div>

                    <div className="flex-1 pt-1.5">
                      <h4 className={`text-sm font-bold transition-colors ${
                        isCompleted || isActive ? 'text-light-950 font-extrabold' : 'text-light-400'
                      }`}>
                        {step.label}
                      </h4>
                      <p className={`text-xs mt-1 leading-relaxed transition-colors ${
                        isActive ? 'text-light-600 font-semibold' : 'text-light-400'
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
