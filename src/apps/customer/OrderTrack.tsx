import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, 
  Package, ChefHat, Truck, PartyPopper, UtensilsCrossed, Bell, Receipt, X 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import type { Order } from '../../shared/types';

const STATUS_STEPS = [
  { key: 'pending', label: 'قيد الانتظار', desc: 'تم إرسال طلبك ومستني الكاشير يقبله', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' },
  { key: 'accepted', label: 'تم القبول', desc: 'الكاشير قبل الطلب وتم إرساله للمطبخ', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/30' },
  { key: 'preparing', label: 'جاري التحضير', desc: 'الشيف بيجهز طلبك دلوقتي', icon: ChefHat, color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/30' },
  { key: 'ready', label: 'جاهز للاستلام', desc: 'طلبك جاهز والويتر هيوصله لترابيزتك', icon: Truck, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { key: 'delivered', label: 'تم التوصيل', desc: 'بالهنا والشفا! تم توصيل الطلب بنجاح', icon: PartyPopper, color: 'text-customer-accent', bg: 'bg-customer-accent-subtle border-customer-accent/30' }
];

export default function OrderTrack() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isServiceOpen, setIsServiceOpen] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-track', orderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${orderId}/public`);
      return response.data.data as Order;
    },
    enabled: !!orderId,
    refetchInterval: 15000,
  });

  // Service Mutations
  const callWaiterMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      await api.post('/orders/call-waiter', { tableNumber: order.tableNumber }, {
        headers: { 'x-restaurant-id': order.restaurantId },
      });
    },
    onSuccess: () => {
      toast.success('تم استدعاء الويتر، وجاري الحضور إليك');
    },
    onError: () => {
      toast.error('فشل استدعاء الويتر. يرجى المحاولة لاحقاً.');
    },
  });

  const requestBillMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      await api.post('/orders/request-bill', { tableNumber: order.tableNumber }, {
        headers: { 'x-restaurant-id': order.restaurantId },
      });
    },
    onSuccess: () => {
      toast.success('تم طلب الحساب، الكاشير هيحضرلك فوراً');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل طلب الحساب.');
    },
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
      
      if (status === 'delivered') {
        playNote(523.25, audioCtx.currentTime, 0.15); // C5
        playNote(659.25, audioCtx.currentTime + 0.12, 0.15); // E5
        playNote(783.99, audioCtx.currentTime + 0.24, 0.35); // G5
      } else {
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
          toast.success(`تحديث الطلب: ${matchedStep.label}`, { duration: 5000 });
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
      <div className="min-h-screen bg-customer-bg-base flex flex-col items-center justify-center text-customer-text-primary">
        <div className="w-14 h-14 border-2 border-customer-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-customer-text-secondary text-sm animate-pulse">جاري تحميل حالة الطلب...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-customer-bg-base flex flex-col items-center justify-center text-center px-6 text-customer-text-primary" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-customer-bg-elevated flex items-center justify-center mb-4 border border-customer-border shadow-customer-card">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-customer-text-primary mb-2">الطلب غير موجود</h2>
        <p className="text-customer-text-secondary text-sm mb-6">عذراً، لم نتمكن من العثور على تفاصيل الطلب.</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-customer-bg-elevated border border-customer-border text-customer-accent px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-customer-bg-overlay transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع للمنيو</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-customer-bg-base text-customer-text-primary p-4 pb-24 relative overflow-hidden noise" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1a1a1e', color: '#f5f5f0', border: '1px solid rgba(255,255,255,0.08)' }
      }} />

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="glow-blob bg-customer-accent-glow top-1/4 -right-1/4 w-[600px] h-[600px]" />
        <div className="absolute inset-0 dot-pattern" />
      </div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center py-4 mb-6">
          <div>
            <h1 className="text-xl font-display font-extrabold text-customer-text-primary">تتبع طلبك</h1>
            <p className="text-xs text-customer-text-secondary mt-1.5 font-semibold">
              طاولة {order.tableNumber}
            </p>
          </div>
          <motion.button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['order-track', orderId] })}
            whileTap={{ scale: 0.9, rotate: 180 }}
            className="p-2.5 rounded-xl border border-customer-border bg-customer-bg-elevated text-customer-accent hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Status Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-customer-bg-elevated border border-customer-border rounded-lg p-8 text-center space-y-5 mb-6 shadow-customer-card"
        >
          <div className="relative w-24 h-24 mx-auto">
            {/* Pulsing rings */}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <>
                <div className="absolute inset-0 rounded-full border border-customer-accent/30 animate-ping-slow" />
                <div className="absolute inset-2 rounded-full border border-customer-accent/20 animate-ping-slow" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
              order.status === 'cancelled' ? 'bg-red-500/10 border border-red-500/20' :
              order.status === 'delivered' ? 'bg-customer-accent-subtle border border-customer-accent/20' :
              'bg-customer-accent-subtle border border-customer-accent/20'
            }`}>
              {order.status === 'cancelled' ? (
                <AlertCircle className="w-10 h-10 text-red-500" />
              ) : order.status === 'delivered' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <PartyPopper className="w-10 h-10 text-customer-accent" />
                </motion.div>
              ) : (
                <Clock className="w-10 h-10 text-customer-accent animate-pulse" />
              )}
            </div>
          </div>

          {order.status === 'cancelled' ? (
            <div>
              <h2 className="text-xl font-bold text-red-500 mb-1">تم إلغاء الطلب</h2>
              <p className="text-xs text-customer-text-secondary">تم إلغاء هذا الطلب من قبل الإدارة.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-extrabold text-customer-text-primary mb-1">
                {STATUS_STEPS[activeIndex]?.label || 'جاري المراجعة'}
              </h2>
              <p className="text-sm text-customer-text-secondary">
                {STATUS_STEPS[activeIndex]?.desc || 'طلبك قيد المراجعة حالياً.'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Order Number */}
        <div className="order-number">
          <div className="order-number-label">رقم الطلب</div>
          <div className="order-number-value">
            #{order.id.slice(-6).toUpperCase()}
          </div>
        </div>

        {/* Horizontal Status Bar */}
        {order.status !== 'cancelled' && (
          <div className="order-steps mb-6">
            <div className={`order-step ${activeIndex >= 0 ? 'done' : ''}`} />
            <div className={`order-step ${activeIndex >= 1 ? 'done' : activeIndex === 0 ? 'active' : ''}`} />
            <div className={`order-step ${activeIndex >= 3 ? 'done' : activeIndex === 2 ? 'active' : ''}`} />
            <div className={`order-step ${activeIndex >= 4 ? 'done' : activeIndex === 3 ? 'active' : ''}`} />
          </div>
        )}

        {/* Order Details */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-customer-bg-elevated border border-customer-border rounded-lg p-6 mb-6 shadow-customer-card"
        >
          <h3 className="font-extrabold text-customer-text-primary text-sm mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-customer-accent" />
            <span>تفاصيل الفاتورة</span>
          </h3>
          <div className="space-y-2.5 border-b border-customer-border pb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-customer-text-secondary font-semibold">
                  {item.name} <span className="text-customer-accent font-bold">x{item.quantity}</span>
                </span>
                <span className="font-bold text-customer-text-primary">{item.price * item.quantity} ج.م</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-customer-text-secondary font-semibold">الإجمالي</span>
            <span className="text-xl font-bold text-customer-accent">{order.totalAmount} ج.م</span>
          </div>
        </motion.div>

        {/* Stepper list */}
        {order.status !== 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-customer-bg-elevated border border-customer-border rounded-lg p-6 shadow-customer-card"
          >
            <div className="space-y-0 relative">
              <div className="absolute right-[19px] top-6 bottom-6 w-[2px] bg-customer-border z-0" />
              
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      isCompleted 
                        ? `bg-customer-accent text-customer-bg-base shadow-customer-accent` 
                        : isActive 
                        ? `bg-customer-bg-base ${step.color} border-2 border-current`
                        : 'bg-customer-bg-overlay text-customer-text-muted border border-customer-border'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      ) : (
                        <StepIcon className="w-4.5 h-4.5" />
                      )}
                    </div>

                    <div className="flex-1 pt-1.5 text-right">
                      <h4 className={`text-sm font-bold transition-colors ${
                        isCompleted || isActive ? 'text-customer-text-primary font-extrabold' : 'text-customer-text-muted'
                      }`}>
                        {step.label}
                      </h4>
                      <p className={`text-xs mt-1 leading-relaxed transition-colors ${
                        isActive ? 'text-customer-text-secondary font-semibold' : 'text-customer-text-muted'
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

      {/* ===== persistent Bottom Navigation Bar ===== */}
      <div className="fixed bottom-0 inset-x-0 bottom-nav z-40 max-w-[430px] mx-auto rounded-t-2xl shadow-customer-elevated">
        <button
          onClick={() => {
            const cachedSlug = localStorage.getItem('tawla_restaurant_slug') || 'demo';
            const cachedTable = localStorage.getItem('tawla_table_number') || '1';
            navigate(`/menu/${cachedSlug}/table/${cachedTable}`);
          }}
          className="bottom-nav-item"
        >
          <UtensilsCrossed />
          <span>المنيو</span>
        </button>

        <button
          onClick={() => setIsServiceOpen(true)}
          className="bottom-nav-item"
        >
          <Bell />
          <span>الخدمات</span>
        </button>

        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['order-track', orderId] });
            toast.success('تم تحديث حالة الطلب');
          }}
          className="bottom-nav-item active"
        >
          <Clock />
          <span>طلباتي</span>
        </button>
      </div>

      {/* ===== Service Drawer ===== */}
      <AnimatePresence>
        {isServiceOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsServiceOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-customer-bg-overlay rounded-t-3xl z-50 p-6 border-t border-customer-border shadow-customer-elevated max-w-[430px] mx-auto text-center"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-customer-text-primary text-base flex items-center gap-2">
                  <Bell className="w-5 h-5 text-customer-accent" />
                  <span>طلب خدمة أو مساعدة</span>
                </h3>
                <button 
                  onClick={() => setIsServiceOpen(false)} 
                  className="w-8 h-8 rounded-full bg-customer-bg-elevated border border-customer-border flex items-center justify-center text-customer-text-secondary hover:text-customer-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  onClick={() => {
                    callWaiterMutation.mutate();
                    setIsServiceOpen(false);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-customer-bg-elevated border border-customer-border hover:border-customer-accent/30 flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl text-sm font-bold text-customer-accent transition-colors shadow-customer-card"
                >
                  <div className="w-12 h-12 rounded-full bg-customer-accent/10 border border-customer-accent/20 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-customer-accent" />
                  </div>
                  <span>استدعاء ويتر</span>
                </motion.button>
                <motion.button
                  onClick={() => {
                    requestBillMutation.mutate();
                    setIsServiceOpen(false);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-customer-bg-elevated border border-customer-border hover:border-customer-accent/30 flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl text-sm font-bold text-customer-accent transition-colors shadow-customer-card"
                >
                  <div className="w-12 h-12 rounded-full bg-customer-accent/10 border border-customer-accent/20 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-customer-accent" />
                  </div>
                  <span>طلب الحساب</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
