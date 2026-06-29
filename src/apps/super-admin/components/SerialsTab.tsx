import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Key, Activity, Sliders, Calendar, Copy, Check, ShieldCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import type { SerialKey } from '../../../shared/types';
import CustomSelect from '../CustomSelect';

interface SerialsTabProps {
  serialKeys: SerialKey[];
  loadingSerials: boolean;
}

export default function SerialsTab({ serialKeys, loadingSerials }: SerialsTabProps) {
  const queryClient = useQueryClient();

  // Form states
  const [serialPlan, setSerialPlan] = useState<'trial' | 'basic' | 'pro'>('basic');
  const [serialDuration, setSerialDuration] = useState('30');
  const [customDays, setCustomDays] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Mutation
  const generateSerialMutation = useMutation({
    mutationFn: async () => {
      const days = serialDuration === 'custom' ? Number(customDays) : Number(serialDuration);
      return api.post('/super-admin/serials/generate', { plan: serialPlan, durationDays: days });
    },
    onSuccess: (res) => {
      toast.success('تم توليد كود التفعيل بنجاح!');
      setGeneratedKey(res.data.data.key);
      queryClient.invalidateQueries({ queryKey: ['super-admin-serials'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل توليد الكود.');
    },
  });

  const handleGenerateSerial = (e: React.FormEvent) => {
    e.preventDefault();
    const days = serialDuration === 'custom' ? Number(customDays) : Number(serialDuration);
    if (!days || days <= 0) {
      toast.error('يرجى تحديد مدة اشتراك صالحة بالأيام.');
      return;
    }
    generateSerialMutation.mutate();
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('تم نسخ الكود للحافظة.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const planOptions = [
    { value: 'trial', label: 'TRIAL (فترة تجريبية 30 يوم)' },
    { value: 'basic', label: 'BASIC (الباقة الأساسية)' },
    { value: 'pro', label: 'PRO (الباقة الاحترافية المتكاملة)' }
  ];

  const durationOptions = [
    { value: '30', label: '30 يوماً (شهر كامل)' },
    { value: '90', label: '90 يوماً (3 أشهر)' },
    { value: '180', label: '180 يوماً (6 أشهر)' },
    { value: '365', label: '365 يوماً (سنة كاملة)' },
    { value: 'custom', label: 'إدخال عدد أيام مخصص...' }
  ];

  const listContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: 25, scale: 0.95, rotateX: -6 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      rotateX: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 12 } 
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Serial Key Generator */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative overflow-hidden self-start">
          <div className="absolute top-0 left-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-base font-black text-white mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Key className="w-5 h-5 animate-pulse" />
            </div>
            <span>توليد كود ترخيص جديد</span>
          </h2>

          <form onSubmit={handleGenerateSerial} className="space-y-5 outline-none">
            <div className="space-y-2">
              <CustomSelect
                value={serialPlan}
                onChange={(val) => setSerialPlan(val as any)}
                options={planOptions}
                label="نوع باقة الترخيص *"
              />
            </div>

            <div className="space-y-2">
              <CustomSelect
                value={serialDuration}
                onChange={(val) => setSerialDuration(val)}
                options={durationOptions}
                label="مدة الترخيص بالكامل *"
              />
            </div>

            {serialDuration === 'custom' && (
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-300">عدد الأيام المطلوبة *</label>
                <input
                  type="number"
                  required
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="مثال: 180"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors outline-none font-bold"
                />
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(79, 70, 229, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={generateSerialMutation.isPending}
              className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-550 active:scale-98 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer border border-indigo-500/30 hover:border-indigo-500/50 outline-none focus:outline-none"
            >
              {generateSerialMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>توليد كود التفعيل المعتمد</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Generated Key Panel */}
          {generatedKey && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-5 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-3 shadow-inner"
            >
              <span className="text-xs text-slate-400 font-extrabold block">كود الترخيص الخاص بكافيه العميل جاهز:</span>
              <span className="text-sm font-mono font-black text-indigo-400 tracking-wider block bg-slate-900 border border-slate-800 py-2.5 rounded-lg select-all">
                {generatedKey}
              </span>
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-indigo-300 font-bold hover:text-white bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/30 rounded-lg px-4 py-2 transition-colors cursor-pointer outline-none focus:outline-none hover:scale-103 active:scale-97 w-full shadow-md"
              >
                {copiedKey === generatedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
                <span>{copiedKey === generatedKey ? 'تم النسخ بنجاح!' : 'نسخ كود التفعيل الفريد'}</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Generated Keys Logs */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-base font-black text-white mb-5 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-400" />
              <span>أرشيف التراخيص المصدرة</span>
            </span>
            <span className="text-xs font-black bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1 rounded-full">{serialKeys.length} ترخيص</span>
          </h2>

          {loadingSerials ? (
            <div className="py-16 flex justify-center items-center">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : serialKeys.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
              <p className="text-sm text-slate-500">لم يتم إصدار أي أكواد ترخيص بعد.</p>
            </div>
          ) : (
            <motion.div 
              variants={listContainerVariants}
              initial="hidden"
              animate="show"
              className="overflow-y-auto max-h-[440px] pr-1 space-y-3.5"
            >
              {serialKeys.map((item) => (
                <motion.div
                  variants={listItemVariants}
                  key={item.id}
                  className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                    item.isUsed 
                      ? 'bg-slate-950/40 border-slate-850 opacity-40' 
                      : 'bg-slate-950 border border-slate-800 hover:border-indigo-500/25 shadow-sm'
                  }`}
                >
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-black text-slate-200 text-sm tracking-wider">{item.key}</span>
                      <button 
                        onClick={() => copyToClipboard(item.key)}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-indigo-400 hover:text-white transition-all cursor-pointer outline-none focus:outline-none flex items-center justify-center"
                        title="نسخ"
                      >
                        {copiedKey === item.key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 font-extrabold uppercase">
                      <span className="flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>الباقة: {item.plan.toUpperCase()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>الصلاحية: {item.durationDays} يوم</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-left font-semibold text-xs">
                    {item.isUsed ? (
                      <div className="space-y-1 text-left md:text-left">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 text-slate-400 border border-slate-800 font-bold">
                          مستخدم
                        </span>
                        <span className="block text-xs text-slate-400 font-bold">
                          بواسطة: <span className="text-indigo-400 font-black text-xs">{item.usedByRestaurantName || 'كافيه نشط'}</span>
                        </span>
                        {item.usedAt && (
                          <span className="block text-[10px] text-slate-500 font-medium">
                            تفعيل: {new Date(item.usedAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>فعال وجاهز للتفعيل</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
