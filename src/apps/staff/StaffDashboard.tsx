import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, LogOut, LayoutGrid, MapPin, ChefHat,
  Sparkles, Download, PlusCircle, Wifi, WifiOff
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import { useAuthStore } from '../../shared/store/authStore';
import type { Order, Table } from '../../shared/types';
import { getOfflineOrders, syncOfflineOrders } from '../../shared/services/offlineOrders';

// Import our new modular components
import LiveAlertsSidebar, { type LiveAlert } from './components/LiveAlertsSidebar';
import OrdersTab from './components/OrdersTab';
import TablesTab from './components/TablesTab';
import CreateOrderModal from './components/CreateOrderModal';
import ReceiptPrintTemplate from './components/ReceiptPrintTemplate';
import KDSTab from './components/KDSTab';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user, restaurant, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'kds'>('orders');
  const [orderFilter, setOrderFilter] = useState<'active' | 'archived'>('active');
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  // Receipt Printing State
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);

  const handlePrintReceipt = (order: any) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setPrintingOrder(null);
    }, 250);
  };

  // Toast Notification States
  const [showNewOrderToast, setShowNewOrderToast] = useState(false);
  const [newOrderDetails, setNewOrderDetails] = useState<any | null>(null);

  // Custom states for PWA and network
  const [isOnline, setIsOnline] = useState(socket.connected);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setTick] = useState(0);

  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(navigator.onLine ? 'online' : 'offline');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [offlineOrders, setOfflineOrders] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Waiter ordering state
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [preselectedTableNumber, setPreselectedTableNumber] = useState<number | ''>('');

  const handleStartOrderForTable = (tableNumber: number) => {
    setPreselectedTableNumber(tableNumber);
    setIsCreateOrderOpen(true);
  };

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
  const playAlertSound = (type: 'call_waiter' | 'bill' | 'new_order' | 'delivery_order') => {
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
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (type === 'delivery_order') {
        playNote(587.33, audioCtx.currentTime, 0.08);
        playNote(698.46, audioCtx.currentTime + 0.08, 0.08);
        playNote(880.00, audioCtx.currentTime + 0.16, 0.3);
      } else if (type === 'new_order') {
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
  const { data: serverOrders = [] } = useQuery({
    queryKey: ['staff-orders'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders');
        const list = response.data.data as Order[];
        localStorage.setItem('tawla_cached_orders', JSON.stringify(list));
        return list;
      } catch (err) {
        console.warn('Failed to fetch orders, loading from cache:', err);
        const cached = localStorage.getItem('tawla_cached_orders');
        return cached ? JSON.parse(cached) : [];
      }
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Fetch Tables
  const { data: tables = [] } = useQuery({
    queryKey: ['staff-tables'],
    queryFn: async () => {
      try {
        const response = await api.get('/tables');
        const list = response.data.data as Table[];
        localStorage.setItem('tawla_cached_tables', JSON.stringify(list));
        return list;
      } catch (err) {
        console.warn('Failed to fetch tables, loading from cache:', err);
        const cached = localStorage.getItem('tawla_cached_tables');
        return cached ? JSON.parse(cached) : [];
      }
    },
    enabled: !!user,
  });

  // Fetch Products & Categories for order creation
  const { data: menuData = { products: [], categories: [] } } = useQuery({
    queryKey: ['staff-menu-data'],
    queryFn: async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories')
        ]);
        const products = prodRes.data.data;
        const categories = catRes.data.data;
        localStorage.setItem('tawla_cached_products', JSON.stringify(products));
        localStorage.setItem('tawla_cached_categories', JSON.stringify(categories));
        return { products, categories };
      } catch (err) {
        console.warn('Failed to fetch products/categories, loading from cache:', err);
        const cachedProducts = localStorage.getItem('tawla_cached_products');
        const cachedCategories = localStorage.getItem('tawla_cached_categories');
        return {
          products: cachedProducts ? JSON.parse(cachedProducts) : [],
          categories: cachedCategories ? JSON.parse(cachedCategories) : []
        };
      }
    },
    enabled: !!user,
  });

  // Combine offline orders and online orders
  const allOrders = useMemo(() => {
    const activeOffline = offlineOrders.filter(o => {
      if (orderFilter === 'active') {
        return ['pending', 'accepted', 'preparing', 'ready'].includes(o.status);
      } else {
        return ['delivered', 'cancelled'].includes(o.status);
      }
    });

    const activeServer = serverOrders.filter((order: Order) => {
      if (orderFilter === 'active') {
        return ['pending', 'accepted', 'preparing', 'ready'].includes(order.status);
      } else {
        return ['delivered', 'cancelled'].includes(order.status);
      }
    });

    const merged = [...activeOffline, ...activeServer];
    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [offlineOrders, serverOrders, orderFilter]);

  const updateLocalTableStatus = (tableNumber: number, status: 'empty' | 'occupied' | 'waitingBill', currentOrderId: string | null) => {
    queryClient.setQueryData(['staff-tables'], (old: any) => {
      const list = old ? [...old] : [];
      const updated = list.map((t: any) => 
        t.number === tableNumber ? { ...t, status, currentOrderId } : t
      );
      localStorage.setItem('tawla_cached_tables', JSON.stringify(updated));
      return updated;
    });
  };

  // Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: string }) => {
      if (orderId.startsWith('offline_')) {
        if (nextStatus === 'cancelled') {
          const list = getOfflineOrders();
          const updated = list.filter((o: any) => o.id !== orderId);
          localStorage.setItem('tawla_offline_orders', JSON.stringify(updated));
          setOfflineOrders(getOfflineOrders());
          toast.success('تم إلغاء الطلب المحلي بنجاح.');
          
          // Revert table status local cache
          const targetOrder = offlineOrders.find(o => o.id === orderId);
          if (targetOrder) {
            updateLocalTableStatus(targetOrder.tableNumber, 'empty', null);
          }
          return null;
        } else {
          const list = getOfflineOrders();
          const updated = list.map((o: any) => o.id === orderId ? { ...o, status: nextStatus } : o);
          localStorage.setItem('tawla_offline_orders', JSON.stringify(updated));
          setOfflineOrders(getOfflineOrders());
          toast.success('تم تحديث حالة الطلب محلياً.');
          return null;
        }
      }
      const res = await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      if (!variables.orderId.startsWith('offline_')) {
        toast.success('تم تحديث حالة الطلب بنجاح.');
        
        queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
        queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تحديث حالة الطلب.');
    },
  });

  // Empty Table
  const emptyTableMutation = useMutation({
    mutationFn: async ({ tableId, paymentMethod }: { tableId: string; paymentMethod: 'cash' | 'card' | 'wallet' }) => {
      await api.patch(`/tables/${tableId}/status`, { status: 'empty', currentOrderId: null, paymentMethod });
    },
    onSuccess: () => {
      toast.success('تم تفريغ الطاولة وتسوية الحساب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تفريغ الطاولة.');
    },
  });

  // Update Order (selective return / edit items)
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, items, specialNotes, status }: { orderId: string; items: any[]; specialNotes?: string; status?: string }) => {
      await api.put(`/orders/${orderId}`, { items, specialNotes, status });
    },
    onSuccess: () => {
      toast.success('تم تعديل الطلب وتحديث الحساب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تعديل الطلب.');
    },
  });

  // Socket Listener
  useEffect(() => {
    if (!user || !restaurant) return;

    const handleConnect = () => {
      console.log('Socket connected, joining restaurant room:', restaurant.id);
      socket.emit('join_restaurant', restaurant.id, (res: any) => {
        if (res && !res.success) {
          console.error('[Socket.io]: Failed to join restaurant room:', res.error);
          setIsOnline(false);
        } else {
          console.log('[Socket.io]: Successfully joined restaurant room:', restaurant.id);
          setIsOnline(true);
        }
      });
    };

    const handleDisconnect = () => {
      setIsOnline(false);
    };

    const handleNewOrder = (data: { order: Order }) => {
      queryClient.setQueryData(['staff-orders'], (old: any) => {
        const list = old ? [...old] : [];
        if (!list.find((o: any) => o.id === data.order.id)) {
          list.unshift(data.order);
        }
        return list;
      });

      // Double-sync: update table state locally if it is a dine-in order
      if (data.order.tableNumber > 0) {
        queryClient.setQueryData(['staff-tables'], (old: any) => {
          const list = old ? [...old] : [];
          return list.map((t: any) => 
            t.number === data.order.tableNumber && t.status === 'empty'
              ? { ...t, status: 'occupied', currentOrderId: data.order.id }
              : t
          );
        });
      }
      
      const isDelivery = data.order.type === 'delivery';
      playAlertSound(isDelivery ? 'delivery_order' : 'new_order');
      setNewOrderDetails(data.order);
      setShowNewOrderToast(true);
      setTimeout(() => setShowNewOrderToast(false), 5000);
      
      if (isDelivery) {
        toast.success(`طلب دليفري جديد باسم: ${data.order.customerName || 'عميل خارجي'}`);
      } else if (data.order.tableNumber > 0) {
        toast.success(`طلب جديد من طاولة رقم ${data.order.tableNumber}`);
      } else {
        toast.success(`طلب سفري جديد`);
      }
    };

    const handleOrderStatusUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    };

    const handleTableStatusChanged = (data: { tableId: string; tableNumber: number; status: 'empty' | 'occupied' | 'waitingBill'; currentOrderId?: string | null }) => {
      queryClient.setQueryData(['staff-tables'], (old: any) => {
        const list = old ? [...old] : [];
        return list.map((t: any) => 
          t.id === data.tableId || t.number === data.tableNumber
            ? { ...t, status: data.status, currentOrderId: data.currentOrderId || null }
            : t
        );
      });
      // Invalidate both to ensure absolute consistency
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    };

    const handleCallWaiter = (data: { tableNumber: number }) => {
      playAlertSound('call_waiter');
      const newAlert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'call_waiter',
        tableNumber: data.tableNumber,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev]);
    };

    const handleRequestBill = (data: { tableNumber: number; totalAmount: number }) => {
      playAlertSound('bill');
      const newAlert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'bill',
        tableNumber: data.tableNumber,
        totalAmount: data.totalAmount,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev]);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Provide authentication token
    socket.auth = { token: useAuthStore.getState().token };

    socket.disconnect().connect();

    socket.on('new_order', handleNewOrder);
    socket.on('order_status_updated', handleOrderStatusUpdated);
    socket.on('table_status_changed', handleTableStatusChanged);
    socket.on('call_waiter', handleCallWaiter);
    socket.on('request_bill', handleRequestBill);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_order', handleNewOrder);
      socket.off('order_status_updated', handleOrderStatusUpdated);
      socket.off('table_status_changed', handleTableStatusChanged);
      socket.off('call_waiter', handleCallWaiter);
      socket.off('request_bill', handleRequestBill);
    };
  }, [user, restaurant, queryClient, token]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'cashier' && user.role !== 'waiter') {
      toast.error('أنت غير مصرح لك بدخول صفحة الموظفين.');
      if (user.role === 'super_admin') {
        navigate('/super-admin');
      } else if (user.role === 'admin') {
        navigate('/admin');
      }
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Load offline orders on mount and listen to network changes
  useEffect(() => {
    setOfflineOrders(getOfflineOrders());

    const handleOnline = () => {
      setNetworkStatus('online');
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setNetworkStatus('offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [restaurant?.id]);

  // Periodically check and sync offline orders if online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && getOfflineOrders().length > 0) {
        triggerSync();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [restaurant?.id]);

  const triggerSync = async () => {
    if (!restaurant?.id || isSyncing) return;
    setIsSyncing(true);
    try {
      const synced = await syncOfflineOrders(restaurant.id, () => {
        queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
        queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
      });
      if (synced) {
        setOfflineOrders(getOfflineOrders());
      }
    } catch (e) {
      console.error('Offline orders sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // PWA Install prompt capture
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event fired');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleOrderCreated = () => {
    setOfflineOrders(getOfflineOrders());
    queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
  };

  if (!user || !restaurant) return null;

  return (
    <div className="flex flex-row min-h-screen bg-staff-bg-base text-staff-text-primary relative overflow-hidden" dir="rtl">
      {/* Background elegant pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-staff-accent-glow blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[-15%] w-[450px] h-[450px] rounded-full bg-staff-accent-glow/50 blur-[100px] pointer-events-none" />
      </div>

      <Toaster position="top-left" toastOptions={{
        style: { background: '#09090B', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.08)' }
      }} />

      {/* ===== new Order Toast Notification Banner ===== */}
      <AnimatePresence>
        {showNewOrderToast && newOrderDetails && (
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.95 }}
            className="fixed top-20 left-6 z-50 bg-[#09090B] border border-staff-accent p-4.5 rounded-2xl shadow-xl flex items-center gap-4 max-w-sm text-white"
          >
            <div className="w-10 h-10 rounded-full bg-staff-accent/15 flex items-center justify-center text-staff-accent">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-sm">طلب جديد وارد!</h4>
              <p className="text-[11px] text-zinc-400 font-bold">طاولة {newOrderDetails.tableNumber} · الإجمالي {newOrderDetails.totalAmount} ج.م</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Luxury Sidebar (Black) ===== */}
      <aside className="w-16 bg-[#09090B] border-l border-white/5 flex flex-col items-center py-7 justify-between z-30 flex-shrink-0 shadow-lg">
        <div className="flex flex-col items-center gap-8 w-full">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-staff-accent to-[#FF7A00] flex items-center justify-center shadow-md shadow-staff-accent/20">
            <Coffee className="w-5 h-5 text-white" />
          </div>

          <div className="flex flex-col items-center gap-4 w-full px-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'orders'
                  ? 'bg-staff-accent text-white shadow-lg shadow-staff-accent/20'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
              title="الطلبات النشطة"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'tables'
                  ? 'bg-staff-accent text-white shadow-lg shadow-staff-accent/20'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
              title="خريطة الطاولات"
            >
              <MapPin className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('kds')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'kds'
                  ? 'bg-staff-accent text-white shadow-lg shadow-staff-accent/20'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
              title="شاشة عرض المطبخ (KDS)"
            >
              <ChefHat className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          title="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* ===== Main Workspace ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-staff-bg-base overflow-hidden z-10">
        
        {/* Top Control Bar (Black Premium Header) */}
        <header className="bg-[#09090B] border-b border-white/5 py-4.5 px-6 flex justify-between items-center z-20 flex-shrink-0 shadow-sm text-white">
          <div>
            <h1 className="text-sm font-black tracking-wide leading-tight text-white flex items-center gap-2">
              <span>{restaurant.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-staff-accent shadow-sm" />
            </h1>
            <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
              {user.name} · <span className="text-staff-accent font-black">{user.role === 'cashier' ? 'كاشير' : user.role === 'waiter' ? 'ويتر' : 'مدير'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Waiter Ordering Trigger */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreateOrderOpen(true)}
              className="flex items-center gap-2 bg-staff-accent hover:bg-staff-accent/90 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border border-staff-accent-glow"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طلب جديد (ويتر)</span>
            </motion.button>

            {/* PWA Install Trigger */}
            {deferredPrompt && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black px-3.5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                title="تثبيت التطبيق على الجهاز"
              >
                <Download className="w-4 h-4 text-staff-accent" />
                <span>تثبيت التطبيق</span>
              </motion.button>
            )}

            {/* Network Status Badge */}
            <span className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-black">
              {networkStatus === 'online' ? (
                <Wifi className="w-3.5 h-3.5 text-lime-400 animate-pulse" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              )}
              <span className="text-zinc-300">{networkStatus === 'online' ? 'الشبكة متصلة' : 'يعمل أوفلاين'}</span>
            </span>

            {/* Socket connectivity badge */}
            <span className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-black">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-lime-400 animate-pulse" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              )}
              <span className="text-zinc-300">{isOnline ? 'متصل بالنظام' : 'غير متصل'}</span>
            </span>

            {/* Live digital clock */}
            <span className="font-mono text-[10px] font-bold text-zinc-300 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
              {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-y-auto min-h-0">
          
          {/* Alerts & Table Status Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0">
            
            {/* Quick table status list */}
            <div className="bg-staff-bg-elevated border border-staff-border rounded-2xl p-4.5 space-y-4 shadow-sm">
              <h3 className="text-xs font-black text-staff-text-secondary uppercase tracking-widest">خريطة الطاولات السريعة</h3>
              <div className="grid grid-cols-5 gap-2">
                {tables.map((table: Table) => {
                  let cellClass = 'bg-staff-bg-panel text-staff-text-secondary border-staff-border';
                  if (table.status === 'occupied') {
                    cellClass = 'bg-staff-text-primary/10 border-staff-text-primary/10 text-staff-text-primary font-black';
                  } else if (table.status === 'waitingBill') {
                    cellClass = 'bg-staff-accent-soft border-staff-accent-glow text-staff-accent animate-pulse font-black';
                  }
                  return (
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      key={table.id}
                      onClick={() => {
                        setActiveTab('tables');
                        toast(`طاولة رقم ${table.number}: ${table.status === 'occupied' ? 'مشغولة' : table.status === 'waitingBill' ? 'تطلب الحساب' : 'متاحة'}`);
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${cellClass}`}
                      title={`طاولة ${table.number}`}
                    >
                      {table.number}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Live Alerts sidebar */}
            <LiveAlertsSidebar 
              alerts={alerts}
              onDismissAlert={handleDismissAlert}
              onSetActiveTab={setActiveTab}
            />
          </div>

          {/* Right Side: Tab Panel Content */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 min-h-0"
              >
                 {activeTab === 'orders' ? (
                  <OrdersTab 
                    orders={allOrders}
                    orderFilter={orderFilter}
                    onSetOrderFilter={setOrderFilter}
                    onPrintReceipt={handlePrintReceipt}
                    onUpdateStatus={(id, status) => updateStatusMutation.mutate({ orderId: id, nextStatus: status })}
                    isStatusPending={updateStatusMutation.isPending}
                    onUpdateOrder={(id, items, status) => updateOrderMutation.mutateAsync({ orderId: id, items, status })}
                    isUpdatePending={updateOrderMutation.isPending}
                  />
                ) : activeTab === 'tables' ? (
                  <TablesTab 
                    tables={tables}
                    orders={serverOrders}
                    onEmptyTable={(id, method) => emptyTableMutation.mutate({ tableId: id, paymentMethod: method })}
                    isEmptyTablePending={emptyTableMutation.isPending}
                    onStartOrderForTable={handleStartOrderForTable}
                    onPrintReceipt={handlePrintReceipt}
                  />
                ) : (
                  <KDSTab 
                    orders={allOrders}
                    onUpdateStatus={(id, status) => updateStatusMutation.mutate({ orderId: id, nextStatus: status })}
                    isStatusPending={updateStatusMutation.isPending}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hidden Receipt Printing Template */}
      <ReceiptPrintTemplate 
        printingOrder={printingOrder}
        restaurant={restaurant}
      />

      {/* Waiter Ordering Dialog Modal */}
      <AnimatePresence>
        {isCreateOrderOpen && (
          <CreateOrderModal 
            isOpen={isCreateOrderOpen}
            onClose={() => {
              setIsCreateOrderOpen(false);
              setPreselectedTableNumber('');
            }}
            tables={tables}
            menuData={menuData}
            restaurantId={restaurant.id || ''}
            onPrintReceipt={handlePrintReceipt}
            networkStatus={networkStatus}
            updateLocalTableStatus={updateLocalTableStatus}
            onOrderCreated={handleOrderCreated}
            defaultTableNumber={preselectedTableNumber}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
