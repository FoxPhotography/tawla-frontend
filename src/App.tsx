import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ghost } from 'lucide-react';

import CustomerMenu from './apps/customer/CustomerMenu.js';
import OrderTrack from './apps/customer/OrderTrack.js';

const StaffLogin = React.lazy(() => import('./apps/staff/StaffLogin.js'));
const StaffDashboard = React.lazy(() => import('./apps/staff/StaffDashboard.js'));
const AdminDashboard = React.lazy(() => import('./apps/admin/AdminDashboard.js'));
const Register = React.lazy(() => import('./apps/admin/Register.js'));
const SuperAdminDashboard = React.lazy(() => import('./apps/super-admin/SuperAdminDashboard.js'));
const LandingPage = React.lazy(() => import('./apps/landing/LandingPage.js'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center noise" dir="rtl">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }>
        <Routes>
          {/* Root Route Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Customer Apps Routes */}
          <Route path="/menu/:restaurantSlug/table/:tableNumber" element={<CustomerMenu />} />
          <Route path="/menu/:restaurantSlug" element={<CustomerMenu />} />
          <Route path="/order/:orderId/track" element={<OrderTrack />} />

          {/* Unified Login Route */}
          <Route path="/login" element={<StaffLogin />} />

          {/* Staff Dashboard Routes */}
          <Route path="/staff" element={<StaffDashboard />} />

          {/* Admin Dashboard Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />

          {/* 404 Not Found */}
          <Route path="*" element={
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden noise" dir="rtl">
              {/* Background */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="glow-blob bg-emerald-200 top-1/4 -right-1/4 w-[400px] h-[400px]" />
                <div className="absolute inset-0 dot-pattern" />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mx-auto mb-6 shadow-sm"
                >
                  <Ghost className="w-9 h-9 text-stone-400" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-stone-900 mb-2">الصفحة غير موجودة</h2>
                <p className="text-stone-600 text-sm mb-8 max-w-sm mx-auto">
                  تأكد من كتابة الرابط بشكل صحيح أو مسح رمز الطاولة مرة أخرى
                </p>
                
                <div className="flex gap-3 justify-center">
                  <a href="/login" className="btn-primary flex items-center justify-center gap-2 px-6">
                    تسجيل الدخول للنظام
                  </a>
                </div>
              </motion.div>
            </div>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
