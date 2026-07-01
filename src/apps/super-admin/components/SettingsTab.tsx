import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sliders, Flame, ShieldCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import CustomDateTimePicker from '../CustomDateTimePicker';

interface SettingsTabProps {
  systemSettings: any;
}

export default function SettingsTab({ systemSettings }: SettingsTabProps) {
  const queryClient = useQueryClient();

  // Local Form states
  const [basicPrice, setBasicPrice] = useState(1000);
  const [proPrice, setProPrice] = useState(1500);
  const [offerActive, setOfferActive] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerBasicPrice, setOfferBasicPrice] = useState(800);
  const [offerProPrice, setOfferProPrice] = useState(1200);
  const [offerEndsAt, setOfferEndsAt] = useState('');
  
  // Tables limits states
  const [limitTrialTables, setLimitTrialTables] = useState(5);
  const [limitBasicTables, setLimitBasicTables] = useState(10);
  const [limitProTables, setLimitProTables] = useState(20);

  // Products limits states
  const [limitTrialProducts, setLimitTrialProducts] = useState(15);
  const [limitBasicProducts, setLimitBasicProducts] = useState(50);
  const [limitProProducts, setLimitProProducts] = useState(9999);

  // Categories limits states
  const [limitTrialCategories, setLimitTrialCategories] = useState(5);
  const [limitBasicCategories, setLimitBasicCategories] = useState(15);
  const [limitProCategories, setLimitProCategories] = useState(9999);

  // Sync settings
  useEffect(() => {
    if (systemSettings) {
      setBasicPrice(systemSettings.pricing?.basic || 1000);
      setProPrice(systemSettings.pricing?.pro || 1500);
      setOfferActive(systemSettings.offer?.active || false);
      setOfferTitle(systemSettings.offer?.title || '');
      setOfferBasicPrice(systemSettings.offer?.basicPrice || 0);
      setOfferProPrice(systemSettings.offer?.proPrice || 0);
      
      if (systemSettings.offer?.endsAt) {
        const d = new Date(systemSettings.offer.endsAt);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        setOfferEndsAt(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setOfferEndsAt('');
      }

      if (systemSettings.limits) {
        // Tables
        setLimitTrialTables(systemSettings.limits.tables?.trial ?? systemSettings.limits.trial ?? 5);
        setLimitBasicTables(systemSettings.limits.tables?.basic ?? systemSettings.limits.basic ?? 10);
        setLimitProTables(systemSettings.limits.tables?.pro ?? systemSettings.limits.pro ?? 20);

        // Products
        setLimitTrialProducts(systemSettings.limits.products?.trial ?? 15);
        setLimitBasicProducts(systemSettings.limits.products?.basic ?? 50);
        setLimitProProducts(systemSettings.limits.products?.pro ?? 9999);

        // Categories
        setLimitTrialCategories(systemSettings.limits.categories?.trial ?? 5);
        setLimitBasicCategories(systemSettings.limits.categories?.basic ?? 15);
        setLimitProCategories(systemSettings.limits.categories?.pro ?? 9999);
      }
    }
  }, [systemSettings]);

  // Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        pricing: {
          basic: Number(basicPrice),
          pro: Number(proPrice),
        },
        offer: {
          active: offerActive,
          title: offerTitle,
          basicPrice: Number(offerBasicPrice),
          proPrice: Number(offerProPrice),
          endsAt: offerEndsAt ? new Date(offerEndsAt).toISOString() : undefined,
        },
        limits: {
          tables: {
            trial: Number(limitTrialTables),
            basic: Number(limitBasicTables),
            pro: Number(limitProTables),
          },
          products: {
            trial: Number(limitTrialProducts),
            basic: Number(limitBasicProducts),
            pro: Number(limitProProducts),
          },
          categories: {
            trial: Number(limitTrialCategories),
            basic: Number(limitBasicCategories),
            pro: Number(limitProCategories),
          },
          // Keep old fields for backward compatibility
          trial: Number(limitTrialTables),
          basic: Number(limitBasicTables),
          pro: Number(limitProTables),
        },
      };
      return api.put('/super-admin/system-settings', payload);
    },
    onSuccess: () => {
      toast.success('تم حفظ إعدادات النظام وتحديث الأسعار والعروض والقيود فورياً!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-system-settings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل تحديث الإعدادات.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative space-y-6">
      <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <h2 className="text-base font-black text-white mb-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Sliders className="w-5 h-5" />
        </div>
        <span>إعدادات النظام وأسعار الباقات العامة</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6 outline-none">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Plan price */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-300">سعر الباقة الأساسية (BASIC) بالجنيه *</label>
            <input
              type="number"
              required
              min="0"
              value={basicPrice}
              onChange={(e) => setBasicPrice(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
            />
          </div>

          {/* Pro Plan price */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-300">سعر الباقة الاحترافية (PRO) بالجنيه *</label>
            <input
              type="number"
              required
              min="0"
              value={proPrice}
              onChange={(e) => setProPrice(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
            />
          </div>
        </div>

        {/* Limits Configuration */}
        <div className="border-t border-slate-800 pt-5 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>الحد الأقصى للطاولات والكيو آر كود</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold">حدد السقف الأعلى من الطاولات الذكية المسموح بإنشائها لكل فئة اشتراك.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة التجريبية (TRIAL) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitTrialTables}
                  onChange={(e) => setLimitTrialTables(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة الأساسية (BASIC) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitBasicTables}
                  onChange={(e) => setLimitBasicTables(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة الاحترافية (PRO) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitProTables}
                  onChange={(e) => setLimitProTables(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/50">
            <h3 className="text-sm font-black text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>الحد الأقصى للمنتجات (Products Limit)</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold">حدد الحد الأقصى للمنتجات المسموح بإضافتها للمنيو لكل فئة اشتراك.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة التجريبية (TRIAL) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitTrialProducts}
                  onChange={(e) => setLimitTrialProducts(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة الأساسية (BASIC) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitBasicProducts}
                  onChange={(e) => setLimitBasicProducts(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة الاحترافية (PRO) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitProProducts}
                  onChange={(e) => setLimitProProducts(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/50">
            <h3 className="text-sm font-black text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>الحد الأقصى للتصنيفات (Categories Limit)</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold">حدد الحد الأقصى لأقسام المنيو/التصنيفات المسموح بإنشائها لكل فئة اشتراك.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة التجريبية (TRIAL) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitTrialCategories}
                  onChange={(e) => setLimitTrialCategories(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة الأساسية (BASIC) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitBasicCategories}
                  onChange={(e) => setLimitBasicCategories(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الباقة الاحترافية (PRO) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitProCategories}
                  onChange={(e) => setLimitProCategories(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Promotion configuration section */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-indigo-400 flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                <span>العروض الترويجية والخصومات الموقوتة</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-bold">تفعيل هذا الخيار يعرض شريط الخصم التنازلي للزوار بالصفحة الرئيسية فوراً.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={offerActive}
                onChange={(e) => setOfferActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650 animate-none cursor-pointer shadow-inner"></div>
              <span className="mr-3 text-xs font-black text-slate-400">{offerActive ? 'نشط' : 'معطل'}</span>
            </label>
          </div>

          {offerActive && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Subtitle / Title of promotion */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300">عنوان العرض الترويجي *</label>
                  <input
                    type="text"
                    required={offerActive}
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    placeholder="مثال: خصم افتتاح الصيف 🏖️"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:shadow-[0_0_12px_rgba(99,102,241,0.06)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none outline-none placeholder:text-slate-500 font-bold"
                  />
                </div>

                {/* Expiry Datetime with Custom Clock picker */}
                <div className="space-y-2">
                  <CustomDateTimePicker
                    value={offerEndsAt}
                    onChange={(val) => setOfferEndsAt(val)}
                    type="datetime"
                    label="تاريخ ووقت انتهاء العرض الترويجي *"
                    required={offerActive}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Basic price during offer */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300">سعر باقة BASIC خلال العرض *</label>
                  <input
                    type="number"
                    required={offerActive}
                    min="0"
                    value={offerBasicPrice}
                    onChange={(e) => setOfferBasicPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                  />
                </div>

                {/* Pro price during offer */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300">سعر باقة PRO خلال العرض *</label>
                  <input
                    type="number"
                    required={offerActive}
                    min="0"
                    value={offerProPrice}
                    onChange={(e) => setOfferProPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-sm transition-all font-mono focus:outline-none outline-none font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Standout Save settings button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.01, boxShadow: '0 4px 20px rgba(79, 70, 229, 0.3)' }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="py-3.5 px-8 bg-indigo-600 hover:bg-indigo-550 active:scale-98 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg outline-none focus:outline-none cursor-pointer flex items-center gap-2 border border-indigo-500/30 hover:border-indigo-500/50"
          >
            {updateSettingsMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>حفظ وبث الأسعار حياً على النظام</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
}
