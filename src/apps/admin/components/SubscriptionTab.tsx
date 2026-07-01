import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../../shared/store/authStore';

export default function SubscriptionTab() {
  const queryClient = useQueryClient();
  const { restaurant, updateRestaurant } = useAuthStore();

  const [serialKey, setSerialKey] = useState('');
  const [menuTitle, setMenuTitle] = useState(restaurant?.settings?.menuTitle || '');
  const [menuDescription, setMenuDescription] = useState(restaurant?.settings?.menuDescription || '');

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
      const response = await api.put('/subscriptions/receipt-settings', payload);
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

  const handleSaveMenuSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveMenuSettingsMutation.mutate({ menuTitle, menuDescription });
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

  const formattedExpiryDate = restaurant?.subscription?.expiresAt
    ? new Date(restaurant.subscription.expiresAt).toLocaleDateString('ar-EG', {
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
          restaurant?.subscription?.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>حالة الاشتراك: {restaurant?.subscription?.status === 'active' ? 'نشط' : 'منتهي'}</span>
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
              <h3 className="text-sm font-extrabold text-admin-text-primary">الباقة الحالية: <span className="text-admin-accent font-black uppercase">{restaurant?.subscription?.plan || 'trial'}</span></h3>
              <p className="text-[10px] text-admin-text-secondary font-bold mt-1">تاريخ انتهاء الصلاحية: {formattedExpiryDate}</p>
            </div>
          </div>
          <div className="p-3.5 bg-admin-bg-subtle rounded-xl text-xs space-y-3 font-semibold text-admin-text-secondary">
            <div className="flex justify-between">
              <span>المنتجات المسموحة:</span>
              <span className="text-admin-text-primary font-bold">
                {restaurant?.subscription?.plan === 'trial' ? '15 منتج' : restaurant?.subscription?.plan === 'basic' ? '50 منتج' : 'غير محدود'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>التصنيفات المسموحة:</span>
              <span className="text-admin-text-primary font-bold">
                {restaurant?.subscription?.plan === 'trial' ? '5 أقسام' : restaurant?.subscription?.plan === 'basic' ? '15 قسم' : 'غير محدود'}
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

        {/* Activate Serial Key Form */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card flex flex-col justify-between col-span-1 lg:col-span-2">
          <div className="space-y-2">
            <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-admin-accent animate-pulse" />
              <span>تجديد أو ترقية الاشتراك</span>
            </h3>
            <p className="text-xs text-admin-text-secondary leading-relaxed font-medium">
              أدخل كود السريال (Serial Key) الذي حصلت عليه لتمديد اشتراكك أو ترقية الباقة الحالية لتفعيل الميزات الإضافية.
            </p>
          </div>

          <form onSubmit={handleActivateSubmit} className="mt-4">
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
                className="py-3 px-6 bg-admin-accent text-white font-bold text-xs rounded-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-admin-accent whitespace-nowrap cursor-pointer"
              >
                {activateMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>تفعيل كود التجديد</span>
                )}
              </motion.button>
            </div>
          </form>
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
