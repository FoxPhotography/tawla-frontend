import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, LayoutGrid, MapPin, ChefHat,
  ShoppingBag, X, Download, PlusCircle, Wifi, WifiOff,
  Volume2, VolumeX, Layers, Users, Bell, Clock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import { useAuthStore } from '../../shared/store/authStore';
import type { Order, Table } from '../../shared/types';
import { getOfflineOrders, syncOfflineOrders } from '../../shared/services/offlineOrders';
import { staffAudio } from './services/staffAudio';

import LiveAlertsSidebar, { type LiveAlert } from './components/LiveAlertsSidebar';
import OrdersTab from './components/OrdersTab';
import TablesTab from './components/TablesTab';
import CreateOrderModal from './components/CreateOrderModal';
import ReceiptPrintTemplate from './components/ReceiptPrintTemplate';
import KDSTab from './components/KDSTab';
import { useOfflineGuard } from '../../shared/hooks/useOfflineGuard';
import OfflineTamperModal from '../../shared/components/OfflineTamperModal';

const formatLiveClock = (date: Date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = hours.toString().padStart(2, '0');
  return `${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

export default function StaffDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user, restaurant, logout, updateRestaurant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'kds'>('orders');
  const [orderFilter, setOrderFilter] = useState<'active' | 'archived'>('active');
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  // Sound Engine Mute State
  const [isMuted, setIsMuted] = useState(staffAudio.getMutedState());

  const handleToggleMute = () => {
    const newState = staffAudio.toggleMute();
    setIsMuted(newState);
    if (!newState) {
      toast.success('تم تشغيل التنبيهات الصوتية 🔊');
    } else {
      toast('تم كتم التنبيهات الصوتية 🔇', { icon: '🔇' });
    }
  };

  // Receipt Printing State
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);

  const handlePrintReceipt = (order: any) => {
    staffAudio.play('action');
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setPrintingOrder(null);
    }, 250);
  };

  // Toast Notification States
  const [showNewOrderToast, setShowNewOrderToast] = useState(false);
  const [newOrderDetails, setNewOrderDetails] = useState<any | null>(null);

  // Custom states for PWA, network and security offline guard
  const offlineGuard = useOfflineGuard();
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
    staffAudio.play('click');
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

  // Audio Context unlocker
  useEffect(() => {
    const resumeAudio = () => {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      }
    };
    window.addEventListener('click', resumeAudio, { once: true });
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
    staleTime: Infinity,
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
  const combinedOrders = useMemo(() => {
    const merged = [...offlineOrders, ...serverOrders];
    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [offlineOrders, serverOrders]);

  const activeOrdersCount = useMemo(() => {
    return combinedOrders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)).length;
  }, [combinedOrders]);

  const occupiedTablesCount = useMemo(() => {
    return tables.filter((t: Table) => t.status === 'occupied' || t.status === 'waitingBill').length;
  }, [tables]);

  const kdsPendingCount = useMemo(() => {
    return combinedOrders.filter(o => ['pending', 'accepted', 'preparing'].includes(o.status)).length;
  }, [combinedOrders]);

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
      staffAudio.play('action');
      if (orderId.startsWith('offline_')) {
        if (nextStatus === 'cancelled') {
          const list = getOfflineOrders();
          const updated = list.filter((o: any) => o.id !== orderId);
          localStorage.setItem('tawla_offline_orders', JSON.stringify(updated));
          setOfflineOrders(getOfflineOrders());
          toast.success('تم إلغاء الطلب المحلي بنجاح.');
          
          const targetOrder = offlineOrders.find(o => o.id === orderId);
          if (targetOrder) {
            updateLocalTableStatus(targetOrder.tableNumber, 'empty', null);
          }
          return null;
        } else {
          const list = getOfflineOrders();
          let updatedOrder: any = null;
          const updated = list.map((o: any) => {
            if (o.id === orderId) {
              updatedOrder = { ...o, status: nextStatus };
              return updatedOrder;
            }
            return o;
          });
          localStorage.setItem('tawla_offline_orders', JSON.stringify(updated));
          setOfflineOrders(getOfflineOrders());
          toast.success('تم تحديث حالة الطلب محلياً.');
          return updatedOrder;
        }
      }
      const res = await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      if (!variables.orderId.startsWith('offline_')) {
        staffAudio.play('success');
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
      staffAudio.play('bill');
      await api.patch(`/tables/${tableId}/status`, { status: 'empty', currentOrderId: null, paymentMethod });
    },
    onSuccess: () => {
      staffAudio.play('success');
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
      staffAudio.play('action');
      await api.put(`/orders/${orderId}`, { items, specialNotes, status });
    },
    onSuccess: () => {
      staffAudio.play('success');
      toast.success('تم تعديل الطلب وتحديث الحساب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تعديل الطلب.');
    },
  });

  // Auto-fetch profile if restaurant store object is missing
  useEffect(() => {
    if (user && !restaurant) {
      api.get('/auth/profile')
        .then(res => {
          if (res.data?.success && res.data.data?.restaurant) {
            updateRestaurant(res.data.data.restaurant);
          }
        })
        .catch(err => console.warn('Failed to fetch restaurant profile:', err));
    }
  }, [user, restaurant, updateRestaurant]);

  // Socket Listener
  useEffect(() => {
    if (!user) return;

    const handleConnect = () => {
      const restId = restaurant?.id || (restaurant as any)?._id || user?.restaurantId;
      console.log('Socket connected, joining restaurant room:', restId);
      setIsOnline(true);

      if (restId) {
        socket.emit('join_restaurant', restId, (res: any) => {
          if (res && !res.success) {
            console.error('[Socket.io]: Failed to join restaurant room:', res.error);
          } else {
            console.log('[Socket.io]: Successfully joined restaurant room:', restId);
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
          }
        });
      }
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
      staffAudio.play(isDelivery ? 'delivery_order' : 'new_order');
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

    const handleOrderStatusUpdated = (data: { orderId: string; status: string }) => {
      queryClient.setQueryData(['staff-orders'], (old: any) => {
        const list = old ? [...old] : [];
        return list.map((o: any) => 
          o.id === data.orderId ? { ...o, status: data.status } : o
        );
      });
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
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
      queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    };

    const handleCallWaiter = (data: { tableNumber: number }) => {
      staffAudio.play('call_waiter');
      const newAlert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'call_waiter',
        tableNumber: data.tableNumber,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev]);
    };

    const handleRequestBill = (data: { tableNumber: number; totalAmount: number }) => {
      staffAudio.play('bill');
      const newAlert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'bill',
        tableNumber: data.tableNumber,
        totalAmount: data.totalAmount,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev]);
    };

    const handleConnectError = (err: any) => {
      console.error('[Socket.io]: Connection error:', err);
      setIsOnline(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    socket.auth = { token: useAuthStore.getState().token };

    const handleMenuUpdated = async () => {
      console.log('[Socket.io]: Menu settings updated, refetching restaurant profile...');
      try {
        const res = await api.get('/auth/profile');
        if (res.data?.success && res.data.data?.restaurant) {
          updateRestaurant(res.data.data.restaurant);
        }
      } catch (err) {
        console.warn('Failed to refetch restaurant settings via socket:', err);
      }
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    socket.on('new_order', handleNewOrder);
    socket.on('order_status_updated', handleOrderStatusUpdated);
    socket.on('table_status_changed', handleTableStatusChanged);
    socket.on('call_waiter', handleCallWaiter);
    socket.on('request_bill', handleRequestBill);
    socket.on('menu_updated', handleMenuUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('new_order', handleNewOrder);
      socket.off('order_status_updated', handleOrderStatusUpdated);
      socket.off('table_status_changed', handleTableStatusChanged);
      socket.off('call_waiter', handleCallWaiter);
      socket.off('request_bill', handleRequestBill);
      socket.off('menu_updated', handleMenuUpdated);
    };
  }, [user, restaurant, queryClient, token, updateRestaurant]);

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
    staffAudio.play('click');
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
    staffAudio.play('click');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismissAlert = (alertId: string) => {
    staffAudio.play('click');
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleOrderCreated = () => {
    staffAudio.play('success');
    setOfflineOrders(getOfflineOrders());
    queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    queryClient.invalidateQueries({ queryKey: ['staff-tables'] });
  };

  if (!user || !restaurant) return null;

  return (
    <div className="flex flex-row h-screen max-h-screen w-full bg-[#FAF9F6] text-zinc-900 relative overflow-hidden font-body selection:bg-[#801B2C]/10 selection:text-[#801B2C]" dir="rtl">
      
      {/* Background ambient luxury glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-60">
        <div className="absolute -top-32 right-[-5%] w-[550px] h-[550px] rounded-full bg-[#801B2C]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />
      </div>

      <Toaster position="top-center" toastOptions={{
        style: { 
          background: '#FFFFFF', 
          color: '#0F0F10', 
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.08)',
          fontWeight: 700,
          fontSize: '13px',
          borderRadius: '16px'
        }
      }} />

      {/* Offline Guard & Anti-Tamper Protection Modal */}
      <OfflineTamperModal guardStatus={offlineGuard} />

      {/* ===== Luxury Incoming Order Toast Banner ===== */}
      <AnimatePresence>
        {showNewOrderToast && newOrderDetails && (
          <motion.div
            initial={{ y: -60, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            onClick={() => {
              staffAudio.play('click');
              setActiveTab('orders');
              setShowNewOrderToast(false);
            }}
            className="fixed top-6 left-6 z-50 bg-white/95 backdrop-blur-xl border border-zinc-200/90 hover:border-[#801B2C]/40 p-4 px-5 rounded-2xl shadow-[0_20px_50px_-10px_rgba(128,27,44,0.25)] flex items-center gap-4 min-w-[340px] max-w-sm text-zinc-900 font-cairo cursor-pointer select-none transition-all group"
          >
            {/* Animated Order Icon with Live Indicator */}
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#801B2C] to-[#962436] flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-[#801B2C]/30">
              <ShoppingBag className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-zinc-900 font-cairo">طلب جديد وارد!</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#801B2C] animate-pulse" />
                </div>
                <span className="text-[11px] bg-[#801B2C]/10 border border-[#801B2C]/20 text-[#801B2C] px-2 py-0.5 rounded-lg font-mono font-black">
                  #{newOrderDetails.id.slice(-4).toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-zinc-600 font-bold truncate">
                {newOrderDetails.type === 'delivery' 
                  ? `🛵 دليفري · ${newOrderDetails.customerName || 'عميل'}` 
                  : newOrderDetails.tableNumber > 0 
                  ? `🍽️ طاولة رقم ${newOrderDetails.tableNumber}` 
                  : '🥡 تيك أواي سفري'}
              </p>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[11px] text-zinc-500 font-bold">الحساب الإجمالي:</span>
                <span className="text-xs text-[#801B2C] font-black font-cairo">
                  {newOrderDetails.totalAmount} ج.م
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNewOrderToast(false);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer self-start -mr-2 -mt-1"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Luxury Light Sidebar ===== */}
      <aside className="w-20 h-screen max-h-screen sticky top-0 bg-white/95 backdrop-blur-md border-l border-zinc-200/80 flex flex-col items-center py-6 justify-between z-30 flex-shrink-0 shadow-sm overflow-hidden">
        
        {/* Top Brand Logo & Tabs */}
        <div className="flex flex-col items-center gap-7 w-full">
          
          {/* Logo / Restaurant Initial Letter */}
          <motion.div 
            whileHover={{ scale: 1.06, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#801B2C] to-[#962436] flex items-center justify-center shadow-lg shadow-[#801B2C]/20 cursor-pointer overflow-hidden border border-white/20 select-none"
            title={restaurant.name}
          >
            <span className="text-white font-black text-xl font-cairo leading-none">
              {restaurant.name ? restaurant.name.trim().charAt(0).toUpperCase() : 'ط'}
            </span>
          </motion.div>

          {/* Navigation Tab Buttons */}
          <div className="flex flex-col items-center gap-3 w-full px-2">
            
            {/* Orders Tab */}
            <button
              onClick={() => {
                staffAudio.play('click');
                setActiveTab('orders');
              }}
              className={`relative w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group ${
                activeTab === 'orders'
                  ? 'text-white bg-[#801B2C] shadow-lg shadow-[#801B2C]/25'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80'
              }`}
              title="الطلبات النشطة"
            >
              <LayoutGrid className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-[9px] font-black mt-0.5 font-body">الطلبات</span>
              {activeOrdersCount > 0 && activeTab !== 'orders' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#801B2C] text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-sm">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            {/* Tables Tab */}
            <button
              onClick={() => {
                staffAudio.play('click');
                setActiveTab('tables');
              }}
              className={`relative w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group ${
                activeTab === 'tables'
                  ? 'text-white bg-[#801B2C] shadow-lg shadow-[#801B2C]/25'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80'
              }`}
              title="خريطة الطاولات"
            >
              <MapPin className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-[9px] font-black mt-0.5 font-body">الطاولات</span>
              {occupiedTablesCount > 0 && activeTab !== 'tables' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-sm">
                  {occupiedTablesCount}
                </span>
              )}
            </button>

            {/* KDS Kitchen Tab */}
            <button
              onClick={() => {
                staffAudio.play('click');
                setActiveTab('kds');
              }}
              className={`relative w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group ${
                activeTab === 'kds'
                  ? 'text-white bg-[#801B2C] shadow-lg shadow-[#801B2C]/25'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80'
              }`}
              title="شاشة المطبخ (KDS)"
            >
              <ChefHat className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-[9px] font-black mt-0.5 font-body">المطبخ</span>
              {kdsPendingCount > 0 && activeTab !== 'kds' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-sm">
                  {kdsPendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Utility Controls (Audio Mute Toggle & Logout) */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          
          {/* Sound Mute/Unmute Toggle */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={handleToggleMute}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer border ${
              isMuted 
                ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100' 
                : 'bg-zinc-100 text-zinc-700 border-zinc-200/80 hover:bg-zinc-200 hover:text-zinc-950'
            }`}
            title={isMuted ? 'تشغيل التنبيهات الصوتية' : 'كتم التنبيهات الصوتية'}
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5 text-[#801B2C]" />}
          </motion.button>

          {/* Logout Button */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={handleLogout}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200/60 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4.5 h-4.5" />
          </motion.button>
        </div>
      </aside>

      {/* ===== Main Workspace ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAF9F6] overflow-hidden z-10">
        
        {/* Top Control Bar (Clean Light Luxury Header) */}
        <header className="bg-white/95 backdrop-blur-md border-b border-zinc-200/80 py-3.5 px-6 flex justify-between items-center z-20 flex-shrink-0 shadow-sm">
          
          {/* Right Brand Info & User Badge */}
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-zinc-900 font-cairo">
                  {restaurant.name}
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
              </div>
              <p className="text-[11px] text-zinc-500 font-bold mt-0.5 flex items-center gap-1.5 font-body">
                <span>{user.name}</span>
                <span className="text-zinc-300">·</span>
                <span className="bg-[#801B2C]/10 text-[#801B2C] px-2 py-0.2 rounded-md font-black text-[10px]">
                  {user.role === 'cashier' ? 'كاشير' : user.role === 'waiter' ? 'ويتر' : 'مدير'}
                </span>
              </p>
            </div>

            {/* Quick overview pills (Desktop only) */}
            <div className="hidden xl:flex items-center gap-2 mr-4 border-r border-zinc-200 pr-4">
              <div className="flex items-center gap-1.5 bg-zinc-100/80 border border-zinc-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700">
                <Layers className="w-3.5 h-3.5 text-[#801B2C]" />
                <span>الطلبات:</span>
                <span className="font-mono font-black text-[#801B2C]">{activeOrdersCount}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-100/80 border border-zinc-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>الطاولات:</span>
                <span className="font-mono font-black text-amber-700">{occupiedTablesCount}/{tables.length}</span>
              </div>
              {alerts.length > 0 && (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 animate-pulse">
                  <Bell className="w-3.5 h-3.5 text-red-500" />
                  <span>النداءات:</span>
                  <span className="font-mono font-black">{alerts.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Left Controls & Status Badges */}
          <div className="flex items-center gap-3">
            
            {/* Waiter Ordering Trigger (Prominent Royal Burgundy Button) */}
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 8px 20px -4px rgba(128, 27, 44, 0.25)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                staffAudio.play('click');
                setIsCreateOrderOpen(true);
              }}
              className="flex items-center gap-2.5 bg-[#801B2C] hover:bg-[#962436] text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition-all shadow-md shadow-[#801B2C]/20 cursor-pointer font-body border border-[#801B2C] whitespace-nowrap min-w-fit"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طلب جديد</span>
            </motion.button>

            {/* PWA Install Trigger */}
            {deferredPrompt && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-black px-3.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                title="تثبيت التطبيق على الجهاز"
              >
                <Download className="w-4 h-4 text-[#801B2C]" />
                <span>تثبيت التطبيق</span>
              </motion.button>
            )}

            {/* Network / Offline DB Sync Badge */}
            <span className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${
              networkStatus === 'online'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200 animate-pulse'
            }`}>
              {networkStatus === 'online' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-600" />
              )}
              <span>{networkStatus === 'online' ? 'الشبكة متصلة' : 'أوفلاين'}</span>
            </span>

            {/* Socket Live Sync Badge */}
            <span className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black border ${
              isOnline
                ? 'bg-zinc-50 text-zinc-700 border-zinc-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isOnline ? 'مزامنة حية' : 'إعادة اتصال...'}</span>
            </span>

            {/* Live digital clock */}
            <span className="text-xs font-bold text-zinc-700 font-cairo bg-white border border-zinc-200/90 px-3.5 py-2 rounded-xl shadow-2xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#801B2C]" />
              <span className="tracking-wide">{formatLiveClock(currentTime)}</span>
            </span>
          </div>
        </header>

        {/* Dashboard Main Workspace Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-hidden min-h-0">
          
          {/* Alerts & Table Status Sidebar (Right Side on RTL) */}
          <div className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 pr-1 max-h-full">
            
            {/* Quick table status card (Luxury Circular Dining Map with Neon Inner Glow) */}
            <div className="bg-white/95 backdrop-blur-sm border border-zinc-200/90 rounded-3xl p-5 space-y-3.5 shadow-[0_4px_24px_-4px_rgba(128,27,44,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider font-cairo">خريطة الطاولات السريعة</h3>
                <span className="text-[11px] font-mono font-black text-[#801B2C] bg-[#801B2C]/5 px-2.5 py-0.5 rounded-full border border-[#801B2C]/10 shadow-[inset_0_1px_2px_rgba(128,27,44,0.08)]">
                  {tables.length} طاولة
                </span>
              </div>

              {/* Status Counter Chips */}
              {(() => {
                const emptyCount = tables.filter((t: Table) => t.status === 'empty').length;
                const occupiedCount = tables.filter((t: Table) => t.status === 'occupied').length;
                const billCount = tables.filter((t: Table) => t.status === 'waitingBill').length;

                return (
                  <div className="grid grid-cols-3 gap-1.5 text-center font-body text-[10px] font-bold">
                    <div className="bg-zinc-50/90 border border-zinc-200/70 rounded-xl py-1.5 px-1 text-zinc-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
                      <span>متاحة: </span>
                      <strong className="font-mono font-black text-zinc-900">{emptyCount}</strong>
                    </div>
                    <div className="bg-[#801B2C]/5 border border-[#801B2C]/15 rounded-xl py-1.5 px-1 text-[#801B2C] shadow-[inset_0_1px_3px_rgba(128,27,44,0.06)]">
                      <span>مشغولة: </span>
                      <strong className="font-mono font-black text-[#801B2C]">{occupiedCount}</strong>
                    </div>
                    <div className={`rounded-xl py-1.5 px-1 border ${
                      billCount > 0 
                        ? 'bg-amber-100/90 border-amber-300 text-amber-900 animate-pulse font-black shadow-[inset_0_1px_4px_rgba(245,158,11,0.2),0_2px_8px_rgba(245,158,11,0.15)]' 
                        : 'bg-amber-50/50 border-amber-200/60 text-amber-800 shadow-[inset_0_1px_2px_rgba(245,158,11,0.05)]'
                    }`}>
                      <span>حساب: </span>
                      <strong className="font-mono font-black">{billCount}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Scalable Circular Table Grid with Neon Inner Glow */}
              <div className="grid grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1 pl-0.5 py-1.5 scrollbar-thin scrollbar-thumb-zinc-200 min-h-0">
                {tables.map((table: Table) => {
                  let circleClass = 'bg-zinc-50/90 text-zinc-700 border-zinc-200/90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05),inset_0_0_6px_rgba(255,255,255,0.9)] hover:border-[#801B2C]/40 hover:bg-[#801B2C]/5 hover:text-[#801B2C] hover:shadow-[inset_0_0_8px_rgba(128,27,44,0.18)]';
                  if (table.status === 'occupied') {
                    circleClass = 'bg-gradient-to-tr from-[#801B2C] to-[#962436] text-white border-[#962436] font-black shadow-[inset_0_1px_4px_rgba(255,255,255,0.4),inset_0_0_10px_rgba(255,120,140,0.25),0_3px_10px_rgba(128,27,44,0.28)]';
                  } else if (table.status === 'waitingBill') {
                    circleClass = 'bg-gradient-to-tr from-amber-400 to-amber-500 text-amber-950 border-amber-300 font-black shadow-[inset_0_1px_4px_rgba(255,255,255,0.7),inset_0_0_12px_rgba(255,230,100,0.5),0_3px_12px_rgba(245,158,11,0.35)] animate-pulse';
                  }
                  return (
                    <motion.button
                      key={table.id}
                      whileHover={{ scale: 1.2, zIndex: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        handleStartOrderForTable(table.number);
                      }}
                      className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all cursor-pointer border ${circleClass} relative`}
                      title={`طاولة رقم ${table.number} - انقر لبدء طلب جديد (${table.status === 'occupied' ? 'مشغولة' : table.status === 'waitingBill' ? 'تطلب الحساب' : 'متاحة'})`}
                    >
                      <span>{table.number}</span>
                      {table.status === 'waitingBill' && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-white animate-ping" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[10px] text-zinc-500 font-bold font-body">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 border border-zinc-300" /> متاحة
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#801B2C] border border-[#962436]" /> مشغولة
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500" /> تطلب الحساب
                </span>
              </div>
            </div>

            {/* Live Alerts sidebar */}
            <LiveAlertsSidebar 
              alerts={alerts}
              onDismissAlert={handleDismissAlert}
              onSetActiveTab={setActiveTab}
            />
          </div>

          {/* Main Tab Panel Content */}
          <div className="flex-1 flex flex-col gap-5 min-w-0 h-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex-1 min-h-0 h-full overflow-hidden flex flex-col"
              >
                {activeTab === 'orders' ? (
                  <OrdersTab 
                    orders={combinedOrders}
                    orderFilter={orderFilter}
                    onSetOrderFilter={setOrderFilter}
                    onPrintReceipt={handlePrintReceipt}
                    onUpdateStatus={(id, status) => updateStatusMutation.mutate({ orderId: id, nextStatus: status })}
                    isStatusPending={updateStatusMutation.isPending}
                    onUpdateOrder={(id, items, status) => updateOrderMutation.mutateAsync({ orderId: id, items, status })}
                    isUpdatePending={updateOrderMutation.isPending}
                    isDeliveryEnabled={restaurant?.settings?.isDeliveryEnabled !== false}
                  />
                ) : activeTab === 'tables' ? (
                  <TablesTab 
                    tables={tables}
                    orders={combinedOrders}
                    onEmptyTable={(id, method) => emptyTableMutation.mutate({ tableId: id, paymentMethod: method })}
                    isEmptyTablePending={emptyTableMutation.isPending}
                    onStartOrderForTable={handleStartOrderForTable}
                    onPrintReceipt={handlePrintReceipt}
                  />
                ) : (
                  <KDSTab 
                    orders={combinedOrders}
                    categories={menuData.categories}
                    products={menuData.products}
                    onUpdateStatus={(id, status) => updateStatusMutation.mutate({ orderId: id, nextStatus: status })}
                    isStatusPending={updateStatusMutation.isPending}
                    isDeliveryEnabled={restaurant?.settings?.isDeliveryEnabled !== false}
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
              staffAudio.play('click');
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
            orders={combinedOrders}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
