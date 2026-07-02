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
    <div className="space-y-6 text-right" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Serial Key Generator */}
        <div className="lg:col-span-2 bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card relative overflow-hidden self-start">
          <h2 className="text-base font-extrabold text-admin-text-primary mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent">
              <Key className="w-5 h-5" />
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
                <label className="block text-xs font-bold text-admin-text-secondary">عدد الأيام المطلوبة *</label>
                <input
                  type="number"
                  required
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="مثال: 180"
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold focus:outline-none transition-colors outline-none"
                />
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={generateSerialMutation.isPending}
              className="w-full py-3 px-6 bg-admin-accent hover:opacity-95 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-admin-accent cursor-pointer border-none outline-none focus:outline-none"
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
              className="mt-6 p-5 bg-admin-bg-base border border-admin-border rounded-xl text-center space-y-3 shadow-inner"
            >
              <span className="text-xs text-admin-text-secondary font-bold block">كود الترخيص الخاص بكافيه العميل جاهز:</span>
              <span className="text-sm font-mono font-black text-admin-accent tracking-wider block bg-admin-bg-elevated border border-admin-border py-2.5 rounded-lg select-all">
                {generatedKey}
              </span>
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-admin-accent font-bold hover:opacity-90 bg-admin-accent/10 border border-admin-accent/25 rounded-lg px-4 py-2.5 transition-colors cursor-pointer outline-none focus:outline-none w-full shadow-sm"
              >
                {copiedKey === generatedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-admin-accent" />}
                <span>{copiedKey === generatedKey ? 'تم النسخ بنجاح!' : 'نسخ كود التفعيل الفريد'}</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Generated Keys Logs */}
        <div className="lg:col-span-3 bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card relative overflow-hidden">
          <h2 className="text-base font-extrabold text-admin-text-primary mb-5 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-admin-accent" />
              <span>أرشيف التراخيص المصدرة</span>
            </span>
            <span className="text-xs font-bold bg-admin-accent/10 text-admin-accent border border-admin-accent/20 px-3 py-1 rounded-full">{serialKeys.length} ترخيص</span>
          </h2>

          {loadingSerials ? (
            <div className="py-16 flex justify-center items-center">
              <RefreshCw className="w-8 h-8 text-admin-accent animate-spin" />
            </div>
          ) : serialKeys.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-admin-border rounded-xl bg-admin-bg-base">
              <p className="text-xs text-admin-text-muted font-bold">لم يتم إصدار أي أكواد ترخيص بعد.</p>
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
                      ? 'bg-admin-bg-subtle/50 border-admin-border opacity-60' 
                      : 'bg-admin-bg-elevated border border-admin-border hover:border-admin-accent/25 shadow-admin-card'
                  }`}
                >
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-admin-text-primary text-sm tracking-wider">{item.key}</span>
                      <button 
                        onClick={() => copyToClipboard(item.key)}
                        className="p-1.5 rounded-lg border border-admin-border bg-admin-bg-base hover:bg-admin-bg-subtle text-admin-accent transition-all cursor-pointer outline-none focus:outline-none flex items-center justify-center"
                        title="نسخ"
                      >
                        {copiedKey === item.key ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-admin-accent" />}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-admin-text-secondary font-bold uppercase">
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-admin-bg-base text-admin-text-muted border border-admin-border font-bold">
                          مستخدم
                        </span>
                        <span className="block text-xs text-admin-text-secondary font-bold">
                          بواسطة: <span className="text-admin-accent font-extrabold text-xs">{item.usedByRestaurantName || 'كافيه نشط'}</span>
                        </span>
                        {item.usedAt && (
                          <span className="block text-[10px] text-admin-text-muted font-medium">
                            تفعيل: {new Date(item.usedAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
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
