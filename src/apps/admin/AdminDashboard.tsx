import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, Edit2, Check, Trash2, Download, ToggleLeft, 
  ToggleRight, DollarSign, Calendar, TrendingUp, ShoppingBag, 
  MapPin, BarChart3, LogOut, ArrowUp, ArrowDown, X, 
  ImagePlus, QrCode, Clock, Flame, Star
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket';
import { useAuthStore } from '../../shared/store/authStore';
import type { Category, Product, Table, Order } from '../../shared/types';

// ===== IMAGE UPLOAD COMPONENT =====
function ImageUploadZone({ 
  preview, 
  onFileChange, 
  onClear,
  label = 'اسحب الصورة هنا أو اضغط للاختيار' 
}: { 
  preview: string | null; 
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  onClear: () => void;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      onFileChange(fakeEvent);
    }
  };

  return (
    <div
      className={`upload-zone ${preview ? 'has-preview' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => !preview && fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
      {preview ? (
        <div className="relative group">
          <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-2xl" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="p-2 bg-white/20 rounded-xl text-white hover:bg-white/30 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="p-2 bg-red-500/30 rounded-xl text-white hover:bg-red-500/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="w-12 h-12 rounded-xl bg-dark-800/60 flex items-center justify-center mb-3">
            <ImagePlus className="w-5 h-5 text-dark-500" />
          </div>
          <p className="text-xs text-dark-500 text-center">{label}</p>
          <p className="text-[10px] text-dark-600 mt-1">PNG, JPG حتى 5MB</p>
        </div>
      )}
    </div>
  );
}

// ===== MAIN DASHBOARD =====
export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, restaurant, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'tables' | 'orders' | 'analytics'>('categories');

  // Categories states
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Products states
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [prodImage, setProdImage] = useState<File | null>(null);
  const [prodImagePreview, setProdImagePreview] = useState<string | null>(null);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [inlinePriceEdit, setInlinePriceEdit] = useState<{ id: string; price: string } | null>(null);

  // Tables states
  const [tableNum, setTableNum] = useState('');
  const [tableLabel, setTableLabel] = useState('');

  // Orders Filter states
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');

  // Analytics states
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');

  // Auth Guard
  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
    } else if (user.role !== 'admin') {
      toast.error('غير مصرح لك بدخول لوحة المدير.');
      navigate('/staff');
    }
  }, [user, navigate]);

  // Sound Synthesizer Chime
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playNote(660, audioCtx.currentTime, 0.12);
      playNote(880, audioCtx.currentTime + 0.12, 0.20);
    } catch (e) {
      console.warn('Audio Context failed to play:', e);
    }
  };

  // Audio Context unlocker
  useEffect(() => {
    const resumeAudio = () => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    };
    window.addEventListener('click', resumeAudio);
    return () => window.removeEventListener('click', resumeAudio);
  }, []);

  // Socket connection for Admin
  useEffect(() => {
    if (!user || !restaurant?.id) return;

    const handleConnect = () => {
      console.log('Admin socket connected, joining restaurant:', restaurant.id);
      socket.emit('join_restaurant', restaurant.id);
    };

    socket.on('connect', handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    socket.on('new_order', (_data: { order: Order }) => {
      playAlertSound();
      toast('وصل طلب جديد للمطعم!', { icon: '🍔', duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    });

    socket.on('order_status_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    });

    socket.on('table_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('new_order');
      socket.off('order_status_updated');
      socket.off('table_status_changed');
    };
  }, [user, restaurant, queryClient]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // ==================== QUERIES ====================
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.data as Category[];
    },
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data.data as Product[];
    },
    enabled: !!user,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['admin-tables'],
    queryFn: async () => {
      const response = await api.get('/tables');
      return response.data.data as Table[];
    },
    enabled: !!user,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders', orderStatusFilter, orderStartDate, orderEndDate],
    queryFn: async () => {
      let url = '/orders?';
      if (orderStatusFilter) url += `status=${orderStatusFilter}&`;
      if (orderStartDate) url += `startDate=${orderStartDate}&`;
      if (orderEndDate) url += `endDate=${orderEndDate}&`;
      const response = await api.get(url);
      return response.data.data as Order[];
    },
    enabled: !!user,
  });

  // Analytics queries
  const { data: salesStats } = useQuery({
    queryKey: ['admin-analytics-sales', salesPeriod],
    queryFn: async () => {
      const response = await api.get(`/analytics/sales?period=${salesPeriod}`);
      return response.data.data;
    },
    enabled: !!user && activeTab === 'analytics',
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ['admin-analytics-products'],
    queryFn: async () => {
      const response = await api.get('/analytics/products');
      return response.data.data;
    },
    enabled: !!user && activeTab === 'analytics',
  });

  const { data: tableStats = [] } = useQuery({
    queryKey: ['admin-analytics-tables'],
    queryFn: async () => {
      const response = await api.get('/analytics/tables');
      return response.data.data;
    },
    enabled: !!user && activeTab === 'analytics',
  });

  const { data: peakHours = [] } = useQuery({
    queryKey: ['admin-analytics-peakhours'],
    queryFn: async () => {
      const response = await api.get('/analytics/peak-hours');
      return response.data.data;
    },
    enabled: !!user && activeTab === 'analytics',
  });

  // ==================== MUTATIONS ====================
  const catMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      if (editingCatId) {
        return api.put(`/categories/${editingCatId}`, fd);
      }
      return api.post('/categories', fd);
    },
    onSuccess: () => {
      toast.success(editingCatId ? 'تم تعديل القسم.' : 'تم إضافة القسم.');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      resetCatForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ القسم.');
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف القسم بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const reorderCatMutation = useMutation({
    mutationFn: async (items: { id: string; order: number }[]) => {
      await api.patch('/categories/reorder', { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const prodMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      if (editingProdId) {
        return api.put(`/products/${editingProdId}`, fd);
      }
      return api.post('/products', fd);
    },
    onSuccess: () => {
      toast.success(editingProdId ? 'تم تعديل المنتج.' : 'تم إضافة المنتج.');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      resetProdForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ المنتج.');
    },
  });

  const toggleProdMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/products/${id}/toggle`);
    },
    onSuccess: () => {
      toast.success('تم تعديل حالة المنتج.');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const inlinePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      await api.patch(`/products/${id}/price`, { price });
    },
    onSuccess: () => {
      toast.success('تم تعديل السعر بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setInlinePriceEdit(null);
    },
  });

  const deleteProdMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف المنتج بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const reorderProdMutation = useMutation({
    mutationFn: async (items: { id: string; order: number }[]) => {
      await api.patch('/products/reorder', { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async () => {
      await api.post('/tables', { number: Number(tableNum), label: tableLabel });
    },
    onSuccess: () => {
      toast.success('تم إنشاء الطاولة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
      setTableNum('');
      setTableLabel('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل إنشاء الطاولة.');
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tables/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف الطاولة.');
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    },
  });

  // ==================== FORM HELPERS ====================
  const handleCatImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCatImage(file);
      setCatImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProdImage(file);
      setProdImagePreview(URL.createObjectURL(file));
    }
  };

  const resetCatForm = () => {
    setCatName('');
    setCatDesc('');
    setCatImage(null);
    setCatImagePreview(null);
    setEditingCatId(null);
  };

  const resetProdForm = () => {
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdCatId('');
    setProdImage(null);
    setProdImagePreview(null);
    setEditingProdId(null);
  };

  const submitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) {
      toast.error('يرجى إدخال اسم القسم.');
      return;
    }
    const fd = new FormData();
    fd.append('name', catName);
    fd.append('description', catDesc);
    if (catImage) {
      fd.append('image', catImage);
    }
    catMutation.mutate(fd);
  };

  const submitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodCatId) {
      toast.error('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    const fd = new FormData();
    fd.append('name', prodName);
    fd.append('description', prodDesc);
    fd.append('price', prodPrice);
    fd.append('categoryId', prodCatId);
    if (prodImage) {
      fd.append('image', prodImage);
    }
    prodMutation.mutate(fd);
  };

  const shiftCategoryOrder = (index: number, direction: 'up' | 'down') => {
    const list = [...categories];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index].order;
    list[index].order = list[targetIdx].order;
    list[targetIdx].order = temp;
    const payload = list.map(c => ({ id: c.id, order: c.order }));
    reorderCatMutation.mutate(payload);
  };

  const shiftProductOrder = (index: number, direction: 'up' | 'down') => {
    const list = [...products];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index].order;
    list[index].order = list[targetIdx].order;
    list[targetIdx].order = temp;
    const payload = list.map(p => ({ id: p.id, order: p.order }));
    reorderProdMutation.mutate(payload);
  };

  if (!user || !restaurant) return null;

  const tabs = [
    { key: 'categories' as const, label: 'الأقسام', icon: FolderPlus, count: categories.length },
    { key: 'products' as const, label: 'المنتجات', icon: ShoppingBag, count: products.length },
    { key: 'tables' as const, label: 'الطاولات', icon: MapPin, count: tables.length },
    { key: 'orders' as const, label: 'الطلبات', icon: Calendar },
    { key: 'analytics' as const, label: 'التحليلات', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col" dir="rtl">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.1)' }
      }} />

      {/* ===== HEADER ===== */}
      <header className="glass sticky top-0 z-30 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center shadow-glow-sm">
            <span className="text-xl">👑</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{restaurant.name}</h1>
            <p className="text-xs text-dark-500">لوحة التحكم الرئيسية</p>
          </div>
        </div>

        <motion.button 
          onClick={handleLogout}
          whileTap={{ scale: 0.9 }}
          className="btn-icon hover:text-red-400 hover:border-red-500/30"
        >
          <LogOut className="w-4.5 h-4.5" />
        </motion.button>
      </header>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-6">
        {/* Sidebar */}
        <aside className="w-full md:w-60 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible scrollbar-hide pb-2 md:pb-0">
          {tabs.map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-3 whitespace-nowrap ${
                activeTab === tab.key ? 'nav-item-active' : 'nav-item'
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto ${
                  activeTab === tab.key ? 'bg-dark-950/20 text-dark-950' : 'bg-dark-800/60 text-dark-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </motion.button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* ==================== CATEGORIES TAB ==================== */}
              {activeTab === 'categories' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">إدارة أقسام المنيو</h2>
                    <span className="badge-neutral">{categories.length} قسم</span>
                  </div>
                  
                  {/* Category form */}
                  <form onSubmit={submitCategory} className="glass-card rounded-2xl p-6 space-y-5 max-w-2xl">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      {editingCatId ? 'تعديل القسم المحدد' : 'إضافة قسم جديد'}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs text-dark-400 font-medium">اسم القسم *</label>
                        <input
                          type="text"
                          required
                          value={catName}
                          onChange={(e) => setCatName(e.target.value)}
                          placeholder="مثال: مشروبات باردة"
                          className="input-premium text-right text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs text-dark-400 font-medium">الوصف (اختياري)</label>
                        <input
                          type="text"
                          value={catDesc}
                          onChange={(e) => setCatDesc(e.target.value)}
                          placeholder="وصف مختصر للقسم..."
                          className="input-premium text-right text-sm"
                        />
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-1.5">
                      <label className="block text-xs text-dark-400 font-medium">صورة القسم</label>
                      <ImageUploadZone
                        preview={catImagePreview}
                        onFileChange={handleCatImageChange}
                        onClear={() => { setCatImage(null); setCatImagePreview(null); }}
                      />
                    </div>

                    <div className="flex gap-3 pt-1">
                      <motion.button 
                        type="submit" 
                        disabled={catMutation.isPending} 
                        whileTap={{ scale: 0.97 }}
                        className="btn-primary text-xs"
                      >
                        {catMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          editingCatId ? 'حفظ التعديلات' : 'إضافة القسم'
                        )}
                      </motion.button>
                      {editingCatId && (
                        <button type="button" onClick={resetCatForm} className="btn-ghost text-xs">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Categories list */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-white text-sm">الأقسام الحالية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categories.map((cat, idx) => (
                        <motion.div
                          key={cat.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="glass-card-hover rounded-2xl p-4 flex justify-between items-center gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {cat.image?.url ? (
                              <img src={cat.image.url} alt={cat.name} className="w-14 h-14 rounded-xl object-cover border border-dark-700/30 flex-shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-dark-800/60 flex items-center justify-center text-dark-500 flex-shrink-0">
                                <FolderPlus className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-sm truncate">{cat.name}</h4>
                              <p className="text-[11px] text-dark-500 truncate">{cat.description || 'بدون وصف'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => shiftCategoryOrder(idx, 'up')} disabled={idx === 0} className="btn-icon p-1.5 disabled:opacity-20">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => shiftCategoryOrder(idx, 'down')} disabled={idx === categories.length - 1} className="btn-icon p-1.5 disabled:opacity-20">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingCatId(cat.id);
                                setCatName(cat.name);
                                setCatDesc(cat.description || '');
                                setCatImagePreview(cat.image?.url || null);
                              }}
                              className="btn-icon p-1.5 hover:text-accent-sky hover:border-accent-sky/30"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => { if(confirm('هل تريد حذف القسم بالكامل؟')) deleteCatMutation.mutate(cat.id); }} 
                              className="btn-icon p-1.5 hover:text-red-400 hover:border-red-500/30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== PRODUCTS TAB ==================== */}
              {activeTab === 'products' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">إدارة منتجات المنيو</h2>
                    <span className="badge-neutral">{products.length} منتج</span>
                  </div>
                  
                  {/* Product Form */}
                  <form onSubmit={submitProduct} className="glass-card rounded-2xl p-6 space-y-5 max-w-2xl">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      {editingProdId ? 'تعديل المنتج المحدد' : 'إضافة منتج جديد'}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs text-dark-400 font-medium">اسم المنتج *</label>
                        <input
                          type="text"
                          required
                          value={prodName}
                          onChange={(e) => setProdName(e.target.value)}
                          placeholder="مثال: كابتشينو دوبل"
                          className="input-premium text-right text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs text-dark-400 font-medium">القسم *</label>
                        <select
                          required
                          value={prodCatId}
                          onChange={(e) => setProdCatId(e.target.value)}
                          className="input-premium text-right text-sm"
                        >
                          <option value="">اختر القسم...</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs text-dark-400 font-medium">السعر (ج.م) *</label>
                        <input
                          type="number"
                          required
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          placeholder="مثال: 45"
                          className="input-premium text-right text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs text-dark-400 font-medium">الوصف والمكونات</label>
                        <input
                          type="text"
                          value={prodDesc}
                          onChange={(e) => setProdDesc(e.target.value)}
                          placeholder="مثال: حبوب قهوة فاخرة مع حليب رغوي"
                          className="input-premium text-right text-sm"
                        />
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-1.5">
                      <label className="block text-xs text-dark-400 font-medium">صورة المنتج</label>
                      <ImageUploadZone
                        preview={prodImagePreview}
                        onFileChange={handleProdImageChange}
                        onClear={() => { setProdImage(null); setProdImagePreview(null); }}
                      />
                    </div>

                    <div className="flex gap-3 pt-1">
                      <motion.button 
                        type="submit" 
                        disabled={prodMutation.isPending}
                        whileTap={{ scale: 0.97 }}
                        className="btn-primary text-xs"
                      >
                        {prodMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          editingProdId ? 'حفظ التعديلات' : 'إضافة المنتج'
                        )}
                      </motion.button>
                      {editingProdId && (
                        <button type="button" onClick={resetProdForm} className="btn-ghost text-xs">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Products Table */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-white text-sm">المنتجات الحالية</h3>
                    <div className="glass-card rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="table-premium">
                          <thead>
                            <tr>
                              <th>المنتج</th>
                              <th>القسم</th>
                              <th>السعر</th>
                              <th>الحالة</th>
                              <th className="text-left">التحكم</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((prod, idx) => {
                              const cat = categories.find(c => c.id === prod.categoryId);
                              const isEditingPrice = inlinePriceEdit?.id === prod.id;

                              return (
                                <motion.tr 
                                  key={prod.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: idx * 0.03 }}
                                >
                                  <td>
                                    <div className="flex items-center gap-3">
                                      {prod.image?.url ? (
                                        <img src={prod.image.url} alt={prod.name} className="w-10 h-10 rounded-lg object-cover border border-dark-700/30" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-dark-800/60 flex items-center justify-center">
                                          <ShoppingBag className="w-4 h-4 text-dark-600" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-bold text-white block text-sm">{prod.name}</span>
                                        <span className="text-[11px] text-dark-500 line-clamp-1">{prod.description}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-dark-400 text-sm">{cat?.name || 'غير معروف'}</td>
                                  
                                  {/* Inline Price edit */}
                                  <td>
                                    {isEditingPrice ? (
                                      <div className="flex items-center gap-2 max-w-[120px]">
                                        <input
                                          type="number"
                                          value={inlinePriceEdit.price}
                                          onChange={(e) => setInlinePriceEdit({ id: prod.id, price: e.target.value })}
                                          className="input-premium text-center text-xs py-1.5 px-2"
                                        />
                                        <button 
                                          onClick={() => inlinePriceMutation.mutate({ id: prod.id, price: Number(inlinePriceEdit.price) })} 
                                          className="text-accent-emerald hover:text-emerald-300"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 group">
                                        <span className="font-bold text-primary-500">{prod.price} ج.م</span>
                                        <button 
                                          onClick={() => setInlinePriceEdit({ id: prod.id, price: String(prod.price) })} 
                                          className="opacity-0 group-hover:opacity-100 text-dark-500 hover:text-white transition-opacity"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>

                                  {/* Availability Toggle */}
                                  <td>
                                    <button onClick={() => toggleProdMutation.mutate(prod.id)} className="transition-colors">
                                      {prod.isAvailable ? (
                                        <span className="badge-success">
                                          <ToggleRight className="w-4 h-4" /> متاح
                                        </span>
                                      ) : (
                                        <span className="badge-danger">
                                          <ToggleLeft className="w-4 h-4" /> نفد
                                        </span>
                                      )}
                                    </button>
                                  </td>

                                  <td className="text-left">
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => shiftProductOrder(idx, 'up')} disabled={idx === 0} className="btn-icon p-1.5 disabled:opacity-20">
                                        <ArrowUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => shiftProductOrder(idx, 'down')} disabled={idx === products.length - 1} className="btn-icon p-1.5 disabled:opacity-20">
                                        <ArrowDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingProdId(prod.id);
                                          setProdName(prod.name);
                                          setProdDesc(prod.description || '');
                                          setProdPrice(String(prod.price));
                                          setProdCatId(prod.categoryId);
                                          setProdImagePreview(prod.image?.url || null);
                                        }}
                                        className="btn-icon p-1.5 hover:text-accent-sky hover:border-accent-sky/30"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => { if(confirm('حذف هذا المنتج؟')) deleteProdMutation.mutate(prod.id); }} 
                                        className="btn-icon p-1.5 hover:text-red-400 hover:border-red-500/30"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== TABLES TAB ==================== */}
              {activeTab === 'tables' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">إدارة طاولات المطعم</h2>
                    <span className="badge-neutral">{tables.length} طاولة</span>
                  </div>
                  
                  {/* Table creation form */}
                  <div className="glass-card rounded-2xl p-6 max-w-lg space-y-5">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      إضافة طاولة جديدة
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs text-dark-400 font-medium">رقم الطاولة *</label>
                        <input
                          type="number"
                          required
                          value={tableNum}
                          onChange={(e) => setTableNum(e.target.value)}
                          placeholder="مثال: 5"
                          className="input-premium text-right text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs text-dark-400 font-medium">الموقع (اختياري)</label>
                        <input
                          type="text"
                          value={tableLabel}
                          onChange={(e) => setTableLabel(e.target.value)}
                          placeholder="مثال: VIP بالخارج"
                          className="input-premium text-right text-sm"
                        />
                      </div>
                    </div>
                    <motion.button
                      onClick={() => createTableMutation.mutate()}
                      disabled={createTableMutation.isPending}
                      whileTap={{ scale: 0.97 }}
                      className="btn-primary text-xs flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      إنشاء الطاولة وتوليد QR
                    </motion.button>
                  </div>

                  {/* Tables grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tables.map((table, idx) => (
                      <motion.div
                        key={table.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="glass-card-hover rounded-2xl p-5 flex flex-col items-center gap-4 text-center"
                      >
                        <div>
                          <h4 className="font-extrabold text-white text-lg">طاولة {table.number}</h4>
                          {table.label && <span className="text-xs text-dark-500">{table.label}</span>}
                        </div>

                        {table.qrCode?.url && (
                          <div className="bg-white p-3 rounded-xl shadow-lg">
                            <img src={table.qrCode.url} alt="QR Code" className="w-28 h-28" />
                          </div>
                        )}

                        <div className="flex gap-2 w-full">
                          <a
                            href={`${api.defaults.baseURL}/tables/${table.id}/qr`}
                            download
                            className="flex-1 btn-ghost flex items-center justify-center gap-2 text-xs hover:text-primary-500 hover:border-primary-500/30"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تحميل QR</span>
                          </a>
                          <button
                            onClick={() => { if(confirm('هل تريد حذف هذه الطاولة؟')) deleteTableMutation.mutate(table.id); }}
                            className="btn-icon hover:text-red-400 hover:border-red-500/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================== ORDERS TAB ==================== */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white">سجل طلبات المطعم</h2>
                  
                  {/* Filters */}
                  <div className="glass-card rounded-2xl p-5 flex flex-wrap gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="block text-xs text-dark-400 font-medium">حالة الطلب</label>
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="input-premium text-right text-xs py-2"
                      >
                        <option value="">كل الحالات</option>
                        <option value="pending">قيد الانتظار</option>
                        <option value="accepted">مقبول</option>
                        <option value="preparing">قيد التحضير</option>
                        <option value="ready">جاهز للاستلام</option>
                        <option value="delivered">تم التوصيل</option>
                        <option value="cancelled">ملغي</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs text-dark-400 font-medium">من تاريخ</label>
                      <input
                        type="date"
                        value={orderStartDate}
                        onChange={(e) => setOrderStartDate(e.target.value)}
                        className="input-premium text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs text-dark-400 font-medium">إلى تاريخ</label>
                      <input
                        type="date"
                        value={orderEndDate}
                        onChange={(e) => setOrderEndDate(e.target.value)}
                        className="input-premium text-xs py-2"
                      />
                    </div>
                  </div>

                  {/* Orders list */}
                  <div className="space-y-3">
                    {orders.length === 0 ? (
                      <div className="glass-card rounded-2xl p-16 text-center text-dark-500">
                        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">لا توجد طلبات تطابق معايير التصفية.</p>
                      </div>
                    ) : (
                      orders.map((order, idx) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="glass-card-hover rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] text-dark-500 font-mono bg-dark-800/50 px-2 py-0.5 rounded-md">
                                #{order.id.slice(-6).toUpperCase()}
                              </span>
                              <span className={
                                order.status === 'delivered' ? 'badge-success' :
                                order.status === 'cancelled' ? 'badge-danger' :
                                'badge-warning'
                              }>
                                {order.status === 'delivered' ? 'تم التوصيل' :
                                 order.status === 'cancelled' ? 'ملغي' : 'نشط'}
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-sm">طاولة {order.tableNumber}</h4>
                            <p className="text-xs text-dark-500">
                              {new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>

                          <div className="flex-1 max-w-md">
                            <p className="text-xs text-dark-400 leading-relaxed">
                              {order.items.map(i => `${i.name} (x${i.quantity})`).join('، ')}
                            </p>
                          </div>

                          <div className="text-left font-bold text-primary-500 text-lg whitespace-nowrap">
                            {order.totalAmount} ج.م
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ==================== ANALYTICS TAB ==================== */}
              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-white">التقارير والتحليلات</h2>
                    <div className="glass-card rounded-xl p-1 flex gap-1">
                      {[
                        { key: 'day', label: 'اليوم' },
                        { key: 'week', label: 'الأسبوع' },
                        { key: 'month', label: 'الشهر' },
                        { key: 'year', label: 'العام' },
                      ].map(p => (
                        <button
                          key={p.key}
                          onClick={() => setSalesPeriod(p.key as any)}
                          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                            salesPeriod === p.key 
                              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-dark-950 font-bold shadow-glow-sm' 
                              : 'text-dark-400 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats Cards */}
                  {salesStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { label: 'إجمالي المبيعات', value: `${salesStats.total} ج.م`, prev: `${salesStats.previousPeriod?.total || 0} ج.م`, icon: TrendingUp, color: 'text-primary-500' },
                        { label: 'عدد الطلبات', value: `${salesStats.ordersCount} طلب`, prev: `${salesStats.previousPeriod?.ordersCount || 0} طلب`, icon: ShoppingBag, color: 'text-accent-sky' },
                        { label: 'متوسط قيمة الطلب', value: `${salesStats.avgOrderValue} ج.م`, prev: `${salesStats.previousPeriod?.avgOrderValue || 0} ج.م`, icon: DollarSign, color: 'text-accent-emerald' },
                      ].map((stat, idx) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="stat-card"
                        >
                          <div className="relative z-10 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-dark-400 block mb-2">{stat.label}</span>
                              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                              <span className="text-[11px] text-dark-600 block mt-1.5">السابق: {stat.prev}</span>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-dark-800/30 flex items-center justify-center">
                              <stat.icon className={`w-6 h-6 ${stat.color} opacity-40`} />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Detailed Analytics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top Products */}
                    <div className="glass-card rounded-2xl p-6">
                      <h3 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-primary-500" />
                        أكثر 10 منتجات مبيعاً
                      </h3>
                      <div className="space-y-4">
                        {topProducts.length === 0 ? (
                          <p className="text-xs text-dark-500 text-center py-8">لا توجد بيانات مبيعات كافية</p>
                        ) : (
                          topProducts.map((p: any, idx: number) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-white font-medium flex items-center gap-2">
                                  {idx < 3 && <Star className="w-3 h-3 text-primary-500 fill-primary-500" />}
                                  {p.name}
                                  <span className="text-dark-600 font-mono">({p.count})</span>
                                </span>
                                <span className="text-primary-500 font-bold">{p.revenue} ج.م</span>
                              </div>
                              <div className="w-full bg-dark-800/40 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, (p.count / Math.max(...topProducts.map((p: any) => p.count))) * 100)}%` }}
                                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-1.5 rounded-full"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Table Stats */}
                    <div className="glass-card rounded-2xl p-6">
                      <h3 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-accent-sky" />
                        إنتاجية الطاولات
                      </h3>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
                        {tableStats.map((t: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-sm py-3 border-b border-dark-800/30 last:border-0">
                            <span className="font-medium text-white">طاولة {t.tableNumber}</span>
                            <span className="text-dark-500 text-xs">{t.ordersCount} أوردرات</span>
                            <span className="font-bold text-accent-emerald">{t.revenue} ج.م</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Peak Hours */}
                    <div className="glass-card rounded-2xl p-6 lg:col-span-2">
                      <h3 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent-violet" />
                        أوقات الذروة خلال اليوم
                      </h3>
                      <div className="flex items-end justify-between gap-1.5 h-44 pt-4 px-1">
                        {Array.from({ length: 24 }).map((_, hour) => {
                          const matched = peakHours.find((h: any) => h.hour === hour);
                          const ordersCount = matched ? matched.ordersCount : 0;
                          const maxVal = Math.max(...peakHours.map((h: any) => h.ordersCount), 1);
                          const heightPercent = `${(ordersCount / maxVal) * 100}%`;

                          return (
                            <div key={hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                              {ordersCount > 0 && (
                                <span className="absolute bottom-full mb-1 glass-card text-primary-500 text-[9px] font-bold py-0.5 px-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                  {ordersCount}
                                </span>
                              )}
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: heightPercent }}
                                transition={{ duration: 0.6, delay: hour * 0.02 }}
                                className={`w-full rounded-t-sm ${ordersCount > 0 ? 'bg-gradient-to-t from-primary-600 to-primary-400' : 'bg-dark-800/30'}`} 
                              />
                              <span className="text-[8px] text-dark-600 mt-1.5 font-mono">
                                {hour === 0 ? '12أ' : hour > 12 ? `${hour - 12}م` : `${hour}أ`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
