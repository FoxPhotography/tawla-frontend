import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Check, Play, CheckCheck, XCircle, 
  LogOut, Coffee, MapPin, Grid
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
      // Play a lovely double notification tone
      playNote(660, audioCtx.currentTime, 0.12);
      playNote(880, audioCtx.currentTime + 0.12, 0.20);
    } catch (e) {
      console.warn('Audio Context failed to play:', e);
    }
  };

  // 1. Fetch live orders and tables
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

  // 2. Mutations
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
      toast.success('تم تفريغ الترابيزة وإرجاعها متاحة.');
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تفريغ الترابيزة.');
    },
  });

  // 3. Socket Real-time Listeners
  useEffect(() => {
    if (!user || !restaurant?.id) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_restaurant', restaurant.id);

    // Listen for new orders
    socket.on('new_order', (_data: { order: Order }) => {
      playAlertSound();
      toast('وصل طلب جديد!', { icon: '🍔', duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    });

    // Listen for order status updates from other terminals
    socket.on('order_status_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    });

    // Listen for Table Status changes
    socket.on('table_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    });

    // Listen for Call Waiter Alert
    socket.on('call_waiter', (data: { tableNumber: number; tableId: string }) => {
      playAlertSound();
      const newAlert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'waiter',
        tableNumber: data.tableNumber,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev]);
      toast(`نداء ويتر: ترابيزة رقم ${data.tableNumber}`, { icon: '🔔', duration: 6000 });
    });

    // Listen for Request Bill Alert
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
      toast(`طلب الحساب: ترابيزة رقم ${data.tableNumber} بمبلغ ${data.totalAmount} ج.م`, { icon: '💳', duration: 8000 });
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_updated');
      socket.off('table_status_changed');
      socket.off('call_waiter');
      socket.off('request_bill');
    };
  }, [user, restaurant, queryClient]);

  // Check Auth
  useEffect(() => {
    if (!user) {
      navigate('/staff/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // Helper to determine next status flow
  const getNextStatusAction = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { label: 'قبول الطلب', next: 'accepted', color: 'bg-blue-600 hover:bg-blue-500', icon: <Check className="w-4 h-4" /> };
      case 'accepted':
        return { label: 'بدء التحضير', next: 'preparing', color: 'bg-yellow-600 hover:bg-yellow-500', icon: <Play className="w-4 h-4" /> };
      case 'preparing':
        return { label: 'جاهز للتوصيل', next: 'ready', color: 'bg-teal-600 hover:bg-teal-500', icon: <CheckCheck className="w-4 h-4" /> };
      case 'ready':
        return { label: 'تم التوصيل', next: 'delivered', color: 'bg-green-600 hover:bg-green-500', icon: <CheckCheck className="w-4 h-4" /> };
      default:
        return null;
    }
  };

  if (!user || !restaurant) return null;

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col" dir="rtl">
      <Toaster position="top-right" />

      {/* Navigation bar Header */}
      <header className="bg-dark-900 border-b border-dark-800 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{restaurant.name}</h1>
            <p className="text-xs text-dark-400">لوحة الموظفين | {user.name} ({user.role === 'cashier' ? 'كاشير' : user.role === 'waiter' ? 'ويتر' : 'مدير'})</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="p-2.5 bg-dark-950 border border-dark-800 text-dark-400 rounded-xl hover:text-red-500 hover:border-red-500/30 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 p-6">
        {/* Left Side: Live Alerts Column */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-500" />
            <span>تنبيهات الطاولة المباشرة</span>
            {alerts.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-bounce">
                {alerts.length}
              </span>
            )}
          </h2>

          <div className="flex-1 min-h-[150px] md:min-h-0 overflow-y-auto space-y-3 bg-dark-900 border border-dark-800/60 p-4 rounded-3xl">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-dark-500 py-10">
                <Bell className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">لا توجد نداءات نشطة الآن</p>
              </div>
            ) : (
              <AnimatePresence>
                {alerts.map((alert) => (
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    key={alert.id}
                    className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                      alert.type === 'bill' 
                        ? 'bg-emerald-950/20 border-emerald-500/20' 
                        : 'bg-blue-950/20 border-blue-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        alert.type === 'bill' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {alert.type === 'bill' ? 'طلب الحساب' : 'نداء ويتر'}
                      </span>
                      <button onClick={() => dismissAlert(alert.id)} className="text-dark-400 hover:text-white">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm">
                      ترابيزة رقم <span className="font-bold text-white text-lg">{alert.tableNumber}</span>
                      {alert.type === 'bill' && (
                        <span> بمبلغ <span className="font-bold text-emerald-500">{alert.totalAmount} ج.م</span></span>
                      )}
                    </div>
                    <span className="text-[10px] text-dark-500">
                      {new Date(alert.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Side: Tab panel dashboard */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Tabs header Toggle */}
          <div className="bg-dark-900 p-1.5 rounded-2xl border border-dark-800 flex gap-2 w-max self-start">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 py-2 px-6 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'orders' 
                  ? 'bg-primary-500 text-dark-950' 
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>الطلبات النشطة ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-2 py-2 px-6 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'tables' 
                  ? 'bg-primary-500 text-dark-950' 
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>خريطة الترابيزات ({tables.length})</span>
            </button>
          </div>

          {/* Active Tab View */}
          <div className="flex-1">
            {activeTab === 'orders' ? (
              /* Live Orders view view */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {orders.length === 0 ? (
                  <div className="col-span-full bg-dark-900 border border-dark-800 rounded-3xl p-12 text-center text-dark-500">
                    لا توجد طلبات نشطة حالياً. جميع الطلبات تم تسليمها أو إلغاؤها.
                  </div>
                ) : (
                  orders.map((order) => {
                    const action = getNextStatusAction(order.status);
                    return (
                      <div key={order.id} className="bg-dark-900 border border-dark-800/80 rounded-3xl p-5 flex flex-col justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-dark-800 pb-2">
                            <div>
                              <span className="text-xs text-dark-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                              <h3 className="font-bold text-white text-base">ترابيزة {order.tableNumber}</h3>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                              order.status === 'pending' ? 'bg-red-500/10 text-red-500' :
                              order.status === 'accepted' ? 'bg-blue-500/10 text-blue-500' :
                              order.status === 'preparing' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-teal-500/10 text-teal-500'
                            }`}>
                              {order.status === 'pending' ? 'جديد' :
                               order.status === 'accepted' ? 'مقبول' :
                               order.status === 'preparing' ? 'يتم التجهيز' : 'جاهز'}
                            </span>
                          </div>

                          {/* Items list */}
                          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-sm">
                                <div className="flex justify-between items-center text-white">
                                  <span>{item.name} <span className="text-primary-500 font-bold">x{item.quantity}</span></span>
                                </div>
                                {item.notes && (
                                  <p className="text-xs text-yellow-500/80 mr-2 bg-yellow-500/5 p-1 rounded mt-0.5">ملاحظة: {item.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>

                          {order.specialNotes && (
                            <div className="bg-dark-950 p-2.5 rounded-xl border border-dark-850">
                              <p className="text-xs text-dark-400">ملاحظة عامة: {order.specialNotes}</p>
                            </div>
                          )}
                        </div>

                        {/* Order action controllers */}
                        <div className="flex items-center justify-between border-t border-dark-800 pt-3">
                          <span className="font-bold text-primary-500 text-lg">{order.totalAmount} ج.م</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, nextStatus: 'cancelled' })}
                              className="p-2.5 bg-dark-950 border border-dark-800 text-dark-500 hover:text-red-500 hover:border-red-500/30 rounded-xl transition-all"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            {action && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, nextStatus: action.next })}
                                className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md ${action.color}`}
                              >
                                {action.icon}
                                <span>{action.label}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Table Status Map view view */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.length === 0 ? (
                  <div className="col-span-full bg-dark-900 border border-dark-800 rounded-3xl p-12 text-center text-dark-500">
                    لا توجد طاولات مضافة للنظام بعد.
                  </div>
                ) : (
                  tables.map((table) => (
                    <div 
                      key={table.id}
                      className={`bg-dark-900 p-5 rounded-3xl border flex flex-col justify-between gap-4 transition-all ${
                        table.status === 'waitingBill' 
                          ? 'border-emerald-500 bg-emerald-950/5 ring-4 ring-emerald-500/10' 
                          : table.status === 'occupied' 
                          ? 'border-blue-500 bg-blue-950/5' 
                          : 'border-dark-800'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-extrabold text-white text-lg">طاولة {table.number}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            table.status === 'waitingBill' ? 'bg-emerald-500/10 text-emerald-500' :
                            table.status === 'occupied' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-dark-800 text-dark-400'
                          }`}>
                            {table.status === 'waitingBill' ? 'يطلب الحساب' :
                             table.status === 'occupied' ? 'مشغولة' : 'متاحة'}
                          </span>
                        </div>
                        {table.label && (
                          <p className="text-xs text-dark-400 mt-1">{table.label}</p>
                        )}
                      </div>

                      {table.status !== 'empty' ? (
                        <button
                          onClick={() => emptyTableMutation.mutate({ tableId: table.id })}
                          disabled={emptyTableMutation.isPending}
                          className="w-full bg-dark-950 border border-dark-800 hover:border-red-500/30 hover:text-red-500 py-2 rounded-xl text-xs font-bold text-dark-300 transition-colors"
                        >
                          تفريغ الطاولة (متاحة)
                        </button>
                      ) : (
                        <div className="text-[11px] text-dark-500 text-center py-2 border border-dashed border-dark-800 rounded-xl">
                          جاهزة لاستقبال العملاء
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
