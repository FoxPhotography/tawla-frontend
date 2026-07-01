import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { 
  FolderPlus, ShoppingBag, MapPin, BarChart3, LogOut, Crown, Users, ClipboardList
} from 'lucide-react';

import { useAuthStore } from '../../shared/store/authStore';
import CategoriesTab from './components/CategoriesTab.js';
import ProductsTab from './components/ProductsTab.js';
import TablesTab from './components/TablesTab.js';
import OrdersTab from './components/OrdersTab.js';
import AnalyticsTab from './components/AnalyticsTab.js';
import SubscriptionTab from './components/SubscriptionTab.js';
import StaffTab from './components/StaffTab.js';
import AuditLogsTab from './components/AuditLogsTab.js';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, restaurant, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'tables' | 'orders' | 'analytics' | 'subscription' | 'staff' | 'audit'>('categories');

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const plan = restaurant?.subscription?.plan || 'trial';

  // Navigation Items
  const navItems = [
    { id: 'categories', label: 'التصنيفات', icon: FolderPlus },
    { id: 'products', label: 'المنتجات', icon: ShoppingBag },
    { id: 'tables', label: 'الطاولات & QR', icon: MapPin },
    { id: 'orders', label: 'أرشيف الطلبات', icon: ClipboardList },
    { id: 'analytics', label: 'التقارير والتحليلات', icon: BarChart3, premium: true },
    { id: 'audit', label: 'سجلات العمليات', icon: ClipboardList, premium: true },
    { id: 'subscription', label: 'الاشتراك والنظام', icon: Crown },
    { id: 'staff', label: 'حسابات الموظفين', icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col md:flex-row text-right" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#09090B] border-l border-white/5 flex flex-col justify-between p-6 flex-shrink-0 text-white">
        <div className="space-y-8">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 pb-6 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-admin-accent to-orange-500 flex items-center justify-center text-white font-black shadow-md shadow-admin-accent/20">
              T
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide">{restaurant?.name || 'لوحة المدير'}</h1>
              <span className="text-[10px] text-zinc-400 font-bold">باقة: <span className="text-admin-accent uppercase">{plan}</span></span>
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
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.premium && plan !== 'pro' && (
                    <span className="text-[8px] bg-admin-accent/20 text-admin-accent px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="pt-6 border-t border-white/5 mt-8 flex justify-between items-center">
          <div className="text-[10px] text-zinc-500 font-semibold">
            <div>مرحباً، {user?.name}</div>
            <div className="mt-0.5 text-zinc-600">الدور: مدير النظام</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
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
