import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FolderPlus, Edit2, Check, Trash2, Download, ToggleLeft, 
  ToggleRight, DollarSign, Calendar, TrendingUp, ShoppingBag, 
  MapPin, BarChart3, LogOut, ArrowUp, ArrowDown
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { useAuthStore } from '../../shared/store/authStore';
import type { Category, Product, Table, Order } from '../../shared/types';

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

  // Category CRUD
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

  // Product CRUD
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

  // Tables CRUD
  const createTableMutation = useMutation({
    mutationFn: async () => {
      await api.post('/tables', { number: Number(tableNum), label: tableLabel });
    },
    onSuccess: () => {
      toast.success('تم إنشاء الترابيزة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
      setTableNum('');
      setTableLabel('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل إنشاء الترابيزة.');
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tables/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف الترابيزة.');
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

  // Reordering helpers (simple shifts for robustness)
  const shiftCategoryOrder = (index: number, direction: 'up' | 'down') => {
    const list = [...categories];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    // Swap order values
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

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col" dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-dark-900 border-b border-dark-800 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 font-extrabold text-lg">
            👑
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{restaurant.name} | لوحة المدير</h1>
            <p className="text-xs text-dark-400">إدارة البزنس بالكامل والمبيعات</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="p-2.5 bg-dark-950 border border-dark-800 text-dark-400 rounded-xl hover:text-red-500 hover:border-red-500/30 transition-colors animate-pulse"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Sidebar Navigation */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 p-6">
        <aside className="w-full md:w-64 flex flex-col gap-2">
          {[
            { key: 'categories', label: 'إدارة الأقسام', icon: <FolderPlus className="w-4 h-4" /> },
            { key: 'products', label: 'إدارة المنتجات', icon: <ShoppingBag className="w-4 h-4" /> },
            { key: 'tables', label: 'إدارة الترابيزات', icon: <MapPin className="w-4 h-4" /> },
            { key: 'orders', label: 'سجل الطلبات', icon: <Calendar className="w-4 h-4" /> },
            { key: 'analytics', label: 'التقارير والتحليلات', icon: <BarChart3 className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                activeTab === tab.key 
                  ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/15' 
                  : 'bg-dark-900 border border-dark-850 text-dark-400 hover:text-white hover:bg-dark-850'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Dashboard Tabs Container */}
        <main className="flex-1 bg-dark-900 border border-dark-800/60 p-6 rounded-[2rem] overflow-y-auto">
          
          {/* ==================== CATEGORIES TAB ==================== */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">إدارة أقسام المنيو</h2>
              
              {/* Category form */}
              <form onSubmit={submitCategory} className="bg-dark-950 p-6 rounded-3xl border border-dark-800 space-y-4 max-w-xl">
                <h3 className="font-bold text-white text-sm">{editingCatId ? 'تعديل القسم المحدد' : 'إضافة قسم جديد'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">اسم القسم</label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="مثال: مشروبات باردة"
                      className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2.5 text-xs text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">الوصف (اختياري)</label>
                    <input
                      type="text"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="وصف مختصر للقسم..."
                      className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2.5 text-xs text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-dark-400 mb-2">صورة القسم</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCatImageChange}
                      className="text-xs text-dark-400 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-dark-900 file:text-primary-500 hover:file:bg-dark-850 cursor-pointer"
                    />
                  </div>
                  {catImagePreview && (
                    <img src={catImagePreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-dark-800" />
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={catMutation.isPending} className="bg-primary-500 text-dark-950 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-primary-400">
                    حفظ القسم
                  </button>
                  {editingCatId && (
                    <button type="button" onClick={resetCatForm} className="bg-dark-800 hover:bg-dark-700 px-6 py-2.5 rounded-xl text-xs">
                      إلغاء
                    </button>
                  )}
                </div>
              </form>

              {/* Categories list */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm">الأقسام الحالية ({categories.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((cat, idx) => (
                    <div key={cat.id} className="bg-dark-950 border border-dark-850 p-4 rounded-2xl flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        {cat.image?.url ? (
                          <img src={cat.image.url} alt={cat.name} className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-dark-900 flex items-center justify-center text-[10px] text-dark-500">بلا صورة</div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                          <p className="text-[10px] text-dark-400">{cat.description || 'بدون وصف'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Reorder actions */}
                        <button onClick={() => shiftCategoryOrder(idx, 'up')} disabled={idx === 0} className="p-1.5 hover:text-white disabled:opacity-30">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => shiftCategoryOrder(idx, 'down')} disabled={idx === categories.length - 1} className="p-1.5 hover:text-white disabled:opacity-30">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        {/* Edit & delete */}
                        <button
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setCatName(cat.name);
                            setCatDesc(cat.description || '');
                            setCatImagePreview(cat.image?.url || null);
                          }}
                          className="p-1.5 text-blue-500 hover:bg-dark-850 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if(confirm('هل تريد حذف القسم بالكامل؟')) deleteCatMutation.mutate(cat.id); }} className="p-1.5 text-red-500 hover:bg-dark-850 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== PRODUCTS TAB ==================== */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">إدارة منتجات المنيو</h2>
              
              {/* Product Form */}
              <form onSubmit={submitProduct} className="bg-dark-950 p-6 rounded-3xl border border-dark-800 space-y-4 max-w-xl">
                <h3 className="font-bold text-white text-sm">{editingProdId ? 'تعديل المنتج المحدد' : 'إضافة منتج جديد'}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">اسم المنتج</label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="مثال: كابتشينو دوبل"
                      className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2.5 text-xs text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">القسم</label>
                    <select
                      required
                      value={prodCatId}
                      onChange={(e) => setProdCatId(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2.5 text-xs text-right focus:outline-none focus:border-primary-500"
                    >
                      <option value="">اختر القسم...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">السعر (ج.م)</label>
                    <input
                      type="number"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="مثال: 45"
                      className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2.5 text-xs text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">الوصف والمكونات</label>
                    <input
                      type="text"
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      placeholder="مثال: حبوب قهوة فاخرة مع حليب رغوي كثيف"
                      className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2.5 text-xs text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-dark-400 mb-2">صورة المنتج</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProdImageChange}
                      className="text-xs text-dark-400 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-dark-900 file:text-primary-500 hover:file:bg-dark-850 cursor-pointer"
                    />
                  </div>
                  {prodImagePreview && (
                    <img src={prodImagePreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-dark-800" />
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={prodMutation.isPending} className="bg-primary-500 text-dark-950 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-primary-400">
                    حفظ المنتج
                  </button>
                  {editingProdId && (
                    <button type="button" onClick={resetProdForm} className="bg-dark-800 hover:bg-dark-700 px-6 py-2.5 rounded-xl text-xs">
                      إلغاء
                    </button>
                  )}
                </div>
              </form>

              {/* Products List list */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm">المنتجات الحالية ({products.length})</h3>
                <div className="overflow-x-auto bg-dark-950 rounded-2xl border border-dark-800/80">
                  <table className="w-full border-collapse text-right text-xs">
                    <thead>
                      <tr className="bg-dark-900 border-b border-dark-800 text-dark-400">
                        <th className="p-4">المنتج</th>
                        <th className="p-4">القسم</th>
                        <th className="p-4">السعر</th>
                        <th className="p-4">الحالة</th>
                        <th className="p-4 text-left">التحكم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod, idx) => {
                        const cat = categories.find(c => c.id === prod.categoryId);
                        const isEditingPrice = inlinePriceEdit?.id === prod.id;

                        return (
                          <tr key={prod.id} className="border-b border-dark-850 hover:bg-dark-900/35">
                            <td className="p-4 flex items-center gap-3">
                              {prod.image?.url ? (
                                <img src={prod.image.url} alt={prod.name} className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-dark-850 flex items-center justify-center text-[8px] text-dark-500">بلا صورة</div>
                              )}
                              <div>
                                <span className="font-bold text-white block">{prod.name}</span>
                                <span className="text-[10px] text-dark-400 line-clamp-1">{prod.description}</span>
                              </div>
                            </td>
                            <td className="p-4 text-dark-300">{cat?.name || 'غير معروف'}</td>
                            
                            {/* Inline Price edit */}
                            <td className="p-4 font-bold text-primary-500">
                              {isEditingPrice ? (
                                <div className="flex items-center gap-2 max-w-[100px]">
                                  <input
                                    type="number"
                                    value={inlinePriceEdit.price}
                                    onChange={(e) => setInlinePriceEdit({ id: prod.id, price: e.target.value })}
                                    className="bg-dark-950 border border-dark-800 rounded px-2 py-1 text-xs text-white w-full text-center"
                                  />
                                  <button onClick={() => inlinePriceMutation.mutate({ id: prod.id, price: Number(inlinePriceEdit.price) })} className="text-emerald-500">
                                    <Check className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 group">
                                  <span>{prod.price} ج.م</span>
                                  <button onClick={() => setInlinePriceEdit({ id: prod.id, price: String(prod.price) })} className="opacity-0 group-hover:opacity-100 text-dark-400 hover:text-white transition-opacity">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Availability Toggle */}
                            <td className="p-4">
                              <button onClick={() => toggleProdMutation.mutate(prod.id)}>
                                {prod.isAvailable ? (
                                  <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                                    <ToggleRight className="w-5 h-5" /> متاح
                                  </span>
                                ) : (
                                  <span className="text-dark-500 flex items-center gap-1">
                                    <ToggleLeft className="w-5 h-5" /> نفد
                                  </span>
                                )}
                              </button>
                            </td>

                            <td className="p-4 text-left space-x-1 space-x-reverse">
                              <button onClick={() => shiftProductOrder(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-white disabled:opacity-30">
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button onClick={() => shiftProductOrder(idx, 'down')} disabled={idx === products.length - 1} className="p-1 hover:text-white disabled:opacity-30">
                                <ArrowDown className="w-4 h-4" />
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
                                className="p-1.5 text-blue-500 hover:bg-dark-800 rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => { if(confirm('حذف هذا المنتج؟')) deleteProdMutation.mutate(prod.id); }} className="p-1.5 text-red-500 hover:bg-dark-800 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TABLES TAB ==================== */}
          {activeTab === 'tables' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">إدارة طاولات المطعم</h2>
              
              {/* Table creation form */}
              <div className="bg-dark-950 p-6 rounded-3xl border border-dark-800 max-w-md space-y-4">
                <h3 className="font-bold text-white text-sm">إضافة طاولة جديدة</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">رقم الطاولة</label>
                    <input
                      type="number"
                      required
                      value={tableNum}
                      onChange={(e) => setTableNum(e.target.value)}
                      placeholder="مثال: 5"
                      className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2.5 text-xs text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">الموقع / تصنيف (اختياري)</label>
                    <input
                      type="text"
                      value={tableLabel}
                      onChange={(e) => setTableLabel(e.target.value)}
                      placeholder="مثال: VIP بالخارج"
                      className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2.5 text-xs text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => createTableMutation.mutate()}
                  className="bg-primary-500 text-dark-950 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-primary-400"
                >
                  إنشاء الطاولة وتوليد QR
                </button>
              </div>

              {/* Tables grid view list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {tables.map(table => (
                  <div key={table.id} className="bg-dark-950 border border-dark-850 p-5 rounded-3xl flex flex-col items-center gap-4 text-center">
                    <div>
                      <h4 className="font-extrabold text-white text-lg">طاولة {table.number}</h4>
                      {table.label && <span className="text-xs text-dark-400">{table.label}</span>}
                    </div>

                    {table.qrCode?.url && (
                      <img src={table.qrCode.url} alt="QR Code" className="w-32 h-32 bg-white p-2 rounded-xl" />
                    )}

                    <div className="flex gap-2 w-full">
                      {/* Download QR attachment file */}
                      <a
                        href={`${api.defaults.baseURL}/tables/${table.id}/qr`}
                        download
                        className="flex-1 flex items-center justify-center gap-2 bg-dark-900 border border-dark-800 py-2 rounded-xl text-xs hover:border-primary-500 hover:text-primary-500 transition-all font-semibold"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل QR</span>
                      </a>
                      <button
                        onClick={() => { if(confirm('هل تريد حذف هذه الطاولة؟')) deleteTableMutation.mutate(table.id); }}
                        className="p-2.5 bg-dark-900 border border-dark-800 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== ORDERS TAB ==================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">سجل طلبات المطعم التاريخي</h2>
              
              {/* Filters header bar */}
              <div className="bg-dark-950 p-4 rounded-3xl border border-dark-800 flex flex-wrap gap-4 items-end text-xs">
                <div>
                  <label className="block text-dark-400 mb-2">تصفية بحالة الطلب</label>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2 text-xs focus:outline-none"
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

                <div>
                  <label className="block text-dark-400 mb-2">من تاريخ</label>
                  <input
                    type="date"
                    value={orderStartDate}
                    onChange={(e) => setOrderStartDate(e.target.value)}
                    className="bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-dark-400 mb-2">إلى تاريخ</label>
                  <input
                    type="date"
                    value={orderEndDate}
                    onChange={(e) => setOrderEndDate(e.target.value)}
                    className="bg-dark-900 border border-dark-800 text-white rounded-xl px-4 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* History list */}
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-dark-950 p-10 rounded-2xl border border-dark-850 text-center text-dark-500">
                    لا توجد طلبات تطابق معايير التصفية.
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="bg-dark-950 border border-dark-850 p-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] text-dark-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                            order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {order.status === 'delivered' ? 'تم التوصيل' :
                             order.status === 'cancelled' ? 'ملغي' : 'نشط'}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm">طاولة {order.tableNumber}</h4>
                        <p className="text-xs text-dark-400">
                          {new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>

                      {/* Items details */}
                      <div className="flex-1 max-w-md">
                        <p className="text-xs text-dark-300 font-semibold mb-1">الطلب:</p>
                        <p className="text-xs text-dark-400 leading-relaxed">
                          {order.items.map(i => `${i.name} (x${i.quantity})`).join('، ')}
                        </p>
                      </div>

                      <div className="text-left font-bold text-primary-500 text-lg">
                        {order.totalAmount} ج.م
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================== ANALYTICS TAB ==================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">التقارير المالية والتحليلات</h2>
                <div className="bg-dark-950 p-1 rounded-xl border border-dark-800 flex gap-1 text-xs">
                  {['day', 'week', 'month', 'year'].map(p => (
                    <button
                      key={p}
                      onClick={() => setSalesPeriod(p as any)}
                      className={`px-4 py-1.5 rounded-lg transition-all ${
                        salesPeriod === p ? 'bg-primary-500 text-dark-950 font-bold' : 'text-dark-400 hover:text-white'
                      }`}
                    >
                      {p === 'day' ? 'اليوم' : p === 'week' ? 'الأسبوع' : p === 'month' ? 'الشهر' : 'العام'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main stats layout */}
              {salesStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-dark-950 p-6 rounded-3xl border border-dark-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-dark-400 block mb-1">إجمالي المبيعات</span>
                      <span className="text-2xl font-bold text-primary-500">{salesStats.total} ج.م</span>
                      <span className="text-[10px] text-dark-500 block mt-1">السابق: {salesStats.previousPeriod?.total || 0} ج.م</span>
                    </div>
                    <TrendingUp className="w-8 h-8 text-primary-500/20" />
                  </div>

                  <div className="bg-dark-950 p-6 rounded-3xl border border-dark-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-dark-400 block mb-1">عدد الطلبات</span>
                      <span className="text-2xl font-bold text-white">{salesStats.ordersCount} طلب</span>
                      <span className="text-[10px] text-dark-500 block mt-1">السابق: {salesStats.previousPeriod?.ordersCount || 0} طلب</span>
                    </div>
                    <ShoppingBag className="w-8 h-8 text-white/20" />
                  </div>

                  <div className="bg-dark-950 p-6 rounded-3xl border border-dark-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-dark-400 block mb-1">متوسط قيمة الطلب</span>
                      <span className="text-2xl font-bold text-white">{salesStats.avgOrderValue} ج.م</span>
                      <span className="text-[10px] text-dark-500 block mt-1">السابق: {salesStats.previousPeriod?.avgOrderValue || 0} ج.م</span>
                    </div>
                    <DollarSign className="w-8 h-8 text-white/20" />
                  </div>
                </div>
              )}

              {/* More detailed metrics layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Top Selling Products */}
                <div className="bg-dark-950 border border-dark-800 p-6 rounded-3xl">
                  <h3 className="font-bold text-white text-sm mb-4">أكثر 10 منتجات مبيعاً</h3>
                  <div className="space-y-4">
                    {topProducts.length === 0 ? (
                      <p className="text-xs text-dark-500 text-center py-6">لا توجد بيانات مبيعات كافية</p>
                    ) : (
                      topProducts.map((p: any, idx: number) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-white">{p.name} <span className="text-dark-500 font-mono text-[10px]">({p.count} طلب)</span></span>
                            <span className="text-primary-500">{p.revenue} ج.م</span>
                          </div>
                          <div className="w-full bg-dark-900 rounded-full h-1.5">
                            <div 
                              className="bg-primary-500 h-1.5 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (p.count / Math.max(...topProducts.map((p: any) => p.count))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Table analytics */}
                <div className="bg-dark-950 border border-dark-800 p-6 rounded-3xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm mb-4">إنتاجية الطاولات (Heat Map)</h3>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      {tableStats.map((t: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-2 border-b border-dark-900">
                          <span className="font-semibold text-white">طاولة رقم {t.tableNumber}</span>
                          <span className="text-dark-400">{t.ordersCount} أوردرات</span>
                          <span className="font-bold text-emerald-500">{t.revenue} ج.م</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Peak hours layout */}
                <div className="bg-dark-950 border border-dark-800 p-6 rounded-3xl col-span-full">
                  <h3 className="font-bold text-white text-sm mb-4">أوقات الذروة خلال اليوم</h3>
                  <div className="flex items-end justify-between gap-2 h-40 pt-4 px-2">
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const matched = peakHours.find((h: any) => h.hour === hour);
                      const ordersCount = matched ? matched.ordersCount : 0;
                      const maxVal = Math.max(...peakHours.map((h: any) => h.ordersCount), 1);
                      const heightPercent = `${(ordersCount / maxVal) * 100}%`;

                      return (
                        <div key={hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          {ordersCount > 0 && (
                            <span className="absolute bottom-full mb-1 bg-dark-900 border border-dark-800 text-primary-500 text-[8px] font-bold py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {ordersCount}
                            </span>
                          )}
                          <div 
                            className={`w-full rounded-t ${ordersCount > 0 ? 'bg-primary-500' : 'bg-dark-900'}`} 
                            style={{ height: heightPercent }}
                          ></div>
                          <span className="text-[8px] text-dark-500 mt-1 font-mono">
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

        </main>
      </div>
    </div>
  );
}
