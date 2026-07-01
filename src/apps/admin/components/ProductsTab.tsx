import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion as fMotion, AnimatePresence as fAnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Edit2, Trash2, Check, GripVertical, Search, Plus, X, ListPlus 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import type { Category, Product, ProductOption, ProductModifier } from '../../../shared/types';
import { ImageUploadZone } from './ImageUploadZone.js';
import { ImageCropperModal } from './ImageCropperModal.js';
import CustomSelect from './CustomSelect.js';

export default function ProductsTab() {
  const queryClient = useQueryClient();

  // Search & Filters
  const [prodSearchQuery, setProdSearchQuery] = useState('');

  // Form states
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [prodImage, setProdImage] = useState<File | null>(null);
  const [prodImagePreview, setProdImagePreview] = useState<string | null>(null);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  // Custom Options/Modifiers states
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);

  // Inline Price Edit
  const [inlinePriceEdit, setInlinePriceEdit] = useState<{ id: string; price: string } | null>(null);

  // Cropper states
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  // Drag and drop states
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data as Category[];
    },
  });

  const { data: products = [], isLoading: loadingProds } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data.data as Product[];
    },
  });

  const resetProdForm = () => {
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdCatId('');
    setProdImage(null);
    setProdImagePreview(null);
    setEditingProdId(null);
    setOptions([]);
    setModifiers([]);
  };

  // Product Mutation (Create/Update)
  const prodMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      if (editingProdId) {
        return api.put(`/products/${editingProdId}`, fd);
      }
      return api.post('/products', fd);
    },
    onSuccess: () => {
      toast.success(editingProdId ? 'تم تعديل المنتج بنجاح.' : 'تم إضافة المنتج بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      resetProdForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ المنتج.');
    },
  });

  // Delete Product
  const deleteProdMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف المنتج.');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  // Toggle Availability
  const toggleProdMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/products/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  // Reorder Products
  const reorderProdMutation = useMutation({
    mutationFn: async (payload: { id: string; order: number }[]) => {
      await api.put('/products/reorder', { items: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  // Inline Price Edit Mutation
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

  const handleProdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCropperFile(file);
      setCropperSrc(URL.createObjectURL(file));
      e.target.value = '';
    }
  };

  const handleCropConfirm = (croppedFile: File) => {
    setProdImage(croppedFile);
    setProdImagePreview(URL.createObjectURL(croppedFile));
    setCropperFile(null);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropCancel = () => {
    setCropperFile(null);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  // Add Option Group
  const addOptionGroup = () => {
    setOptions([...options, { name: 'المقاس / الحجم', required: true, choices: [{ name: 'وسط', priceAdjustment: 0 }] }]);
  };

  const removeOptionGroup = (gIdx: number) => {
    setOptions(options.filter((_, i) => i !== gIdx));
  };

  const addOptionChoice = (gIdx: number) => {
    const copy = [...options];
    copy[gIdx].choices.push({ name: 'كبير', priceAdjustment: 20 });
    setOptions(copy);
  };

  const removeOptionChoice = (gIdx: number, cIdx: number) => {
    const copy = [...options];
    copy[gIdx].choices = copy[gIdx].choices.filter((_, i) => i !== cIdx);
    setOptions(copy);
  };

  const updateOptionGroupTitle = (gIdx: number, title: string) => {
    const copy = [...options];
    copy[gIdx].name = title;
    setOptions(copy);
  };

  const updateOptionGroupRequired = (gIdx: number, req: boolean) => {
    const copy = [...options];
    copy[gIdx].required = req;
    setOptions(copy);
  };

  const updateOptionChoiceName = (gIdx: number, cIdx: number, val: string) => {
    const copy = [...options];
    copy[gIdx].choices[cIdx].name = val;
    setOptions(copy);
  };

  const updateOptionChoicePrice = (gIdx: number, cIdx: number, val: number) => {
    const copy = [...options];
    copy[gIdx].choices[cIdx].priceAdjustment = val;
    setOptions(copy);
  };

  // Modifiers triggers
  const addModifierGroup = () => {
    setModifiers([...modifiers, { name: 'الإضافات', choices: [{ name: 'جبنة إضافية', price: 15 }] }]);
  };

  const removeModifierGroup = (gIdx: number) => {
    setModifiers(modifiers.filter((_, i) => i !== gIdx));
  };

  const addModifierChoice = (gIdx: number) => {
    const copy = [...modifiers];
    copy[gIdx].choices.push({ name: 'صوص إضافي', price: 10 });
    setModifiers(copy);
  };

  const removeModifierChoice = (gIdx: number, cIdx: number) => {
    const copy = [...modifiers];
    copy[gIdx].choices = copy[gIdx].choices.filter((_, i) => i !== cIdx);
    setModifiers(copy);
  };

  const updateModifierGroupTitle = (gIdx: number, title: string) => {
    const copy = [...modifiers];
    copy[gIdx].name = title;
    setModifiers(copy);
  };

  const updateModifierChoiceName = (gIdx: number, cIdx: number, val: string) => {
    const copy = [...modifiers];
    copy[gIdx].choices[cIdx].name = val;
    setModifiers(copy);
  };

  const updateModifierChoicePrice = (gIdx: number, cIdx: number, val: number) => {
    const copy = [...modifiers];
    copy[gIdx].choices[cIdx].price = val;
    setModifiers(copy);
  };

  const submitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice.trim() || !prodCatId) {
      return toast.error('يرجى ملء جميع الحقول المطلوبة.');
    }

    const fd = new FormData();
    fd.append('name', prodName);
    fd.append('description', prodDesc);
    fd.append('price', prodPrice);
    fd.append('categoryId', prodCatId);
    
    // Append options/modifiers stringified
    fd.append('options', JSON.stringify(options));
    fd.append('modifiers', JSON.stringify(modifiers));

    if (prodImage) {
      fd.append('image', prodImage);
    }
    prodMutation.mutate(fd);
  };

  // Drag and Drop
  const handleDragStartProduct = (e: React.DragEvent, productId: string, categoryId: string) => {
    setDraggedProductId(productId);
    setDraggedCategoryId(categoryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropProduct = (e: React.DragEvent, targetProductId: string, categoryId: string) => {
    e.preventDefault();
    if (!draggedProductId || draggedCategoryId !== categoryId || draggedProductId === targetProductId) return;

    const catProducts = products.filter(p => p.categoryId === categoryId).sort((a, b) => a.order - b.order);
    const draggedIdx = catProducts.findIndex(p => p.id === draggedProductId);
    const targetIdx = catProducts.findIndex(p => p.id === targetProductId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const list = [...catProducts];
    const [draggedItem] = list.splice(draggedIdx, 1);
    list.splice(targetIdx, 0, draggedItem);

    const originalOrders = [...catProducts].map(p => p.order).sort((a, b) => a - b);
    const updatedList = list.map((item, index) => ({
      ...item,
      order: originalOrders[index] !== undefined ? originalOrders[index] : index
    }));

    const payload = updatedList.map(p => ({ id: p.id, order: p.order }));
    reorderProdMutation.mutate(payload);

    setDraggedProductId(null);
    setDraggedCategoryId(null);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-admin-text-primary">إدارة منتجات المينيو والخيارات المخصصة</h2>
        <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">
          {products.length} صنف مسجل
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Creation Form (Huge sidebar on the left) */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card space-y-5 h-fit lg:col-span-1">
          <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-admin-accent" />
            <span>{editingProdId ? 'تعديل الصنف المحدد' : 'إضافة صنف جديد للمينيو'}</span>
          </h3>

          <form onSubmit={submitProduct} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">اسم المنتج *</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="مثال: بيتزا مارجريتا، عصير مانجو"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">السعر الأساسي (ج.م) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">القسم / التصنيف *</label>
              <CustomSelect
                value={prodCatId}
                onChange={(val) => setProdCatId(val)}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                placeholder="اختر قسم المنتج..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">مكونات أو تفاصيل الصنف (وصف)</label>
              <textarea
                rows={2}
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="تفاصيل المكونات أو الحجم..."
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">صورة المنتج</label>
              <ImageUploadZone
                previewUrl={prodImagePreview}
                onChange={handleProdImageChange}
                onClear={() => {
                  setProdImage(null);
                  setProdImagePreview(null);
                }}
              />
            </div>

            {/* PRODUCT CUSTOMIZATION SECTION (Modifiers and options editor) */}
            <div className="pt-4 border-t border-admin-border space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs text-admin-text-primary">مجموعات الخيارات والإضافات</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addOptionGroup}
                    className="flex items-center gap-1 text-[10px] font-black text-admin-accent bg-admin-accent/10 border border-admin-accent/20 px-2 py-1 rounded hover:bg-admin-accent/20 transition-all cursor-pointer"
                  >
                    <ListPlus className="w-3 h-3" />
                    <span>مجموعة مقاسات</span>
                  </button>
                  <button
                    type="button"
                    onClick={addModifierGroup}
                    className="flex items-center gap-1 text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded hover:bg-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>مجموعة إضافات</span>
                  </button>
                </div>
              </div>

              {/* Render dynamic Options */}
              {options.map((opt, gIdx) => (
                <div key={gIdx} className="bg-admin-bg-subtle p-3 rounded-lg border border-admin-border space-y-3">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => updateOptionGroupTitle(gIdx, e.target.value)}
                      className="bg-transparent border-b border-admin-border text-admin-text-primary font-bold text-xs focus:border-admin-accent focus:outline-none"
                    />
                    <button type="button" onClick={() => removeOptionGroup(gIdx)} className="text-red-500 hover:text-red-650">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <label className="flex items-center gap-2 text-[10px] font-bold text-admin-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opt.required}
                      onChange={(e) => updateOptionGroupRequired(gIdx, e.target.checked)}
                      className="rounded text-admin-accent focus:ring-admin-accent h-3.5 w-3.5"
                    />
                    <span>اختيار إجباري للعميل</span>
                  </label>

                  <div className="space-y-2">
                    {opt.choices.map((choice, cIdx) => (
                      <div key={cIdx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={choice.name}
                          onChange={(e) => updateOptionChoiceName(gIdx, cIdx, e.target.value)}
                          placeholder="الخيار"
                          className="flex-1 bg-admin-bg-base border border-admin-border text-admin-text-primary text-[10px] rounded px-2 py-1 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={choice.priceAdjustment}
                          onChange={(e) => updateOptionChoicePrice(gIdx, cIdx, Number(e.target.value))}
                          placeholder="فرق السعر"
                          className="w-16 bg-admin-bg-base border border-admin-border text-admin-text-primary text-[10px] rounded px-2 py-1 focus:outline-none text-left"
                        />
                        <button type="button" onClick={() => removeOptionChoice(gIdx, cIdx)} className="text-zinc-500 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOptionChoice(gIdx)}
                      className="text-[9px] font-black text-admin-accent hover:opacity-85"
                    >
                      + إضافة خيار
                    </button>
                  </div>
                </div>
              ))}

              {/* Render dynamic Modifiers */}
              {modifiers.map((mod, gIdx) => (
                <div key={gIdx} className="bg-admin-bg-subtle p-3 rounded-lg border border-admin-border space-y-3">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={mod.name}
                      onChange={(e) => updateModifierGroupTitle(gIdx, e.target.value)}
                      className="bg-transparent border-b border-admin-border text-admin-text-primary font-bold text-xs focus:border-admin-accent focus:outline-none"
                    />
                    <button type="button" onClick={() => removeModifierGroup(gIdx)} className="text-red-500 hover:text-red-650">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {mod.choices.map((choice, cIdx) => (
                      <div key={cIdx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={choice.name}
                          onChange={(e) => updateModifierChoiceName(gIdx, cIdx, e.target.value)}
                          placeholder="الإضافة"
                          className="flex-1 bg-admin-bg-base border border-admin-border text-admin-text-primary text-[10px] rounded px-2 py-1 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={choice.price}
                          onChange={(e) => updateModifierChoicePrice(gIdx, cIdx, Number(e.target.value))}
                          placeholder="السعر"
                          className="w-16 bg-admin-bg-base border border-admin-border text-admin-text-primary text-[10px] rounded px-2 py-1 focus:outline-none text-left"
                        />
                        <button type="button" onClick={() => removeModifierChoice(gIdx, cIdx)} className="text-zinc-500 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addModifierChoice(gIdx)}
                      className="text-[9px] font-black text-indigo-500 hover:opacity-85"
                    >
                      + إضافة اختيار
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 pt-3">
              <fMotion.button
                type="submit"
                disabled={prodMutation.isPending}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2.5 bg-admin-accent text-white font-bold text-xs rounded-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 shadow-admin-accent cursor-pointer"
              >
                {prodMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{editingProdId ? 'حفظ التعديلات' : 'إضافة المنتج للمينيو'}</span>
                )}
              </fMotion.button>
              {editingProdId && (
                <button
                  type="button"
                  onClick={resetProdForm}
                  className="bg-admin-bg-subtle text-admin-text-secondary border border-admin-border py-2 px-4 rounded-lg text-xs font-semibold hover:bg-admin-bg-base transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Products Grid / Category Groupings list */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          {/* Top Search bar */}
          <div className="flex items-center bg-admin-bg-elevated border border-admin-border rounded-xl px-4 py-2 shadow-sm">
            <Search className="w-4 h-4 text-admin-text-muted/60 ml-2.5" />
            <input
              type="text"
              placeholder="ابحث عن منتج بالاسم أو الوصف..."
              value={prodSearchQuery}
              onChange={(e) => setProdSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-admin-text-primary focus:outline-none"
            />
          </div>

          {loadingProds ? (
            <div className="flex items-center justify-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl">
              <div className="w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl">
              <p className="text-xs text-admin-text-muted font-medium">لا توجد منتجات مسجلة حالياً.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const allCatProducts = products.filter(p => p.categoryId === category.id);
                const filtered = allCatProducts
                  .filter(p => p.name.toLowerCase().includes(prodSearchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(prodSearchQuery.toLowerCase())))
                  .sort((a, b) => a.order - b.order);

                if (filtered.length === 0 && prodSearchQuery) return null;

                return (
                  <div key={category.id} className="bg-admin-bg-elevated border border-admin-border rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-admin-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-admin-text-primary">{category.name}</span>
                        <span className="text-[10px] bg-admin-bg-subtle text-admin-text-secondary px-2 py-0.5 rounded-full font-bold">
                          {filtered.length} منتجات
                        </span>
                      </div>
                      <span className="text-[9px] text-admin-text-secondary font-medium">اسحب لترتيب المنتجات داخل القسم</span>
                    </div>

                    {filtered.length === 0 ? (
                      <p className="text-[11px] text-admin-text-muted text-center py-4">لا توجد منتجات مسجلة في هذا القسم.</p>
                    ) : (
                      <div className="divide-y divide-admin-border">
                        <fAnimatePresence initial={false}>
                          {filtered.map((prod) => {
                            const isEditingPrice = inlinePriceEdit?.id === prod.id;
                            
                            return (
                              <fMotion.div
                                key={prod.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                draggable
                                onDragStart={(e: any) => handleDragStartProduct(e, prod.id, category.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e: any) => handleDropProduct(e, prod.id, category.id)}
                                className={`flex justify-between items-center gap-4 py-3 cursor-move hover:bg-admin-bg-subtle/10 px-2 rounded-lg transition-all ${
                                  draggedProductId === prod.id ? 'bg-admin-accent/5 opacity-50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-admin-text-muted cursor-grab">
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  {prod.image?.url ? (
                                    <img src={prod.image.url} alt="" className="w-10 h-10 rounded-lg object-cover border border-admin-border" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-admin-bg-subtle flex items-center justify-center border border-admin-border text-admin-text-muted">
                                      <ShoppingBag className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-bold text-xs text-admin-text-primary">{prod.name}</h4>
                                    {prod.description && <p className="text-[10px] text-admin-text-secondary mt-0.5 leading-relaxed line-clamp-1">{prod.description}</p>}
                                    
                                    {/* Display modifiers count tags */}
                                    {((prod.options && prod.options.length > 0) || (prod.modifiers && prod.modifiers.length > 0)) && (
                                      <div className="flex gap-1.5 mt-1">
                                        {prod.options && prod.options.length > 0 && (
                                          <span className="text-[8px] font-black bg-admin-accent/10 text-admin-accent border border-admin-accent/20 px-1.5 py-0.5 rounded">
                                            {prod.options.length} مجموعات خيارات
                                          </span>
                                        )}
                                        {prod.modifiers && prod.modifiers.length > 0 && (
                                          <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                                            {prod.modifiers.length} إضافات
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                  {/* Price edit */}
                                  {isEditingPrice ? (
                                    <div className="flex items-center gap-1 bg-admin-bg-base border border-admin-border rounded-lg p-0.5">
                                      <input
                                        type="number"
                                        value={inlinePriceEdit.price}
                                        onChange={(e) => setInlinePriceEdit({ id: prod.id, price: e.target.value })}
                                        className="w-14 bg-transparent text-left px-1.5 py-0.5 text-xs text-admin-text-primary focus:outline-none font-mono"
                                      />
                                      <button
                                        onClick={() => inlinePriceMutation.mutate({ id: prod.id, price: Number(inlinePriceEdit.price) })}
                                        className="p-1 text-emerald-600 hover:text-emerald-500"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 group text-xs font-black">
                                      <span className="text-admin-accent font-mono">{prod.price} ج.م</span>
                                      <button
                                        onClick={() => setInlinePriceEdit({ id: prod.id, price: String(prod.price) })}
                                        className="opacity-0 group-hover:opacity-100 text-admin-text-muted hover:text-admin-text-primary transition-opacity"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}

                                  {/* Availability */}
                                  <button
                                    onClick={() => toggleProdMutation.mutate(prod.id)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                      prod.isAvailable
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                                        : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                                    }`}
                                  >
                                    {prod.isAvailable ? 'متاح' : 'نفد'}
                                  </button>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingProdId(prod.id);
                                        setProdName(prod.name);
                                        setProdDesc(prod.description || '');
                                        setProdPrice(String(prod.price));
                                        setProdCatId(prod.categoryId);
                                        setProdImagePreview(prod.image?.url || null);
                                        setOptions(prod.options || []);
                                        setModifiers(prod.modifiers || []);
                                      }}
                                      className="p-1.5 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-accent transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => { if (confirm('هل تريد حذف هذا المنتج؟')) deleteProdMutation.mutate(prod.id); }}
                                      className="p-1.5 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-red-500 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </fMotion.div>
                            );
                          })}
                        </fAnimatePresence>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      {cropperSrc && cropperFile && (
        <ImageCropperModal
          src={cropperSrc}
          fileName={cropperFile.name}
          aspectRatio={1.33}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
