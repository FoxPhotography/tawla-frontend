import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Check, Play, CheckCheck, XCircle, 
  LogOut, Coffee, MapPin, LayoutGrid, Clock, CreditCard
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import { useAuthStore } from '../../shared/store/authStore';
import type { Order, Table } from '../../shared/types';

interface LiveAlert {
  id: string;
  type: 'waiter' | 'bill';
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

  // Sound Synthesizer Chime
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      playNote(660, audioCtx.currentTime, 0.12);
      playNote(880, audioCtx.currentTime + 0.12, 0.20);
    } catch (e) {
      console.warn('Audio Context failed to play:', e);
    }
  };

  // Queries
  const { data: orders = [] } = useQuery({
    queryKey: ['staff-orders'],
    queryFn: async () => {
      const response = await api.get('/orders?liveOnly=true');
      return response.data.data as Order[];
    },
    enabled: !!user,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['staff-tables'],
    queryFn: async () => {
      const response = await api.get('/tables');
      return response.data.data as Table[];
    },
    enabled: !!user,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: string }) => {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
    },
    onSuccess: () => {
      toast.success('تم تحديث حالة الطلب.');
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل التحديث.');
    },
  });

  const emptyTableMutation = useMutation({
    mutationFn: async ({ tableId }: { tableId: string }) => {
      await api.patch(`/tables/${tableId}/status`, { status: 'empty', currentOrderId: null });
    },
    onSuccess: () => {
      toast.success('تم تفريغ الطاولة وإرجاعها متاحة.');
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تفريغ الطاولة.');
    },
  });

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

  // Socket Real-time
  useEffect(() => {
    if (!user || !restaurant?.id) return;

    const handleConnect = () => {
      console.log('Socket connected, joining restaurant:', restaurant.id);
      socket.emit('join_restaurant', restaurant.id);
    };

    socket.on('connect', handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    socket.on('new_order', (_data: { order: Order }) => {
      playAlertSound();
      toast('وصل طلب جديد!', { icon: '🍔', duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    });

    socket.on('order_status_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    });

    socket.on('table_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    });

    socket.on('call_waiter', (data: { tableNumber: number; tableId: string }) => {
      playAlertSound();
      const newAlert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'waiter',
        tableNumber: data.tableNumber,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev]);
      toast(`نداء ويتر: طاولة رقم ${data.tableNumber}`, { icon: '🔔', duration: 6000 });
    });

    socket.on('request_bill', (data: { tableNumber: number; tableId: string; totalAmount: number }) => {
      playAlertSound();
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
      case 'pending': return 'border-red-500/30 shadow-red-500/5';
      case 'accepted': return 'border-blue-500/30 shadow-blue-500/5';
      case 'preparing': return 'border-amber-500/30 shadow-amber-500/5';
      case 'ready': return 'border-teal-500/30 shadow-teal-500/5';
      default: return 'border-dark-700/30';
    }
  };

  if (!user || !restaurant) return null;

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col" dir="rtl">
      <Toaster position="top-left" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.1)' }
      }} />

      {/* Header */}
      <header className="glass sticky top-0 z-30 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-sky/20 to-accent-sky/5 border border-accent-sky/20 flex items-center justify-center">
            <Coffee className="w-5 h-5 text-accent-sky" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{restaurant.name}</h1>
            <p className="text-xs text-dark-500">
              {user.name} · {user.role === 'cashier' ? 'كاشير' : user.role === 'waiter' ? 'ويتر' : 'مدير'}
            </p>
          </div>
        </div>

        <motion.button 
          onClick={handleLogout}
          whileTap={{ scale: 0.9 }}
          className="btn-icon hover:text-red-400 hover:border-red-500/30"
        >
          <LogOut className="w-4.5 h-4.5" />
        </motion.button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-6">
        {/* Live Alerts Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary-500" />
            <span>التنبيهات المباشرة</span>
            {alerts.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold">
                {alerts.length}
              </span>
            )}
          </h2>

          <div className="flex-1 min-h-[120px] md:min-h-0 overflow-y-auto space-y-3 glass-card rounded-2xl p-4 scrollbar-hide">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-dark-800/40 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-dark-600" />
                </div>
                <p className="text-sm text-dark-500">لا توجد نداءات نشطة</p>
              </div>
            ) : (
              <AnimatePresence>
                {alerts.map((alert) => (
                  <motion.div
                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50, scale: 0.9 }}
                    key={alert.id}
                    className={`glass-card rounded-xl p-4 space-y-2 border ${
                      alert.type === 'bill' 
                        ? 'border-accent-emerald/20' 
                        : 'border-accent-sky/20'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={alert.type === 'bill' ? 'badge-success' : 'badge-info'}>
                        {alert.type === 'bill' ? (
                          <><CreditCard className="w-3 h-3" /> طلب الحساب</>
                        ) : (
                          <><Bell className="w-3 h-3" /> نداء ويتر</>
                        )}
                      </span>
                      <button onClick={() => dismissAlert(alert.id)} className="text-dark-500 hover:text-white transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm text-dark-300">
                      طاولة رقم <span className="font-bold text-white text-lg">{alert.tableNumber}</span>
                      {alert.type === 'bill' && (
                        <span> بمبلغ <span className="font-bold text-accent-emerald">{alert.totalAmount} ج.م</span></span>
                      )}
                    </div>
                    <span className="text-[10px] text-dark-600 flex items-center gap-1">
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
          <div className="glass-card rounded-xl p-1.5 flex gap-2 w-max">
            {[
              { key: 'orders' as const, label: `الطلبات النشطة (${orders.length})`, icon: LayoutGrid },
              { key: 'tables' as const, label: `خريطة الطاولات (${tables.length})`, icon: MapPin },
            ].map(tab => (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2 py-2.5 px-5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key 
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-dark-950 font-bold shadow-glow-sm' 
                    : 'text-dark-400 hover:text-white'
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
                    <div className="col-span-full glass-card rounded-2xl p-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-dark-800/40 flex items-center justify-center mx-auto mb-4">
                        <LayoutGrid className="w-7 h-7 text-dark-600" />
                      </div>
                      <p className="text-dark-500">لا توجد طلبات نشطة حالياً</p>
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
                          className={`glass-card rounded-2xl p-5 flex flex-col justify-between gap-4 border ${getStatusBorder(order.status)} shadow-lg`}
                        >
                          <div className="space-y-3">
                            {/* Order header */}
                            <div className="flex justify-between items-center pb-3 border-b border-dark-800/30">
                              <div>
                                <span className="text-[11px] text-dark-500 font-mono bg-dark-800/50 px-2 py-0.5 rounded-md">
                                  #{order.id.slice(-6).toUpperCase()}
                                </span>
                                <h3 className="font-bold text-white text-base mt-1">طاولة {order.tableNumber}</h3>
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
                                    <span className="text-white">
                                      {item.name} <span className="text-primary-500 font-bold">x{item.quantity}</span>
                                    </span>
                                  </div>
                                  {item.notes && (
                                    <p className="text-[11px] text-amber-400/80 mr-2 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded-lg mt-1">
                                      📝 {item.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>

                            {order.specialNotes && (
                              <div className="bg-dark-800/20 p-3 rounded-xl border border-dark-700/20">
                                <p className="text-xs text-dark-400">📋 {order.specialNotes}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-dark-800/30">
                            <span className="font-bold text-primary-500 text-lg">{order.totalAmount} ج.م</span>
                            <div className="flex gap-2">
                              <motion.button
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, nextStatus: 'cancelled' })}
                                whileTap={{ scale: 0.9 }}
                                className="btn-icon hover:text-red-400 hover:border-red-500/30"
                              >
                                <XCircle className="w-4.5 h-4.5" />
                              </motion.button>
                              {action && (
                                <motion.button
                                  onClick={() => updateStatusMutation.mutate({ orderId: order.id, nextStatus: action.next })}
                                  whileTap={{ scale: 0.95 }}
                                  className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${action.gradient} shadow-lg transition-all hover:shadow-xl`}
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
                    <div className="col-span-full glass-card rounded-2xl p-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-dark-800/40 flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-7 h-7 text-dark-600" />
                      </div>
                      <p className="text-dark-500">لا توجد طاولات مضافة للنظام</p>
                    </div>
                  ) : (
                    tables.map((table, idx) => (
                      <motion.div
                        key={table.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`glass-card rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all border ${
                          table.status === 'waitingBill' 
                            ? 'border-accent-emerald/40 shadow-lg shadow-emerald-500/5' 
                            : table.status === 'occupied' 
                            ? 'border-accent-sky/30 shadow-lg shadow-sky-500/5' 
                            : 'border-dark-700/20'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-white text-lg">طاولة {table.number}</h3>
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
                            <p className="text-xs text-dark-500 mt-1">{table.label}</p>
                          )}
                        </div>

                        {table.status !== 'empty' ? (
                          <motion.button
                            onClick={() => emptyTableMutation.mutate({ tableId: table.id })}
                            disabled={emptyTableMutation.isPending}
                            whileTap={{ scale: 0.97 }}
                            className="btn-ghost text-xs w-full hover:text-red-400 hover:border-red-500/30"
                          >
                            تفريغ الطاولة
                          </motion.button>
                        ) : (
                          <div className="text-[11px] text-dark-600 text-center py-2.5 border border-dashed border-dark-700/30 rounded-xl">
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
