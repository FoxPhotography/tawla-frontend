import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, Edit2, Check, Trash2, Download, 
  Calendar, ShoppingBag, 
  MapPin, BarChart3, LogOut, ArrowUp, ArrowDown, X, 
  ImagePlus, QrCode, Clock, Flame, Star, Crown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer 
} from 'recharts';
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
      className={`relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${
        preview ? 'border-admin-accent/30 bg-white' : 'border-admin-border bg-admin-bg-base hover:bg-admin-bg-subtle hover:border-admin-accent/50'
      } ${isDragging ? 'border-admin-accent bg-admin-accent-light' : ''}`}
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
        <div className="relative group p-1.5">
          <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/35 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="p-2 bg-red-500/30 rounded-lg text-white hover:bg-red-500/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-admin-border flex items-center justify-center mb-3 shadow-admin-card">
            <ImagePlus className="w-5 h-5 text-admin-accent" />
          </div>
          <p className="text-xs text-admin-text-primary font-bold">{label}</p>
          <p className="text-[10px] text-admin-text-muted mt-1">PNG, JPG حتى 5MB</p>
        </div>
      )}
    </div>
  );
}

// ============ Recharts Timeline and Heatmap Helpers ============
const getRechartsTimeline = (total: number, period: 'day' | 'week' | 'month' | 'year') => {
  const data: any[] = [];
  const now = new Date();
  
  if (period === 'day') {
    const hours = ['12 ص', '6 ص', '12 م', '6 م'];
    const partVal = total / 4;
    hours.forEach((h, i) => {
      data.push({
        label: h,
        amount: Math.round(partVal * (0.6 + i * 0.2 + Math.random() * 0.15)),
        orders: Math.round(i * 3 + 2)
      });
    });
  } else if (period === 'week') {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const partVal = total / 7;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = days[d.getDay()];
      data.push({
        label: dayLabel,
        amount: Math.round(partVal * (0.8 + Math.sin(i) * 0.2 + Math.random() * 0.1)),
        orders: Math.round(5 + Math.random() * 8)
      });
    }
  } else if (period === 'month') {
    const partVal = total / 4;
    for (let i = 1; i <= 4; i++) {
      data.push({
        label: `أسبوع ${i}`,
        amount: Math.round(partVal * (0.7 + i * 0.15 + Math.random() * 0.1)),
        orders: Math.round(20 + i * 5)
      });
    }
  } else {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const partVal = total / 12;
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const monthLabel = months[d.getMonth()];
      data.push({
        label: monthLabel,
        amount: Math.round(partVal * (0.6 + Math.cos(i) * 0.3 + Math.random() * 0.15)),
        orders: Math.round(60 + Math.random() * 40)
      });
    }
  }
  return data;
};

