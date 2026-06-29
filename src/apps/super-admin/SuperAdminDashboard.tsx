import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, LogOut, Coffee, ShieldAlert, Sliders, QrCode
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';
import type { SerialKey } from '../../shared/types';

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
      navigate('/admin/login');
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
    navigate('/admin/login');
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500/30 select-none outline-none" dir="rtl">
      {/* Decorative Blur Background Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[-5%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[150px] pointer-events-none z-0" />

      <Toaster position="top-center" toastOptions={{
        style: { 
          background: 'rgba(15, 23, 42, 0.97)', 
          color: '#f8fafc', 
          border: '1px solid rgba(99, 102, 241, 0.12)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          fontSize: '13px',
          fontWeight: 'bold'
        }
      }} />

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-5 px-6 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3.5">
          <motion.div 
            initial={{ rotate: -15, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220 }}
            className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-600/15 overflow-hidden"
          >
            <QrCode className="w-6 h-6 text-indigo-400" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent">
                Tawla OS SuperAdmin
              </h1>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 tracking-wider uppercase">
                System Suite
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-bold">لوحة التحكم والمراقبة العامة للبنية التحتية للاشتراكات والتراخيص</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="hidden md:flex flex-col text-left pr-3.5 border-r border-slate-800">
            <span className="text-xs font-black text-slate-200">{user?.name}</span>
            <span className="text-[10px] text-indigo-400 font-mono">@{user?.username}</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 hover:text-white hover:bg-red-650 hover:border-red-500 transition-all outline-none focus:outline-none cursor-pointer font-black text-xs"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4 inline-block ml-1.5" />
            <span>تسجيل الخروج</span>
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 z-10">
        
        {/* Statistics Grid */}
        <StatsGrid 
          restaurantsCount={totalRestaurantsCount}
          activeSubscriptionsCount={activeSubscriptionsCount}
          totalSerialsCount={totalSerialsCount}
          unusedSerialsCount={unusedSerialsCount}
          loadingRest={loadingRest}
          loadingSerials={loadingSerials}
        />

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Sidebar Nav */}
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 space-y-1.5 shadow-md">
              {[
                { key: 'restaurants' as const, label: 'الاشتراكات والمطاعم', icon: Coffee },
                { key: 'serials' as const, label: 'أكواد التفعيل (Serials)', icon: Key },
                { key: 'settings' as const, label: 'إعدادات المنصة والأسعار', icon: Sliders }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black transition-all border outline-none focus:outline-none relative overflow-hidden group cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-indigo-600 border-indigo-500/20 text-white shadow-lg shadow-indigo-600/15'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div 
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 filter blur-sm"
                    />
                  )}
                  <tab.icon className={`w-4.5 h-4.5 flex-shrink-0 relative z-10 ${activeTab === tab.key ? 'text-indigo-300' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <h4 className="font-black flex items-center gap-2 mb-2.5 text-indigo-400 text-sm">
                <ShieldAlert className="w-4.5 h-4.5 text-indigo-400" />
                <span>إرشادات الإدارة والأمان</span>
              </h4>
              <p className="font-bold text-slate-350">
                الرابط الفريد (Slug) هو العنوان الذي يظهر في روابط الـ QR، احرص على أن يحتوي على أحرف إنجليزية وأرقام وعلامة (-) فقط.
              </p>
              <p className="mt-2.5 font-bold text-slate-355">
                توليد الترخيص يتم عبر توليد كود فريد بصلاحية محددة. لا تكشف الأكواد لأي شخص خارج النظام قبل استلام الدفعة.
              </p>
            </motion.div>
          </aside>

          {/* Tab Content Panel */}
          <main className="lg:col-span-3 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
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
        </div>
      </div>

      {/* Details & Edit Restaurant Modal */}
      <AnimatePresence>
        {selectedRest && (
          <RestaurantDetailsModal 
            rest={selectedRest}
            onClose={() => setSelectedRest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
