import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Crown, CreditCard, ArrowLeft, KeyRound, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../../shared/store/authStore';

export default function SubscriptionTab() {
  const queryClient = useQueryClient();
  const { restaurant, updateRestaurant } = useAuthStore();

  const [serialKey, setSerialKey] = useState('');
  const [renewPlan, setRenewPlan] = useState<'basic' | 'pro'>((restaurant?.subscription?.plan as any) === 'basic' ? 'basic' : 'pro');
  const [renewCycle, setRenewCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isRenewing, setIsRenewing] = useState(false);
  const [showSerialInput, setShowSerialInput] = useState(false);

  // Fetch real-time subscription status from backend
  const { data: subStatusData } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/status');
      return response.data?.data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Sync real-time subscription to authStore
  useEffect(() => {
    if (subStatusData?.subscription && restaurant) {
      if (
        restaurant.subscription?.expiresAt !== subStatusData.subscription.expiresAt ||
        restaurant.subscription?.plan !== subStatusData.subscription.plan ||
        restaurant.subscription?.status !== subStatusData.subscription.status
      ) {
        updateRestaurant({
          ...restaurant,
          subscription: subStatusData.subscription,
          receiptSettings: subStatusData.receiptSettings || restaurant.receiptSettings,
        });
      }
    }
  }, [subStatusData]);

  const currentSub = subStatusData?.subscription || restaurant?.subscription;

  // Check URL for payment completion and verify immediately
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const invoiceId = params.get('invoice_id') || params.get('invoiceId');

    if (status === 'renewed' || status === 'paid' || status === 'success') {
      if (invoiceId) {
        api.get(`/subscriptions/verify-payment?invoiceId=${invoiceId}`)
          .then((res) => {
            if (res.data?.data?.status === 'paid') {
              toast.success('🎉 تم التحقق من سداد الفاتورة بنجاح وتحديث صلاحية الاشتراك والباقة!');
              queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
            }
          })
          .catch(() => {});
      } else {
        toast.success('🎉 تم تجديد الاشتراك بنجاح!');
        queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'failed') {
      toast.error('❌ تعذر إتمام عملية الدفع عبر فواتيرك أو تم إلغاؤها.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const [menuTitle, setMenuTitle] = useState(restaurant?.settings?.menuTitle || '');
  const [menuDescription, setMenuDescription] = useState(restaurant?.settings?.menuDescription || '');
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(restaurant?.settings?.isDeliveryEnabled !== false);
  const [separateRestCafe, setSeparateRestCafe] = useState(restaurant?.settings?.separateRestCafe === true);
  const [customPopularEnabled, setCustomPopularEnabled] = useState(restaurant?.settings?.customPopularEnabled === true);
  const [customPopularProducts, setCustomPopularProducts] = useState<string[]>(restaurant?.settings?.customPopularProducts || []);
  const initialMode = restaurant?.loyaltySettings?.mode || (restaurant?.loyaltySettings?.enabled ? 'loyalty_enabled' : 'disabled');
  const [isCustomerDbEnabled, setIsCustomerDbEnabled] = useState(
    initialMode === 'database_only' || initialMode === 'loyalty_enabled'
  );
  const [isGiftsEnabled, setIsGiftsEnabled] = useState(initialMode === 'loyalty_enabled');
  const [loyaltyTarget, setLoyaltyTarget] = useState(restaurant?.loyaltySettings?.targetOrderCount || 10);
  const [loyaltyRewardType, setLoyaltyRewardType] = useState(restaurant?.loyaltySettings?.rewardType || 'free_product');
  const [loyaltyRewardProductName, setLoyaltyRewardProductName] = useState(restaurant?.loyaltySettings?.rewardProductName || 'مشروب مجاني');
  const [loyaltyRewardDiscountPercent, setLoyaltyRewardDiscountPercent] = useState(restaurant?.loyaltySettings?.rewardDiscountPercent || 50);

  const plan = restaurant?.subscription?.plan || 'trial';

  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/system-settings');
      return response.data.data;
    }
  });

  const isFeatureAllowed = (featureName: 'analytics' | 'audit' | 'delivery' | 'loyalty' | 'separateRestCafe' | 'customPopularProducts' | 'customDiscounts') => {
    if (!systemSettings) {
      return plan === 'pro';
    }
    const allowedPlans = systemSettings.features?.[featureName] || ['pro'];
    return allowedPlans.includes(plan);
  };



  useEffect(() => {
    if (restaurant) {
      setMenuTitle(restaurant.settings?.menuTitle || '');
      setMenuDescription(restaurant.settings?.menuDescription || '');
      setIsDeliveryEnabled(restaurant.settings?.isDeliveryEnabled !== false);
      setSeparateRestCafe(restaurant.settings?.separateRestCafe === true);
      setCustomPopularEnabled(restaurant.settings?.customPopularEnabled === true);
      setCustomPopularProducts(restaurant.settings?.customPopularProducts || []);
      const mode = restaurant.loyaltySettings?.mode || (restaurant.loyaltySettings?.enabled ? 'loyalty_enabled' : 'disabled');
      setIsCustomerDbEnabled(mode === 'database_only' || mode === 'loyalty_enabled');
      setIsGiftsEnabled(mode === 'loyalty_enabled');
      setLoyaltyTarget(restaurant.loyaltySettings?.targetOrderCount || 10);
      setLoyaltyRewardType(restaurant.loyaltySettings?.rewardType || 'free_product');
      setLoyaltyRewardProductName(restaurant.loyaltySettings?.rewardProductName || 'مشروب مجاني');
      setLoyaltyRewardDiscountPercent(restaurant.loyaltySettings?.rewardDiscountPercent || 50);
    }
  }, [restaurant]);

  const [receiptPhone, setReceiptPhone] = useState(restaurant?.receiptSettings?.phone || '');
  const [receiptWhatsapp, setReceiptWhatsapp] = useState(restaurant?.receiptSettings?.whatsapp || '');
  const [receiptAddress, setReceiptAddress] = useState(restaurant?.receiptSettings?.address || '');
  const [receiptTaxNumber, setReceiptTaxNumber] = useState(restaurant?.receiptSettings?.taxNumber || '');
  const [receiptTaxRate, setReceiptTaxRate] = useState(restaurant?.receiptSettings?.taxRate || 0);
  const [receiptServiceRate, setReceiptServiceRate] = useState(restaurant?.receiptSettings?.serviceRate || 0);
  const [receiptHeaderText, setReceiptHeaderText] = useState(restaurant?.receiptSettings?.headerText || '');
  const [receiptFooterText, setReceiptFooterText] = useState(restaurant?.receiptSettings?.footerText || '');

  // Activate Serial Key Mutation
  const activateMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await api.post('/subscriptions/activate', { key, serialKey: key });
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success('تهانينا! تم تفعيل الاشتراك وتجديد باقتك بنجاح.');
      setSerialKey('');
      if (data.restaurant) {
        updateRestaurant(data.restaurant);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-restaurant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'كود التفعيل غير صالح أو منتهي الصلاحية.');
    },
  });

  // Save Menu Settings
  const saveMenuSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.put('/subscriptions/settings', payload);
      return response.data.data;
    },
    onSuccess: (updatedRest) => {
      toast.success('تم حفظ إعدادات المينيو بنجاح!');
      updateRestaurant(updatedRest);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ الإعدادات.');
    },
  });

  // Save Receipt Settings
  const saveReceiptSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.put('/subscriptions/settings', payload);
      return response.data.data;
    },
    onSuccess: (updatedRest) => {
      toast.success('تم حفظ إعدادات الفاتورة بنجاح!');
      updateRestaurant(updatedRest);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ إعدادات الفاتورة.');
    },
  });

  const handleActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialKey.trim()) return toast.error('يرجى إدخال كود التفعيل.');
    activateMutation.mutate(serialKey);
  };

  const handleRenewFawaterk = async () => {
    setIsRenewing(true);
    try {
      const response = await api.post('/subscriptions/renew', {
        plan: renewPlan,
        billingCycle: renewCycle,
      });

      if (response.data?.data?.invoiceLink) {
        toast.success('جاري توجيهك لبوابة الدفع الآمنة (فواتيرك)...');
        window.location.href = response.data.data.invoiceLink;
      } else {
        toast.error('تعذر إنشاء رابط الفاتورة من فواتيرك.');
      }
    } catch (err: any) {
      const rawError = err.response?.data?.error || err.response?.data?.message;
      let msg = 'فشلت معالجة طلب التجديد. يرجى المحاولة لاحقاً.';
      if (typeof rawError === 'string') {
        msg = rawError;
      } else if (typeof rawError === 'object' && rawError !== null) {
        msg = Object.values(rawError).flat().join(' - ');
      }
      toast.error(msg);
    } finally {
      setIsRenewing(false);
    }
  };

  const handleSaveMenuSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveMenuSettingsMutation.mutate({ 
      menuTitle, 
      menuDescription, 
      isDeliveryEnabled, 
      separateRestCafe,
      customPopularEnabled,
      customPopularProducts
    });
  };

  const handleCustomerDbToggle = (checked: boolean) => {
    setIsCustomerDbEnabled(checked);
    if (!checked) {
      setIsGiftsEnabled(false);
    }
  };

  const handleGiftsToggle = (checked: boolean) => {
    setIsGiftsEnabled(checked);
    if (checked) {
      setIsCustomerDbEnabled(true);
    }
  };

  const handleSaveLoyaltySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const computedMode = !isCustomerDbEnabled 
      ? 'disabled' 
      : (!isGiftsEnabled ? 'database_only' : 'loyalty_enabled');

    saveMenuSettingsMutation.mutate({
      loyaltySettings: {
        enabled: computedMode === 'loyalty_enabled',
        mode: computedMode,
        targetOrderCount: Number(loyaltyTarget),
        rewardType: loyaltyRewardType,
        rewardProductName: loyaltyRewardProductName,
        rewardDiscountPercent: Number(loyaltyRewardDiscountPercent),
      }
    });
  };

  const handleSaveReceiptSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveReceiptSettingsMutation.mutate({
      phone: receiptPhone,
      whatsapp: receiptWhatsapp,
      address: receiptAddress,
      taxNumber: receiptTaxNumber,
      taxRate: Number(receiptTaxRate),
      serviceRate: Number(receiptServiceRate),
      headerText: receiptHeaderText,
      footerText: receiptFooterText,
      showLogo: true,
    });
  };

  const formattedExpiryDate = currentSub?.expiresAt
    ? new Date(currentSub.expiresAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'غير متوفر';

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-admin-text-primary">إعدادات الاشتراك والنظام</h2>
        <span className={`text-xs px-3.5 py-1.5 rounded-full font-black flex items-center gap-1.5 ${
          currentSub?.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>حالة الاشتراك: {currentSub?.status === 'active' ? 'نشط' : 'منتهي'}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Quotas Summary Card */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-accent/10 flex items-center justify-center text-admin-accent">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-admin-text-primary">الباقة الحالية: <span className="text-admin-accent font-black uppercase">{currentSub?.plan || 'trial'}</span></h3>
              <p className="text-[10px] text-admin-text-secondary font-bold mt-1">تاريخ انتهاء الصلاحية: {formattedExpiryDate}</p>
            </div>
          </div>
          <div className="p-3.5 bg-admin-bg-subtle rounded-xl text-xs space-y-3 font-semibold text-admin-text-secondary">
            <div className="flex justify-between">
              <span>الطاولات المسموحة:</span>
              <span className="text-admin-text-primary font-bold">
                {(() => {
                  const plan = (currentSub?.plan || 'trial') as 'trial' | 'basic' | 'pro';
                  const lim = systemSettings?.limits?.tables?.[plan] ?? systemSettings?.limits?.[plan] ?? (plan === 'trial' ? 5 : plan === 'basic' ? 10 : 20);
                  return lim >= 9999 ? 'غير محدود' : `${lim} طاولات`;
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>المنتجات المسموحة:</span>
              <span className="text-admin-text-primary font-bold">
                {(() => {
                  const plan = (currentSub?.plan || 'trial') as 'trial' | 'basic' | 'pro';
                  const lim = systemSettings?.limits?.products?.[plan] ?? (plan === 'trial' ? 15 : plan === 'basic' ? 50 : 9999);
                  return lim >= 9999 ? 'غير محدود' : `${lim} منتج`;
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>التصنيفات المسموحة:</span>
              <span className="text-admin-text-primary font-bold">
                {(() => {
                  const plan = (currentSub?.plan || 'trial') as 'trial' | 'basic' | 'pro';
                  const lim = systemSettings?.limits?.categories?.[plan] ?? (plan === 'trial' ? 5 : plan === 'basic' ? 15 : 9999);
                  return lim >= 9999 ? 'غير محدود' : `${lim} أقسام`;
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>لوحة التحليلات المتقدمة:</span>
              <span className="text-admin-text-primary font-bold">
                {restaurant?.subscription?.plan === 'pro' ? 'مفعلة' : 'مغلقة'}
              </span>
            </div>
          </div>
        </div>

        {/* Fawaterk Direct Renewal & Plan Upgrade */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-2xl p-6 shadow-admin-card flex flex-col justify-between col-span-1 lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-admin-border/50 pb-4">
            <div>
              <h3 className="font-extrabold text-admin-text-primary text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-admin-accent" />
                <span>تجديد أو ترقية الاشتراك أونلاين</span>
              </h3>
              <p className="text-xs text-admin-text-secondary mt-1">
                جدد اشتراكك مباشرة بالدفع الإلكتروني عبر بوابة فواتيرك (فيزا، ماستركارد، فودافون كاش، إنستاباي).
              </p>
            </div>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center bg-admin-bg-base p-1 rounded-xl border border-admin-border text-xs">
              <button
                type="button"
                onClick={() => setRenewCycle('monthly')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  renewCycle === 'monthly'
                    ? 'bg-admin-accent text-white shadow-sm'
                    : 'text-admin-text-secondary hover:text-admin-text-primary'
                }`}
              >
                شهري
              </button>
              <button
                type="button"
                onClick={() => setRenewCycle('annual')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  renewCycle === 'annual'
                    ? 'bg-admin-accent text-white shadow-sm'
                    : 'text-admin-text-secondary hover:text-admin-text-primary'
                }`}
              >
                سنوي
                <span className="bg-emerald-500 text-white text-[9px] px-1 py-0.2 rounded font-mono">خصم سنوي</span>
              </button>
            </div>
          </div>

          {/* Plan Selector Radios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Basic Card */}
            {(() => {
              const isOffer = Boolean(systemSettings?.offer?.active && (!systemSettings.offer.endsAt || new Date(systemSettings.offer.endsAt) > new Date()));
              const basicMonthly = isOffer && systemSettings?.offer?.basicPrice ? systemSettings.offer.basicPrice : (systemSettings?.pricing?.basic || 1500);
              const basicAnnual = isOffer && systemSettings?.offer?.annualBasicPrice ? systemSettings.offer.annualBasicPrice : (systemSettings?.pricing?.annualBasic || (systemSettings?.pricing?.basic ? systemSettings.pricing.basic * 10 : 15000));
              const bTables = systemSettings?.limits?.tables?.basic ?? systemSettings?.limits?.basic ?? 10;
              const bProducts = systemSettings?.limits?.products?.basic ?? 50;

              return (
                <div
                  onClick={() => setRenewPlan('basic')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    renewPlan === 'basic'
                      ? 'border-admin-accent bg-admin-accent/5 ring-1 ring-admin-accent shadow-sm'
                      : 'border-admin-border bg-admin-bg-base hover:border-admin-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-admin-text-primary">الباقة الأساسية (Basic)</span>
                    <span className="font-extrabold text-sm text-admin-accent font-mono">
                      {renewCycle === 'annual' ? `${basicAnnual.toLocaleString()} ج.م / سنة` : `${basicMonthly.toLocaleString()} ج.م / شهر`}
                    </span>
                  </div>
                  <p className="text-[11px] text-admin-text-secondary">
                    {`حتى ${bTables} طاولات، ${bProducts} صنف، منيو QR، ولوحة المطبخ والكاشير.`}
                  </p>
                </div>
              );
            })()}

            {/* Pro Card */}
            {(() => {
              const isOffer = Boolean(systemSettings?.offer?.active && (!systemSettings.offer.endsAt || new Date(systemSettings.offer.endsAt) > new Date()));
              const proMonthly = isOffer && systemSettings?.offer?.proPrice ? systemSettings.offer.proPrice : (systemSettings?.pricing?.pro || 3000);
              const proAnnual = isOffer && systemSettings?.offer?.annualProPrice ? systemSettings.offer.annualProPrice : (systemSettings?.pricing?.annualPro || (systemSettings?.pricing?.pro ? systemSettings.pricing.pro * 10 : 30000));
              const pTables = systemSettings?.limits?.tables?.pro ?? systemSettings?.limits?.pro ?? 20;
              const pProducts = systemSettings?.limits?.products?.pro ?? 9999;

              return (
                <div
                  onClick={() => setRenewPlan('pro')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    renewPlan === 'pro'
                      ? 'border-admin-accent bg-admin-accent/5 ring-1 ring-admin-accent shadow-sm'
                      : 'border-admin-border bg-admin-bg-base hover:border-admin-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-admin-text-primary">الباقة المتقدمة (Pro)</span>
                      <span className="bg-admin-accent text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">شاملة</span>
                    </div>
                    <span className="font-extrabold text-sm text-admin-accent font-mono">
                      {renewCycle === 'annual' ? `${proAnnual.toLocaleString()} ج.م / سنة` : `${proMonthly.toLocaleString()} ج.م / شهر`}
                    </span>
                  </div>
                  <p className="text-[11px] text-admin-text-secondary">
                    {`${pTables >= 9999 ? 'طاولات غير محدودة' : `حتى ${pTables} طاولة`}، ${pProducts >= 9999 ? 'أصناف غير محدودة' : `حتى ${pProducts} صنف`}، برامج الولاء، وتخصيص الفواتير والضريبة.`}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Plan Change Policy Warning */}
          {restaurant?.subscription?.plan && restaurant.subscription.plan !== renewPlan && (
            <div className="p-4.5 bg-[#801B2C]/5 border-2 border-[#801B2C]/20 rounded-2xl flex items-start gap-3.5 text-xs shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-[#801B2C]/10 border border-[#801B2C]/15 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-[#801B2C]" />
              </div>
              <div className="space-y-1.5 flex-1 text-right">
                <span className="font-black text-[#801B2C] text-xs block">
                  تنبيه ترقية / تغيير الخطة:
                </span>
                <p className="leading-relaxed text-xs text-[#1C1612] font-medium">
                  عند تغيير الباقة من (<strong className="text-[#801B2C] font-black">{restaurant.subscription.plan === 'pro' ? 'المتقدمة Pro' : restaurant.subscription.plan === 'basic' ? 'الأساسية Basic' : 'التجريبية Trial'}</strong>) إلى (<strong className="text-[#801B2C] font-black">{renewPlan === 'pro' ? 'المتقدمة Pro' : 'الأساسية Basic'}</strong>)، سيبدأ احتساب الاشتراك الجديد فوراً لمدة (<span className="font-bold text-[#801B2C]">{renewCycle === 'annual' ? 'سنة كاملة' : 'شهر كامل'}</span>) من تاريخ السداد، وسيتم إلغاء واستبدال أي فترة متبقية من باقتك الحالية تلقائياً دون استحقاق استرداد مالي.
                </p>
              </div>
            </div>
          )}

          {/* Checkout Button & Fawaterk Badges */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <motion.button
              type="button"
              onClick={handleRenewFawaterk}
              disabled={isRenewing}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto py-3.5 px-8 bg-admin-accent hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-admin-accent cursor-pointer transition-all disabled:opacity-50"
            >
              {isRenewing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>تجديد / ترقية الباقة الآن بالدفع الإلكتروني (فواتيرك)</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => setShowSerialInput(!showSerialInput)}
              className="text-xs text-admin-text-secondary hover:text-admin-text-primary font-bold flex items-center gap-1.5 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showSerialInput ? 'إخفاء إدخال السيريال' : 'لديك كود سريال يدوي؟'}</span>
            </button>
          </div>

          {/* Alternative: Manual Serial Key Input */}
          {showSerialInput && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleActivateSubmit}
              className="pt-4 border-t border-admin-border/50"
            >
              <label className="text-xs font-bold text-admin-text-secondary block mb-2">تفعيل عبر كود السريال (Serial Key):</label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="أدخل كود التفعيل المكون من 24 رمزاً..."
                  value={serialKey}
                  onChange={(e) => setSerialKey(e.target.value)}
                  className="flex-1 bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none placeholder-admin-text-muted/40 font-mono text-left"
                  dir="ltr"
                />
                <motion.button
                  type="submit"
                  disabled={activateMutation.isPending}
                  whileTap={{ scale: 0.97 }}
                  className="py-2.5 px-6 bg-admin-bg-subtle text-admin-text-primary border border-admin-border font-bold text-xs rounded-lg hover:bg-admin-border transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {activateMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-admin-text-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>تفعيل الكود</span>
                  )}
                </motion.button>
              </div>
            </motion.form>
          )}
        </div>
      </div>

      {/* Menu Settings Section */}
      <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card space-y-6">
        <div>
          <h3 className="font-extrabold text-admin-text-primary text-base">إعدادات المينيو الخاص بك</h3>
          <p className="text-xs text-admin-text-secondary mt-1">قم بتخصيص العنوان والوصف اللذين يظهران للزبائن في صفحة المينيو الخاصة بمطعمك.</p>
        </div>

        <form onSubmit={handleSaveMenuSettings} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">عنوان المينيو (العنوان الرئيسي)</label>
            <input
              type="text"
              value={menuTitle}
              onChange={(e) => setMenuTitle(e.target.value)}
              placeholder={restaurant?.name || "مثال: مطعم وكافيه البركة"}
              className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
            />
            <p className="text-[10px] text-admin-text-muted">إذا تركت هذا الحقل فارغاً، فسيتم عرض اسم المطعم الافتراضي ({restaurant?.name || 'اسم المطعم'}).</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">وصف المطعم (المقدمة الترحيبية)</label>
            <textarea
              rows={3}
              value={menuDescription}
              onChange={(e) => setMenuDescription(e.target.value)}
              placeholder="مثال: أهلاً بك في تجربة طعام فاخرة ومميزة. نقدم لكم تشكيلة من أشهى المأكولات والمشروبات الطازجة."
              className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors resize-none"
            />
            <p className="text-[10px] text-admin-text-muted">سيظهر هذا الوصف أسفل عنوان المطعم مباشرة كرسالة ترحيبية للعملاء.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-t border-admin-border/50 pt-4">
              <div>
                <label className="text-xs text-admin-text-secondary font-bold block mb-1">تفعيل خدمة التوصيل (Delivery)</label>
                <p className="text-[10px] text-admin-text-muted">إذا قمت بإلغائها، فلن يتمكن العملاء من تقديم طلبات توصيل خارجية عبر المينيو العام، وسيكون المينيو للعرض فقط.</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isFeatureAllowed('delivery')}
                  checked={isDeliveryEnabled && isFeatureAllowed('delivery')}
                  onChange={(e) => setIsDeliveryEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-accent cursor-pointer ${!isFeatureAllowed('delivery') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                {!isFeatureAllowed('delivery') && (
                  <span className="mr-2 text-[8px] bg-admin-accent/10 text-admin-accent px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
                )}
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-admin-border/50 pt-4">
              <div>
                <label className="text-xs text-admin-text-secondary font-bold block mb-1">فصل حسابات المطعم عن الكافيه (Split Restaurant & Cafe Accounts)</label>
                <p className="text-[10px] text-admin-text-muted">تتيح لك هذه الميزة تصنيف أقسام المينيو لتكون تابعة للمطعم أو الكافيه بشكل منفصل ورصد تحليلات المبيعات لكل منهما على حدة.</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isFeatureAllowed('separateRestCafe')}
                  checked={separateRestCafe && isFeatureAllowed('separateRestCafe')}
                  onChange={(e) => setSeparateRestCafe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-accent cursor-pointer ${!isFeatureAllowed('separateRestCafe') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                {!isFeatureAllowed('separateRestCafe') && (
                  <span className="mr-2 text-[8px] bg-admin-accent/10 text-admin-accent px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
                )}
              </label>
            </div>

            {/* Feature: Custom Popular Products */}
            <div className="flex items-center justify-between border-t border-admin-border/50 pt-4">
              <div>
                <label className="text-xs text-admin-text-secondary font-bold block mb-1">تخصيص المنتجات الأكثر طلباً (Custom Most Popular Products)</label>
                <p className="text-[10px] text-admin-text-muted">تتيح لك تحديد منتجات معينة يدوياً وتثبيتها كمنتجات "أكثر طلباً" للترويج لها وبيعها بشكل أسرع.</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isFeatureAllowed('customPopularProducts')}
                  checked={customPopularEnabled && isFeatureAllowed('customPopularProducts')}
                  onChange={(e) => setCustomPopularEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-accent cursor-pointer ${!isFeatureAllowed('customPopularProducts') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                {!isFeatureAllowed('customPopularProducts') && (
                  <span className="mr-2 text-[8px] bg-admin-accent/10 text-admin-accent px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <motion.button
              type="submit"
              disabled={saveMenuSettingsMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="py-2.5 px-6 bg-admin-accent text-white font-bold text-xs rounded-lg hover:opacity-95 transition-opacity flex items-center gap-2 shadow-admin-accent cursor-pointer"
            >
              {saveMenuSettingsMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>حفظ إعدادات المينيو</span>
              )}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Loyalty Settings Section */}
      <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card space-y-6">
        <div>
          <h3 className="font-extrabold text-admin-text-primary text-base">نظام الهدايا والمكافآت وإدارة العملاء</h3>
          <p className="text-xs text-admin-text-secondary mt-1">قم بتخصيص خيارات تتبع العملاء وتقديم هدايا ومكافآت بعد تحقيق عدد معين من الطلبات لتشجيعهم على العودة لمطعمك.</p>
        </div>

        <form onSubmit={handleSaveLoyaltySettings} className="space-y-4">
          <div className="flex items-center justify-between border-b border-admin-border/50 pb-4">
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1">تفعيل قاعدة بيانات العملاء</label>
              <p className="text-[10px] text-admin-text-muted font-bold">تتيح لك تتبع وحفظ أرقام هواتف العملاء وعناوينهم وسجل طلباتهم لتسهيل التوصيل وتسجيل الطلبات.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!isFeatureAllowed('loyalty')}
                checked={isCustomerDbEnabled && isFeatureAllowed('loyalty')}
                onChange={(e) => handleCustomerDbToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-accent cursor-pointer ${!isFeatureAllowed('loyalty') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
              {!isFeatureAllowed('loyalty') && (
                <span className="mr-2 text-[8px] bg-admin-accent/10 text-admin-accent px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
              )}
            </label>
          </div>

          <div className="flex items-center justify-between border-b border-admin-border/50 pb-4">
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1">تفعيل نظام الهدايا والمكافآت (Loyalty Points)</label>
              <p className="text-[10px] text-admin-text-muted font-bold">حساب النقاط التراكمية للزبائن بناءً على طلباتهم وتقديم مكافآت عند بلوغ حد معين.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!isFeatureAllowed('loyalty')}
                checked={isGiftsEnabled && isFeatureAllowed('loyalty')}
                onChange={(e) => handleGiftsToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-accent cursor-pointer ${!isFeatureAllowed('loyalty') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
            </label>
          </div>

          {isGiftsEnabled && isFeatureAllowed('loyalty') && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">عدد الطلبات المطلوبة للحصول على الهدية (الهدف X)</label>
                  <input
                    type="number"
                    min={1}
                    value={loyaltyTarget}
                    onChange={(e) => setLoyaltyTarget(Number(e.target.value))}
                    className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-admin-text-muted">مثال: بعد إتمام 10 طلبات، يحصل العميل على هديته في الطلب التالي.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">نوع المكافأة</label>
                  <select
                    value={loyaltyRewardType}
                    onChange={(e) => setLoyaltyRewardType(e.target.value as 'free_product' | 'discount')}
                    className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
                  >
                    <option value="free_product">منتج أو مشروب مجاني</option>
                    <option value="discount">نسبة خصم على الطلب</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {loyaltyRewardType === 'free_product' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">اسم المنتج / المشروب المجاني</label>
                    <input
                      type="text"
                      value={loyaltyRewardProductName}
                      onChange={(e) => setLoyaltyRewardProductName(e.target.value)}
                      placeholder="مثال: فنجان قهوة مجاني، أو حلوى مجانية"
                      className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-bold"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">نسبة الخصم المئوية (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={loyaltyRewardDiscountPercent}
                      onChange={(e) => setLoyaltyRewardDiscountPercent(Number(e.target.value))}
                      placeholder="مثال: 50"
                      className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-bold"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div className="flex justify-end pt-2">
            <motion.button
              type="submit"
              disabled={saveMenuSettingsMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="py-2.5 px-6 bg-admin-accent text-white font-bold text-xs rounded-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-admin-accent"
            >
              {saveMenuSettingsMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>حفظ إعدادات الهدايا والمكافآت</span>
              )}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Receipt Settings Section */}
      <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card space-y-6">
        <div>
          <h3 className="font-extrabold text-admin-text-primary text-base">إعدادات طباعة الفواتير</h3>
          <p className="text-xs text-admin-text-secondary mt-1">قم بتعديل وتخصيص البيانات التي تظهر على الفاتورة الحرارية المطبوعة للعملاء.</p>
        </div>

        <form onSubmit={handleSaveReceiptSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">هاتف الفاتورة</label>
              <input
                type="text"
                value={receiptPhone}
                onChange={(e) => setReceiptPhone(e.target.value)}
                placeholder="مثال: 01012345678"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">رقم الواتساب للطلبات</label>
              <input
                type="text"
                value={receiptWhatsapp}
                onChange={(e) => setReceiptWhatsapp(e.target.value)}
                placeholder="مثال: 201012345678"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">عنوان الفاتورة</label>
              <input
                type="text"
                value={receiptAddress}
                onChange={(e) => setReceiptAddress(e.target.value)}
                placeholder="مثال: القاهرة، مصر"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">الرقم الضريبي (إن وجد)</label>
              <input
                type="text"
                value={receiptTaxNumber}
                onChange={(e) => setReceiptTaxNumber(e.target.value)}
                placeholder="مثال: 123-456-789"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">نسبة ضريبة القيمة المضافة (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={receiptTaxRate}
                onChange={(e) => setReceiptTaxRate(Number(e.target.value))}
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">نسبة الخدمة للصالات (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={receiptServiceRate}
                onChange={(e) => setReceiptServiceRate(Number(e.target.value))}
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">ترويسة الفاتورة (Header Text)</label>
              <input
                type="text"
                value={receiptHeaderText}
                onChange={(e) => setReceiptHeaderText(e.target.value)}
                placeholder="أهلاً بكم في مطعمنا"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">تذييل الفاتورة (Footer Text)</label>
              <input
                type="text"
                value={receiptFooterText}
                onChange={(e) => setReceiptFooterText(e.target.value)}
                placeholder="شكراً لزيارتكم!"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <motion.button
              type="submit"
              disabled={saveReceiptSettingsMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="py-2.5 px-6 bg-admin-accent text-white font-bold text-xs rounded-lg hover:opacity-95 transition-opacity flex items-center gap-2 shadow-admin-accent cursor-pointer"
            >
              {saveReceiptSettingsMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>حفظ إعدادات الفاتورة</span>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}
