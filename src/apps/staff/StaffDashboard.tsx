import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, LogOut, Bell, LayoutGrid, MapPin, 
  Check, CheckCheck, Play, XCircle, CreditCard, Clock, Sparkles, Printer,
  CloudOff, Search, Plus, Minus, Trash2, PlusCircle, Download, ChevronDown, UtensilsCrossed, ShoppingBag
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import { useAuthStore } from '../../shared/store/authStore';
import type { Order, Table } from '../../shared/types';
import { getOfflineOrders, saveOfflineOrder, removeOfflineOrder, syncOfflineOrders } from '../../shared/services/offlineOrders';
import type { OfflineOrder } from '../../shared/services/offlineOrders';


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

  // Custom states for Tably Luxury top-bar & timers
  const [isOnline, setIsOnline] = useState(socket.connected);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setTick] = useState(0);

  // Network and PWA installation state
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(navigator.onLine ? 'online' : 'offline');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [offlineOrders, setOfflineOrders] = useState<OfflineOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Waiter ordering state
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | ''>('');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState<string>('all');
  const [newOrderCart, setNewOrderCart] = useState<{ product: any; quantity: number; notes: string }[]>([]);
  const [newOrderSpecialNotes, setNewOrderSpecialNotes] = useState('');
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const tableDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside custom table select dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tableDropdownRef.current && !tableDropdownRef.current.contains(event.target as Node)) {
        setIsTableDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Fetch Orders (with offline cache fallback)
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

  // Fetch Tables (with offline cache fallback)
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

  // Fetch Products & Categories for order creation (with offline cache fallback)
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

  // Alias for backward compatibility
  const filteredOrders = allOrders;

  const modalFilteredProducts = useMemo(() => {
    const products = menuData?.products || [];
    return products.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(menuSearchQuery.toLowerCase()));
      const matchesCategory = menuSelectedCategory === 'all' || p.categoryId === menuSelectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuData?.products, menuSearchQuery, menuSelectedCategory]);

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
          removeOfflineOrder(orderId);
          setOfflineOrders(getOfflineOrders());
          toast.success('تم إلغاء الطلب المحلي بنجاح.');
          
          // Revert table status local cache
          const targetOrder = offlineOrders.find(o => o.id === orderId);
          if (targetOrder) {
            updateLocalTableStatus(targetOrder.tableNumber, 'empty', null);
          }
          return;
        } else {
          const list = getOfflineOrders();
          const updated = list.map(o => o.id === orderId ? { ...o, status: nextStatus as any } : o);
          localStorage.setItem('tawla_offline_orders', JSON.stringify(updated));
          setOfflineOrders(getOfflineOrders());
          toast.success('تم تحديث حالة الطلب محلياً.');
          return;
        }
      }
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
    },
    onSuccess: (_, variables) => {
      if (!variables.orderId.startsWith('offline_')) {
        toast.success('تم تحديث حالة الطلب.');
        queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تحديث حالة الطلب.');
    },
  });

  // Empty Table
  const emptyTableMutation = useMutation({
    mutationFn: async ({ tableId }: { tableId: string }) => {
      await api.patch(`/tables/${tableId}/status`, { status: 'empty', currentOrderId: null });
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

    // Provide authentication token
    socket.auth = { token: useAuthStore.getState().token };

    socket.disconnect().connect();

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
    if (!user) {
      navigate('/staff/login');
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
    navigate('/staff/login');
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

  const handleCreateOrderSubmit = async () => {
    if (!selectedTableNumber) {
      toast.error('يرجى اختيار رقم الطاولة.');
      return;
    }
    if (newOrderCart.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للطلب.');
      return;
    }

    if (!restaurant?.id) {
      toast.error('لم يتم العثور على بيانات المطعم.');
      return;
    }

    const totalAmount = newOrderCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

    const orderPayload = {
      restaurantId: restaurant.id,
      tableNumber: Number(selectedTableNumber),
      items: newOrderCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        notes: item.notes
      })),
      specialNotes: newOrderSpecialNotes,
      totalAmount,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    if (navigator.onLine) {
      try {
        const payload = {
          tableNumber: orderPayload.tableNumber,
          items: orderPayload.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes
          })),
          specialNotes: orderPayload.specialNotes
        };
        const response = await api.post('/orders', payload, {
          headers: { 'x-restaurant-id': restaurant.id }
        });
        if (response.data?.success) {
          const serverOrder = response.data.data;
          toast.success('تم إرسال الطلب بنجاح.');
          
          handlePrintReceipt(serverOrder);

          queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
          queryClient.invalidateQueries({ queryKey: ['staff-tables'] });

          setNewOrderCart([]);
          setNewOrderSpecialNotes('');
          setSelectedTableNumber('');
          setIsCreateOrderOpen(false);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'فشل إرسال الطلب للسيرفر.');
      }
    } else {
      const tempId = `offline_${Date.now()}`;
      const tempOrder = {
        ...orderPayload,
        id: tempId,
        isOffline: true
      };
      
      saveOfflineOrder(tempOrder);
      setOfflineOrders(getOfflineOrders());

      updateLocalTableStatus(Number(selectedTableNumber), 'occupied', tempId);

      toast.success('تم حفظ الطلب محلياً (أوفلاين) وجاري طباعة الفاتورة.');

      handlePrintReceipt(tempOrder);

      setNewOrderCart([]);
      setNewOrderSpecialNotes('');
      setSelectedTableNumber('');
      setIsCreateOrderOpen(false);
    }
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
            {/* Waiter Ordering Trigger */}
            <button
              onClick={() => setIsCreateOrderOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طلب جديد (ويتر)</span>
            </button>

            {/* PWA Install Trigger */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold px-3 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                title="تثبيت التطبيق على الجهاز"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق</span>
              </button>
            )}

            {/* Network Status Badge */}
            <span className="flex items-center gap-2 bg-staff-bg-base border border-staff-border px-3 py-1.5 rounded-full text-[10px] font-bold">
              <span className={`w-2 h-2 rounded-full ${networkStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-ping'}`} />
              <span>{networkStatus === 'online' ? 'الشبكة متصلة' : 'يعمل بدون إنترنت (أوفلاين)'}</span>
            </span>

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
                {tables.map((table: Table) => {
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
                  <div className="space-y-6 pb-12">
                    {/* Sub-tab segmented control */}
                    <div className="inline-flex bg-staff-bg-panel border border-staff-border p-1 rounded-xl shadow-sm">
                      <button
                        onClick={() => setOrderFilter('active')}
                        className={`py-2 px-6 rounded-lg text-xs font-bold transition-all ${
                          orderFilter === 'active'
                            ? 'bg-staff-accent text-white shadow-staff-card'
                            : 'text-staff-text-secondary hover:text-staff-text-primary'
                        }`}
                      >
                        الطلبات النشطة
                      </button>
                      <button
                        onClick={() => setOrderFilter('archived')}
                        className={`py-2 px-6 rounded-lg text-xs font-bold transition-all ${
                          orderFilter === 'archived'
                            ? 'bg-staff-accent text-white shadow-staff-card'
                            : 'text-staff-text-secondary hover:text-staff-text-primary'
                        }`}
                      >
                        الطلبات القديمة (المكتملة والملغاة)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredOrders.length === 0 ? (
                        <div className="col-span-full bg-staff-bg-elevated border border-staff-border rounded-xl p-16 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-staff-bg-base border border-staff-border flex items-center justify-center mx-auto mb-4">
                            <LayoutGrid className="w-7 h-7 text-staff-text-muted" />
                          </div>
                          <p className="text-staff-text-secondary font-medium">
                            {orderFilter === 'active' ? 'لا توجد طلبات نشطة حالياً' : 'لا توجد طلبات قديمة لعرضها'}
                          </p>
                        </div>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {filteredOrders.map((order, idx) => {
                            const action = getNextStatusAction(order.status);
                            
                            // Calculate live elapsed minutes
                            const elapsedMs = Date.now() - new Date(order.createdAt).getTime();
                            const elapsedMins = Math.floor(elapsedMs / (60 * 1000));
                            let timerClass = 'text-staff-text-secondary bg-staff-bg-panel border border-staff-border';
                            if (order.status !== 'delivered' && order.status !== 'cancelled') {
                              if (elapsedMins >= 20) {
                                timerClass = 'text-red-500 bg-red-500/10 border border-red-500/20 animate-pulse font-extrabold';
                              } else if (elapsedMins >= 10) {
                                timerClass = 'text-amber-500 bg-amber-500/10 border border-amber-500/20';
                              }
                            }

                            const isPending = order.status === 'pending';
                            const cardBorderColor = 
                              order.status === 'pending' ? 'border-r-amber-500' :
                              order.status === 'accepted' ? 'border-r-indigo-500' :
                              order.status === 'preparing' ? 'border-r-violet-500' :
                              order.status === 'ready' ? 'border-r-emerald-500' :
                              order.status === 'delivered' ? 'border-r-teal-500' : 'border-r-red-500';

                            return (
                              <motion.div
                                key={order.id}
                                variants={orderCardVariants}
                                exit="exit"
                                layout
                                initial="hidden"
                                animate="visible"
                                custom={idx}
                                className={`bg-staff-bg-elevated border border-staff-border rounded-lg p-5 flex flex-col justify-between gap-4 border-r-4 ${cardBorderColor} shadow-staff-card transition-all duration-300 ${
                                  isPending ? 'animate-pending-pulse bg-gradient-to-br from-staff-bg-elevated to-amber-500/[0.03]' : ''
                                }`}
                              >
                                <div className="space-y-3">
                                  {/* Order header */}
                                  <div className="flex justify-between items-center pb-3 border-b border-staff-border">
                                    <div>
                                      <span className="text-[11px] text-staff-text-secondary font-mono bg-staff-bg-panel border border-staff-border px-2 py-0.5 rounded-md">
                                        #{order.id.startsWith('offline_') ? 'محلي' : order.id.slice(-6).toUpperCase()}
                                      </span>
                                      {order.id.startsWith('offline_') && (
                                        <span className="mr-2 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 animate-pulse">
                                          <CloudOff className="w-3 h-3" />
                                          بانتظار المزامنة
                                        </span>
                                      )}
                                      <div className="mt-1">
                                        <h3 className="font-extrabold text-staff-text-primary text-2xl leading-none">طاولة {order.tableNumber}</h3>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {/* Urgency kitchen timer badge for active orders only */}
                                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                        <span className={`text-[12px] font-mono font-bold px-2.5 py-0.5 rounded-full ${timerClass}`}>
                                          {elapsedMins} دقيقة
                                        </span>
                                      )}

                                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                        order.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        order.status === 'accepted' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                        order.status === 'preparing' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                        order.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        order.status === 'delivered' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                      }`}>
                                        {order.status === 'pending' ? 'جديد' :
                                         order.status === 'accepted' ? 'مقبول' :
                                         order.status === 'preparing' ? 'يتم التجهيز' :
                                         order.status === 'ready' ? 'جاهز' :
                                         order.status === 'delivered' ? 'تم التوصيل' : 'ملغي'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Items */}
                                  <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-hide">
                                    {order.items.map((item: any, idx: number) => (
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
                                      onClick={() => handlePrintReceipt(order)}
                                      whileTap={{ scale: 0.9 }}
                                      className="p-2.5 rounded-xl border border-staff-border bg-staff-bg-base text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/30 transition-colors"
                                      title="طباعة الفاتورة"
                                    >
                                      <Printer className="w-4.5 h-4.5" />
                                    </motion.button>
                                    {orderFilter === 'active' ? (
                                      <>
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
                                      </>
                                    ) : (
                                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                                        order.status === 'delivered' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                      }`}>
                                        {order.status === 'delivered' ? 'تم تقديم الخدمة' : 'تم الرفض / الإلغاء'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      )}
                    </div>
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
                      tables.map((table: Table, idx: number) => (
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
      {/* PRINT RECEIPT TEMPLATE */}
      {printingOrder && createPortal(
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @page {
              size: 80mm auto;
              margin: 0 !important;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                width: 80mm !important;
              }
              #root, header, aside, main, footer, .toast, .no-print {
                display: none !important;
              }
              .print-receipt-container {
                display: block !important;
                width: 80mm !important;
                margin: 0 auto !important;
                padding: 6mm 4mm !important;
                box-sizing: border-box !important;
                background: white !important;
              }
            }
          `}} />
          <div className="print-receipt-container hidden print:block text-black bg-white leading-relaxed text-[11px]" dir="rtl" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            {/* Header Welcome banner */}
            <div className="text-center border-b-2 border-double border-black pb-3 mb-3">
              {/* Logo if active */}
              {restaurant?.receiptSettings?.showLogo && restaurant?.logo?.url && (
                <div className="mb-2">
                  <img src={restaurant.logo.url} alt="logo" className="mx-auto max-h-16 object-contain rounded-md" />
                </div>
              )}
              {/* Restaurant Name */}
              <h1 className="text-base font-extrabold tracking-tight uppercase mb-0.5 text-black">{restaurant?.name}</h1>
              {/* Header Text */}
              {restaurant?.receiptSettings?.headerText && (
                <p className="text-[10px] text-zinc-800 leading-tight mt-1 max-w-[90%] mx-auto font-medium">{restaurant.receiptSettings.headerText}</p>
              )}
            </div>

            {/* Receipt title */}
            <div className="text-center font-bold text-[12px] tracking-widest my-2 border-b border-dashed border-black pb-2">
              *** فـاتـورة حـسـاب ***
            </div>

            {/* Metadata Info */}
            <table className="w-full text-right text-[10px] mb-3 leading-normal border-b border-dashed border-black pb-2.5">
              <tbody>
                <tr>
                  <td className="py-0.5 font-bold text-zinc-700 w-[75px]">رقم الطلب:</td>
                  <td className="py-0.5 font-mono font-bold text-black">#{printingOrder.id.slice(-6).toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-bold text-zinc-700">رقم الطاولة:</td>
                  <td className="py-0.5 font-bold text-black">طاولة {printingOrder.tableNumber}</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-bold text-zinc-700">التاريخ:</td>
                  <td className="py-0.5 text-zinc-900 font-mono text-[9.5px]">
                    {new Date(printingOrder.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
                {restaurant?.receiptSettings?.phone && (
                  <tr>
                    <td className="py-0.5 font-bold text-zinc-700">الهاتف:</td>
                    <td className="py-0.5 font-mono text-zinc-900">{restaurant.receiptSettings.phone}</td>
                  </tr>
                )}
                {restaurant?.receiptSettings?.address && (
                  <tr>
                    <td className="py-0.5 font-bold text-zinc-700">العنوان:</td>
                    <td className="py-0.5 text-zinc-900">{restaurant.receiptSettings.address}</td>
                  </tr>
                )}
                {restaurant?.receiptSettings?.taxNumber && (
                  <tr>
                    <td className="py-0.5 font-bold text-zinc-700">الرقم الضريبي:</td>
                    <td className="py-0.5 font-mono text-zinc-900">{restaurant.receiptSettings.taxNumber}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Items Table */}
            <table className="w-full text-right text-[10px] my-3 border-b-2 border-double border-black pb-3">
              <thead>
                <tr className="border-b border-dashed border-black text-[10px] text-zinc-800 font-black">
                  <th className="pb-1.5 text-right">الصنف</th>
                  <th className="pb-1.5 text-center w-12">الكمية</th>
                  <th className="pb-1.5 text-left w-24">السعر</th>
                </tr>
              </thead>
              <tbody>
                {printingOrder.items.map((item: any, idx: number) => (
                  <tr key={idx} className="font-bold border-b border-zinc-100 last:border-b-0">
                    <td className="py-2 pr-1">
                      <div className="leading-tight text-black">{item.name}</div>
                      {item.notes && (
                        <div className="text-[8.5px] text-zinc-700 mr-2 mt-0.5 font-medium leading-tight">
                          * ملاحظة: {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center font-mono text-[11px] font-black text-black">{item.quantity}</td>
                    <td className="py-2 text-left font-mono text-[11px] font-black text-black">{item.price * item.quantity} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="space-y-1.5 font-bold text-[10px] pr-1 py-1 border-b border-dashed border-black pb-3">
              <div className="flex justify-between">
                <span className="text-zinc-700">الإجمالي الفرعي:</span>
                <span className="font-mono text-black">{printingOrder.totalAmount} ج.م</span>
              </div>
              {(restaurant?.receiptSettings?.taxRate ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-700">ضريبة القيمة المضافة ({restaurant?.receiptSettings?.taxRate}%):</span>
                  <span className="font-mono text-black">{(printingOrder.totalAmount * ((restaurant?.receiptSettings?.taxRate || 0) / 100)).toFixed(1)} ج.م</span>
                </div>
              )}
              {(restaurant?.receiptSettings?.serviceRate ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-700">رسوم الخدمة ({restaurant?.receiptSettings?.serviceRate}%):</span>
                  <span className="font-mono text-black">{(printingOrder.totalAmount * ((restaurant?.receiptSettings?.serviceRate || 0) / 100)).toFixed(1)} ج.م</span>
                </div>
              )}
            </div>

            {/* Net Grand Total */}
            <div className="flex justify-between text-[13px] font-black py-2.5 my-1 border-b-2 border-double border-black">
              <span>الإجمالي الكلي:</span>
              <span className="font-mono text-black">
                {(
                  printingOrder.totalAmount +
                  (printingOrder.totalAmount * ((restaurant?.receiptSettings?.taxRate || 0) / 100)) +
                  (printingOrder.totalAmount * ((restaurant?.receiptSettings?.serviceRate || 0) / 100))
                ).toFixed(1)} ج.م
              </span>
            </div>

            {/* Welcome Footer Text */}
            <div className="text-center mt-4 space-y-2">
              {restaurant?.receiptSettings?.footerText && (
                <p className="text-[9.5px] text-zinc-800 font-bold px-2 leading-relaxed">
                  {restaurant.receiptSettings.footerText}
                </p>
              )}
              
              <div className="text-[8px] text-zinc-500 font-medium tracking-wider pt-2">
                نظام إدارة المنيو الذكي - Tawla OS
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* WAITER DIRECT ORDER MODAL */}
      {isCreateOrderOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 transition-all duration-300" dir="rtl">
          <div className="bg-[#0f111a] border border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl text-slate-100 relative">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-800 bg-[#161925]/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-white">إنشاء طلب جديد (ويتر)</h2>
                  <p className="text-[10px] text-slate-400 font-medium">سجل طلب طاولة جديدة واطبع الفاتورة فوراً</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setNewOrderCart([]);
                  setSelectedTableNumber('');
                  setNewOrderSpecialNotes('');
                  setIsCreateOrderOpen(false);
                }} 
                className="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer border border-slate-700/30"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              
              {/* Left Column: Cart & Table details (40%) */}
              <div className="w-full md:w-[380px] border-l border-slate-800 flex flex-col h-full bg-[#0c0d14] flex-shrink-0">
                {/* Table & Notes selection */}
                <div className="p-5 border-b border-slate-800 space-y-4">
                  <div className="space-y-1.5" ref={tableDropdownRef}>
                    <label className="block text-[11px] font-bold text-slate-400">اختر رقم الطاولة:</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsTableDropdownOpen(prev => !prev)}
                        className="w-full bg-[#161925] border border-slate-800 text-slate-100 text-xs rounded-xl pr-3.5 pl-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 font-bold transition-all text-right flex justify-between items-center cursor-pointer"
                      >
                        <span className="truncate">
                          {selectedTableNumber 
                            ? `طاولة ${selectedTableNumber} (${
                                tables.find((t: Table) => t.number === selectedTableNumber)?.status === 'occupied' 
                                  ? 'مشغولة' 
                                  : tables.find((t: Table) => t.number === selectedTableNumber)?.status === 'waitingBill' 
                                  ? 'تطلب الحساب' 
                                  : 'متاحة'
                              })`
                            : '-- اختر رقم الطاولة --'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-250 ${isTableDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isTableDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute right-0 left-0 mt-2 bg-[#161925] border border-slate-800 rounded-xl overflow-hidden shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-hide"
                          >
                            <div className="p-1.5 space-y-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTableNumber('');
                                  setIsTableDropdownOpen(false);
                                }}
                                className="w-full text-right px-3 py-2 text-xs text-slate-400 hover:bg-slate-800/40 hover:text-white rounded-lg transition-colors cursor-pointer"
                              >
                                -- اختر رقم الطاولة --
                              </button>
                              {tables.map((t: Table) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTableNumber(t.number);
                                    setIsTableDropdownOpen(false);
                                  }}
                                  className={`w-full text-right px-3 py-2.5 text-xs rounded-lg transition-colors flex justify-between items-center cursor-pointer ${
                                    selectedTableNumber === t.number
                                      ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/10'
                                      : 'text-slate-200 hover:bg-slate-800/40'
                                  }`}
                                >
                                  <span className="font-bold">طاولة {t.number}</span>
                                  <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                                    t.status === 'occupied' 
                                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10' 
                                      : t.status === 'waitingBill' 
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/10 animate-pulse' 
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10'
                                  }`}>
                                    {t.status === 'occupied' ? 'مشغولة' : t.status === 'waitingBill' ? 'تطلب الحساب' : 'متاحة'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-400">ملاحظات عامة للطلب:</label>
                    <textarea
                      placeholder="مثال: البهارات خفيفة، التوصيل مع فواتير الطاولة السابقة..."
                      value={newOrderSpecialNotes}
                      onChange={(e) => setNewOrderSpecialNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-[#161925] border border-slate-800 text-slate-100 text-xs rounded-xl p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-hide">
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">مكونات الطلب</h4>
                  {newOrderCart.length === 0 ? (
                    <div className="h-full border border-dashed border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-[#10121e]/20 min-h-[220px]">
                      <div className="w-12 h-12 rounded-full bg-slate-800/40 flex items-center justify-center mb-3">
                        <ShoppingBag className="w-6 h-6 text-slate-500/60" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-300 mb-1">السلة فارغة</h5>
                      <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                        لم يتم إضافة وجبات بعد. اختر بعض الأصناف من القائمة للبدء.
                      </p>
                    </div>
                  ) : (
                    newOrderCart.map((item, idx) => (
                      <div key={idx} className="bg-[#121420] border border-slate-800/80 rounded-xl p-3.5 space-y-3 hover:border-slate-700/50 transition-all shadow-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h5 className="text-xs font-extrabold text-white leading-snug">{item.product.name}</h5>
                            <span className="text-[11px] text-indigo-400 font-extrabold font-mono">{item.product.price} ج.م</span>
                          </div>
                          <button
                            onClick={() => setNewOrderCart(prev => prev.filter(i => i.product.id !== item.product.id))}
                            className="w-6 h-6 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {/* Quantity and Notes */}
                        <div className="flex justify-between items-center gap-2 pt-2.5 border-t border-slate-800/60">
                          <div className="flex items-center bg-[#0d0f17] border border-slate-800 rounded-lg p-0.5">
                            <button
                              onClick={() => {
                                setNewOrderCart(prev => prev.map(i => 
                                  i.product.id === item.product.id 
                                    ? { ...i, quantity: Math.max(1, i.quantity - 1) } 
                                    : i
                                ));
                              }}
                              className="w-6 h-6 rounded bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center active:scale-95 transition-all text-xs text-slate-300"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs font-extrabold w-6 text-center text-slate-100">{item.quantity}</span>
                            <button
                              onClick={() => {
                                setNewOrderCart(prev => prev.map(i => 
                                  i.product.id === item.product.id 
                                    ? { ...i, quantity: i.quantity + 1 } 
                                    : i
                                ));
                              }}
                              className="w-6 h-6 rounded bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center active:scale-95 transition-all text-xs text-slate-300"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <input
                            type="text"
                            placeholder="إضافة ملاحظة على الصنف..."
                            value={item.notes}
                            onChange={(e) => {
                              setNewOrderCart(prev => prev.map(i => 
                                i.product.id === item.product.id 
                                  ? { ...i, notes: e.target.value } 
                                  : i
                              ));
                            }}
                            className="flex-1 bg-[#161925] border border-slate-800 text-[10px] rounded-lg px-2.5 py-1.5 outline-none text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 transition-colors"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Submit Panel */}
                <div className="p-5 border-t border-slate-800 bg-[#161925]/30 space-y-4">
                  <div className="flex justify-between items-center bg-[#0a0b12] border border-slate-800 px-4 py-3.5 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400">إجمالي الحساب:</span>
                    <span className="font-mono text-base font-black text-indigo-400">
                      {newOrderCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)} ج.م
                    </span>
                  </div>

                  <button
                    onClick={handleCreateOrderSubmit}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] text-xs flex items-center justify-center gap-2 cursor-pointer border border-indigo-500/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>تأكيد وطباعة الفاتورة</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Menu catalog & Categories (60%) */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f16]">
                
                {/* Search Bar */}
                <div className="p-5 border-b border-slate-800 flex items-center gap-2 bg-[#10121e]/20">
                  <div className="relative flex-1">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="ابحث في المنيو عن مشروب أو أكلة..."
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      className="w-full bg-[#161925] border border-slate-800 text-slate-100 text-xs rounded-xl pr-10 pl-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 font-bold transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Categories Scrollbar */}
                <div className="flex gap-2.5 overflow-x-auto p-5 border-b border-slate-800/80 scrollbar-hide flex-shrink-0 bg-[#0d0f16]">
                  <button
                    onClick={() => setMenuSelectedCategory('all')}
                    className={`py-2 px-5 rounded-full text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                      menuSelectedCategory === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                        : 'bg-[#161925] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    الكل
                  </button>
                  {(menuData?.categories || []).map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => setMenuSelectedCategory(cat.id)}
                      className={`py-2 px-5 rounded-full text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                        menuSelectedCategory === cat.id
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                          : 'bg-[#161925] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Product Grid Area */}
                <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 lg:grid-cols-3 gap-4 items-start scrollbar-hide">
                  {modalFilteredProducts.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center text-center py-20 text-slate-500">
                      <LayoutGrid className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-xs font-semibold">لا توجد منتجات مطابقة للبحث</p>
                    </div>
                  ) : (
                    modalFilteredProducts.map((prod: any) => {
                      const inCart = newOrderCart.find(i => i.product.id === prod.id);
                      return (
                        <div
                          key={prod.id}
                          className="bg-[#121420] border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/[0.02] transition-all group overflow-hidden"
                        >
                          <div className="flex flex-col gap-2">
                            {prod.image?.url ? (
                              <div className="w-full aspect-square rounded-xl overflow-hidden mb-1 border border-slate-800/40">
                                <img
                                  src={prod.image.url}
                                  alt={prod.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            ) : (
                              <div className="w-full aspect-square rounded-xl bg-slate-900/60 border border-slate-800/40 flex items-center justify-center text-slate-600 mb-1">
                                <UtensilsCrossed className="w-8 h-8 opacity-40" />
                              </div>
                            )}
                            <div className="px-1">
                              <h5 className="text-xs font-extrabold text-white leading-snug line-clamp-1 group-hover:text-indigo-400 transition-colors">{prod.name}</h5>
                              {prod.description ? (
                                <p className="text-[10px] text-slate-500 leading-tight mt-1 line-clamp-2 min-h-[28px]">{prod.description}</p>
                              ) : (
                                <p className="text-[10px] text-slate-600 italic leading-tight mt-1 min-h-[28px]">لا يوجد وصف متوفر</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-800/60 px-1">
                            <span className="font-mono text-xs font-black text-indigo-400">{prod.price} ج.م</span>
                            <button
                              onClick={() => {
                                if (inCart) {
                                  setNewOrderCart(prev => prev.map(i => 
                                    i.product.id === prod.id 
                                      ? { ...i, quantity: i.quantity + 1 } 
                                      : i
                                  ));
                                } else {
                                  setNewOrderCart(prev => [...prev, { product: prod, quantity: 1, notes: '' }]);
                                  toast.success(`تم إضافة ${prod.name}`);
                                }
                              }}
                              className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all active:scale-95 cursor-pointer ${
                                inCart 
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                                  : 'bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20'
                              }`}
                            >
                              {inCart ? `مضاف (${inCart.quantity})` : 'إضافة +'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
