import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ghost } from 'lucide-react';
import CustomerMenu from './apps/customer/CustomerMenu';
import OrderTrack from './apps/customer/OrderTrack';
import StaffLogin from './apps/staff/StaffLogin';
import StaffDashboard from './apps/staff/StaffDashboard';
import AdminLogin from './apps/admin/AdminLogin';
import AdminDashboard from './apps/admin/AdminDashboard';
import Register from './apps/admin/Register';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Apps Routes */}
        <Route path="/menu/:restaurantSlug/table/:tableNumber" element={<CustomerMenu />} />
        <Route path="/order/:orderId/track" element={<OrderTrack />} />

        {/* Staff Dashboard Routes */}
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff" element={<StaffDashboard />} />

        {/* Admin Dashboard Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/register" element={<Register />} />

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
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/staff/login" className="btn-primary flex items-center justify-center gap-2">
                  تسجيل دخول الموظفين
                </a>
                <a href="/admin/login" className="btn-ghost flex items-center justify-center gap-2">
                  لوحة المدير
                </a>
              </div>
            </motion.div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
