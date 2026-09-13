import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, LogOut, Coffee, Sliders, CreditCard
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import { useAuthStore } from '../../shared/store/authStore';
import type { SerialKey } from '../../shared/types';
import logoImg from '../../assets/TAWLA_Logo.png';

// Sub-components
import StatsGrid from './components/StatsGrid';
import RestaurantsTab from './components/RestaurantsTab';
import SerialsTab from './components/SerialsTab';
import SettingsTab from './components/SettingsTab';
import TransactionsTab from './components/TransactionsTab';
import RestaurantDetailsModal from './components/RestaurantDetailsModal';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, token: currentToken, logout } = useAuthStore();
  
  const urlTab = (searchParams.get('tab') as any) || 'restaurants';
  const [activeTab, setActiveTab] = useState<'restaurants' | 'serials' | 'settings' | 'transactions'>(
    ['restaurants', 'transactions', 'serials', 'settings'].includes(urlTab) ? urlTab : 'restaurants'
  );
  const [selectedRest, setSelectedRest] = useState<any | null>(null);

  const handleTabChange = (tabId: 'restaurants' | 'serials' | 'settings' | 'transactions') => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Redirect if not super_admin
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'super_admin') {
      toast.error('غير مصرح لك بدخول لوحة تحكم مطور النظام.');
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Audio chime function for real-time alerts
  const playAlertChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      // High-end pleasant two-tone chime (F5 -> A5 -> C6)
      [698.46, 880, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.25, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.45);
      });
    } catch (e) {
      console.warn('Audio chime notice:', e);
    }
  };

  // Socket Connection for Real-Time Super Admin Updates
  useEffect(() => {
    if (!user || user.role !== 'super_admin') return;

    if (currentToken) {
      socket.auth = { token: currentToken };
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_super_admin', { token: currentToken }, (res: any) => {
      if (res && !res.success) {
        console.warn('[Socket.io]: Failed to join super_admin room:', res.error);
      } else {
        console.log('[Socket.io]: Super Admin successfully joined super_admin room');
      }
    });

    // When a new subscription / payment transaction is submitted
    const handleNewTransaction = (data: any) => {
      console.log('[Socket.io]: New transaction received:', data);
      playAlertChime();
      const tx = data?.transaction || data;
      const amount = tx?.amount ? `${tx.amount} ج.م` : '';
      const invoice = tx?.invoiceId || '';
      const restName = tx?.restaurantName || tx?.restaurantId?.name || 'مطعم';
      
      toast.success(
        `🔔 وصل طلب اشتراك/تحويل جديد (${invoice}) بقيمة ${amount} من "${restName}"!`,
        { duration: 8000 }
      );

      // Invalidate queries so tables & badges update live without refresh
      queryClient.invalidateQueries({ queryKey: ['super-admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
    };

    // When a transaction status is updated (approved / rejected)
    const handleTransactionStatusUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
    };

    // When a new restaurant registers
    const handleNewRestaurant = (data: any) => {
      playAlertChime();
      const restName = data?.restaurant?.name || 'مطعم جديد';
      toast.success(`🏪 انضم مطعم جديد للمنصة: "${restName}"!`, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-transactions'] });
    };

    // When a customer order is created
    const handleSuperAdminNewOrder = () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
    };

    socket.on('new_transaction', handleNewTransaction);
    socket.on('super_admin_transaction_created', handleNewTransaction);
    socket.on('transaction_status_updated', handleTransactionStatusUpdated);
    socket.on('new_restaurant', handleNewRestaurant);
    socket.on('super_admin_new_order', handleSuperAdminNewOrder);

    return () => {
      socket.off('new_transaction', handleNewTransaction);
      socket.off('super_admin_transaction_created', handleNewTransaction);
      socket.off('transaction_status_updated', handleTransactionStatusUpdated);
      socket.off('new_restaurant', handleNewRestaurant);
      socket.off('super_admin_new_order', handleSuperAdminNewOrder);
    };
  }, [user, currentToken, queryClient]);

  // Queries
  const { data: restaurants = [], isLoading: loadingRest } = useQuery({
    queryKey: ['super-admin-restaurants'],
    queryFn: async () => {
      const response = await api.get('/super-admin/restaurants');
      return response.data.data;
    },
  });

  const { data: serialKeys = [], isLoading: loadingSerials } = useQuery({
    queryKey: ['super-admin-serials'],
    queryFn: async () => {
      const response = await api.get('/super-admin/serials');
      return response.data.data as SerialKey[];
    },
  });

  const { data: systemSettings } = useQuery({
    queryKey: ['super-admin-system-settings'],
    queryFn: async () => {
      const response = await api.get('/system-settings');
      return response.data.data;
    },
  });

  // Query transactions for live pending badge
  const { data: txQueryData } = useQuery({
    queryKey: ['super-admin-transactions'],
    queryFn: async () => {
      const response = await api.get('/super-admin/transactions');
      const d = response.data?.data;
      return Array.isArray(d?.transactions) ? d.transactions : Array.isArray(d) ? d : [];
    },
    refetchInterval: 10000,
  });
  const pendingTxCount = (txQueryData || []).filter((t: any) => t.status === 'pending').length;

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const totalRestaurantsCount = restaurants.length;
  const activeSubscriptionsCount = restaurants.filter((r: any) => {
    const expires = new Date(r.subscription?.expiresAt);
    return expires > new Date() && r.subscription?.status !== 'expired';
  }).length;
  const totalSerialsCount = serialKeys.length;
  const unusedSerialsCount = serialKeys.filter((k: any) => !k.isUsed).length;

  const navItems = [
    { id: 'restaurants' as const, label: 'الاشتراكات والمطاعم', icon: Coffee },
    { id: 'transactions' as const, label: 'المدفوعات والتحويلات', icon: CreditCard },
    { id: 'serials' as const, label: 'أكواد التفعيل (Serials)', icon: Key },
    { id: 'settings' as const, label: 'إعدادات المنصة والأسعار', icon: Sliders }
  ] as const;

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col md:flex-row text-right" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-l border-zinc-200/80 flex flex-col justify-between p-6 flex-shrink-0 text-zinc-900">
        <div className="space-y-8">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 pb-6 border-b border-zinc-200/85">
            <img 
              src={logoImg} 
              className="h-10 w-auto max-w-[110px] object-contain flex-shrink-0" 
              alt="Tawla Logo" 
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-black tracking-wide text-zinc-900">Tawla SuperAdmin</h1>
              <span className="text-[10px] text-zinc-500 font-bold">الدور: <span className="text-[#801B2C] font-black uppercase">مشرف النظام</span></span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#801B2C] text-white shadow-lg shadow-[#801B2C]/20'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'transactions' && pendingTxCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                      {pendingTxCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="pt-6 border-t border-zinc-200 mt-8 flex justify-between items-center">
          <div className="text-[10px] text-zinc-700 font-bold">
            <div>مرحبا ابراهيم</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 bg-zinc-50 p-6 md:p-8 overflow-y-auto max-h-screen space-y-6">
        {/* Statistics Grid */}
        <StatsGrid 
          restaurantsCount={totalRestaurantsCount}
          activeSubscriptionsCount={activeSubscriptionsCount}
          totalSerialsCount={totalSerialsCount}
          unusedSerialsCount={unusedSerialsCount}
          loadingRest={loadingRest}
          loadingSerials={loadingSerials}
          pendingTxCount={pendingTxCount}
          onOpenTransactions={() => handleTabChange('transactions')}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'restaurants' && (
              <RestaurantsTab 
                restaurants={restaurants}
                loadingRest={loadingRest}
                onOpenRestDetails={setSelectedRest}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsTab />
            )}

            {activeTab === 'serials' && (
              <SerialsTab 
                serialKeys={serialKeys}
                loadingSerials={loadingSerials}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab 
                systemSettings={systemSettings}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Details & Edit Restaurant Modal */}
      <AnimatePresence>
        {selectedRest && (
          <RestaurantDetailsModal 
            rest={selectedRest}
            onClose={() => setSelectedRest(null)}
          />
        )}
      </AnimatePresence>

      <Toaster position="top-center" toastOptions={{
        style: { background: '#ffffff', color: '#09090B', border: '1px solid rgba(0,0,0,0.08)' }
      }} />
    </div>
  );
}
