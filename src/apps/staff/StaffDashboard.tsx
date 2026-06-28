import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, LogOut, Bell, LayoutGrid, MapPin, 
  Check, CheckCheck, Play, XCircle, CreditCard, Clock, Sparkles
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import { useAuthStore } from '../../shared/store/authStore';
import type { Order, Table } from '../../shared/types';

// ============ Framer Motion Animation Variants ============
const orderCardVariants = {
  hidden: { y: -20, opacity: 0, scale: 0.97 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 350, damping: 25 }
  },
  exit: {
    x: 60,
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.3, ease: "easeIn" as const }
  }
};

const statusChangeVariants = {
  tap: { scale: 0.96 },
  transition: { duration: 0.15 }
};

interface LiveAlert {
  id: string;
  type: 'call_waiter' | 'bill';
  tableNumber: number;
  totalAmount?: number;
  time: Date;
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, restaurant, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders');
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  // Toast Notification States
  const [showNewOrderToast, setShowNewOrderToast] = useState(false);
  const [newOrderDetails, setNewOrderDetails] = useState<any | null>(null);

  // Custom states for Tably Luxury top-bar & timers
  const [isOnline, setIsOnline] = useState(socket.connected);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setTick] = useState(0);

  // Digital Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Force-rerender live timers every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Sound Synthesizer for Staff Dashboard alerts
  const playAlertSound = (type: 'call_waiter' | 'bill' | 'new_order') => {
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
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (type === 'new_order') {
        playNote(880.00, audioCtx.currentTime, 0.15); // A5
        playNote(1046.50, audioCtx.currentTime + 0.12, 0.3); // C6
      } else if (type === 'bill') {
        playNote(987.77, audioCtx.currentTime, 0.08); // B5
        playNote(1318.51, audioCtx.currentTime + 0.06, 0.25); // E6
      } else {
        playNote(783.99, audioCtx.currentTime, 0.25); // G5
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

  // Fetch Orders
  const { data: orders = [] } = useQuery({
    queryKey: ['staff-orders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      return response.data.data as Order[];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Fetch Tables
  const { data: tables = [] } = useQuery({
    queryKey: ['staff-tables'],
    queryFn: async () => {
      const response = await api.get('/tables');
      return response.data.data as Table[];
    },
    enabled: !!user,
  });

  // Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: string }) => {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
    },
    onSuccess: () => {
      toast.success('تم تحديث حالة الطلب.');
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تحديث حالة الطلب.');
    },
  });

  // Empty Table
  const emptyTableMutation = useMutation({
    mutationFn: async ({ tableId }: { tableId: string }) => {
      await api.post(`/tables/${tableId}/empty`);
    },
    onSuccess: () => {
      toast.success('تم تفريغ الطاولة.');
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تفريغ الطاولة.');
    },
  });

  // Socket Listener
  useEffect(() => {
    if (!user || !restaurant) return;

    const handleConnect = () => {
      console.log('Socket connected, joining restaurant room:', restaurant.id);
      socket.emit('join_restaurant', restaurant.id);
      setIsOnline(true);
    };

    const handleDisconnect = () => {
      setIsOnline(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    socket.on('new_order', (data: { order: Order }) => {
      queryClient.setQueryData(['staff-orders'], (old: any) => {
        const list = old ? [...old] : [];
        if (!list.find((o: any) => o.id === data.order.id)) {
          list.unshift(data.order);
        }
        return list;
      });
      playAlertSound('new_order');
      setNewOrderDetails(data.order);
      setShowNewOrderToast(true);
      setTimeout(() => setShowNewOrderToast(false), 5000);
      toast.success(`طلب جديد من طاولة رقم ${data.order.tableNumber} بقيمة ${data.order.totalAmount} ج.م`);
    });

    socket.on('order_status_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    });

    socket.on('table_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    });

    socket.on('call_waiter', (data: { tableNumber: number }) => {
      playAlertSound('call_waiter');
      const newAlert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'call_waiter',
        tableNumber: data.tableNumber,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev]);
      toast(`نداء ويتر: طاولة رقم ${data.tableNumber}`);
    });

    socket.on('request_bill', (data: { tableNumber: number; totalAmount: number }) => {
      playAlertSound('bill');
      const newAlert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'bill',
        tableNumber: data.tableNumber,
        totalAmount: data.totalAmount,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev]);
      toast(`طلب الحساب: طاولة رقم ${data.tableNumber} بمبلغ ${data.totalAmount} ج.م`);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_order');
      socket.off('order_status_updated');
      socket.off('table_status_changed');
      socket.off('call_waiter');
      socket.off('request_bill');
    };
  }, [user, restaurant, queryClient]);

  useEffect(() => {
    if (!user) navigate('/staff/login');
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const getNextStatusAction = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { label: 'قبول الطلب', next: 'accepted', actionClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-black', icon: <Check className="w-4 h-4" /> };
      case 'accepted':
        return { label: 'بدء التحضير', next: 'preparing', actionClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white', icon: <Play className="w-4 h-4" /> };
      case 'preparing':
        return { label: 'جاهز للتوصيل', next: 'ready', actionClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white', icon: <CheckCheck className="w-4 h-4" /> };
      case 'ready':
        return { label: 'تم التوصيل', next: 'delivered', actionClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white', icon: <CheckCheck className="w-4 h-4" /> };
      default:
        return null;
    }
  };

  if (!user || !restaurant) return null;

  return (
    <div className="flex flex-row min-h-screen bg-staff-bg-base text-staff-text-primary relative overflow-hidden noise" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="glow-blob bg-staff-accent-glow top-1/4 -right-1/4 w-[600px] h-[600px]" />
        <div className="glow-blob bg-staff-accent-soft bottom-1/4 -left-1/4 w-[500px] h-[500px]" />
        <div className="absolute inset-0 dot-pattern opacity-60" />
      </div>

      <Toaster position="top-left" toastOptions={{
        style: { background: '#141720', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.08)' }
      }} />

      {/* ===== new Order Toast Notification Banner ===== */}
      <AnimatePresence>
        {showNewOrderToast && newOrderDetails && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-6 z-50 bg-[#1e2330] border-l-4 border-indigo-500 p-4 rounded-xl shadow-staff-elevated flex items-center gap-4 max-w-sm"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-staff-text-primary">طلب جديد وارد!</h4>
              <p className="text-xs text-staff-text-secondary">طاولة {newOrderDetails.tableNumber} · الإجمالي {newOrderDetails.totalAmount} ج.م</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 64px narrow sidebar ===== */}
      <aside className="w-16 bg-staff-bg-elevated border-l border-staff-border flex flex-col items-center py-6 justify-between z-30 flex-shrink-0">
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-11 h-11 rounded-xl bg-staff-accent-soft border border-staff-border flex items-center justify-center">
            <Coffee className="w-5 h-5 text-staff-accent" />
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'orders'
                  ? 'bg-staff-accent text-white shadow-staff-accent'
                  : 'text-staff-text-muted hover:text-staff-text-primary hover:bg-staff-bg-panel'
              }`}
              title="الطلبات النشطة"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'tables'
                  ? 'bg-staff-accent text-white shadow-staff-accent'
                  : 'text-staff-text-muted hover:text-staff-text-primary hover:bg-staff-bg-panel'
              }`}
              title="خريطة الطاولات"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-staff-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* ===== Main Content Area ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-staff-bg-base overflow-hidden z-10">
        
        {/* Top Control Bar */}
        <header className="bg-staff-bg-elevated border-b border-staff-border py-4 px-6 flex justify-between items-center z-20 flex-shrink-0">
          <div>
            <h1 className="text-sm font-extrabold text-staff-text-primary leading-tight">{restaurant.name}</h1>
            <p className="text-[11px] text-staff-text-muted">
              {user.name} · {user.role === 'cashier' ? 'كاشير' : user.role === 'waiter' ? 'ويتر' : 'مدير'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Socket connectivity badge */}
            <span className="flex items-center gap-2 bg-staff-bg-base border border-staff-border px-3 py-1.5 rounded-full text-[10px] font-bold">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-red-500 animate-ping'}`} />
              <span>{isOnline ? 'متصل بالنظام' : 'غير متصل'}</span>
            </span>

            {/* Live digital clock */}
            <span className="font-mono text-[11px] text-staff-text-secondary bg-staff-bg-base border border-staff-border px-3 py-1.5 rounded-full">
              {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-y-auto min-h-0">
          
          {/* Alerts & Table Status Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0">
            
            {/* Table status grids */}
            <div className="bg-staff-bg-elevated border border-staff-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-staff-text-muted uppercase tracking-wider">حالة الطاولات</h3>
              <div className="grid grid-cols-5 gap-2">
                {tables.map(table => {
                  let cellClass = 'bg-staff-bg-panel text-staff-text-muted border border-staff-border';
                  if (table.status === 'occupied') {
                    cellClass = 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400';
                  } else if (table.status === 'waitingBill') {
                    cellClass = 'bg-red-500/10 border border-red-500/20 text-red-500 animate-pulse';
                  }
                  return (
                    <div
                      key={table.id}
                      onClick={() => {
                        setActiveTab('tables');
                        toast(`طاولة رقم ${table.number}: ${table.status === 'occupied' ? 'مشغولة' : table.status === 'waitingBill' ? 'تطلب الحساب' : 'متاحة'}`);
                      }}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${cellClass}`}
                      title={`طاولة ${table.number}`}
                    >
                      {table.number}
                    </div>
                  );
                })}
              </div>
            </div>

            <h2 className="text-sm font-extrabold text-staff-text-primary flex items-center gap-2">
              <Bell className="w-4 h-4 text-staff-accent" />
              <span>التنبيهات المباشرة</span>
              {alerts.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold">
                  {alerts.length}
                </span>
              )}
            </h2>

            <div className="flex-1 min-h-[120px] lg:min-h-0 overflow-y-auto space-y-3 bg-staff-bg-elevated border border-staff-border rounded-xl p-4 scrollbar-hide">
              {alerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-staff-bg-base border border-staff-border flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-staff-text-muted" />
                  </div>
                  <p className="text-xs text-staff-text-muted font-semibold">لا توجد نداءات نشطة</p>
                </div>
              ) : (
                <AnimatePresence>
                  {alerts.map((alert) => (
                    <motion.div
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.9 }}
                      key={alert.id}
                      className={`bg-staff-bg-panel rounded-xl p-4 space-y-2 border ${
                        alert.type === 'bill' 
                          ? 'border-emerald-500/20' 
                          : 'border-blue-500/20'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          alert.type === 'bill' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {alert.type === 'bill' ? (
                            <><CreditCard className="w-3 h-3" /> طلب الحساب</>
                          ) : (
                            <><Bell className="w-3 h-3" /> نداء ويتر</>
                          )}
                        </span>
                        <button onClick={() => dismissAlert(alert.id)} className="text-staff-text-muted hover:text-staff-text-primary transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-staff-text-secondary font-semibold">
                        طاولة رقم <span className="font-extrabold text-staff-text-primary text-lg">{alert.tableNumber}</span>
                        {alert.type === 'bill' && (
                          <span> بمبلغ <span className="font-bold text-emerald-400">{alert.totalAmount} ج.م</span></span>
                        )}
                      </div>
                      <span className="text-[10px] text-staff-text-muted flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Right Side: Tab Panel Content */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex-1 min-h-0"
              >
                {activeTab === 'orders' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
                    {orders.length === 0 ? (
                      <div className="col-span-full bg-staff-bg-elevated border border-staff-border rounded-xl p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-staff-bg-base border border-staff-border flex items-center justify-center mx-auto mb-4">
                          <LayoutGrid className="w-7 h-7 text-staff-text-muted" />
                        </div>
                        <p className="text-staff-text-secondary font-medium">لا توجد طلبات نشطة حالياً</p>
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {orders.map((order, idx) => {
                          const action = getNextStatusAction(order.status);
                          
                          // Calculate live elapsed minutes
                          const elapsedMs = Date.now() - new Date(order.createdAt).getTime();
                          const elapsedMins = Math.floor(elapsedMs / (60 * 1000));
                          let timerClass = 'text-staff-text-secondary bg-staff-bg-panel border border-staff-border';
                          if (elapsedMins >= 20) {
                            timerClass = 'text-red-500 bg-red-500/10 border border-red-500/20 animate-pulse font-extrabold';
                          } else if (elapsedMins >= 10) {
                            timerClass = 'text-amber-500 bg-amber-500/10 border border-amber-500/20';
                          }

                          const isPending = order.status === 'pending';
                          const cardBorderColor = 
                            order.status === 'pending' ? 'border-r-amber-500' :
                            order.status === 'accepted' ? 'border-r-indigo-500' :
                            order.status === 'preparing' ? 'border-r-violet-500' :
                            order.status === 'ready' ? 'border-r-emerald-500' : 'border-r-stone-500';

                          return (
                            <motion.div
                              key={order.id}
                              variants={orderCardVariants}
                              exit="exit"
                              layout
                              initial="hidden"
                              animate="visible"
                              custom={idx}
                              className={`bg-staff-bg-elevated border rounded-lg p-5 flex flex-col justify-between gap-4 border-r-4 ${cardBorderColor} shadow-staff-card transition-all duration-300 ${
                                isPending ? 'animate-pending-pulse bg-gradient-to-br from-staff-bg-elevated to-amber-500/[0.03]' : ''
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Order header */}
                                <div className="flex justify-between items-center pb-3 border-b border-staff-border">
                                  <div>
                                    <span className="text-[11px] text-staff-text-secondary font-mono bg-staff-bg-panel border border-staff-border px-2 py-0.5 rounded-md">
                                      #{order.id.slice(-6).toUpperCase()}
                                    </span>
                                    <div className="mt-1">
                                      <h3 className="font-extrabold text-staff-text-primary text-2xl leading-none">طاولة {order.tableNumber}</h3>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Urgency kitchen timer badge */}
                                    <span className={`text-[12px] font-mono font-bold px-2.5 py-0.5 rounded-full ${timerClass}`}>
                                      {elapsedMins} دقيقة
                                    </span>

                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                      order.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                      order.status === 'accepted' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                      order.status === 'preparing' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                      {order.status === 'pending' ? 'جديد' :
                                       order.status === 'accepted' ? 'مقبول' :
                                       order.status === 'preparing' ? 'يتم التجهيز' : 'جاهز'}
                                    </span>
                                  </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-hide">
                                  {order.items.map((item, idx) => (
                                    <div key={idx}>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-staff-text-primary font-bold">
                                          {item.name} <span className="text-staff-accent font-extrabold font-mono">x{item.quantity}</span>
                                        </span>
                                      </div>
                                      {item.notes && (
                                        <p className="text-[11px] text-amber-400 mr-2 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded-lg mt-1 font-semibold">
                                          📝 {item.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {order.specialNotes && (
                                  <div className="bg-staff-bg-panel p-3 rounded-xl border border-staff-border">
                                    <p className="text-xs text-staff-text-secondary font-semibold">📋 {order.specialNotes}</p>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-between pt-3 border-t border-staff-border">
                                <span className="font-extrabold text-staff-accent text-lg">{order.totalAmount} ج.م</span>
                                <div className="flex gap-2">
                                  <motion.button
                                    onClick={() => updateStatusMutation.mutate({ orderId: order.id, nextStatus: 'cancelled' })}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2.5 rounded-xl border border-staff-border bg-staff-bg-base text-staff-text-secondary hover:text-red-400 hover:border-red-500/30 transition-colors"
                                  >
                                    <XCircle className="w-4.5 h-4.5" />
                                  </motion.button>
                                  {action && (
                                    <motion.button
                                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, nextStatus: action.next })}
                                      whileTap={statusChangeVariants.tap}
                                      className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all ${action.actionClass}`}
                                    >
                                      {action.icon}
                                      <span>{action.label}</span>
                                    </motion.button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                ) : (
                  /* Tables Map */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-12">
                    {tables.length === 0 ? (
                      <div className="col-span-full bg-staff-bg-elevated border border-staff-border rounded-xl p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-staff-bg-base border border-staff-border flex items-center justify-center mx-auto mb-4">
                          <MapPin className="w-7 h-7 text-staff-text-muted" />
                        </div>
                        <p className="text-staff-text-secondary font-medium">لا توجد طاولات مضافة للنظام</p>
                      </div>
                    ) : (
                      tables.map((table, idx) => (
                        <motion.div
                          key={table.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.04 }}
                          className={`bg-staff-bg-elevated border rounded-lg p-5 flex flex-col justify-between gap-4 transition-all border-r-3 ${
                            table.status === 'waitingBill' 
                              ? 'border-r-red-500 border-staff-border bg-red-500/[0.02] shadow-red-500/5' 
                              : table.status === 'occupied' 
                              ? 'border-r-indigo-500 border-staff-border bg-indigo-500/[0.02] shadow-indigo-500/5' 
                              : 'border-r-staff-border border-staff-border'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="font-extrabold text-staff-text-primary text-lg">طاولة {table.number}</h3>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                table.status === 'waitingBill' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                table.status === 'occupied' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                'bg-staff-bg-panel text-staff-text-secondary border-staff-border'
                              }`}>
                                {table.status === 'waitingBill' ? '💳 حساب' :
                                 table.status === 'occupied' ? 'مشغولة' : 'متاحة'}
                              </span>
                            </div>
                            {table.label && (
                              <p className="text-xs text-staff-text-muted mt-1 font-medium">{table.label}</p>
                            )}
                          </div>

                          {table.status !== 'empty' ? (
                            <motion.button
                              onClick={() => emptyTableMutation.mutate({ tableId: table.id })}
                              disabled={emptyTableMutation.isPending}
                              whileTap={{ scale: 0.97 }}
                              className="bg-staff-bg-panel border border-staff-border text-staff-text-secondary hover:text-red-400 hover:border-red-500/20 text-xs w-full py-2 rounded-xl transition-all"
                            >
                              تفريغ الطاولة
                            </motion.button>
                          ) : (
                            <div className="text-[11px] text-staff-text-muted text-center py-2.5 border border-dashed border-staff-border rounded-xl font-bold bg-staff-bg-panel">
                              <Sparkles className="w-3.5 h-3.5 inline-block mr-1 text-staff-accent" />
                              <span>جاهزة لاستقبال العملاء</span>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
