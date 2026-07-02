import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, LogOut, Coffee, Sliders
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';
import type { SerialKey } from '../../shared/types';
import logoImg from '../../assets/newlogo.svg';

// Sub-components
import StatsGrid from './components/StatsGrid';
import RestaurantsTab from './components/RestaurantsTab';
import SerialsTab from './components/SerialsTab';
import SettingsTab from './components/SettingsTab';
import RestaurantDetailsModal from './components/RestaurantDetailsModal';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'restaurants' | 'serials' | 'settings'>('restaurants');
  const [selectedRest, setSelectedRest] = useState<any | null>(null);

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
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200/80 flex items-center justify-center bg-white shadow-sm flex-shrink-0">
              <img src={logoImg} className="w-full h-full object-contain" alt="Logo" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-zinc-900">Tawla OS SuperAdmin</h1>
              <span className="text-[10px] text-zinc-500 font-bold">الدور: <span className="text-indigo-600 font-black uppercase">مشرف النظام</span></span>
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
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
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
