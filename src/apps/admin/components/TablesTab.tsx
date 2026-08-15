import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PlusCircle, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import type { Table } from '../../../shared/types';

export default function TablesTab() {
  const queryClient = useQueryClient();

  const [tableNum, setTableNum] = useState('');
  const [tableLabel, setTableLabel] = useState('');

  // Fetch tables
  const { data: tables = [], isLoading: loadingTables } = useQuery({
    queryKey: ['admin-tables'],
    queryFn: async () => {
      const response = await api.get('/tables');
      return response.data.data as Table[];
    },
  });

  // Create Table Mutation
  const createTableMutation = useMutation({
    mutationFn: async () => {
      await api.post('/tables', { number: Number(tableNum), label: tableLabel });
    },
    onSuccess: () => {
      toast.success('تم إضافة الطاولة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
      setTableNum('');
      setTableLabel('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل إنشاء الطاولة.');
    },
  });

  // Delete Table Mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tables/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف الطاولة.');
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حذف الطاولة.');
    }
  });

  const handleCreateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNum.trim()) return toast.error('يرجى تحديد رقم الطاولة.');
    createTableMutation.mutate();
  };

  const handleDownloadQR = async (table: Table) => {
    try {
      const response = await fetch(table.qrCode.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-${table.number}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('فشل تحميل كود الـ QR.');
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-admin-text-primary">إدارة طاولات المطعم وأكواد الـ QR</h2>
        <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">
          {tables.length} طاولة مسجلة
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Table Creation Form (Sticky on scroll) */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-2xl p-6 shadow-admin-card space-y-5 h-fit lg:sticky lg:top-0 z-10 font-cairo">
          <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2 font-cairo">
            <PlusCircle className="w-4.5 h-4.5 text-admin-accent" />
            <span>إضافة طاولة جديدة</span>
          </h3>

          <form onSubmit={handleCreateTableSubmit} className="space-y-4 font-cairo">
            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold font-cairo">رقم الطاولة *</label>
              <input
                type="number"
                min="1"
                required
                value={tableNum}
                onChange={(e) => setTableNum(e.target.value)}
                placeholder="مثال: 5"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-xl px-3.5 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono font-bold shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold font-cairo">مسمى إضافي أو موقع (اختياري)</label>
              <input
                type="text"
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="مثال: بجوار النافذة، طابق 2"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-xl px-3.5 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-cairo shadow-2xs"
              />
            </div>

            <motion.button
              type="submit"
              disabled={createTableMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 bg-admin-accent text-white font-bold text-xs rounded-xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-admin-accent cursor-pointer font-cairo mt-2"
            >
              {createTableMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>إضافة الطاولة وتوليد QR</span>
              )}
            </motion.button>
          </form>
        </div>

        {/* Tables Grid */}
        <div className="col-span-1 lg:col-span-2 space-y-3">
          <h3 className="font-extrabold text-admin-text-primary text-sm">الطاولات الحالية وأكواد المسح</h3>
          {loadingTables ? (
            <div className="flex items-center justify-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl">
              <div className="w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl">
              <p className="text-xs text-admin-text-muted font-medium">لم يتم إضافة طاولات بعد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 font-cairo">
              {tables.map((table: Table) => (
                <div
                  key={table.id}
                  className="bg-admin-bg-elevated border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-admin-accent/30 transition-all gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-base text-admin-text-primary font-cairo">طاولة رقم {table.number}</h4>
                      {table.label && <p className="text-xs text-admin-text-secondary mt-0.5 font-bold font-cairo">{table.label}</p>}
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-lg mt-2 font-cairo ${
                        table.status === 'occupied' ? 'bg-[#801B2C]/10 text-[#801B2C]' : table.status === 'waitingBill' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {table.status === 'occupied' ? 'مشغولة' : table.status === 'waitingBill' ? 'تطلب الحساب' : 'متاحة'}
                      </span>
                    </div>

                    <button
                      onClick={() => { if (confirm(`هل أنت متأكد من حذف طاولة رقم ${table.number}؟`)) deleteTableMutation.mutate(table.id); }}
                      className="p-2 text-admin-text-secondary hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="حذف الطاولة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* QR Box with Luxury Rounded Preview */}
                  <div className="bg-admin-bg-subtle p-4 rounded-2xl flex flex-col items-center gap-3 border border-admin-border/60">
                    <div className="w-32 h-32 rounded-2xl bg-white p-2 border border-zinc-200/80 shadow-2xs flex items-center justify-center overflow-hidden">
                      <img src={table.qrCode.url} alt={`QR طاولة ${table.number}`} className="w-full h-full object-contain" />
                    </div>
                    <button
                      onClick={() => handleDownloadQR(table)}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold text-admin-text-primary bg-admin-bg-elevated hover:bg-[#801B2C] hover:text-white border border-admin-border hover:border-[#801B2C] py-2 px-3 rounded-xl transition-all cursor-pointer shadow-xs font-cairo"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل كود QR</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
