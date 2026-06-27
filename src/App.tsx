import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CustomerMenu from './apps/customer/CustomerMenu';
import OrderTrack from './apps/customer/OrderTrack';
import StaffLogin from './apps/staff/StaffLogin';
import StaffDashboard from './apps/staff/StaffDashboard';
import AdminLogin from './apps/admin/AdminLogin';
import AdminDashboard from './apps/admin/AdminDashboard';

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

        {/* Default Redirect to Staff Login */}
        <Route path="*" element={
          <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">عذراً، الصفحة غير موجودة</h2>
            <p className="text-dark-400 mb-6">تأكد من كتابة الرابط بشكل صحيح أو مسح رمز الطاولة مرة أخرى.</p>
            <a href="/staff/login" className="px-6 py-2.5 rounded-xl bg-primary-500 text-dark-950 font-bold hover:bg-primary-400 transition-colors">
              تسجيل دخول الموظفين
            </a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
