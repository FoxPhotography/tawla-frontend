import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import { ShieldAlert, ChevronLeft, ChevronRight, User } from 'lucide-react';

export default function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery<{ logs: any[]; total: number }>({
    queryKey: ['admin-audit-logs', page],
    queryFn: async () => {
      const response = await api.get(`/analytics/audit-logs?page=${page}&limit=${limit}`);
      return response.data.data;
    },
    placeholderData: (prev) => prev,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (action.includes('CREATE')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (action.includes('UPDATE') || action.includes('TOGGLE')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-zinc-800 text-zinc-300';
  };

  const getActionTextAr = (action: string) => {
    switch (action) {
      case 'CREATE_PRODUCT': return 'إضافة منتج';
      case 'UPDATE_PRODUCT': return 'تعديل منتج';
      case 'DELETE_PRODUCT': return 'حذف منتج';
      case 'TOGGLE_PRODUCT': return 'تغيير إتاحة منتج';
      case 'CREATE_CATEGORY': return 'إضافة تصنيف';
      case 'UPDATE_CATEGORY': return 'تعديل تصنيف';
      case 'DELETE_CATEGORY': return 'حذف تصنيف';
      case 'EMPTY_TABLE': return 'إنهاء جلسة طاولة';
      case 'CREATE_STAFF': return 'إضافة موظف';
      case 'UPDATE_STAFF': return 'تعديل موظف';
      case 'DELETE_STAFF': return 'حذف موظف';
      default: return action;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-admin-text-primary">سجل العمليات والرقابة (Audit Logs)</h2>
          <p className="text-xs text-admin-text-secondary mt-1">سجل تفصيلي بكافة التعديلات الإدارية لمنع التلاعب والسرقة الداخلية</p>
        </div>
        <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">
          إجمالي العمليات: {total}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl">
          <span className="text-sm text-admin-text-secondary">جاري تحميل سجل العمليات...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-admin-bg-subtle flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6 text-admin-text-muted" />
          </div>
          <p className="text-sm font-bold text-admin-text-secondary">لا توجد عمليات مسجلة حالياً</p>
        </div>
      ) : (
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl overflow-hidden shadow-admin-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-admin-bg-subtle border-b border-admin-border text-xs font-semibold text-admin-text-muted">
                  <th className="px-6 py-4 text-right">المستخدم / الدور</th>
                  <th className="px-6 py-4 text-right">العملية</th>
                  <th className="px-6 py-4 text-right">التفاصيل</th>
                  <th className="px-6 py-4 text-right">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border text-admin-text-primary">
                {logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-admin-bg-subtle/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs">{log.userName}</div>
                          <div className="text-[10px] text-zinc-500 font-bold">{log.userRole === 'admin' ? 'مدير النظام' : 'موظف كاشير'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${getActionColor(log.action)}`}>
                        {getActionTextAr(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-admin-text-secondary leading-relaxed">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[11px] text-admin-text-muted font-mono">
                      {new Date(log.createdAt).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 bg-admin-bg-subtle border-t border-admin-border">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 bg-white hover:bg-zinc-50 disabled:opacity-50 text-xs font-bold text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
              <span className="text-xs font-bold text-admin-text-secondary">
                صفحة {page} من {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 bg-white hover:bg-zinc-50 disabled:opacity-50 text-xs font-bold text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
