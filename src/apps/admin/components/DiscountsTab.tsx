import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Calendar, Percent, Check, AlertCircle, ShoppingBag, FolderOpen, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../../shared/store/authStore';

const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الإثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
];
export default function DiscountsTab() {
  const { restaurant, updateRestaurant } = useAuthStore();

  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/system-settings');
      return response.data.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data.data || [];
    },
  });

  const plan = restaurant?.subscription?.plan || 'trial';
  
  const isFeatureAllowed = () => {
    if (!systemSettings) {
      return plan === 'pro';
    }
    const allowedPlans = systemSettings.features?.customDiscounts || ['pro'];
    return allowedPlans.includes(plan);
  };

  // State fields
  const [enabled, setEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'all' | 'categories' | 'products'>('all');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [valueType, setValueType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState(0);
  const [scheduleType, setScheduleType] = useState<'always' | 'weekly' | 'custom_range'>('always');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sync state
  useEffect(() => {
    if (restaurant?.settings?.discountConfig) {
      const config = restaurant.settings.discountConfig;
      setEnabled(config.enabled ?? false);
      setDiscountType(config.discountType || 'all');
      setTargetIds(config.targetIds || []);
      setValueType(config.valueType || 'percentage');
      setValue(config.value || 0);
      setScheduleType(config.scheduleType || 'always');
      setDaysOfWeek(config.daysOfWeek || []);
      setStartDate(config.startDate || '');
      setEndDate(config.endDate || '');
    }
  }, [restaurant]);

  // Mutation
  const saveDiscountMutation = useMutation({
    mutationFn: async (updatedConfig: any) => {
      return api.put('/subscriptions/settings', {
        discountConfig: updatedConfig,
      });
    },
    onSuccess: (res: any) => {
      toast.success('تم حفظ إعدادات الخصومات والعروض المجدولة بنجاح!');
      if (res.data?.data) {
        updateRestaurant(res.data.data);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ إعدادات الخصومات.');
    },
  });

  if (!isFeatureAllowed()) {
    return (
      <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-8 text-center max-w-xl mx-auto my-10 space-y-4">
        <div className="w-12 h-12 bg-admin-accent/10 text-admin-accent rounded-full flex items-center justify-center mx-auto">
          <Percent className="w-6 h-6" />
        </div>
        <h3 className="font-extrabold text-sm text-admin-text-primary">الخصومات والعروض المجدولة غير متاحة في باقتك الحالية</h3>
        <p className="text-xs text-admin-text-secondary leading-relaxed">
          قم بترقية باقتك إلى الفئة الأعلى للتمكن من جدولة خصومات تلقائية بنسب مئوية أو قيمة ثابتة على كامل المنيو أو أقسام ومنتجات معينة، وتطبيقها وعرضها للعملاء وفي الفواتير تلقائياً.
        </p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (value <= 0) {
      toast.error('الرجاء إدخال قيمة خصم أكبر من الصفر.');
      return;
    }
    if (valueType === 'percentage' && value > 100) {
      toast.error('نسبة الخصم المئوية لا يمكن أن تتجاوز 100%.');
      return;
    }
    if (scheduleType === 'weekly' && daysOfWeek.length === 0) {
      toast.error('الرجاء اختيار يوم واحد على الأقل للجدول الأسبوعي.');
      return;
    }
    if (scheduleType === 'custom_range' && (!startDate || !endDate)) {
      toast.error('الرجاء تحديد تاريخ البدء والانتهاء.');
      return;
    }

    saveDiscountMutation.mutate({
      enabled,
      discountType,
      targetIds,
      valueType,
      value: Number(value),
      scheduleType,
      daysOfWeek,
      startDate: scheduleType === 'custom_range' ? startDate : undefined,
      endDate: scheduleType === 'custom_range' ? endDate : undefined,
    });
  };

  const handleToggleTarget = (id: string) => {
    if (targetIds.includes(id)) {
      setTargetIds(targetIds.filter((t) => t !== id));
    } else {
      setTargetIds([...targetIds, id]);
    }
  };

  const handleToggleDay = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-lg font-black text-admin-text-primary">الخصومات والعروض المجدولة</h2>
        <p className="text-xs text-admin-text-secondary mt-1">
          قم بإنشاء وتخصيص حملات خصومات مجدولة تلقائياً بنسب معينة لتطبيقها في المنيو، شاشات الاستاف، الفواتير المطبوعة.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-admin-accent" />
                <span className="font-bold text-xs text-admin-text-primary">تفعيل الخصومات والعروض المجدولة</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-accent cursor-pointer"></div>
              </label>
            </div>

            {enabled && (
              <div className="space-y-4 pt-4 border-t border-admin-border/50 animate-fade-in">
                {/* Discount value & type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-admin-text-secondary font-bold block mb-1.5">نوع الخصم</label>
                    <div className="flex border border-admin-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setValueType('percentage')}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${
                          valueType === 'percentage'
                            ? 'bg-admin-accent text-white'
                            : 'bg-admin-bg-subtle text-admin-text-secondary hover:bg-admin-bg-base'
                        }`}
                      >
                        نسبة مئوية (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setValueType('fixed')}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${
                          valueType === 'fixed'
                            ? 'bg-admin-accent text-white'
                            : 'bg-admin-bg-subtle text-admin-text-secondary hover:bg-admin-bg-base'
                        }`}
                      >
                        قيمة ثابتة ({restaurant?.settings?.currency || 'ج.م'})
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-admin-text-secondary font-bold block mb-1.5">قيمة الخصم</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={valueType === 'percentage' ? '100' : '9999'}
                        value={value || ''}
                        onChange={(e) => setValue(Number(e.target.value))}
                        className="w-full bg-admin-bg-subtle border border-admin-border rounded-lg px-3 py-2 text-xs text-admin-text-primary focus:outline-none focus:border-admin-accent font-bold"
                        placeholder={valueType === 'percentage' ? 'مثال: 50' : 'مثال: 10'}
                      />
                      <span className="absolute left-3 top-2 text-xs text-admin-text-secondary font-bold">
                        {valueType === 'percentage' ? '%' : restaurant?.settings?.currency || 'ج.م'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Scope selection */}
                <div className="space-y-2">
                  <label className="text-[11px] text-admin-text-secondary font-bold block">نطاق تطبيق الخصم</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'all', label: 'كامل المنيو', icon: ShoppingBag },
                      { key: 'categories', label: 'أقسام معينة', icon: FolderOpen },
                      { key: 'products', label: 'منتجات محددة', icon: Tag },
                    ].map((scope) => (
                      <button
                        key={scope.key}
                        type="button"
                        onClick={() => {
                          setDiscountType(scope.key as any);
                          setTargetIds([]);
                        }}
                        className={`py-2.5 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                          discountType === scope.key
                            ? 'border-admin-accent bg-admin-accent/5 text-admin-accent font-bold'
                            : 'border-admin-border hover:bg-admin-bg-subtle text-admin-text-secondary'
                        }`}
                      >
                        <scope.icon className="w-4 h-4" />
                        <span className="text-[10px] font-black">{scope.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope Target Selection checkboxes grid */}
                {discountType === 'categories' && (
                  <div className="space-y-2 bg-admin-bg-subtle/30 border border-admin-border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <span className="text-[10px] font-bold text-admin-text-secondary block mb-2">اختر الأقسام التي يطبق عليها الخصم:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories.map((cat: any) => (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs font-bold transition-all ${
                            targetIds.includes(cat.id)
                              ? 'border-admin-accent bg-admin-accent/5 text-admin-text-primary'
                              : 'border-admin-border text-admin-text-secondary hover:bg-admin-bg-subtle'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={targetIds.includes(cat.id)}
                            onChange={() => handleToggleTarget(cat.id)}
                            className="sr-only"
                          />
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            targetIds.includes(cat.id) ? 'bg-admin-accent border-admin-accent text-white' : 'border-zinc-400'
                          }`}>
                            {targetIds.includes(cat.id) && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span>{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {discountType === 'products' && (
                  <div className="space-y-2 bg-admin-bg-subtle/30 border border-admin-border rounded-lg p-3 max-h-56 overflow-y-auto">
                    <span className="text-[10px] font-bold text-admin-text-secondary block mb-2">اختر المنتجات التي يطبق عليها الخصم:</span>
                    <div className="space-y-4">
                      {categories.map((cat: any) => {
                        const catProds = products.filter((p: any) => p.categoryId === cat.id);
                        if (catProds.length === 0) return null;
                        return (
                          <div key={cat.id} className="space-y-2">
                            <h4 className="text-[9px] font-bold text-admin-accent bg-admin-accent/5 px-2 py-0.5 rounded inline-block">{cat.name}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {catProds.map((prod: any) => (
                                <label
                                  key={prod.id}
                                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs font-bold transition-all ${
                                    targetIds.includes(prod.id)
                                      ? 'border-admin-accent bg-admin-accent/5 text-admin-text-primary'
                                      : 'border-admin-border text-admin-text-secondary hover:bg-admin-bg-subtle'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={targetIds.includes(prod.id)}
                                    onChange={() => handleToggleTarget(prod.id)}
                                    className="sr-only"
                                  />
                                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                    targetIds.includes(prod.id) ? 'bg-admin-accent border-admin-accent text-white' : 'border-zinc-400'
                                  }`}>
                                    {targetIds.includes(prod.id) && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <div className="flex justify-between items-center w-full ml-1">
                                    <span className="truncate max-w-[120px]">{prod.name}</span>
                                    <span className="text-[9px] text-admin-text-muted font-mono">{prod.price} ج.م</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Schedule settings */}
        <div className="space-y-6">
          <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-admin-border/50 pb-2">
              <Calendar className="w-4 h-4 text-admin-accent" />
              <span className="font-bold text-xs text-admin-text-primary">جدولة التفعيل</span>
            </div>

            {enabled ? (
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-[11px] text-admin-text-secondary font-bold block mb-1.5">طريقة التجديل</label>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between bg-admin-bg-subtle border border-admin-border rounded-lg px-3 py-2 text-xs text-admin-text-primary focus:outline-none focus:border-admin-accent font-bold cursor-pointer transition-all"
                  >
                    <span>
                      {scheduleType === 'always' && 'دائم (مفعل باستمرار)'}
                      {scheduleType === 'weekly' && 'متكرر أسبوعياً (أيام محددة)'}
                      {scheduleType === 'custom_range' && 'فترة زمنية محددة (تاريخ بدء وانتهاء)'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-admin-text-secondary transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                        
                        <motion.ul
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 left-0 mt-1 bg-admin-bg-elevated border border-admin-border rounded-lg shadow-lg py-1 z-20"
                        >
                          {[
                            { value: 'always', label: 'دائم (مفعل باستمرار)' },
                            { value: 'weekly', label: 'متكرر أسبوعياً (أيام محددة)' },
                            { value: 'custom_range', label: 'فترة زمنية محددة (تاريخ بدء وانتهاء)' }
                          ].map((opt) => (
                            <li key={opt.value}>
                              <button
                                type="button"
                                onClick={() => {
                                  setScheduleType(opt.value as any);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors hover:bg-admin-accent hover:text-white cursor-pointer ${
                                  scheduleType === opt.value
                                    ? 'text-admin-accent bg-admin-accent/5'
                                    : 'text-admin-text-primary'
                                }`}
                              >
                                {opt.label}
                              </button>
                            </li>
                          ))}
                        </motion.ul>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {scheduleType === 'weekly' && (
                  <div className="space-y-2 pt-2 border-t border-admin-border/50">
                    <span className="text-[10px] font-bold text-admin-text-secondary block">اختر أيام الأسبوع للتفعيل:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DAYS_OF_WEEK.map((day) => (
                        <label
                          key={day.value}
                          className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer text-xs font-bold transition-all ${
                            daysOfWeek.includes(day.value)
                              ? 'border-admin-accent bg-admin-accent/5 text-admin-text-primary'
                              : 'border-admin-border text-admin-text-secondary hover:bg-admin-bg-subtle'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={daysOfWeek.includes(day.value)}
                            onChange={() => handleToggleDay(day.value)}
                            className="sr-only"
                          />
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            daysOfWeek.includes(day.value) ? 'bg-admin-accent border-admin-accent text-white' : 'border-zinc-400'
                          }`}>
                            {daysOfWeek.includes(day.value) && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span>{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {scheduleType === 'custom_range' && (
                  <div className="space-y-3 pt-2 border-t border-admin-border/50">
                    <div>
                      <label className="text-[10px] text-admin-text-secondary font-bold block mb-1">تاريخ ووقت البدء</label>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-admin-bg-subtle border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-text-primary focus:outline-none focus:border-admin-accent font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-admin-text-secondary font-bold block mb-1">تاريخ ووقت الانتهاء</label>
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-admin-bg-subtle border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-text-primary focus:outline-none focus:border-admin-accent font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-admin-text-muted py-4">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold">قم بتفعيل الخصم من اليمين لتتمكن من ضبط جدولة التفعيل.</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saveDiscountMutation.isPending}
            className="w-full py-2.5 bg-admin-accent text-white font-extrabold text-xs rounded-xl shadow-lg shadow-admin-accent/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer border-none"
          >
            {saveDiscountMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>حفظ إعدادات الخصم</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
