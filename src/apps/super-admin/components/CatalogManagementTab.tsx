import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Coffee,
  UtensilsCrossed,
  Layers,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
import EditCatalogItemModal, { type MasterCatalogItemData } from '../../../shared/components/EditCatalogItemModal';
import ConfirmModal from '../../../shared/components/ConfirmModal';

export default function CatalogManagementTab() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'cafe' | 'restaurant'>('all');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterCatalogItemData | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<MasterCatalogItemData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Horizontal scroll ref for category pills
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  // Fetch catalog items
  const { data: catalogItems = [], isLoading: loadingItems } = useQuery<MasterCatalogItemData[]>({
    queryKey: ['master-catalog', selectedCategory, selectedType],
    queryFn: async () => {
      const params: any = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedType !== 'all') params.type = selectedType;
      const res = await api.get('/catalog', { params });
      return res.data.data;
    },
  });

  // Fetch catalog categories
  const { data: catalogCategories = [] } = useQuery<{ name: string; count: number; type: string }[]>({
    queryKey: ['master-catalog-categories'],
    queryFn: async () => {
      const res = await api.get('/catalog/categories');
      return res.data.data;
    },
  });

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return catalogItems;
    const q = searchQuery.toLowerCase().trim();
    return catalogItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [catalogItems, searchQuery]);

  // Statistics calculation
  const totalCount = catalogItems.length;
  const cafeCount = catalogItems.filter((i) => i.categoryType === 'cafe').length;
  const restaurantCount = catalogItems.filter((i) => i.categoryType === 'restaurant').length;

  // Horizontal Scroll Controls
  const scrollCategories = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const amount = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current && (e.deltaY !== 0 || e.deltaX !== 0)) {
      scrollContainerRef.current.scrollLeft += e.deltaY || e.deltaX;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftPos(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Open Add Item
  const handleAddNew = () => {
    setEditingItem(null);
    setIsEditModalOpen(true);
  };

  // Open Edit Item
  const handleEdit = (item: MasterCatalogItemData) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // Open Delete Item
  const handleDeleteClick = (item: MasterCatalogItemData) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem?._id) return;
    try {
      setIsDeleting(true);
      await api.delete(`/catalog/${deletingItem._id}`);
      toast.success(`تم حذف "${deletingItem.name}" من الكتالوج بنجاح.`);
      queryClient.invalidateQueries({ queryKey: ['master-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['master-catalog-categories'] });
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.message || 'فشل حذف الصنف.');
    } finally {
      setIsDeleting(false);
    }
  };

  const existingCategoryNames = catalogCategories.map((c) => c.name);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & Stats */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-[#801B2C]/10 text-[#801B2C] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-zinc-900">كتالوج الأصناف الأساسية الموحد</h2>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            إدارة وتعديل مكتبة الأصناف الجاهزة (الأسماء، الصور، المقاسات، والخيارات) التي تظهر للمقاهي والمطاعم للاستيراد الفوري.
          </p>
        </div>

        {/* Quick Stats Badges & Add Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700">
            <span>إجمالي الأصناف:</span>
            <span className="font-mono text-[#801B2C] font-black">{totalCount}</span>
          </div>

          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700">
            <span>الأقسام:</span>
            <span className="font-mono text-zinc-900 font-black">{catalogCategories.length}</span>
          </div>

          <button
            type="button"
            onClick={handleAddNew}
            className="px-4 py-2 rounded-xl bg-[#801B2C] hover:bg-[#9a2135] text-white text-xs font-black shadow-md shadow-[#801B2C]/20 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة صنف أساسي جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم العربي، الإنجليزي، أو الهاشتاج..."
              className="w-full pr-9 pl-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#801B2C] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700"
              >
                مسح
              </button>
            )}
          </div>

          {/* Activity Type Toggle Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedType === 'all'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              الكل ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('cafe')}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                selectedType === 'cafe'
                  ? 'bg-white text-[#801B2C] shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>كافيه ({cafeCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('restaurant')}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                selectedType === 'restaurant'
                  ? 'bg-white text-[#801B2C] shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>مطعم ({restaurantCount})</span>
            </button>
          </div>
        </div>

        {/* Categories Horizontal Scroll Bar */}
        <div className="relative flex items-center group/scroll pt-1 border-t border-zinc-100">
          {/* Scroll Right (Prev in RTL) */}
          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className="absolute right-0 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 shadow-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="التمرير لليمين"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            ref={scrollContainerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="flex items-center gap-2 overflow-x-auto px-10 py-1.5 scrollbar-thin scrollbar-thumb-zinc-300 hover:scrollbar-thumb-[#801B2C]/50 scrollbar-track-transparent select-none cursor-grab active:cursor-grabbing scroll-smooth w-full"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#801B2C] text-white shadow-sm'
                  : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              جميع الأقسام ({totalCount})
            </button>
            {catalogCategories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-[#801B2C] text-white shadow-sm'
                    : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedCategory === cat.name
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 text-zinc-500'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Scroll Left (Next in RTL) */}
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className="absolute left-0 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 shadow-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="التمرير لليسار"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Catalog Items Grid */}
      {loadingItems ? (
        <div className="flex flex-col items-center justify-center py-28 text-center bg-white border border-zinc-200/80 rounded-2xl">
          <Loader2 className="w-8 h-8 text-[#801B2C] animate-spin mb-3" />
          <p className="text-xs text-zinc-500 font-bold">جاري تحميل أصناف الكتالوج العام...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-zinc-200/80 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3 text-zinc-400">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">لم يتم العثور على أصناف مطابقة</h4>
          <p className="text-xs text-zinc-500 max-w-sm">
            جرّب تغيير كلمات البحث أو اختيار قسم آخر.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-zinc-500">
            <span>يظهر {filteredItems.length} صنفاً أساسياً</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className="group bg-white border border-zinc-200/80 hover:border-[#801B2C]/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Photo Container */}
                  <div className="aspect-square w-full relative bg-zinc-100 overflow-hidden">
                    <img
                      src={item.image?.url || '/uploads/catalog/turkish-coffee.webp'}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Price Badge */}
                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md text-white font-mono text-xs font-black shadow">
                      {item.suggestedPrice} ج.م
                    </div>
                    {/* Category Badge */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white/95 text-[10px] font-bold">
                      {item.category}
                    </div>
                    {/* Type Badge */}
                    <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-md text-zinc-800 flex items-center justify-center shadow-sm">
                      {item.categoryType === 'restaurant' ? (
                        <UtensilsCrossed className="w-3.5 h-3.5 text-red-600" />
                      ) : (
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div>
                      <h4 className="text-sm font-black text-zinc-900 group-hover:text-[#801B2C] transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-medium text-zinc-400 line-clamp-1" dir="ltr">
                        {item.nameEn}
                      </p>
                    </div>

                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Features Tags (Options & Modifiers) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {item.options && item.options.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                          <Layers className="w-2.5 h-2.5 text-[#801B2C]" />
                          <span>{item.options.length} مجموعات خيارات</span>
                        </span>
                      )}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          <span>{item.modifiers.length} إضافات</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-50 hover:bg-[#801B2C] hover:text-white border border-zinc-200 text-zinc-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>تعديل الصنف</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteClick(item)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="حذف من الكتالوج"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit / Create Item Modal */}
      <EditCatalogItemModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        existingCategories={existingCategoryNames}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['master-catalog'] });
          queryClient.invalidateQueries({ queryKey: ['master-catalog-categories'] });
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['master-catalog'] });
          queryClient.invalidateQueries({ queryKey: ['master-catalog-categories'] });
        }}
      />

      {/* Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="حذف صنف من الكتالوج العام"
        message={`هل أنت متأكد من رغبتك في حذف الصنف "${deletingItem?.name}" من الكتالوج الأساسي نهائياً؟`}
        confirmText="نعم، احذف الصنف"
        cancelText="تراجع"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingItem(null);
        }}
      />
    </div>
  );
}
