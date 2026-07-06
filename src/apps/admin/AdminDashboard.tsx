import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  FolderPlus, ShoppingBag, MapPin, BarChart3, LogOut, Crown, Users, ClipboardList, UserCheck
} from 'lucide-react';

import { useAuthStore } from '../../shared/store/authStore';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket.js';
import logoImg from '../../assets/newlogo.svg';
import CategoriesTab from './components/CategoriesTab.js';
import ProductsTab from './components/ProductsTab.js';
import TablesTab from './components/TablesTab.js';
import OrdersTab from './components/OrdersTab.js';
import AnalyticsTab from './components/AnalyticsTab.js';
import SubscriptionTab from './components/SubscriptionTab.js';
import StaffTab from './components/StaffTab.js';
import AuditLogsTab from './components/AuditLogsTab.js';
import CustomersTab from './components/CustomersTab.js';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, restaurant, logout, updateRestaurant } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'tables' | 'orders' | 'analytics' | 'subscription' | 'staff' | 'audit' | 'customers'>('categories');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const plan = restaurant?.subscription?.plan || 'trial';

  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/system-settings');
      return response.data.data;
    }
  });

  const isFeatureAllowed = (featureName: 'analytics' | 'audit' | 'delivery' | 'loyalty') => {
    if (!systemSettings) {
      return plan === 'pro';
    }
    const allowedPlans = systemSettings.features?.[featureName] || ['pro'];
    return allowedPlans.includes(plan);
  };

  useEffect(() => {
    if (!restaurant) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_restaurant', restaurant.id, (res: any) => {
      if (res && !res.success) {
        console.error('[Socket.io]: Failed to join restaurant room:', res.error);
      } else {
        console.log('[Socket.io]: Admin successfully joined restaurant room:', restaurant.id);
      }
    });

    const handleSettingsUpdate = () => {
      console.log('System settings updated via socket, invalidating queries in AdminDashboard...');
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    };

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

    socket.on('system_settings_updated', handleSettingsUpdate);
    socket.on('menu_updated', handleMenuUpdated);

    return () => {
      socket.off('system_settings_updated', handleSettingsUpdate);
      socket.off('menu_updated', handleMenuUpdated);
    };
  }, [restaurant, queryClient, updateRestaurant]);

  const navItems = [
    { id: 'categories', label: 'التصنيفات', icon: FolderPlus, premium: false },
    { id: 'products', label: 'المنتجات', icon: ShoppingBag, premium: false },
    { id: 'tables', label: 'الطاولات & QR', icon: MapPin, premium: false },
    { id: 'orders', label: 'أرشيف الطلبات', icon: ClipboardList, premium: false },
    { id: 'customers', label: 'العملاء والهدايا', icon: Users, premium: !isFeatureAllowed('loyalty') },
    { id: 'analytics', label: 'التقارير والتحليلات', icon: BarChart3, premium: !isFeatureAllowed('analytics') },
    { id: 'audit', label: 'سجلات العمليات', icon: ClipboardList, premium: !isFeatureAllowed('audit') },
    { id: 'subscription', label: 'الاشتراك والنظام', icon: Crown, premium: false },
    { id: 'staff', label: 'حسابات الموظفين', icon: UserCheck, premium: false },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col md:flex-row text-right" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-l border-zinc-200/80 flex flex-col justify-between p-6 flex-shrink-0 text-zinc-900">
        <div className="space-y-8">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 pb-6 border-b border-zinc-200/85">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200/80 flex items-center justify-center bg-white shadow-sm flex-shrink-0">
              <img src={logoImg} className="w-full h-full object-contain" alt="Logo" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-zinc-900">{restaurant?.name || 'لوحة المدير'}</h1>
              <span className="text-[10px] text-zinc-500 font-bold">باقة: <span className="text-admin-accent uppercase">{plan}</span></span>
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
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-admin-accent text-white shadow-lg shadow-admin-accent/15'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.premium && plan !== 'pro' && (
                    <span className="text-[8px] bg-admin-accent/10 text-admin-accent px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="pt-6 border-t border-zinc-200 mt-8 flex justify-between items-center">
          <div className="text-[10px] text-zinc-700 font-semibold">
            <div>مرحباً، {user?.name}</div>
            <div className="mt-0.5 text-zinc-500">الدور: مدير النظام</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-zinc-50 border border-zinc-250 text-zinc-500 hover:text-red-650 hover:bg-red-500/10 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 bg-admin-bg-base p-6 md:p-8 overflow-y-auto max-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'categories' && <CategoriesTab />}
            {activeTab === 'products' && <ProductsTab />}
            {activeTab === 'tables' && <TablesTab />}
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'customers' && <CustomersTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'audit' && <AuditLogsTab />}
            {activeTab === 'subscription' && <SubscriptionTab />}
            {activeTab === 'staff' && <StaffTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}
