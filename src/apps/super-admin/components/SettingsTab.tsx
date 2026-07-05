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

  // Features permissions states
  const [featureAnalytics, setFeatureAnalytics] = useState<('trial' | 'basic' | 'pro')[]>(['pro']);
  const [featureAudit, setFeatureAudit] = useState<('trial' | 'basic' | 'pro')[]>(['pro']);
  const [featureDelivery, setFeatureDelivery] = useState<('trial' | 'basic' | 'pro')[]>(['pro']);

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

      if (systemSettings.features) {
        setFeatureAnalytics(systemSettings.features.analytics || ['pro']);
        setFeatureAudit(systemSettings.features.audit || ['pro']);
        setFeatureDelivery(systemSettings.features.delivery || ['pro']);
      } else {
        setFeatureAnalytics(['pro']);
        setFeatureAudit(['pro']);
        setFeatureDelivery(['pro']);
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
        features: {
          analytics: featureAnalytics,
          audit: featureAudit,
          delivery: featureDelivery,
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
    <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card relative space-y-6 text-right" dir="rtl">
      <h2 className="text-base font-extrabold text-admin-text-primary mb-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent">
          <Sliders className="w-5 h-5" />
        </div>
        <span>إعدادات النظام وأسعار الباقات العامة</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6 outline-none">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Plan price */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-admin-text-secondary">سعر الباقة الأساسية (BASIC) بالجنيه *</label>
            <input
              type="number"
              required
              min="0"
              value={basicPrice}
              onChange={(e) => setBasicPrice(Number(e.target.value))}
              className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
            />
          </div>

          {/* Pro Plan price */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-admin-text-secondary">سعر الباقة الاحترافية (PRO) بالجنيه *</label>
            <input
              type="number"
              required
              min="0"
              value={proPrice}
              onChange={(e) => setProPrice(Number(e.target.value))}
              className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
            />
          </div>
        </div>

        {/* Limits Configuration */}
        <div className="border-t border-admin-border pt-5 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-admin-accent flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>الحد الأقصى للطاولات والكيو آر كود</span>
            </h3>
            <p className="text-xs text-admin-text-muted font-bold">حدد السقف الأعلى من الطاولات الذكية المسموح بإنشائها لكل فئة اشتراك.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة التجريبية (TRIAL) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitTrialTables}
                  onChange={(e) => setLimitTrialTables(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة الأساسية (BASIC) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitBasicTables}
                  onChange={(e) => setLimitBasicTables(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة الاحترافية (PRO) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitProTables}
                  onChange={(e) => setLimitProTables(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-admin-border">
            <h3 className="text-sm font-extrabold text-admin-accent flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>الحد الأقصى للمنتجات (Products Limit)</span>
            </h3>
            <p className="text-xs text-admin-text-muted font-bold">حدد الحد الأقصى للمنتجات المسموح بإضافتها للمنيو لكل فئة اشتراك.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة التجريبية (TRIAL) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitTrialProducts}
                  onChange={(e) => setLimitTrialProducts(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة الأساسية (BASIC) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitBasicProducts}
                  onChange={(e) => setLimitBasicProducts(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة الاحترافية (PRO) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitProProducts}
                  onChange={(e) => setLimitProProducts(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-admin-border">
            <h3 className="text-sm font-extrabold text-admin-accent flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>الحد الأقصى للتصنيفات (Categories Limit)</span>
            </h3>
            <p className="text-xs text-admin-text-muted font-bold">حدد الحد الأقصى لأقسام المنيو/التصنيفات المسموح بإنشائها لكل فئة اشتراك.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة التجريبية (TRIAL) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitTrialCategories}
                  onChange={(e) => setLimitTrialCategories(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة الأساسية (BASIC) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitBasicCategories}
                  onChange={(e) => setLimitBasicCategories(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">الباقة الاحترافية (PRO) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={limitProCategories}
                  onChange={(e) => setLimitProCategories(Number(e.target.value))}
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Promotion configuration section */}
        <div className="border-t border-admin-border pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-admin-accent flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                <span>العروض الترويجية والخصومات الموقوتة</span>
              </h3>
              <p className="text-xs text-admin-text-muted mt-0.5 font-bold">تفعيل هذا الخيار يعرض شريط الخصم التنازلي للزوار بالصفحة الرئيسية فوراً.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={offerActive}
                onChange={(e) => setOfferActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-accent animate-none cursor-pointer shadow-inner"></div>
              <span className="mr-3 text-xs font-bold text-admin-text-secondary">{offerActive ? 'نشط' : 'معطل'}</span>
            </label>
          </div>

          {offerActive && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Subtitle / Title of promotion */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-admin-text-secondary">عنوان العرض الترويجي *</label>
                  <input
                    type="text"
                    required={offerActive}
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    placeholder="مثال: خصم افتتاح الصيف 🏖️"
                    className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold focus:outline-none outline-none placeholder-admin-text-muted/40"
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
                  <label className="block text-xs font-bold text-admin-text-secondary">سعر باقة BASIC خلال العرض *</label>
                  <input
                    type="number"
                    required={offerActive}
                    min="0"
                    value={offerBasicPrice}
                    onChange={(e) => setOfferBasicPrice(Number(e.target.value))}
                    className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                  />
                </div>

                {/* Pro price during offer */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-admin-text-secondary">سعر باقة PRO خلال العرض *</label>
                  <input
                    type="number"
                    required={offerActive}
                    min="0"
                    value={offerProPrice}
                    onChange={(e) => setOfferProPrice(Number(e.target.value))}
                    className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all font-mono focus:outline-none outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Permissions / Plan features configuration section */}
        <div className="border-t border-admin-border pt-5 space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-admin-accent flex items-center gap-1.5">
              <Sliders className="w-5 h-5" />
              <span>صلاحيات ومميزات الباقات (Plan Features & Permissions)</span>
            </h3>
            <p className="text-xs text-admin-text-muted mt-0.5 font-bold">
              حدد أي فئات اشتراك (Trial, Basic, Pro) مسموح لها بالوصول إلى الميزات المتقدمة التالية.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 bg-admin-bg-base border border-admin-border rounded-xl p-5">
            {/* Feature: Analytics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-admin-border/50">
              <div>
                <span className="text-xs font-black text-admin-text-primary block">التقارير والتحليلات المتقدمة (Analytics Dashboard)</span>
                <span className="text-[10px] text-admin-text-secondary font-medium">تتيح للمطعم رؤية رسوم المبيعات البيانية والمنتجات الأكثر طلباً وساعات الذروة.</span>
              </div>
              <div className="flex items-center gap-4">
                {['trial', 'basic', 'pro'].map((p) => (
                  <label key={p} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-admin-text-secondary">
                    <input
                      type="checkbox"
                      checked={featureAnalytics.includes(p as any)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFeatureAnalytics([...featureAnalytics, p as any]);
                        } else {
                          setFeatureAnalytics(featureAnalytics.filter(x => x !== p));
                        }
                      }}
                      className="rounded border-zinc-300 text-admin-accent focus:ring-admin-accent cursor-pointer"
                    />
                    <span className="uppercase">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Feature: Audit Logs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-admin-border/50">
              <div>
                <span className="text-xs font-black text-admin-text-primary block">سجلات العمليات والرقابة (Audit Logs)</span>
                <span className="text-[10px] text-admin-text-secondary font-medium">سجل تفصيلي بكافة التعديلات الإدارية لمنع التلاعب والسرقة الداخلية وتتبع الكاشير.</span>
              </div>
              <div className="flex items-center gap-4">
                {['trial', 'basic', 'pro'].map((p) => (
                  <label key={p} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-admin-text-secondary">
                    <input
                      type="checkbox"
                      checked={featureAudit.includes(p as any)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFeatureAudit([...featureAudit, p as any]);
                        } else {
                          setFeatureAudit(featureAudit.filter(x => x !== p));
                        }
                      }}
                      className="rounded border-zinc-300 text-admin-accent focus:ring-admin-accent cursor-pointer"
                    />
                    <span className="uppercase">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Feature: Delivery */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black text-admin-text-primary block">تلقي طلبات التوصيل / الدليفري الخارجية (Delivery Mode)</span>
                <span className="text-[10px] text-admin-text-secondary font-medium">تتيح للمطعم استقبال طلبات دليفري من المينيو العام وتعديل خيارات التوصيل من الإعدادات.</span>
              </div>
              <div className="flex items-center gap-4">
                {['trial', 'basic', 'pro'].map((p) => (
                  <label key={p} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-admin-text-secondary">
                    <input
                      type="checkbox"
                      checked={featureDelivery.includes(p as any)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFeatureDelivery([...featureDelivery, p as any]);
                        } else {
                          setFeatureDelivery(featureDelivery.filter(x => x !== p));
                        }
                      }}
                      className="rounded border-zinc-300 text-admin-accent focus:ring-admin-accent cursor-pointer"
                    />
                    <span className="uppercase">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Standout Save settings button */}
        <div className="pt-4 border-t border-admin-border flex justify-end">
          <motion.button
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="py-3 px-8 bg-admin-accent hover:opacity-95 text-white font-bold text-xs rounded-lg transition-all shadow-admin-accent outline-none focus:outline-none cursor-pointer flex items-center gap-2 border-none"
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
