import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Search, CheckCircle2, XCircle, Clock, AlertCircle, 
  Smartphone, Wallet, RefreshCw, Copy, Check, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import ConfirmModal from '../../../shared/components/ConfirmModal';

export default function TransactionsTab() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');
  const [filterGateway, setFilterGateway] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingTx, setApprovingTx] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Fetch Transactions
  const { data: rawData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['super-admin-transactions'],
    queryFn: async () => {
      const response = await api.get('/super-admin/transactions');
      const d = response.data?.data;
      return Array.isArray(d?.transactions) ? d.transactions : Array.isArray(d) ? d : [];
    },
    refetchInterval: 15000, // Auto refresh every 15s for pending payments
  });

  const transactions: any[] = Array.isArray(rawData) ? rawData : [];

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/super-admin/transactions/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم قبول المعاملة وتفعيل اشتراك المطعم بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل قبول المعاملة وتفعيل الاشتراك.');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.post(`/super-admin/transactions/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم رفض المعاملة بنجاح.');
      setRejectingId(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['super-admin-transactions'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل رفض المعاملة.');
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    toast.success('تم النسخ!');
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleApprove = (tx: any) => {
    setApprovingTx(tx);
  };

  const handleConfirmReject = () => {
    if (!rejectingId) return;
    rejectMutation.mutate({ id: rejectingId, reason: rejectReason.trim() || undefined });
  };

  // Filtered list
  const filtered = transactions.filter((t: any) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterGateway !== 'all' && t.paymentGateway !== filterGateway) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const restName = (t.restaurantId?.name || '').toLowerCase();
    const restPhone = (t.restaurantId?.phone || '').toLowerCase();
    const inv = (t.invoiceId || '').toLowerCase();
    const contact = (t.senderContact || '').toLowerCase();
    const ref = (t.senderReference || '').toLowerCase();

    return restName.includes(q) || restPhone.includes(q) || inv.includes(q) || contact.includes(q) || ref.includes(q);
  });

  // Stats
  const pendingCount = transactions.filter((t: any) => t.status === 'pending').length;
  const paidCount = transactions.filter((t: any) => t.status === 'paid').length;
  const totalAmountPaid = transactions
    .filter((t: any) => t.status === 'paid')
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

  const getGatewayBadge = (gw: string) => {
    switch (gw) {
      case 'vodafone_cash':
        return { label: 'فودافون كاش', icon: Smartphone, bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'instapay':
        return { label: 'إنستاباي (InstaPay)', icon: CreditCard, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'paypal':
        return { label: 'PayPal', icon: Wallet, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'fawaterk':
        return { label: 'فواتيرك (بطاقات)', icon: CreditCard, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: 'تحويل يدوي', icon: CreditCard, bg: 'bg-zinc-50 text-zinc-700 border-zinc-200' };
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500">معاملات بانتظار التأكيد (Pending)</span>
            <div className="text-2xl font-black text-amber-600 mt-1 font-mono flex items-center gap-2">
              <span>{pendingCount}</span>
              {pendingCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold animate-pulse">
                  تحتاج مراجعة
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500">الاشتراكات المفعلة والمحصلة</span>
            <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              {paidCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500">إجمالي المبالغ المحصلة</span>
            <div className="text-2xl font-black text-[#801B2C] mt-1 font-mono">
              {totalAmountPaid.toLocaleString()} <span className="text-xs text-zinc-500 font-sans">ج.م</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#801B2C]/10 border border-[#801B2C]/20 flex items-center justify-center text-[#801B2C]">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم المطعم، هاتف المحفظة، أو كود العملية..."
              className="w-full pl-4 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#801B2C] transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'pending', label: `المعلقة (${pendingCount})` },
              { id: 'paid', label: 'المقبولة' },
              { id: 'rejected', label: 'المرفوضة' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === st.id
                    ? 'bg-[#801B2C] text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                {st.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="p-2.5 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Gateway Selector */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 text-xs">
          <span className="text-zinc-500 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>بوابة الدفع:</span>
          </span>
          {[
            { id: 'all', label: 'كافة الطرق' },
            { id: 'vodafone_cash', label: 'فودافون كاش' },
            { id: 'instapay', label: 'إنستاباي (InstaPay)' },
            { id: 'paypal', label: 'PayPal' },
            { id: 'fawaterk', label: 'فواتيرك' },
          ].map((gw) => (
            <button
              key={gw.id}
              type="button"
              onClick={() => setFilterGateway(gw.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                filterGateway === gw.id
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {gw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List / Table */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#801B2C] border-t-transparent rounded-full animate-spin" />
            <span>جاري تحميل المعاملات المالية...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="font-bold">لا توجد أي معاملات مسجلة مطابقة لمعايير البحث الحالية.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                <tr>
                  <th className="p-4">الفاتورة والتاريخ</th>
                  <th className="p-4">المطعم والمسؤول</th>
                  <th className="p-4">الباقة والدورة</th>
                  <th className="p-4">القيمة</th>
                  <th className="p-4">وسيلة الدفع</th>
                  <th className="p-4">بيانات التحويل (المرسل)</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((tx: any) => {
                  const gw = getGatewayBadge(tx.paymentGateway);
                  const GwIcon = gw.icon;
                  const dateStr = new Date(tx.createdAt).toLocaleString('ar-EG', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  });

                  return (
                    <tr key={tx._id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Invoice ID & Date */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-zinc-900">{tx.invoiceId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.invoiceId, `inv_${tx._id}`)}
                            className="text-zinc-400 hover:text-zinc-600 p-0.5"
                            title="نسخ رقم الفاتورة"
                          >
                            {copiedText === `inv_${tx._id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-bold mt-1">{dateStr}</div>
                      </td>

                      {/* Restaurant info */}
                      <td className="p-4">
                        <div className="font-black text-zinc-900">
                          {tx.restaurantId?.name || 'مطعم غير محدد'}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {tx.restaurantId?.phone || '-'}
                        </div>
                      </td>

                      {/* Plan & Cycle */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                            tx.plan === 'pro' ? 'bg-[#801B2C]/10 text-[#801B2C]' : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {tx.plan === 'pro' ? 'PRO' : 'BASIC'}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-bold">
                            ({tx.billingCycle === 'annual' ? 'سنوي' : 'شهري'})
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-4">
                        <span className="font-black text-zinc-900 font-mono text-sm">
                          {(tx.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-zinc-500 mr-1 font-bold">ج.م</span>
                      </td>

                      {/* Payment Gateway */}
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${gw.bg}`}>
                          <GwIcon className="w-3.5 h-3.5" />
                          <span>{gw.label}</span>
                        </div>
                      </td>

                      {/* Sender details */}
                      <td className="p-4">
                        {tx.senderContact || tx.senderReference ? (
                          <div className="space-y-1">
                            {tx.senderContact && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-zinc-400 font-bold">المحول:</span>
                                <span className="font-mono font-bold text-zinc-800 select-all">{tx.senderContact}</span>
                              </div>
                            )}
                            {tx.senderReference && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-zinc-400 font-bold">كود/Ref:</span>
                                <span className="font-mono font-bold text-zinc-800 select-all">{tx.senderReference}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {tx.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>بانتظار التأكيد</span>
                          </span>
                        )}
                        {tx.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مقبولة ومفعلة</span>
                          </span>
                        )}
                        {tx.status === 'rejected' && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>مرفوضة</span>
                            </span>
                            {tx.rejectionReason && (
                              <div className="text-[10px] text-rose-600 max-w-[150px] truncate" title={tx.rejectionReason}>
                                {tx.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}
                        {tx.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[11px] font-bold">
                            <span>فشلت</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        {tx.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(tx)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تفعيل وقبول</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(tx._id);
                                setRejectReason('');
                              }}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رفض</span>
                            </button>
                          </div>
                        ) : tx.status === 'paid' ? (
                          <span className="text-[10px] text-zinc-400 font-bold">
                            {tx.approvedAt ? `تم التفعيل ${new Date(tx.approvedAt).toLocaleDateString('ar-EG')}` : 'مفعل'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4 text-right"
              dir="rtl"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-zinc-900 text-sm">رفض المعاملة المالية</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">يمكنك كتابة سبب الرفض ليظهر في السجل</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5">
                  سبب الرفض (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: لم يتم استلام المبلغ على المحفظة، أو رقم العملية غير مطابق..."
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={rejectMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {rejectMutation.isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>تأكيد الرفض</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={!!approvingTx}
        onClose={() => setApprovingTx(null)}
        onConfirm={() => {
          if (approvingTx) {
            approveMutation.mutate(approvingTx._id);
            setApprovingTx(null);
          }
        }}
        title="تأكيد قبول المعاملة وتفعيل الاشتراك"
        message={`هل أنت متأكد من مراجعة وقبول الفاتورة (${approvingTx?.invoiceId}) وتفعيل اشتراك المطعم فوراً؟`}
        confirmText="تأكيد واعتماد الاشتراك الآن"
        cancelText="تراجع وإلغاء"
        variant="success"
        isLoading={approveMutation.isPending}
      >
        {approvingTx && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-2.5 text-xs text-zinc-900">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200/80">
              <span className="text-zinc-500 font-bold">المطعم:</span>
              <span className="font-black text-zinc-900">{approvingTx.restaurantId?.name || 'مطعم غير محدد'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200/80">
              <span className="text-zinc-500 font-bold">قيمة الفاتورة:</span>
              <span className="font-mono font-black text-emerald-600 text-sm">
                {(approvingTx.amount || 0).toLocaleString()} ج.م
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200/80">
              <span className="text-zinc-500 font-bold">طريقة الدفع:</span>
              <span className="font-bold text-zinc-800">
                {approvingTx.paymentGateway === 'vodafone_cash' ? 'فودافون كاش' : approvingTx.paymentGateway === 'instapay' ? 'إنستاباي (InstaPay)' : approvingTx.paymentGateway === 'paypal' ? 'PayPal' : 'فواتيرك'}
              </span>
            </div>
            {approvingTx.senderContact && (
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200/80">
                <span className="text-zinc-500 font-bold">بيانات المحوّل:</span>
                <span className="font-mono font-bold text-zinc-900 select-all">{approvingTx.senderContact}</span>
              </div>
            )}
            {approvingTx.senderReference && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-bold">كود العملية / الرقم المرجعي:</span>
                <span className="font-mono font-bold text-zinc-900 select-all">{approvingTx.senderReference}</span>
              </div>
            )}
          </div>
        )}
      </ConfirmModal>
      </AnimatePresence>
    </div>
  );
}
