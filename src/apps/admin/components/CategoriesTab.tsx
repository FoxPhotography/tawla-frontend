import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Edit2, Trash2, GripVertical, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import type { Category } from '../../../shared/types';
import { ImageUploadZone } from './ImageUploadZone.js';
import { ImageCropperModal } from './ImageCropperModal.js';
import { useAuthStore } from '../../../shared/store/authStore';

export default function CategoriesTab() {
  const queryClient = useQueryClient();

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catDelayLimit, setCatDelayLimit] = useState<number | ''>('');
  const [catImage, setCatImage] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catType, setCatType] = useState<'restaurant' | 'cafe'>('restaurant');

  const { restaurant } = useAuthStore();
  const isSplitActive = restaurant?.settings?.separateRestCafe === true;

  // Cropper states
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  // Drag and drop states
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.data as Category[];
    },
  });

  // Sync query data with local state when not dragging/syncing
  useEffect(() => {
    if (syncingIds.length === 0 && draggedItemIndex === null) {
      setLocalCategories([...categories].sort((a, b) => a.order - b.order));
    }
  }, [categories, syncingIds, draggedItemIndex]);

  const resetCatForm = () => {
    setCatName('');
    setCatDesc('');
    setCatDelayLimit('');
    setCatImage(null);
    setCatImagePreview(null);
    setEditingCatId(null);
    setCatType('restaurant');
  };

  // Category Mutation (Create/Update)
  const catMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      if (editingCatId) {
        return api.put(`/categories/${editingCatId}`, fd);
      }
      return api.post('/categories', fd);
    },
    onSuccess: () => {
      toast.success(editingCatId ? 'تم تعديل القسم بنجاح.' : 'تم إضافة القسم بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      resetCatForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ القسم.');
    },
  });

  // Delete Category Mutation
  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      toast.success('تم حذف القسم بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حذف القسم.');
    }
  });

  // Reorder Category Mutation
  const reorderCatMutation = useMutation({
    mutationFn: async (variables: { items: { id: string; order: number }[]; draggedId: string }) => {
      await api.put('/categories/reorder', { items: variables.items });
    },
    onMutate: async (variables) => {
      const draggedId = variables.draggedId;
      setSyncingIds((prev) => [...prev, draggedId]);

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['admin-categories'] });

      // Snapshot the previous value
      const previousCategories = queryClient.getQueryData<Category[]>(['admin-categories']);

      // Optimistically update to the new value
      if (previousCategories) {
        const payloadMap = new Map(variables.items.map(item => [item.id, item.order]));
        const optimisticallyUpdated = previousCategories.map(cat => {
          if (payloadMap.has(cat.id)) {
            return { ...cat, order: payloadMap.get(cat.id)! };
          }
          return cat;
        }).sort((a, b) => a.order - b.order);

        queryClient.setQueryData(['admin-categories'], optimisticallyUpdated);
      }

      // Return context with snapshotted value and draggedId
      return { previousCategories, draggedId };
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin-categories'], context.previousCategories);
      }
      if (context?.draggedId) {
        setSyncingIds((prev) => prev.filter((id) => id !== context.draggedId));
      }
      toast.error(err.response?.data?.error || 'فشل إعادة ترتيب الأقسام.');
    },
    onSuccess: (_data, _variables, context) => {
      if (context?.draggedId) {
        setSyncingIds((prev) => prev.filter((id) => id !== context.draggedId));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const handleCatImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCropperFile(file);
      setCropperSrc(URL.createObjectURL(file));
      e.target.value = '';
    }
  };

  const handleCropConfirm = (croppedFile: File) => {
    setCatImage(croppedFile);
    setCatImagePreview(URL.createObjectURL(croppedFile));
    setCropperFile(null);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropCancel = () => {
    setCropperFile(null);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const submitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      return toast.error('يرجى إدخال اسم القسم.');
    }
    const fd = new FormData();
    fd.append('name', catName);
    fd.append('description', catDesc);
    fd.append('delayLimit', catDelayLimit !== '' ? String(catDelayLimit) : '20');
    if (isSplitActive) {
      fd.append('type', catType);
    }
    if (catImage) {
      fd.append('image', catImage);
    }
    catMutation.mutate(fd);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (hoverIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === hoverIndex) return;

    const list = [...localCategories];
    const draggedItem = list[draggedItemIndex];
    
    // Remove the item from its current position
    list.splice(draggedItemIndex, 1);
    // Insert it at the new position
    list.splice(hoverIndex, 0, draggedItem);

    setLocalCategories(list);
    setDraggedItemIndex(hoverIndex);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
    setLocalCategories([...categories].sort((a, b) => a.order - b.order));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;

    const originalOrders = [...categories].map(c => c.order).sort((a, b) => a - b);
    const updatedList = localCategories.map((item, index) => ({
      ...item,
      order: originalOrders[index] !== undefined ? originalOrders[index] : index
    }));

    const payload = updatedList.map(c => ({ id: c.id, order: c.order }));
    reorderCatMutation.mutate({ items: payload, draggedId: localCategories[draggedItemIndex].id });
    setDraggedItemIndex(null);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-admin-text-primary">أقسام وتصنيفات المينيو</h2>
        <span className="bg-admin-bg-subtle text-admin-text-secondary text-xs px-3 py-1 rounded-full font-bold">
          {categories.length} أقسام
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Creation Form */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 shadow-admin-card space-y-5 h-fit">
          <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-admin-accent" />
            <span>{editingCatId ? 'تعديل بيانات القسم المحدد' : 'إضافة قسم جديد للمينيو'}</span>
          </h3>

          <form onSubmit={submitCategory} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">اسم القسم *</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="مثال: المشويات، المشروبات الباردة"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">وصف فرعي (اختياري)</label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="مثال: محضرة على الفحم الطازج"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">وقت تحضير القسم (بالدقائق) *</label>
              <input
                type="number"
                required
                min={1}
                max={120}
                value={catDelayLimit}
                onChange={(e) => setCatDelayLimit(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="مثال: 15 (الافتراضي 20 دقيقة)"
                className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors text-right"
              />
            </div>

            {isSplitActive && (
              <div className="space-y-1.5">
                <label className="block text-xs text-admin-text-secondary font-bold">نوع القسم (جهة المبيعات)</label>
                <div className="grid grid-cols-2 gap-2 bg-admin-bg-base p-1 rounded-lg border border-admin-border">
                  <button
                    type="button"
                    onClick={() => setCatType('restaurant')}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      catType === 'restaurant'
                        ? 'bg-admin-accent text-white shadow-sm'
                        : 'text-admin-text-secondary hover:text-admin-text-primary'
                    }`}
                  >
                    مطعم
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('cafe')}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      catType === 'cafe'
                        ? 'bg-admin-accent text-white shadow-sm'
                        : 'text-admin-text-secondary hover:text-admin-text-primary'
                    }`}
                  >
                    كافيه
                  </button>
                </div>
              </div>
            )}

            {/* Image upload zone wrapper */}
            <div className="space-y-1.5">
              <label className="block text-xs text-admin-text-secondary font-bold">صورة القسم التوضيحية</label>
              <ImageUploadZone
                preview={catImagePreview}
                onFileChange={handleCatImageChange}
                onClear={() => {
                  setCatImage(null);
                  setCatImagePreview(null);
                }}
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <motion.button
                type="submit"
                disabled={catMutation.isPending}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2.5 bg-admin-accent text-white font-bold text-xs rounded-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 shadow-admin-accent cursor-pointer"
              >
                {catMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{editingCatId ? 'حفظ التعديلات' : 'إضافة القسم'}</span>
                )}
              </motion.button>
              {editingCatId && (
                <button
                  type="button"
                  onClick={resetCatForm}
                  className="bg-admin-bg-subtle text-admin-text-secondary border border-admin-border py-2 px-4 rounded-lg text-xs font-semibold hover:bg-admin-bg-base transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Categories List grid */}
        <div className="col-span-1 lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-extrabold text-admin-text-primary text-sm">أقسام المطعم الحالية</h3>
            <span className="text-[10px] text-admin-text-secondary font-medium">اسحب الأقسام رأسياً لترتيب ظهورها في منيو العميل</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl">
              <div className="w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-20 bg-admin-bg-elevated border border-admin-border rounded-xl">
              <p className="text-xs text-admin-text-muted font-medium">لا توجد أقسام مسجلة حالياً، أضف أول قسم لبدء المينيو.</p>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <AnimatePresence initial={false}>
                {localCategories
                  .map((category, index) => {
                    const isSyncing = syncingIds.includes(category.id);
                    return (
                      <motion.div
                        key={category.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        draggable={!isSyncing}
                        onDragStart={(e) => !isSyncing && handleDragStart(e as any, index)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => !isSyncing && handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        className={`bg-admin-bg-elevated border border-admin-border rounded-xl p-4 flex justify-between items-center gap-4 hover:border-admin-accent/20 transition-all cursor-move shadow-sm ${
                          isSyncing ? 'border-admin-accent/40 bg-admin-accent/[0.02] shadow-inner' : ''
                        } ${
                          draggedItemIndex === index ? 'opacity-30 border-dashed border-admin-accent/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSyncing ? (
                            <div className="text-admin-accent animate-spin">
                              <Loader2 className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="text-admin-text-muted cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          {category.image?.url ? (
                            <img src={category.image.url} alt="" draggable={false} className="w-10 h-10 rounded-lg object-cover border border-admin-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-admin-bg-subtle flex items-center justify-center text-admin-text-muted border border-admin-border">
                              <FolderPlus className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-extrabold text-sm text-admin-text-primary flex items-center gap-2">
                              <span>{category.name}</span>
                              {isSyncing && (
                                <span className="text-[9px] bg-admin-accent/10 text-admin-accent border border-admin-accent/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  <span>جاري الحفظ...</span>
                                </span>
                              )}
                              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                {category.delayLimit !== undefined ? category.delayLimit : 20} دقيقة
                              </span>
                              {isSplitActive && (
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                  category.type === 'cafe'
                                    ? 'bg-[#801B2C]/10 text-[#801B2C] border-[#801B2C]/20'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {category.type === 'cafe' ? 'كافيه' : 'مطعم'}
                                </span>
                              )}
                            </h4>
                            {category.description && <p className="text-[10px] text-admin-text-secondary mt-0.5">{category.description}</p>}
                          </div>
                        </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingCatId(category.id);
                            setCatName(category.name);
                            setCatDesc(category.description || '');
                            setCatImagePreview(category.image?.url || null);
                            setCatDelayLimit(category.delayLimit !== undefined ? category.delayLimit : '');
                            setCatType(category.type || 'restaurant');
                          }}
                          className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-admin-accent transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('هل تريد حذف هذا القسم؟ سيتم إلغاء تصنيف منتجاته.')) deleteCatMutation.mutate(category.id); }}
                          className="p-2 rounded-lg border border-admin-border bg-white text-admin-text-secondary hover:text-red-650 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      {cropperSrc && cropperFile && (
        <ImageCropperModal
          src={cropperSrc}
          file={cropperFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
