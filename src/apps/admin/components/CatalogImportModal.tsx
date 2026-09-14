import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Library,
  Check,
  Plus,
  Loader2,
  CheckSquare,
  Square,
  Coffee,
  UtensilsCrossed,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import type { Category } from '../../../shared/types';
import CustomSelect from './CustomSelect.js';

interface CatalogOptionChoice {
  name: string;
  priceAdjustment: number;
}

interface CatalogOption {
  name: string;
  required?: boolean;
  choices: CatalogOptionChoice[];
}

interface CatalogModifierChoice {
  name: string;
  price: number;
}

interface CatalogModifier {
  name: string;
  choices: CatalogModifierChoice[];
}

export interface MasterCatalogItem {
  _id: string;
  name: string;
  nameEn: string;
  category: string;
  categoryType: 'cafe' | 'restaurant';
  description: string;
  suggestedPrice: number;
  image: {
    url: string;
    publicId: string;
  };
  options?: CatalogOption[];
  modifiers?: CatalogModifier[];
  tags?: string[];
  order?: number;
}

interface CatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export function CatalogImportModal({ isOpen, onClose, categories }: CatalogImportModalProps) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'cafe' | 'restaurant'>('all');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [targetCategoryOption, setTargetCategoryOption] = useState<string>('auto'); // 'auto' or specific categoryId

  // Fetch catalog items
  const { data: catalogItems = [], isLoading: loadingCatalog } = useQuery<MasterCatalogItem[]>({
    queryKey: ['master-catalog', selectedCategory, selectedType],
    queryFn: async () => {
      const params: any = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedType !== 'all') params.type = selectedType;
      const res = await api.get('/catalog', { params });
      return res.data.data;
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch catalog category statistics
  const { data: catalogCategories = [] } = useQuery<{ name: string; count: number; type: string }[]>({
    queryKey: ['master-catalog-categories'],
    queryFn: async () => {
      const res = await api.get('/catalog/categories');
      return res.data.data;
    },
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  // Filter items locally by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return catalogItems;
    const q = searchQuery.toLowerCase().trim();
    return catalogItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [catalogItems, searchQuery]);

  // Toggle selection of a single item
  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select/Deselect all filtered items
  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map((item) => item._id)));
    }
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (itemsToImport: { catalogItemId: string; targetCategoryId?: string }[]) => {
      const res = await api.post('/catalog/import', { items: itemsToImport });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'تم استيراد الأصناف بنجاح وإضافتها للمنيو!');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setSelectedItemIds(new Set());
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل استيراد الأصناف.');
    },
  });

  // Handle single item quick add
  const handleQuickAdd = (item: MasterCatalogItem) => {
    const payload = [
      {
        catalogItemId: item._id,
        targetCategoryId: targetCategoryOption !== 'auto' ? targetCategoryOption : undefined,
      },
    ];
    importMutation.mutate(payload);
  };

  // Handle batch import of selected items
  const handleBatchImport = () => {
    if (selectedItemIds.size === 0) return;
    const payload = Array.from(selectedItemIds).map((id) => ({
      catalogItemId: id,
      targetCategoryId: targetCategoryOption !== 'auto' ? targetCategoryOption : undefined,
    }));
    importMutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-admin-bg-base border border-admin-border w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-right"
          dir="rtl"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-admin-border flex items-center justify-between bg-admin-bg-elevated">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-admin-text-primary flex items-center gap-2">
                  مكتبة الأصناف الجاهزة
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-admin-accent-light text-admin-accent border border-admin-accent/20">
                    200+ صنف موحد
                  </span>
                </h3>
                <p className="text-xs text-admin-text-muted mt-0.5">
                  استورد أشهر مأكولات ومشروبات الكافيهات والمطاعم بصور استوديو موحدة فائقة السرعة بضغطة واحدة.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-bg-subtle transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search, Filter & Type Controls */}
          <div className="p-4 border-b border-admin-border bg-admin-bg-base space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-admin-text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن صنف بالاسم أو الوصف (كابتشينو، موهيتو، برجر، وافل...)"
                  className="w-full bg-admin-bg-elevated border border-admin-border text-admin-text-primary text-xs rounded-xl pr-10 pl-4 py-2.5 focus:border-admin-accent focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted hover:text-admin-text-primary"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Type Switcher */}
              <div className="flex items-center bg-admin-bg-elevated border border-admin-border rounded-xl p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedType === 'all'
                      ? 'bg-admin-accent text-white shadow-sm'
                      : 'text-admin-text-muted hover:text-admin-text-primary'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('cafe')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    selectedType === 'cafe'
                      ? 'bg-admin-accent text-white shadow-sm'
                      : 'text-admin-text-muted hover:text-admin-text-primary'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  كافيهات
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('restaurant')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    selectedType === 'restaurant'
                      ? 'bg-admin-accent text-white shadow-sm'
                      : 'text-admin-text-muted hover:text-admin-text-primary'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  مطاعم
                </button>
              </div>

              {/* Target Category Selector */}
              <div className="flex items-center gap-2 min-w-[240px]">
                <span className="text-xs text-admin-text-muted font-bold whitespace-nowrap">القسم المستهدف:</span>
                <div className="flex-1 min-w-[200px]">
                  <CustomSelect
                    value={targetCategoryOption}
                    onChange={(val: string) => setTargetCategoryOption(val)}
                    options={[
                      { value: 'auto', label: 'مطابقة الأقسام تلقائياً (موصى به)' },
                      ...categories.map((c) => ({ value: c.id, label: c.name }))
                    ]}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-admin-accent text-white shadow-sm'
                    : 'bg-admin-bg-elevated border border-admin-border text-admin-text-secondary hover:text-admin-text-primary hover:border-admin-accent/40'
                }`}
              >
                جميع الأقسام ({catalogItems.length})
              </button>
              {catalogCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.name
                      ? 'bg-admin-accent text-white shadow-sm'
                      : 'bg-admin-bg-elevated border border-admin-border text-admin-text-secondary hover:text-admin-text-primary hover:border-admin-accent/40'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      selectedCategory === cat.name ? 'bg-white/20 text-white' : 'bg-admin-bg-subtle text-admin-text-muted'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Items Content Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-admin-bg-base">
            {loadingCatalog ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Loader2 className="w-8 h-8 text-admin-accent animate-spin mb-3" />
                <p className="text-xs text-admin-text-muted font-bold">جاري تحميل الأصناف من الكتالوج الموحد...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-admin-bg-subtle border border-admin-border flex items-center justify-center mb-3 text-admin-text-muted">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-admin-text-primary mb-1">لم يتم العثور على أصناف مطابقة</h4>
                <p className="text-xs text-admin-text-muted max-w-sm">
                  جرّب البحث بكلمة أخرى أو تصفح باقي الأقسام.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4 text-xs font-bold text-admin-text-secondary">
                  <span>يظهر {filteredItems.length} صنف</span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-admin-accent hover:underline font-black"
                  >
                    {selectedItemIds.size === filteredItems.length && filteredItems.length > 0 ? (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        <span>إلغاء تحديد الكل</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        <span>تحديد جميع المعروض ({filteredItems.length})</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItems.map((item) => {
                    const isSelected = selectedItemIds.has(item._id);
                    return (
                      <div
                        key={item._id}
                        onClick={() => toggleItemSelection(item._id)}
                        className={`group relative bg-admin-bg-elevated border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
                          isSelected
                            ? 'border-admin-accent ring-2 ring-admin-accent/20 shadow-md bg-admin-accent-light/10'
                            : 'border-admin-border hover:border-admin-accent/50 hover:shadow-admin-card'
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-admin-accent text-white shadow-sm'
                                : 'bg-black/40 text-transparent group-hover:text-white/50 border border-white/30 backdrop-blur-sm'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Image Preview */}
                        <div className="aspect-square w-full relative bg-admin-bg-subtle overflow-hidden">
                          <img
                            src={item.image.url}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white font-mono text-[11px] font-black">
                            {item.suggestedPrice} ج
                          </div>
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-bold">
                            {item.category}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            <h4 className="text-xs font-black text-admin-text-primary line-clamp-1 group-hover:text-admin-accent transition-colors">
                              {item.name}
                            </h4>
                            <p className="text-[10px] font-medium text-admin-text-muted line-clamp-1">
                              {item.nameEn}
                            </p>
                            <p className="text-[11px] text-admin-text-secondary mt-1 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          {/* Quick Action Button */}
                          <div className="pt-2 border-t border-admin-border/60 flex items-center justify-between">
                            <span className="text-[10px] text-admin-text-muted font-bold">
                              {item.options && item.options.length > 0
                                ? `${item.options.length} خيارات`
                                : 'صنف أساسي'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdd(item);
                              }}
                              disabled={importMutation.isPending}
                              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-admin-bg-base border border-admin-border hover:border-admin-accent hover:bg-admin-accent hover:text-white text-admin-text-primary font-bold transition-all disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Bar for Batch Import */}
          {selectedItemIds.size > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-4 border-t border-admin-border bg-admin-bg-elevated flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-admin-accent text-white flex items-center justify-center font-black text-xs">
                  {selectedItemIds.size}
                </span>
                <div className="text-xs">
                  <p className="font-extrabold text-admin-text-primary">
                    تم تحديد {selectedItemIds.size} صنف من الكتالوج
                  </p>
                  <p className="text-[10px] text-admin-text-muted">
                    سيتم إضافتهم فوراً لمنيو الكافيه مع الأقسام المطابقة.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedItemIds(new Set())}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-bg-subtle transition-colors"
                >
                  إلغاء التحديد
                </button>
                <button
                  type="button"
                  onClick={handleBatchImport}
                  disabled={importMutation.isPending}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-admin-accent hover:bg-admin-accent/90 text-white text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الاستيراد...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>استيراد ({selectedItemIds.size}) صنف الآن</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
