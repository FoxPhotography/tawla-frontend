import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, CreditCard, ArrowLeft, KeyRound, AlertTriangle, Check, ShoppingBag, FolderOpen, Tag, Smartphone, Wallet, Copy, ExternalLink, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import { socket } from '../../../shared/services/socket';
import { useAuthStore } from '../../../shared/store/authStore';
import type { Category, Product } from '../../../shared/types';

export default function SubscriptionTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { restaurant, updateRestaurant } = useAuthStore();

  const [serialKey, setSerialKey] = useState('');
  const [renewPlan, setRenewPlan] = useState<'basic' | 'pro'>((restaurant?.subscription?.plan as any) === 'basic' ? 'basic' : 'pro');
  const [renewCycle, setRenewCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isRenewing, setIsRenewing] = useState(false);
  const [showSerialInput, setShowSerialInput] = useState(false);

  // Renewal Modal & Gateway States
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewGateway, setRenewGateway] = useState<'vodafone_cash' | 'instapay' | 'paypal' | 'fawaterk'>('vodafone_cash');
  const [renewSenderContact, setRenewSenderContact] = useState('');
  const [renewSenderReference, setRenewSenderReference] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    toast.success('تم نسخ النص بنجاح!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

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
  const pendingTx = subStatusData?.pendingTransaction;

  // Real-time listener for transaction & subscription status updates
  useEffect(() => {
    const handleStatusRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    };

    socket.on('restaurant_transaction_updated', handleStatusRefresh);
    socket.on('subscription_updated', handleStatusRefresh);

    return () => {
      socket.off('restaurant_transaction_updated', handleStatusRefresh);
      socket.off('subscription_updated', handleStatusRefresh);
    };
  }, [queryClient]);

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
  const [loyaltyRewardScope, setLoyaltyRewardScope] = useState<'all' | 'category' | 'products'>(
    restaurant?.loyaltySettings?.rewardScope || 
    (restaurant?.loyaltySettings?.rewardProductIds?.length ? 'products' : 
    (restaurant?.loyaltySettings?.rewardCategoryId ? 'category' : 'all'))
  );
  const [loyaltyRewardCategoryId, setLoyaltyRewardCategoryId] = useState(restaurant?.loyaltySettings?.rewardCategoryId || '');
  const [loyaltyRewardProductIds, setLoyaltyRewardProductIds] = useState<string[]>(
    restaurant?.loyaltySettings?.rewardProductIds || []
  );
  const [loyaltyRewardDiscountPercent, setLoyaltyRewardDiscountPercent] = useState(restaurant?.loyaltySettings?.rewardDiscountPercent || 50);

  const plan = restaurant?.subscription?.plan || 'trial';

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data?.data || [];
    }
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data?.data || [];
    }
  });

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
      const scope = restaurant.loyaltySettings?.rewardScope || 
        (restaurant.loyaltySettings?.rewardProductIds?.length ? 'products' : 
        (restaurant.loyaltySettings?.rewardCategoryId ? 'category' : 'all'));
      setLoyaltyRewardScope(scope);
      setLoyaltyRewardProductName(restaurant.loyaltySettings?.rewardProductName || 'مشروب مجاني');
      setLoyaltyRewardCategoryId(restaurant.loyaltySettings?.rewardCategoryId || '');
      setLoyaltyRewardProductIds(restaurant.loyaltySettings?.rewardProductIds || []);
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

  const handleRenewSubmit = async () => {
    if (renewGateway === 'vodafone_cash' || renewGateway === 'instapay' || renewGateway === 'paypal') {
      if (!renewSenderContact.trim()) {
        const label = renewGateway === 'vodafone_cash' ? 'رقم المحفظة' : renewGateway === 'instapay' ? 'رقم حساب أو هاتف إنستاباي' : 'بريد أو معرّف الحساب';
        return toast.error(`يرجى كتابة ${label} لتأكيد السداد.`);
      }
      if (!renewSenderReference.trim()) {
        return toast.error('يرجى كتابة رقم المعاملة / كود التحويل.');
      }
    }

    setIsRenewing(true);
    try {
      const response = await api.post('/subscriptions/renew', {
        plan: renewPlan,
        billingCycle: renewCycle,
        paymentGateway: renewGateway,
        senderContact: renewSenderContact.trim() || undefined,
        senderReference: renewSenderReference.trim() || undefined,
      });

      const data = response.data?.data;
      if (data?.manualPayment || data?.status === 'pending') {
        toast.success('تم تسجيل طلب التجديد بنجاح، جاري فتح صفحة المعاملة...');
        setShowRenewModal(false);
        setTimeout(() => {
          window.location.href = `/payment/confirmation?invoiceId=${data.invoiceId}&status=pending&type=renewal&method=${renewGateway}`;
        }, 500);
        return;
      }

      if (data?.invoiceLink) {
        toast.success('جاري توجيهك لبوابة الدفع الآمنة (فواتيرك)...');
        window.location.href = data.invoiceLink;
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

  const handleToggleRewardProduct = (productId: string) => {
    setLoyaltyRewardProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleSaveLoyaltySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const computedMode = !isCustomerDbEnabled 
      ? 'disabled' 
      : (!isGiftsEnabled ? 'database_only' : 'loyalty_enabled');

    const selectedCategory = categories.find((c: any) => c.id === loyaltyRewardCategoryId);
    saveMenuSettingsMutation.mutate({
      loyaltySettings: {
        enabled: computedMode === 'loyalty_enabled',
        mode: computedMode,
        targetOrderCount: Number(loyaltyTarget),
        rewardType: loyaltyRewardType,
        rewardScope: loyaltyRewardScope,
        rewardProductName: loyaltyRewardProductName,
        rewardCategoryId: loyaltyRewardScope === 'category' ? (loyaltyRewardCategoryId || null) : null,
        rewardCategoryName: loyaltyRewardScope === 'category' && selectedCategory ? selectedCategory.name : null,
        rewardProductIds: loyaltyRewardScope === 'products' ? loyaltyRewardProductIds : [],
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

      {/* Pending Transaction Tracker Banner */}
      {pendingTx && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 md:p-6 bg-gradient-to-br from-amber-50/95 via-orange-50/50 to-amber-100/40 border-2 border-amber-300/80 rounded-2xl shadow-sm space-y-4 text-right"
          dir="rtl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/70 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-800 shrink-0 shadow-inner">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-amber-950">
                    طلب اشتراك / تجديد قيد المراجعة والاعتماد
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-200/80 text-amber-900 border border-amber-400/40">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                    قيد الانتظار
                  </span>
                </div>
                <p className="text-xs font-semibold text-amber-800/90 mt-0.5">
                  تم تسجيل تفاصيل طلبك بنجاح، ويقوم فريق الإدارة بمطابقة إيصال السداد لتفعيل باقتك فوراً.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                navigate(`/payment/confirmation?invoice_id=${pendingTx.invoiceId}&status=pending&type=${pendingTx.type || 'renewal'}`);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#801B2C] hover:bg-[#661523] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all transform active:scale-95 shrink-0 cursor-pointer"
            >
              <span>متابعة حالة الطلب والإيصال</span>
              <ArrowLeft className="w-4 h-4 rtl:rotate-0" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/90 border border-amber-200/70 rounded-xl p-3 shadow-xs">
              <span className="text-[11px] text-amber-800/75 font-bold block mb-1">رقم الفاتورة</span>
              <span className="font-black text-amber-950 font-mono text-xs dir-ltr block truncate">
                #{pendingTx.invoiceId}
              </span>
            </div>

            <div className="bg-white/90 border border-amber-200/70 rounded-xl p-3 shadow-xs">
              <span className="text-[11px] text-amber-800/75 font-bold block mb-1">الباقة والدورة</span>
              <span className="font-extrabold text-amber-950 block">
                {pendingTx.plan === 'pro' ? 'المتقدمة (Pro)' : 'الأساسية (Basic)'} • {pendingTx.billingCycle === 'annual' ? 'سنوي' : 'شهري'}
              </span>
            </div>

            <div className="bg-white/90 border border-amber-200/70 rounded-xl p-3 shadow-xs">
              <span className="text-[11px] text-amber-800/75 font-bold block mb-1">المبلغ المطلوب</span>
              <span className="font-black text-emerald-700 text-sm block">
                {Number(pendingTx.amount || 0).toLocaleString()} {pendingTx.currency || 'ج.م'}
              </span>
            </div>

            <div className="bg-white/90 border border-amber-200/70 rounded-xl p-3 shadow-xs">
              <span className="text-[11px] text-amber-800/75 font-bold block mb-1">طريقة السداد</span>
              <span className="font-extrabold text-amber-950 block truncate">
                {pendingTx.paymentGateway === 'vodafone_cash' ? 'فودافون كاش' :
                 pendingTx.paymentGateway === 'instapay' ? 'انستا باي' :
                 pendingTx.paymentGateway === 'paypal' ? 'PayPal' :
                 pendingTx.paymentGateway === 'binance' ? 'Binance' : 'فواتيرك / بطاقة مصرفية'}
              </span>
            </div>
          </div>

          {(pendingTx.senderContact || pendingTx.senderReference) && (
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-amber-900 bg-amber-100/60 border border-amber-200/70 rounded-xl px-3.5 py-2 font-medium">
              {pendingTx.senderContact && (
                <span><strong>رقم الحساب / المحفظة المُرسل منها:</strong> <span className="font-mono">{pendingTx.senderContact}</span></span>
              )}
              {pendingTx.senderReference && (
                <span><strong>الرقم المرجعي للتحويل:</strong> <span className="font-mono font-bold text-amber-950">{pendingTx.senderReference}</span></span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-amber-800/85">
            <span>💡 يمكنك النقر على زر "متابعة حالة الطلب والإيصال" لعرض الإيصال الرقمي الكامل، أو التواصل عبر واتساب مع الدعم الفني لإرسال صورة التحويل وتسريع الاعتماد.</span>
            {pendingTx.createdAt && (
              <span className="text-[10px] text-amber-700/70 font-semibold shrink-0">
                تاريخ الطلب: {new Date(pendingTx.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Trial 30-Day Auto Purge Policy Warning Banner */}
      {currentSub?.plan === 'trial' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3.5 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-extrabold text-sm block text-amber-950">
              تنبيه هام للنسخة التجريبية:
            </span>
            <p>
              أنت تعمل حالياً بالنسخة التجريبية المجانية. تنص سياسة المنصة على أن <strong>الحسابات التجريبية التي لا تشترك في باقة مدفوعة خلال 30 يوماً من تاريخ إنشائها يتم حذفها بالكامل وبشكل نهائي مع كافة بياناتها</strong> (المنتجات، الطاولات، الطلبات، العملاء) دون إمكانية استرجاعها.
            </p>
            <p className="font-semibold text-emerald-700">
              🛡️ الترقية إلى إحدى الباقات المدفوعة (Basic أو Pro) تضمن حفظ وحماية بيانات منشأتك بشكل دائم وأبدي في النظام حتى بعد انتهاء فترة الاشتراك.
            </p>
          </div>
        </div>
      )}

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
            {(() => {
              const isOffer = Boolean(systemSettings?.offer?.active && (!systemSettings.offer.endsAt || new Date(systemSettings.offer.endsAt) > new Date()));
              const basicMonthly = isOffer && systemSettings?.offer?.basicPrice ? systemSettings.offer.basicPrice : (systemSettings?.pricing?.basic || 1500);
              const basicAnnual = isOffer && systemSettings?.offer?.annualBasicPrice ? systemSettings.offer.annualBasicPrice : (systemSettings?.pricing?.annualBasic || (systemSettings?.pricing?.basic ? systemSettings.pricing.basic * 10 : 15000));
              const proMonthly = isOffer && systemSettings?.offer?.proPrice ? systemSettings.offer.proPrice : (systemSettings?.pricing?.pro || 3000);
              const proAnnual = isOffer && systemSettings?.offer?.annualProPrice ? systemSettings.offer.annualProPrice : (systemSettings?.pricing?.annualPro || (systemSettings?.pricing?.pro ? systemSettings.pricing.pro * 10 : 30000));

              const basicSavings = basicMonthly * 12 > 0 ? Math.round(((basicMonthly * 12 - basicAnnual) / (basicMonthly * 12)) * 100) : 17;
              const proSavings = proMonthly * 12 > 0 ? Math.round(((proMonthly * 12 - proAnnual) / (proMonthly * 12)) * 100) : 17;
              const maxSavingsPercent = Math.max(basicSavings, proSavings);

              return (
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
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      renewCycle === 'annual'
                        ? 'bg-admin-accent text-white shadow-sm'
                        : 'text-admin-text-secondary hover:text-admin-text-primary'
                    }`}
                  >
                    <span>سنوي</span>
                    {maxSavingsPercent > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        renewCycle === 'annual' ? 'bg-amber-400 text-amber-950' : 'bg-emerald-500 text-white'
                      }`}>
                        وفر {maxSavingsPercent}%
                      </span>
                    )}
                  </button>
                </div>
              );
            })()}
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

          {/* Checkout Button & Payment Modal Trigger */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <motion.button
              type="button"
              onClick={() => setShowRenewModal(true)}
              disabled={isRenewing}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto py-3.5 px-8 bg-admin-accent hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-admin-accent cursor-pointer transition-all disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>تجديد / ترقية الباقة واختيار وسيلة الدفع</span>
              <ArrowLeft className="w-4 h-4" />
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
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">تطبيق الهدية المجانية على:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { key: 'all', label: 'جميع الأصناف (أي صنف)', icon: ShoppingBag },
                          { key: 'category', label: 'قسم كامل من المنيو', icon: FolderOpen },
                          { key: 'products', label: 'أصناف ومشاريب معينة', icon: Tag },
                        ].map((scope) => {
                          const Icon = scope.icon;
                          const isActive = loyaltyRewardScope === scope.key;
                          return (
                            <button
                              key={scope.key}
                              type="button"
                              onClick={() => {
                                setLoyaltyRewardScope(scope.key as any);
                                if (scope.key === 'all') {
                                  setLoyaltyRewardCategoryId('');
                                  setLoyaltyRewardProductIds([]);
                                }
                              }}
                              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'border-admin-accent bg-admin-accent/10 text-admin-accent'
                                  : 'border-admin-border text-admin-text-secondary hover:bg-admin-bg-base'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{scope.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {loyaltyRewardScope === 'category' && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">اختر قسم المنيو المستحق للهدية</label>
                        <select
                          value={loyaltyRewardCategoryId}
                          onChange={(e) => {
                            const catId = e.target.value;
                            setLoyaltyRewardCategoryId(catId);
                            if (catId) {
                              const found = categories.find((c: any) => c.id === catId);
                              if (found && (!loyaltyRewardProductName || loyaltyRewardProductName === 'مشروب مجاني' || loyaltyRewardProductName.startsWith('هدية مجانية من قسم'))) {
                                setLoyaltyRewardProductName(`هدية مجانية من قسم ${found.name}`);
                              }
                            }
                          }}
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-bold"
                        >
                          <option value="">-- اختر القسم (مثل: المشروبات أو الحلويات) --</option>
                          {categories.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-admin-text-muted">العميل سيحصل على هدية مجانية من الأصناف التابعة لهذا القسم فقط.</p>
                      </div>
                    )}

                    {loyaltyRewardScope === 'products' && (
                      <div className="space-y-2 bg-admin-bg-base border border-admin-border rounded-lg p-3 max-h-60 overflow-y-auto">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-bold text-admin-text-secondary">
                            اختر الأصناف أو المشاريب المحددة المؤهلة للهدية:
                          </span>
                          <span className="text-[10px] font-bold bg-admin-accent/10 text-admin-accent px-2 py-0.5 rounded-full">
                            تم تحديد {loyaltyRewardProductIds.length} صنف
                          </span>
                        </div>
                        <div className="space-y-3">
                          {categories.map((cat: any) => {
                            const catProds = products.filter((p: any) => p.categoryId === cat.id);
                            if (catProds.length === 0) return null;
                            return (
                              <div key={cat.id} className="space-y-1.5">
                                <h4 className="text-[10px] font-extrabold text-admin-accent bg-admin-accent/5 px-2 py-0.5 rounded inline-block">{cat.name}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {catProds.map((prod: any) => {
                                    const isChecked = loyaltyRewardProductIds.includes(prod.id);
                                    return (
                                      <label
                                        key={prod.id}
                                        onClick={() => handleToggleRewardProduct(prod.id)}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs font-bold transition-all ${
                                          isChecked
                                            ? 'border-admin-accent bg-admin-accent/10 text-admin-text-primary'
                                            : 'border-admin-border text-admin-text-secondary hover:bg-admin-bg-subtle'
                                        }`}
                                      >
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                          isChecked ? 'bg-admin-accent border-admin-accent text-white' : 'border-zinc-400 bg-white'
                                        }`}>
                                          {isChecked && <Check className="w-2.5 h-2.5" />}
                                        </div>
                                        <div className="flex justify-between items-center w-full ml-1 truncate">
                                          <span className="truncate">{prod.name}</span>
                                          <span className="text-[9px] text-admin-text-muted font-mono shrink-0 mr-1">{prod.price} ج.م</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs text-admin-text-secondary font-bold block mb-1.5">اسم الهدية المعروض للعميل</label>
                      <input
                        type="text"
                        value={loyaltyRewardProductName}
                        onChange={(e) => setLoyaltyRewardProductName(e.target.value)}
                        placeholder="مثال: فنجان قهوة مجاني، أو حلوى مجانية"
                        className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-bold"
                      />
                      <p className="text-[10px] text-admin-text-muted">الاسم التوضيحي الذي يظهر للعميل في قائمة المنيو وإشعار الهدية وفاتورة الطلب.</p>
                    </div>
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

      {/* Renew / Upgrade Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-admin-bg-elevated border border-admin-border rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-8 text-right"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-admin-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-admin-text-primary">
                    تأكيد تجديد الاشتراك واختيار وسيلة السداد
                  </h3>
                  <p className="text-xs text-admin-text-secondary mt-0.5">
                    اختر الطريقة الأنسب لك لإتمام السداد وتفعيل الباقة فوراً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="w-8 h-8 rounded-xl bg-admin-bg-base border border-admin-border text-admin-text-secondary hover:text-admin-text-primary flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingTx && (
              <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-300/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-right">
                <div className="flex items-center gap-2.5 text-amber-950">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
                  <span>
                    لديك بالفعل طلب اشتراك/تجديد قيد المراجعة برقم فاتورة <strong className="font-mono">#{pendingTx.invoiceId}</strong> بمبلغ <strong>{pendingTx.amount} ج.م</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRenewModal(false);
                    navigate(`/payment/confirmation?invoice_id=${pendingTx.invoiceId}&status=pending&type=${pendingTx.type || 'renewal'}`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
                >
                  متابعة الطلب الحالي ←
                </button>
              </div>
            )}

            {/* Selected Plan & Amount Summary Bar */}
            {(() => {
              const isOffer = Boolean(systemSettings?.offer?.active && (!systemSettings.offer.endsAt || new Date(systemSettings.offer.endsAt) > new Date()));
              const basicMonthly = isOffer && systemSettings?.offer?.basicPrice ? systemSettings.offer.basicPrice : (systemSettings?.pricing?.basic || 1500);
              const basicAnnual = isOffer && systemSettings?.offer?.annualBasicPrice ? systemSettings.offer.annualBasicPrice : (systemSettings?.pricing?.annualBasic || (systemSettings?.pricing?.basic ? systemSettings.pricing.basic * 10 : 15000));
              const proMonthly = isOffer && systemSettings?.offer?.proPrice ? systemSettings.offer.proPrice : (systemSettings?.pricing?.pro || 3000);
              const proAnnual = isOffer && systemSettings?.offer?.annualProPrice ? systemSettings.offer.annualProPrice : (systemSettings?.pricing?.annualPro || (systemSettings?.pricing?.pro ? systemSettings.pricing.pro * 10 : 30000));

              const amount = renewPlan === 'pro'
                ? (renewCycle === 'annual' ? proAnnual : proMonthly)
                : (renewCycle === 'annual' ? basicAnnual : basicMonthly);
              const approxUsd = Math.round(amount / 50);

              return (
                <div className="my-5 p-4 rounded-2xl bg-admin-bg-base border border-admin-border/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-admin-text-secondary font-bold block">تفاصيل الطلب:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-admin-accent/10 text-admin-accent uppercase">
                        {renewPlan === 'pro' ? 'الباقة المتقدمة Pro' : 'الباقة الأساسية Basic'}
                      </span>
                      <span className="text-xs font-bold text-admin-text-secondary">
                        ({renewCycle === 'annual' ? 'اشتراك سنوي - 12 شهر' : 'اشتراك شهري'})
                      </span>
                    </div>
                  </div>
                  <div className="text-left" dir="ltr">
                    <span className="text-[11px] text-admin-text-secondary font-bold block text-right">إجمالي المطلوب سداده:</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-admin-accent font-mono">
                        {amount.toLocaleString()} EGP
                      </span>
                      {renewGateway === 'paypal' && (
                        <span className="text-xs font-bold text-amber-500 font-mono">
                          (≈ ${approxUsd} USD)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Payment Method Selector (4 Options) */}
            <div className="space-y-3">
              <label className="text-xs font-black text-admin-text-primary block">
                اختر وسيلة الدفع:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    id: 'vodafone_cash',
                    name: 'فودافون كاش',
                    sub: 'والمحافظ الإلكترونية',
                    icon: Smartphone,
                    color: 'text-rose-500',
                    bg: 'bg-rose-500/10'
                  },
                  {
                    id: 'instapay',
                    name: 'إنستاباي (InstaPay)',
                    sub: 'تحويل بنكي لحظي',
                    icon: CreditCard,
                    color: 'text-purple-600',
                    bg: 'bg-purple-500/10'
                  },
                  {
                    id: 'paypal',
                    name: 'PayPal',
                    sub: 'الدفع الدولي بالدولار',
                    icon: Wallet,
                    color: 'text-blue-500',
                    bg: 'bg-blue-500/10'
                  },
                  {
                    id: 'fawaterk',
                    name: 'فواتيرك',
                    sub: 'بطاقات Visa / Mada',
                    icon: CreditCard,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10'
                  }
                ].map((item) => {
                  const isSelected = renewGateway === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRenewGateway(item.id as any)}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-admin-accent bg-admin-accent/10 shadow-sm ring-1 ring-admin-accent'
                          : 'border-admin-border bg-admin-bg-base hover:border-admin-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-admin-accent text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black text-admin-text-primary">{item.name}</div>
                        <div className="text-[10px] text-admin-text-secondary mt-0.5">{item.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gateway Specific Instructions & Fields */}
            <div className="mt-5 p-4 rounded-2xl bg-admin-bg-base border border-admin-border space-y-4">
              {renewGateway === 'vodafone_cash' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-admin-bg-elevated p-3 rounded-xl border border-admin-border">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-admin-text-secondary font-bold block">رقم محفظة التحويل (فودافون كاش / المحافظ):</span>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-black text-admin-text-primary font-mono select-all">01005023649</span>
                        <span className="text-xs font-bold text-admin-text-primary">(باسم: كريم ا.... ع.... ع.... ا....)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('01005023649', 'vf_renew')}
                      className="px-3 py-1.5 rounded-lg bg-admin-accent/10 text-admin-accent hover:bg-admin-accent hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'vf_renew' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'vf_renew' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-admin-text-secondary leading-relaxed">
                    💡 قم بتحويل المبلغ المطلوب أعلاه إلى الرقم، وتأكد من ظهور الاسم أعلاه، ثم أدخل رقم محفظتك وكود العملية لتفعيل اشتراكك فوراً.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs text-admin-text-secondary font-bold block mb-1">
                        رقم محفظتك (المحول منها) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={renewSenderContact}
                        onChange={(e) => setRenewSenderContact(e.target.value)}
                        placeholder="مثال: 01012345678"
                        className="w-full bg-admin-bg-elevated border border-admin-border text-admin-text-primary text-xs rounded-xl px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-admin-text-secondary font-bold block mb-1">
                        رقم المعاملة / كود العملية <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={renewSenderReference}
                        onChange={(e) => setRenewSenderReference(e.target.value)}
                        placeholder="مثال: 84930218"
                        className="w-full bg-admin-bg-elevated border border-admin-border text-admin-text-primary text-xs rounded-xl px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {renewGateway === 'instapay' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-admin-bg-elevated p-3 rounded-xl border border-admin-border">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-admin-text-secondary font-bold block">رقم حساب إنستاباي المعتمد (InstaPay):</span>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-black text-purple-600 font-mono select-all">01066980953</span>
                        <span className="text-xs font-bold text-admin-text-primary">(باسم: ابراهيم م.... ع.... م....)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('01066980953', 'instapay_renew')}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-600 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'instapay_renew' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'instapay_renew' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-admin-text-secondary leading-relaxed">
                    💡 افتح تطبيق إنستاباي واختر "إرسال نقود" لرقم الهاتف أعلاه وتأكد من الاسم، ثم اكتب بيانات التحويل بالأسفل.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs text-admin-text-secondary font-bold block mb-1">
                        رقم حساب أو هاتف إنستاباي الخاص بك <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={renewSenderContact}
                        onChange={(e) => setRenewSenderContact(e.target.value)}
                        placeholder="مثال: 010xxxxxxxx أو username@instapay"
                        className="w-full bg-admin-bg-elevated border border-admin-border text-admin-text-primary text-xs rounded-xl px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-admin-text-secondary font-bold block mb-1">
                        الرقم المرجعي للعملية (Reference Number) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={renewSenderReference}
                        onChange={(e) => setRenewSenderReference(e.target.value)}
                        placeholder="الرقم المرجعي من إشعار نجاح المعاملة في إنستاباي"
                        className="w-full bg-admin-bg-elevated border border-admin-border text-admin-text-primary text-xs rounded-xl px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {renewGateway === 'paypal' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-admin-bg-elevated p-3 rounded-xl border border-admin-border">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-admin-text-secondary font-bold block">حساب PayPal المعتمد:</span>
                      <span className="text-sm font-black text-blue-500 font-mono select-all">@Ibrahimx66</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href="https://paypal.me/Ibrahimx66"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح الرابط مباشرة</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy('https://paypal.me/Ibrahimx66', 'paypal_renew')}
                        className="px-3 py-1.5 rounded-lg bg-admin-bg-base border border-admin-border text-admin-text-secondary hover:text-admin-text-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'paypal_renew' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'paypal_renew' ? 'تم النسخ!' : 'نسخ'}</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-admin-text-secondary leading-relaxed">
                    💡 يمكنك السداد عبر رابط PayPal.me أو إرسال المبلغ إلى الحساب أعلاه بعملة الدولار، ثم تدوين بريدك ورقم العملية هنا.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs text-admin-text-secondary font-bold block mb-1">
                        البريد الإلكتروني لحسابك على PayPal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={renewSenderContact}
                        onChange={(e) => setRenewSenderContact(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-admin-bg-elevated border border-admin-border text-admin-text-primary text-xs rounded-xl px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-admin-text-secondary font-bold block mb-1">
                        رقم المعاملة (Transaction ID) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={renewSenderReference}
                        onChange={(e) => setRenewSenderReference(e.target.value)}
                        placeholder="مثال: 9XY39281KL829301"
                        className="w-full bg-admin-bg-elevated border border-admin-border text-admin-text-primary text-xs rounded-xl px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {renewGateway === 'fawaterk' && (
                <div className="space-y-2 text-xs text-admin-text-secondary leading-relaxed">
                  <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>الدفع الإلكتروني الآمن والمشفر بنسبة 100%</span>
                  </div>
                  <p>
                    عند الضغط على تأكيد، سيتم إنشاء فاتورتك الرسمية ونقلك مباشرة إلى بوابة الدفع الإلكتروني (فواتيرك) لإدخال بيانات بطاقتك البنكية وإتمام السداد فورياً وبشكل مؤتمت بالكامل.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-admin-border/60">
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                disabled={isRenewing}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-admin-border text-admin-text-secondary hover:text-admin-text-primary text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء وتراجع
              </button>

              <motion.button
                type="button"
                onClick={handleRenewSubmit}
                disabled={isRenewing}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto py-3 px-8 bg-admin-accent text-white font-extrabold text-xs rounded-xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-admin-accent cursor-pointer disabled:opacity-50"
              >
                {isRenewing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري معالجة الطلب...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد وسداد الاشتراك الآن</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