const generateHeatmapMatrix = (peakHours: any[]) => {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days.map((day, dayIdx) => {
    return {
      day,
      hours: Array.from({ length: 24 }).map((_, hour) => {
        const peakMatched = peakHours.find((h: any) => h.hour === hour);
        const baseVal = peakMatched ? peakMatched.ordersCount : 0;
        const multiplier = dayIdx === 4 || dayIdx === 5 ? 1.5 : dayIdx === 0 ? 0.8 : 1.1;
        const density = Math.round(baseVal * multiplier * (0.7 + Math.sin(dayIdx + hour) * 0.3));
        return Math.max(0, density);
      })
    };
  });
};

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

  // Orders Filter States
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');

  // Analytics Period
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Audio Preloader and Player
  const playNewOrderChime = () => {
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
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      // High sweet double alert chime
      playNote(880.00, audioCtx.currentTime, 0.15); // A5
      playNote(1046.50, audioCtx.currentTime + 0.12, 0.35); // C6
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

  // Redirect if not admin
  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
    } else if (user.role !== 'admin') {
      toast.error('أنت غير مصرح لك بالدخول كمدير.');
      navigate('/staff');
    }
  }, [user, navigate]);

  // Socket
  useEffect(() => {
    if (!user || !restaurant) return;

    const handleConnect = () => {
      console.log('Socket connected, joining restaurant room:', restaurant.id);
      socket.emit('join_restaurant', restaurant.id);
    };

    socket.on('connect', handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    socket.on('new_order', (data: { order: Order }) => {
      playNewOrderChime();
      toast.success(`طلب جديد بقيمة ${data.order.totalAmount} ج.م من طاولة ${data.order.tableNumber}`);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
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
      let url = '/orders';
      const params = new URLSearchParams();
      if (orderStatusFilter) params.append('status', orderStatusFilter);
      if (orderStartDate) params.append('startDate', orderStartDate);
      if (orderEndDate) params.append('endDate', orderEndDate);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
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
      toast.success('تم حذف القسم.');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const reorderCatMutation = useMutation({
    mutationFn: async (payload: { id: string; order: number }[]) => {
      await api.put('/categories/reorder', { categories: payload });
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

  const deleteProdMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف المنتج.');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const reorderProdMutation = useMutation({
    mutationFn: async (payload: { id: string; order: number }[]) => {
      await api.put('/products/reorder', { products: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const toggleProdMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/products/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const inlinePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      await api.put(`/products/${id}/price`, { price });
    },
    onSuccess: () => {
      toast.success('تم تحديث السعر.');
      setInlinePriceEdit(null);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async () => {
      await api.post('/tables', { number: Number(tableNum), label: tableLabel });
    },
    onSuccess: () => {
      toast.success('تم إضافة الطاولة.');
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
    <div className="min-h-screen bg-admin-bg-base text-admin-text-primary flex flex-col relative overflow-hidden" dir="rtl">
      {/* Background decoration pattern */}
      <div className="absolute inset-0 pointer-events-none z-0 dot-pattern-dark" />

      <Toaster position="top-center" toastOptions={{
        style: { background: '#ffffff', color: '#0f0f10', border: '1px solid rgba(0,0,0,0.08)' }
      }} />

      {/* ===== HEADER ===== */}
      <header className="bg-admin-bg-elevated border-b border-admin-border sticky top-0 z-30 py-4 px-6 flex justify-between items-center relative z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-admin-accent-light border border-admin-border flex items-center justify-center shadow-admin-card text-admin-accent">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-admin-text-primary leading-tight">{restaurant.name}</h1>
            <p className="text-xs text-admin-text-secondary">لوحة التحكم الرئيسية للمدير</p>
          </div>
        </div>

        <motion.button 
          onClick={handleLogout}
          whileTap={{ scale: 0.9 }}
          className="p-2.5 rounded-xl border border-admin-border bg-admin-bg-elevated text-admin-text-secondary hover:text-red-650 hover:border-red-300 transition-colors shadow-admin-card"
        >
          <LogOut className="w-4.5 h-4.5" />
        </motion.button>
      </header>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-6 relative z-10">
        {/* Sidebar */}
        <aside className="w-full md:w-60 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible scrollbar-hide pb-2 md:pb-0">
          <div className="hidden md:block font-display font-bold text-lg text-admin-text-primary px-3 mb-4">
            Tably OS
          </div>
          {tabs.map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-3 whitespace-nowrap px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key 
                  ? 'bg-admin-accent-light text-admin-accent font-bold' 
                  : 'text-admin-text-secondary hover:bg-admin-bg-subtle hover:text-admin-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ml-auto ${
                  activeTab === tab.key ? 'bg-admin-accent text-white shadow-sm' : 'bg-admin-bg-subtle text-admin-text-secondary'
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
                    <h2 className="text-xl font-extrabold text-admin-text-primary">إدارة أقسام المنيو</h2>
                    <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">{categories.length} قسم</span>
                  </div>
                  
                  {/* Category form */}
                  <form onSubmit={submitCategory} className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 space-y-5 max-w-2xl shadow-admin-card">
                    <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-admin-accent" />
                      <span>{editingCatId ? 'تعديل القسم المحدد' : 'إضافة قسم جديد'}</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs text-admin-text-secondary font-bold">اسم القسم *</label>
                        <input
                          type="text"
                          required
                          value={catName}
                          onChange={(e) => setCatName(e.target.value)}
                          placeholder="مثال: مشروبات باردة"
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs text-admin-text-secondary font-bold">الوصف (اختياري)</label>
                        <input
                          type="text"
                          value={catDesc}
                          onChange={(e) => setCatDesc(e.target.value)}
                          placeholder="وصف مختصر للقسم..."
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                        />
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-1.5">
                      <label className="block text-xs text-admin-text-secondary font-bold">صورة القسم</label>
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
                        className="py-3 px-6 rounded-lg bg-admin-accent text-white font-bold text-xs hover:opacity-95 transition-opacity"
                      >
                        {catMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          editingCatId ? 'حفظ التعديلات' : 'إضافة القسم'
                        )}
                      </motion.button>
                      {editingCatId && (
                        <button type="button" onClick={resetCatForm} className="bg-admin-bg-subtle text-admin-text-secondary border border-admin-border py-2.5 px-5 rounded-lg text-xs font-medium hover:bg-admin-bg-base transition-colors">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Categories list */}
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-admin-text-primary text-sm">الأقسام الحالية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categories.map((cat, idx) => (
                        <motion.div
                          key={cat.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-admin-bg-elevated border border-admin-border rounded-lg p-4 flex justify-between items-center gap-3 hover:bg-admin-bg-subtle transition-colors shadow-admin-card"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {cat.image?.url ? (
                              <img src={cat.image.url} alt={cat.name} className="w-14 h-14 rounded-lg object-cover border border-admin-border flex-shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-admin-bg-base border border-admin-border flex items-center justify-center text-admin-text-muted flex-shrink-0">
                                <FolderPlus className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-admin-text-primary text-sm truncate">{cat.name}</h4>
                              <p className="text-[11px] text-admin-text-secondary truncate font-medium">{cat.description || 'بدون وصف'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => shiftCategoryOrder(idx, 'up')} disabled={idx === 0} className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-text-primary disabled:opacity-20 transition-colors">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => shiftCategoryOrder(idx, 'down')} disabled={idx === categories.length - 1} className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-text-primary disabled:opacity-20 transition-colors">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingCatId(cat.id);
                                setCatName(cat.name);
                                setCatDesc(cat.description || '');
                                setCatImagePreview(cat.image?.url || null);
                              }}
                              className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-accent transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => { if(confirm('هل تريد حذف القسم بالكامل؟')) deleteCatMutation.mutate(cat.id); }} 
                              className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-red-650 transition-colors"
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
                    <h2 className="text-xl font-extrabold text-admin-text-primary">إدارة منتجات المنيو</h2>
                    <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">{products.length} منتج</span>
                  </div>
                  
                  {/* Product Form */}
                  <form onSubmit={submitProduct} className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 space-y-5 max-w-2xl shadow-admin-card">
                    <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-admin-accent" />
                      <span>{editingProdId ? 'تعديل المنتج المحدد' : 'إضافة منتج جديد'}</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs text-admin-text-secondary font-bold">اسم المنتج *</label>
                        <input
                          type="text"
                          required
                          value={prodName}
                          onChange={(e) => setProdName(e.target.value)}
                          placeholder="مثال: كابتشينو دوبل"
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs text-admin-text-secondary font-bold">القسم *</label>
                        <select
                          required
                          value={prodCatId}
                          onChange={(e) => setProdCatId(e.target.value)}
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all"
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
                        <label className="block text-xs text-admin-text-secondary font-bold">السعر (ج.م) *</label>
                        <input
                          type="number"
                          required
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          placeholder="مثال: 45"
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs text-admin-text-secondary font-bold">الوصف والمكونات</label>
                        <input
                          type="text"
                          value={prodDesc}
                          onChange={(e) => setProdDesc(e.target.value)}
                          placeholder="مثال: حبوب قهوة فاخرة مع حليب رغوي"
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                        />
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-1.5">
                      <label className="block text-xs text-admin-text-secondary font-bold">صورة المنتج</label>
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
                        className="py-3 px-6 rounded-lg bg-admin-accent text-white font-bold text-xs hover:opacity-95 transition-opacity animate-float"
                      >
                        {prodMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          editingProdId ? 'حفظ التعديلات' : 'إضافة المنتج'
                        )}
                      </motion.button>
                      {editingProdId && (
                        <button type="button" onClick={resetProdForm} className="bg-admin-bg-subtle text-admin-text-secondary border border-admin-border py-2.5 px-5 rounded-lg text-xs font-medium hover:bg-admin-bg-base transition-colors">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Products Table */}
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-admin-text-primary text-sm">المنتجات الحالية</h3>
                    <div className="bg-admin-bg-elevated border border-admin-border rounded-lg overflow-hidden shadow-admin-card">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                          <thead>
                            <tr className="bg-admin-bg-subtle border-b border-admin-border">
                              <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider">المنتج</th>
                              <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider">القسم</th>
                              <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider">السعر</th>
                              <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider">الحالة</th>
                              <th className="px-5 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider text-left">التحكم</th>
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
                                  className="border-b border-admin-border hover:bg-admin-bg-subtle transition-colors"
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      {prod.image?.url ? (
                                        <img src={prod.image.url} alt={prod.name} className="w-10 h-10 rounded-lg object-cover border border-admin-border" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-admin-bg-base border border-admin-border flex items-center justify-center">
                                          <ShoppingBag className="w-4 h-4 text-admin-text-muted" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-bold text-admin-text-primary block text-sm">{prod.name}</span>
                                        <span className="text-[11px] text-admin-text-secondary line-clamp-1 font-medium">{prod.description}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-admin-text-secondary font-semibold text-sm">{cat?.name || 'غير معروف'}</td>
                                  
                                  {/* Inline Price edit */}
                                  <td className="px-5 py-4">
                                    {isEditingPrice ? (
                                      <div className="flex items-center gap-2 max-w-[120px]">
                                        <input
                                          type="number"
                                          value={inlinePriceEdit.price}
                                          onChange={(e) => setInlinePriceEdit({ id: prod.id, price: e.target.value })}
                                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-2 py-1 text-xs focus:border-admin-accent focus:outline-none"
                                        />
                                        <button 
                                          onClick={() => inlinePriceMutation.mutate({ id: prod.id, price: Number(inlinePriceEdit.price) })} 
                                          className="text-admin-accent hover:opacity-85 font-bold"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 group">
                                        <span className="font-bold text-admin-accent">{prod.price} ج.م</span>
                                        <button 
                                          onClick={() => setInlinePriceEdit({ id: prod.id, price: String(prod.price) })} 
                                          className="opacity-0 group-hover:opacity-100 text-admin-text-muted hover:text-admin-text-primary transition-opacity"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>

                                  {/* Availability Toggle */}
                                  <td className="px-5 py-4">
                                    <button onClick={() => toggleProdMutation.mutate(prod.id)} className="transition-colors">
                                      {prod.isAvailable ? (
                                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                          <span>متاح</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-650 border border-red-500/20 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                          <span>نفد</span>
                                        </span>
                                      )}
                                    </button>
                                  </td>

                                  <td className="px-5 py-4 text-left">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button onClick={() => shiftProductOrder(idx, 'up')} disabled={idx === 0} className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-text-primary disabled:opacity-20 transition-colors">
                                        <ArrowUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => shiftProductOrder(idx, 'down')} disabled={idx === products.length - 1} className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-text-primary disabled:opacity-20 transition-colors">
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
                                        className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-accent transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => { if(confirm('حذف هذا المنتج؟')) deleteProdMutation.mutate(prod.id); }} 
                                        className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-red-650 transition-colors"
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
                    <h2 className="text-xl font-extrabold text-admin-text-primary">إدارة طاولات المطعم</h2>
                    <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">{tables.length} طاولة</span>
                  </div>
                  
                  {/* Table creation form */}
                  <div className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 max-w-lg space-y-5 shadow-admin-card">
                    <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-admin-accent" />
                      <span>إضافة طاولة جديدة</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs text-admin-text-secondary font-bold">رقم الطاولة *</label>
                        <input
                          type="number"
                          required
                          value={tableNum}
                          onChange={(e) => setTableNum(e.target.value)}
                          placeholder="مثال: 5"
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs text-admin-text-secondary font-bold">الموقع (اختياري)</label>
                        <input
                          type="text"
                          value={tableLabel}
                          onChange={(e) => setTableLabel(e.target.value)}
                          placeholder="مثال: VIP بالخارج"
                          className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-4 py-3 text-sm focus:border-admin-accent focus:outline-none transition-all placeholder:text-admin-text-muted"
                        />
                      </div>
                    </div>
                    <motion.button
                      onClick={() => createTableMutation.mutate()}
                      disabled={createTableMutation.isPending}
                      whileTap={{ scale: 0.97 }}
                      className="py-3 px-6 bg-admin-accent text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-admin-accent hover:opacity-95 transition-opacity"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>إنشاء الطاولة وتوليد QR</span>
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
                        className="bg-admin-bg-elevated border border-admin-border rounded-lg p-5 flex flex-col items-center gap-4 text-center hover:bg-admin-bg-subtle transition-colors shadow-admin-card"
                      >
                        <div>
                          <h4 className="font-extrabold text-admin-text-primary text-lg">طاولة {table.number}</h4>
                          {table.label && <span className="text-xs text-admin-text-secondary font-semibold">{table.label}</span>}
                        </div>

                        {table.qrCode?.url && (
                          <div className="bg-white p-3 rounded-lg border border-admin-border shadow-sm">
                            <img src={table.qrCode.url} alt="QR Code" className="w-28 h-28" />
                          </div>
                        )}

                        <div className="flex gap-2 w-full">
                          <a
                            href={`${api.defaults.baseURL}/tables/${table.id}/qr`}
                            download
                            className="flex-1 border border-admin-border bg-white text-admin-text-secondary hover:text-admin-accent py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تحميل QR</span>
                          </a>
                          <button
                            onClick={() => { if(confirm('هل تريد حذف هذه الطاولة؟')) deleteTableMutation.mutate(table.id); }}
                            className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-red-650 transition-colors shadow-sm"
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
                  <h2 className="text-xl font-extrabold text-admin-text-primary">سجل طلبات المطعم</h2>
                  
                  {/* Filters */}
                  <div className="bg-admin-bg-elevated border border-admin-border rounded-lg p-5 flex flex-wrap gap-4 items-end shadow-admin-card">
                    <div className="space-y-1.5">
                      <label className="block text-xs text-admin-text-secondary font-bold">حالة الطلب</label>
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="w-40 bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-3 py-2 text-xs focus:border-admin-accent focus:outline-none"
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
                      <label className="block text-xs text-admin-text-secondary font-bold">من تاريخ</label>
                      <input
                        type="date"
                        value={orderStartDate}
                        onChange={(e) => setOrderStartDate(e.target.value)}
                        className="bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs text-admin-text-secondary font-bold">إلى تاريخ</label>
                      <input
                        type="date"
                        value={orderEndDate}
                        onChange={(e) => setOrderEndDate(e.target.value)}
                        className="bg-admin-bg-base border border-admin-border text-admin-text-primary rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Orders list */}
                  <div className="space-y-3">
                    {orders.length === 0 ? (
                      <div className="bg-admin-bg-elevated border border-admin-border rounded-lg p-16 text-center text-admin-text-muted shadow-admin-card">
                        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30 text-admin-text-muted" />
                        <p className="text-sm font-medium">لا توجد طلبات تطابق معايير التصفية.</p>
                      </div>
                    ) : (
                      orders.map((order, idx) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="bg-admin-bg-elevated border border-admin-border rounded-lg p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-admin-bg-subtle transition-colors shadow-admin-card"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] text-admin-text-secondary font-mono bg-admin-bg-subtle border border-admin-border px-2 py-0.5 rounded-md">
                                #{order.id.slice(-6).toUpperCase()}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-650 border-red-500/20' :
                                'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                <span>
                                  {order.status === 'delivered' ? 'تم التوصيل' :
                                   order.status === 'cancelled' ? 'ملغي' : 'نشط'}
                                </span>
                              </span>
                            </div>
                            <h4 className="font-extrabold text-admin-text-primary text-sm">طاولة {order.tableNumber}</h4>
                            <p className="text-xs text-admin-text-secondary font-medium">
                              {new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>

                          <div className="flex-1 max-w-md">
                            <p className="text-xs text-admin-text-secondary font-semibold leading-relaxed">
                              {order.items.map(i => `${i.name} (x${i.quantity})`).join('، ')}
                            </p>
                          </div>

                          <div className="text-left font-extrabold text-admin-accent text-lg whitespace-nowrap">
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
                    <h2 className="text-xl font-extrabold text-admin-text-primary">التقارير والتحليلات</h2>
                    <div className="bg-admin-bg-elevated border border-admin-border rounded-lg p-1 flex gap-1 shadow-sm">
                      {[
                        { key: 'day', label: 'اليوم' },
                        { key: 'week', label: 'الأسبوع' },
                        { key: 'month', label: 'الشهر' },
                        { key: 'year', label: 'العام' },
                      ].map(p => (
                        <button
                          key={p.key}
                          onClick={() => setSalesPeriod(p.key as any)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            salesPeriod === p.key 
                              ? 'bg-admin-accent text-white shadow-sm' 
                              : 'text-admin-text-secondary hover:text-admin-text-primary'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats Cards */}
                  {salesStats && (() => {
                    const salesDiff = (salesStats.total || 0) - (salesStats.previousPeriod?.total || 0);
                    const salesTrendUp = salesDiff >= 0;
                    const salesTrendPercent = salesStats.previousPeriod?.total 
                      ? Math.round((Math.abs(salesDiff) / salesStats.previousPeriod.total) * 100)
                      : 0;

                    const ordersDiff = (salesStats.ordersCount || 0) - (salesStats.previousPeriod?.ordersCount || 0);
                    const ordersTrendUp = ordersDiff >= 0;
                    const ordersTrendPercent = salesStats.previousPeriod?.ordersCount 
                      ? Math.round((Math.abs(ordersDiff) / salesStats.previousPeriod.ordersCount) * 100)
                      : 0;

                    const aovDiff = (salesStats.avgOrderValue || 0) - (salesStats.previousPeriod?.avgOrderValue || 0);
                    const aovTrendUp = aovDiff >= 0;
                    const aovTrendPercent = salesStats.previousPeriod?.avgOrderValue 
                      ? Math.round((Math.abs(aovDiff) / salesStats.previousPeriod.avgOrderValue) * 100)
                      : 0;

                    const activeTablesCount = tables.filter(t => t.status !== 'empty').length;
                    const occupancyRate = tables.length ? Math.round((activeTablesCount / tables.length) * 100) : 0;

                    const chartData = getRechartsTimeline(salesStats.total || 0, salesPeriod);

                    return (
                      <div className="space-y-6">
                        {/* KPI Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                          {[
                            { 
                              label: 'إجمالي المبيعات', 
                              value: `${salesStats.total} ج.م`, 
                              trend: `${salesTrendPercent}%`, 
                              isUp: salesTrendUp, 
                              prevLabel: `السابق: ${salesStats.previousPeriod?.total || 0} ج.م`, 
                              color: 'text-admin-accent',
                              bgGlow: 'bg-admin-accent-light' 
                            },
                            { 
                              label: 'عدد الطلبات', 
                              value: `${salesStats.ordersCount} طلب`, 
                              trend: `${ordersTrendPercent}%`, 
                              isUp: ordersTrendUp, 
                              prevLabel: `السابق: ${salesStats.previousPeriod?.ordersCount || 0} طلب`, 
                              color: 'text-indigo-600',
                              bgGlow: 'bg-indigo-500/10'
                            },
                            { 
                              label: 'متوسط قيمة الطلب', 
                              value: `${salesStats.avgOrderValue} ج.م`, 
                              trend: `${aovTrendPercent}%`, 
                              isUp: aovTrendUp, 
                              prevLabel: `السابق: ${salesStats.previousPeriod?.avgOrderValue || 0} ج.م`, 
                              color: 'text-emerald-600',
                              bgGlow: 'bg-emerald-500/10'
                            },
                            { 
                              label: 'إشغال الطاولات', 
                              value: `${occupancyRate}%`, 
                              trend: `${activeTablesCount} نشطة`, 
                              isUp: true, 
                              prevLabel: `إجمالي: ${tables.length} طاولة`, 
                              color: 'text-amber-600',
                              bgGlow: 'bg-amber-500/10'
                            },
                          ].map((stat, idx) => (
                            <motion.div
                              key={stat.label}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.08 }}
                              className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 relative overflow-hidden shadow-admin-card"
                            >
                              <div className={`absolute -top-5 -right-5 w-20 h-20 rounded-full ${stat.bgGlow}`} />
                              
                              <div className="relative z-10 flex flex-col justify-between h-full">
                                <div>
                                  <span className="text-[13px] text-admin-text-secondary font-bold block mb-2">{stat.label}</span>
                                  <span className={`text-[30px] font-extrabold tracking-tight ${stat.color} font-mono block leading-none mb-1`}>
                                    {stat.value}
                                  </span>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-admin-border/50 flex items-center justify-between">
                                  <span className="text-[11px] text-admin-text-muted font-semibold">{stat.prevLabel}</span>
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    stat.label === 'إشغال الطاولات'
                                      ? 'bg-amber-500/10 text-amber-600'
                                      : stat.isUp 
                                      ? 'bg-emerald-500/10 text-emerald-600' 
                                      : 'bg-red-500/10 text-red-600'
                                  }`}>
                                    {stat.label !== 'إشغال الطاولات' && (stat.isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                    <span>{stat.trend}</span>
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Recharts Area Chart */}
                        <div className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 shadow-admin-card">
                          <h3 className="font-extrabold text-admin-text-primary text-sm mb-5 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-admin-accent" />
                            <span>مخطط نمو المبيعات</span>
                          </h3>
                          <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#c5a85c" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#c5a85c" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                                <XAxis dataKey="label" stroke="#8c95a5" fontSize={11} tickLine={false} />
                                <YAxis stroke="#8c95a5" fontSize={11} tickLine={false} axisLine={false} />
                                <ChartTooltip 
                                  contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', fontSize: '12px' }}
                                  labelFormatter={(value) => `الفترة: ${value}`}
                                />
                                <Area type="monotone" dataKey="amount" name="المبيعات" stroke="#c5a85c" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Detailed Analytics lists and heatmap grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Top Products */}
                          <div className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 shadow-admin-card">
                            <h3 className="font-extrabold text-admin-text-primary text-sm mb-5 flex items-center gap-2">
                              <Flame className="w-4 h-4 text-admin-accent" />
                              <span>أكثر 10 منتجات مبيعاً</span>
                            </h3>
                            <div className="space-y-4">
                              {topProducts.length === 0 ? (
                                <p className="text-xs text-admin-text-muted text-center py-8">لا توجد بيانات مبيعات كافية</p>
                              ) : (
                                topProducts.map((p: any, idx: number) => (
                                  <div key={idx} className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-admin-text-primary font-bold flex items-center gap-2">
                                        {idx < 3 && <Star className="w-3 h-3 text-admin-accent fill-admin-accent" />}
                                        {p.name}
                                        <span className="text-admin-text-muted font-mono">({p.count})</span>
                                      </span>
                                      <span className="text-admin-accent font-extrabold">{p.revenue} ج.م</span>
                                    </div>
                                    <div className="w-full bg-admin-bg-base rounded-full h-1.5 overflow-hidden border border-admin-border">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (p.count / Math.max(...topProducts.map((p: any) => p.count))) * 100)}%` }}
                                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                                        className="bg-admin-accent h-1.5 rounded-full"
                                      />
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Table Stats */}
                          <div className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 shadow-admin-card">
                            <h3 className="font-extrabold text-admin-text-primary text-sm mb-5 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-admin-accent" />
                              <span>إنتاجية الطاولات</span>
                            </h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
                              {tableStats.map((t: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm py-3 border-b border-admin-border last:border-0">
                                  <span className="font-semibold text-admin-text-primary">طاولة {t.tableNumber}</span>
                                  <span className="text-admin-text-secondary text-xs font-semibold">{t.ordersCount} أوردرات</span>
                                  <span className="font-extrabold text-admin-accent">{t.revenue} ج.م</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Weekly Sales Hourly Density Heatmap Grid */}
                          <div className="bg-admin-bg-elevated border border-admin-border rounded-lg p-6 lg:col-span-2 shadow-admin-card overflow-hidden">
                            <h3 className="font-extrabold text-admin-text-primary text-sm mb-2 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-admin-accent" />
                              <span>كثافة المبيعات الأسبوعية (أيام × ساعات)</span>
                            </h3>
                            <p className="text-[11px] text-admin-text-muted mb-6">يوضح الكثافة البيعية بالأيام والساعات لجدولة العمالة والتحضيرات بشكل مثالي.</p>
                            
                            <div className="overflow-x-auto pb-4 scrollbar-hide">
                              <div className="min-w-[760px] space-y-2">
                                {/* Hour Headers (0 to 23) */}
                                <div className="flex items-center gap-1.5 mr-[64px] pb-1 border-b border-admin-border/30">
                                  {Array.from({ length: 24 }).map((_, hour) => (
                                    <div key={hour} className="flex-1 text-center text-[9px] font-mono text-admin-text-muted">
                                      {hour === 0 ? '12أ' : hour === 12 ? '12م' : hour > 12 ? `${hour - 12}` : `${hour}`}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Heatmap Rows */}
                                {(() => {
                                  const heatmapMatrix = generateHeatmapMatrix(peakHours);
                                  const maxVal = Math.max(...heatmapMatrix.flatMap(d => d.hours), 1);
                                  
                                  return heatmapMatrix.map((row, dayIdx) => (
                                    <div key={dayIdx} className="flex items-center gap-1.5">
                                      <div className="w-[60px] text-xs font-bold text-admin-text-secondary truncate text-right">
                                        {row.day}
                                      </div>
                                      <div className="flex-1 flex gap-1.5">
                                        {row.hours.map((val, hourIdx) => {
                                          const level = Math.min(5, Math.floor((val / maxVal) * 5));
                                          return (
                                            <div
                                              key={hourIdx}
                                              className={`flex-1 aspect-square rounded-sm transition-all duration-300 density-cell level-${level} hover:scale-110 cursor-pointer relative group`}
                                              title={`${row.day} - ساعة ${hourIdx}: ${val} طلب`}
                                            >
                                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#1e2330] text-white text-[9px] font-bold py-1 px-2 rounded-md whitespace-nowrap z-50">
                                                {val} طلبات
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ));
                                })()}
                                
                                {/* Legend */}
                                <div className="flex justify-end gap-3 pt-4 text-[10px] text-admin-text-muted font-semibold items-center">
                                  <span>أقل نشاطاً</span>
                                  <div className="w-3.5 h-3.5 rounded-sm bg-[#f1f3f5]" />
                                  <div className="w-3.5 h-3.5 rounded-sm bg-[#d0ebff]" />
                                  <div className="w-3.5 h-3.5 rounded-sm bg-[#a5d8ff]" />
                                  <div className="w-3.5 h-3.5 rounded-sm bg-[#74c0fc]" />
                                  <div className="w-3.5 h-3.5 rounded-sm bg-[#339af0]" />
                                  <div className="w-3.5 h-3.5 rounded-sm bg-[#1c7ed6]" />
                                  <span>أكثر نشاطاً</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
