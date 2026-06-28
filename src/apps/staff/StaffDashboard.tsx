import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, LogOut, Bell, LayoutGrid, MapPin, 
  Check, CheckCheck, Play, XCircle, CreditCard, Clock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import { useAuthStore } from '../../shared/store/authStore';
import type { Order, Table } from '../../shared/types';

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
        // High alert double-ping sound
        playNote(880.00, audioCtx.currentTime, 0.15); // A5
        playNote(1046.50, audioCtx.currentTime + 0.12, 0.3); // C6
      } else if (type === 'bill') {
        // Cash register chime sound
        playNote(987.77, audioCtx.currentTime, 0.08); // B5
        playNote(1318.51, audioCtx.currentTime + 0.06, 0.25); // E6
      } else {
        // Regular bell chime sound
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
    };

    socket.on('connect', handleConnect);

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
      toast.success(`طلب جديد من طاولة رقم ${data.order.tableNumber}!`, { duration: 6000, icon: '🔥' });
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
      toast(`نداء ويتر: طاولة رقم ${data.tableNumber}`, { icon: '🔔', duration: 8000 });
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
      toast(`طلب الحساب: طاولة رقم ${data.tableNumber} بمبلغ ${data.totalAmount} ج.م`, { icon: '💳', duration: 8000 });
    });

    return () => {
      socket.off('connect', handleConnect);
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
        return { label: 'قبول الطلب', next: 'accepted', gradient: 'from-blue-600 to-blue-500', icon: <Check className="w-4 h-4" /> };
      case 'accepted':
        return { label: 'بدء التحضير', next: 'preparing', gradient: 'from-amber-600 to-amber-500', icon: <Play className="w-4 h-4" /> };
      case 'preparing':
        return { label: 'جاهز للتوصيل', next: 'ready', gradient: 'from-teal-600 to-teal-500', icon: <CheckCheck className="w-4 h-4" /> };
      case 'ready':
        return { label: 'تم التوصيل', next: 'delivered', gradient: 'from-emerald-600 to-emerald-500', icon: <CheckCheck className="w-4 h-4" /> };
      default:
        return null;
    }
  };

  const getStatusBorder = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'border-red-500/30';
      case 'accepted': return 'border-blue-500/30';
      case 'preparing': return 'border-amber-500/30';
      case 'ready': return 'border-teal-500/30';
      default: return 'border-stone-200';
    }
  };

  if (!user || !restaurant) return null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col relative overflow-hidden noise" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="glow-blob bg-emerald-200 top-1/4 -right-1/4 w-[600px] h-[600px]" />
        <div className="glow-blob bg-stone-200 bottom-1/4 -left-1/4 w-[500px] h-[500px]" />
        <div className="absolute inset-0 dot-pattern opacity-60" />
      </div>

      <Toaster position="top-left" toastOptions={{
        style: { background: '#ffffff', color: '#1c1917', border: '1px solid rgba(120,113,108,0.15)' }
      }} />

      {/* Header */}
      <header className="organic-surface sticky top-0 z-30 py-4 px-6 flex justify-between items-center border-b border-stone-200 relative z-10 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Coffee className="w-5 h-5 text-emerald-800" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-stone-900 leading-tight">{restaurant.name}</h1>
            <p className="text-xs text-stone-500">
              {user.name} · {user.role === 'cashier' ? 'كاشير' : user.role === 'waiter' ? 'ويتر' : 'مدير'}
            </p>
          </div>
        </div>

        <motion.button 
          onClick={handleLogout}
          whileTap={{ scale: 0.9 }}
          className="btn-icon hover:text-red-600 hover:border-red-300"
        >
          <LogOut className="w-4.5 h-4.5" />
        </motion.button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-6 relative z-10">
        {/* Live Alerts Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-800" />
            <span>التنبيهات المباشرة</span>
            {alerts.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold">
                {alerts.length}
              </span>
            )}
          </h2>

          <div className="flex-1 min-h-[120px] md:min-h-0 overflow-y-auto space-y-3 organic-card rounded-2xl p-4 scrollbar-hide bg-white">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-3 border border-stone-200">
                  <Bell className="w-6 h-6 text-stone-400" />
                </div>
                <p className="text-sm text-stone-500 font-semibold">لا توجد نداءات نشطة</p>
              </div>
            ) : (
              <AnimatePresence>
                {alerts.map((alert) => (
                  <motion.div
                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50, scale: 0.9 }}
                    key={alert.id}
                    className={`organic-surface rounded-xl p-4 space-y-2 border bg-white ${
                      alert.type === 'bill' 
                        ? 'border-emerald-200' 
                        : 'border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={alert.type === 'bill' ? 'badge-success' : 'badge-info'}>
                        {alert.type === 'bill' ? (
                          <><CreditCard className="w-3 h-3 text-emerald-800" /> طلب الحساب</>
                        ) : (
                          <><Bell className="w-3 h-3 text-blue-800" /> نداء ويتر</>
                        )}
                      </span>
                      <button onClick={() => dismissAlert(alert.id)} className="text-stone-400 hover:text-stone-700 transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm text-stone-750 font-semibold">
                      طاولة رقم <span className="font-extrabold text-stone-900 text-lg">{alert.tableNumber}</span>
                      {alert.type === 'bill' && (
                        <span> بمبلغ <span className="font-bold text-emerald-800">{alert.totalAmount} ج.م</span></span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Side: Tab Panel */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Tabs Toggle */}
          <div className="organic-card rounded-xl p-1.5 flex gap-2 w-max bg-white">
            {[
              { key: 'orders' as const, label: `الطلبات النشطة (${orders.length})`, icon: LayoutGrid },
              { key: 'tables' as const, label: `خريطة الطاولات (${tables.length})`, icon: MapPin },
            ].map(tab => (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2 py-2.5 px-5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.key 
                    ? 'bg-emerald-800 text-white shadow-sm' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              {activeTab === 'orders' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {orders.length === 0 ? (
                    <div className="col-span-full organic-card rounded-2xl p-16 text-center bg-white">
                      <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-4">
                        <LayoutGrid className="w-7 h-7 text-stone-400" />
                      </div>
                      <p className="text-stone-500 font-medium">لا توجد طلبات نشطة حالياً</p>
                    </div>
                  ) : (
                    orders.map((order, idx) => {
                      const action = getNextStatusAction(order.status);
                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`organic-card rounded-2xl p-5 flex flex-col justify-between gap-4 border ${getStatusBorder(order.status)} shadow-sm bg-white`}
                        >
                          <div className="space-y-3">
                            {/* Order header */}
                            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                              <div>
                                <span className="text-[11px] text-stone-600 font-mono bg-stone-100 border border-stone-200/50 px-2 py-0.5 rounded-md">
                                  #{order.id.slice(-6).toUpperCase()}
                                </span>
                                <h3 className="font-extrabold text-stone-900 text-base mt-1">طاولة {order.tableNumber}</h3>
                              </div>
                              <span className={
                                order.status === 'pending' ? 'badge-danger' :
                                order.status === 'accepted' ? 'badge-info' :
                                order.status === 'preparing' ? 'badge-warning' :
                                'badge-success'
                              }>
                                {order.status === 'pending' ? '🔴 جديد' :
                                 order.status === 'accepted' ? '🔵 مقبول' :
                                 order.status === 'preparing' ? '🟡 يتم التجهيز' : '🟢 جاهز'}
                              </span>
                            </div>

                            {/* Items */}
                            <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-hide">
                              {order.items.map((item, idx) => (
                                <div key={idx}>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-stone-900 font-bold">
                                      {item.name} <span className="text-emerald-800 font-extrabold">x{item.quantity}</span>
                                    </span>
                                  </div>
                                  {item.notes && (
                                    <p className="text-[11px] text-amber-800 mr-2 bg-amber-50 border border-amber-200 p-1.5 rounded-lg mt-1 font-semibold">
                                      📝 {item.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>

                            {order.specialNotes && (
                              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                                <p className="text-xs text-stone-600 font-semibold">📋 {order.specialNotes}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                            <span className="font-extrabold text-emerald-800 text-lg">{order.totalAmount} ج.م</span>
                            <div className="flex gap-2">
                              <motion.button
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, nextStatus: 'cancelled' })}
                                whileTap={{ scale: 0.9 }}
                                className="btn-icon hover:text-red-600 hover:border-red-300"
                              >
                                <XCircle className="w-4.5 h-4.5" />
                              </motion.button>
                              {action && (
                                <motion.button
                                  onClick={() => updateStatusMutation.mutate({ orderId: order.id, nextStatus: action.next })}
                                  whileTap={{ scale: 0.95 }}
                                  className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${action.gradient} shadow-sm transition-all hover:shadow-md`}
                                >
                                  {action.icon}
                                  <span>{action.label}</span>
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Tables Map */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tables.length === 0 ? (
                    <div className="col-span-full organic-card rounded-2xl p-16 text-center bg-white">
                      <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-7 h-7 text-stone-400" />
                      </div>
                      <p className="text-stone-500 font-medium">لا توجد طاولات مضافة للنظام</p>
                    </div>
                  ) : (
                    tables.map((table, idx) => (
                      <motion.div
                        key={table.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`organic-card rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all border bg-white ${
                          table.status === 'waitingBill' 
                            ? 'border-emerald-300' 
                            : table.status === 'occupied' 
                            ? 'border-blue-300' 
                            : 'border-stone-200'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-stone-900 text-lg">طاولة {table.number}</h3>
                            <span className={
                              table.status === 'waitingBill' ? 'badge-success' :
                              table.status === 'occupied' ? 'badge-info' :
                              'badge-neutral'
                            }>
                              {table.status === 'waitingBill' ? '💳 حساب' :
                               table.status === 'occupied' ? '🔵 مشغولة' : '⚪ متاحة'}
                            </span>
                          </div>
                          {table.label && (
                            <p className="text-xs text-stone-500 mt-1 font-medium">{table.label}</p>
                          )}
                        </div>

                        {table.status !== 'empty' ? (
                          <motion.button
                            onClick={() => emptyTableMutation.mutate({ tableId: table.id })}
                            disabled={emptyTableMutation.isPending}
                            whileTap={{ scale: 0.97 }}
                            className="btn-ghost text-xs w-full hover:text-red-600 hover:border-red-300 bg-white"
                          >
                            تفريغ الطاولة
                          </motion.button>
                        ) : (
                          <div className="text-[11px] text-stone-500 text-center py-2.5 border border-dashed border-stone-200 rounded-xl font-bold bg-stone-50">
                            ✨ جاهزة لاستقبال العملاء
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
  );
}
