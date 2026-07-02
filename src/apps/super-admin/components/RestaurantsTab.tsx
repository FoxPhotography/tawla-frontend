import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Lock, Eye, EyeOff, Activity, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import RestaurantCard from './RestaurantCard';

interface RestaurantsTabProps {
  restaurants: any[];
  loadingRest: boolean;
  onOpenRestDetails: (rest: any) => void;
}

export default function RestaurantsTab({
  restaurants,
  loadingRest,
  onOpenRestDetails
}: RestaurantsTabProps) {
  const queryClient = useQueryClient();

  // Form states
  const [restName, setRestName] = useState('');
  const [restSlug, setRestSlug] = useState('');
  const [restPhone, setRestPhone] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Mutation
  const createRestMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: restName,
        slug: restSlug.toLowerCase().trim().replace(/\s+/g, '-'),
        phone: restPhone,
        address: restAddress,
        ownerName,
        username: ownerUsername.toLowerCase().trim(),
        password: ownerPassword,
      };
      return api.post('/super-admin/restaurants', payload);
    },
    onSuccess: () => {
      toast.success('تم تسجيل المطعم الجديد وإنشاء الحساب بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      // Reset form
      setRestName('');
      setRestSlug('');
      setRestPhone('');
      setRestAddress('');
      setOwnerName('');
      setOwnerUsername('');
      setOwnerPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل إضافة المطعم. تأكد من البيانات.');
    },
  });

  const handleCreateRest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName || !restSlug || !ownerName || !ownerUsername || !ownerPassword) {
      toast.error('يرجى ملء جميع الحقول المطلوبة لإنشاء المطعم.');
      return;
    }
    createRestMutation.mutate();
  };

  // Stagger entry animations
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
      {/* Create Restaurant Form */}
      <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card relative">
        <h2 className="text-base font-extrabold text-admin-text-primary mb-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent">
            <Plus className="w-5 h-5" />
          </div>
          <span>تسجيل مطعم / كافيه جديد على الشبكة</span>
        </h2>
        
        <form onSubmit={handleCreateRest} className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-admin-text-secondary">اسم الكافيه أو المطعم *</label>
              <input
                type="text"
                required
                value={restName}
                onChange={(e) => {
                  setRestName(e.target.value);
                  setRestSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '-'));
                }}
                placeholder="مثال: سولو كافيه"
                className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent focus:shadow-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all outline-none focus:outline-none placeholder-admin-text-muted/40"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-admin-text-secondary">رابط الـ QR الفريد (Slug) *</label>
              <input
                type="text"
                required
                value={restSlug}
                onChange={(e) => setRestSlug(e.target.value)}
                placeholder="مثال: solo-cafe"
                className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent focus:shadow-admin-accent text-admin-text-primary font-mono rounded-lg px-4 py-2.5 text-xs font-bold transition-all outline-none focus:outline-none placeholder-admin-text-muted/40 text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-admin-text-secondary">رقم هاتف الكافيه</label>
              <input
                type="text"
                value={restPhone}
                onChange={(e) => setRestPhone(e.target.value)}
                placeholder="رقم الهاتف للتواصل"
                className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent focus:shadow-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all outline-none focus:outline-none placeholder-admin-text-muted/40"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-admin-text-secondary">العنوان الجغرافي بالتفصيل</label>
              <input
                type="text"
                value={restAddress}
                onChange={(e) => setRestAddress(e.target.value)}
                placeholder="الشارع، الحي، المدينة"
                className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent focus:shadow-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all outline-none focus:outline-none placeholder-admin-text-muted/40"
              />
            </div>
          </div>

          <div className="border-t border-admin-border pt-5 mt-3">
            <h3 className="text-sm font-extrabold text-admin-accent mb-4 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-admin-accent" />
              <span>بيانات حساب المدير المشرف للمطعم</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">اسم مالك المطعم *</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="الاسم الكامل"
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent focus:shadow-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all outline-none focus:outline-none placeholder-admin-text-muted/40"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">اسم المستخدم (للوجين) *</label>
                <input
                  type="text"
                  required
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  placeholder="اسم مستخدم فريد"
                  className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent focus:shadow-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all outline-none focus:outline-none placeholder-admin-text-muted/40"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-text-secondary">رمز المرور *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="رمز حماية قوي"
                    className="w-full bg-admin-bg-base border border-admin-border focus:border-admin-accent focus:shadow-admin-accent text-admin-text-primary rounded-lg px-4 py-2.5 text-xs font-bold transition-all outline-none focus:outline-none placeholder-admin-text-muted/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-admin-accent/10 hover:bg-admin-accent/20 text-admin-accent border border-admin-accent/20 p-1 rounded-lg transition-colors cursor-pointer outline-none focus:outline-none"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={createRestMutation.isPending}
            className="mt-4 py-3.5 px-6 bg-admin-accent hover:opacity-95 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-admin-accent cursor-pointer outline-none focus:outline-none border-none"
          >
            {createRestMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>تسجيل المطعم وتفعيل حساب الإشراف</span>
              </>
            )}
          </motion.button>
        </form>
      </div>

      {/* Restaurants Bento Grid */}
      <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card relative overflow-hidden">
        <h2 className="text-base font-extrabold text-admin-text-primary mb-5 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-admin-accent" />
            <span>المطاعم والاشتراكات المقيدة (اضغط للتفاصيل والتعديل)</span>
          </span>
          <span className="text-xs font-bold bg-admin-accent/10 text-admin-accent border border-admin-accent/20 px-3 py-1 rounded-full">{restaurants.length} كافيه</span>
        </h2>

        {loadingRest ? (
          <div className="py-16 flex justify-center items-center">
            <RefreshCw className="w-8 h-8 text-admin-accent animate-spin" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-admin-border rounded-xl bg-admin-bg-base">
            <p className="text-xs text-admin-text-muted font-bold">لا توجد مطاعم مسجلة على النظام حالياً.</p>
          </div>
        ) : (
          <motion.div 
            variants={listContainerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {restaurants.map((rest: any) => (
              <motion.div key={rest.id} variants={listItemVariants}>
                <RestaurantCard rest={rest} onClick={() => onOpenRestDetails(rest)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
