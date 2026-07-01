import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { api } from '../../../shared/services/api';
import type { Order } from '../../../shared/types';
import CustomSelect from './CustomSelect.js';

export default function OrdersTab() {
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');

  // Fetch orders with queries
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', orderStatusFilter, orderStartDate, orderEndDate],
    queryFn: async () => {
      let url = '/orders?';
      if (orderStatusFilter) url += `status=${orderStatusFilter}&`;
      if (orderStartDate) url += `startDate=${orderStartDate}&`;
      if (orderEndDate) url += `endDate=${orderEndDate}&`;
      
      const response = await api.get(url);
      return response.data.data as Order[];
    },
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-admin-text-primary">سجل وأرشيف الطلبات الكلي</h2>
        <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">
          إجمالي النتائج: {orders.length} طلب
        </span>
      </div>

      {/* Filters bar */}
      <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 flex flex-wrap gap-4 items-end shadow-admin-card">
        <div className="space-y-1.5">
          <label className="block text-xs text-admin-text-secondary font-bold">حالة الطلب</label>
          <CustomSelect
            value={orderStatusFilter}
            onChange={(val) => setOrderStatusFilter(val)}
            options={[
              { value: '', label: 'كل الحالات' },
              { value: 'pending', label: 'قيد الانتظار' },
              { value: 'accepted', label: 'مقبول' },
              { value: 'preparing', label: 'قيد التحضير' },
              { value: 'ready', label: 'جاهز للاستلام' },
              { value: 'delivered', label: 'تم التوصيل' },
              { value: 'cancelled', label: 'ملغي' }
            ]}
            placeholder="كل الحالات"
            className="w-40 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-admin-text-secondary font-bold">من تاريخ</label>
          <input
            type="date"
            value={orderStartDate}
            onChange={(e) => setOrderStartDate(e.target.value)}
            className="bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-3 py-2 text-xs focus:border-admin-accent focus:outline-none transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-admin-text-secondary font-bold">إلى تاريخ</label>
          <input
            type="date"
            value={orderEndDate}
            onChange={(e) => setOrderEndDate(e.target.value)}
            className="bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-3 py-2 text-xs focus:border-admin-accent focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl">
            <div className="w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-16 text-center text-admin-text-muted shadow-admin-card">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30 text-admin-text-muted" />
            <p className="text-sm font-medium">لا توجد طلبات تطابق معايير التصفية.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-6 hover:border-admin-accent/20 transition-all shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] text-admin-text-secondary font-mono bg-admin-bg-subtle border border-admin-border px-2 py-0.5 rounded-md font-bold">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                      order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                      order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      <span>
                        {order.status === 'delivered' ? 'تم التوصيل' :
                         order.status === 'cancelled' ? 'ملغي' : 'نشط / قيد التحضير'}
                      </span>
                    </span>
                  </div>
                  <h4 className="font-extrabold text-admin-text-primary text-sm">
                    {order.type === 'dine_in' ? `طاولة رقم ${order.tableNumber}` : order.type === 'takeaway' ? 'تيك أواي / استلام' : 'توصيل للمنزل'}
                  </h4>
                  <p className="text-[10px] text-admin-text-secondary font-bold">
                    {new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>

                <div className="flex-1 max-w-md space-y-1.5">
                  {order.items.map((item, iIdx) => (
                    <div key={iIdx} className="text-xs text-admin-text-secondary font-semibold">
                      <div className="flex items-center justify-between">
                        <span>{item.name} <strong className="text-admin-text-primary">(x{item.quantity})</strong></span>
                        <span className="font-mono text-zinc-500">{item.price * item.quantity} ج.م</span>
                      </div>
                      
                      {/* Render custom choices if exist */}
                      {((item.selectedOptions && item.selectedOptions.length > 0) || 
                        (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                        <div className="flex flex-wrap gap-1.5 mt-1 mr-4 text-[9px] text-admin-text-muted">
                          {item.selectedOptions?.map((o, optIdx) => (
                            <span key={optIdx} className="bg-admin-bg-subtle px-1 rounded">
                              {o.name}: {o.value}
                            </span>
                          ))}
                          {item.selectedModifiers?.map((m, modIdx) => (
                            <span key={modIdx} className="bg-orange-500/5 text-orange-600/90 px-1 rounded">
                              {m.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-left font-black text-admin-accent text-base whitespace-nowrap">
                  {order.totalAmount} ج.م
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
