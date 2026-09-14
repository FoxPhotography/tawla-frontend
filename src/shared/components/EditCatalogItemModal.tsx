import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Layers,
  UtensilsCrossed,
  Coffee,
  Check,
  PlusCircle,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import ConfirmModal from './ConfirmModal';

export interface CatalogOptionChoice {
  name: string;
  priceAdjustment: number;
}

export interface CatalogOption {
  name: string;
  required?: boolean;
  choices: CatalogOptionChoice[];
}

export interface CatalogModifierChoice {
  name: string;
  price: number;
}

export interface CatalogModifier {
  name: string;
  choices: CatalogModifierChoice[];
}

export interface MasterCatalogItemData {
  _id?: string;
  name: string;
  nameEn: string;
  category: string;
  categoryType: 'cafe' | 'restaurant';
  description: string;
  suggestedPrice: number;
  image?: {
    url: string;
    publicId: string;
  };
  options?: CatalogOption[];
  modifiers?: CatalogModifier[];
  tags?: string[];
  order?: number;
}

interface EditCatalogItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MasterCatalogItemData | null;
  existingCategories?: string[];
  onSaved: () => void;
  onDeleted?: () => void;
}

export default function EditCatalogItemModal({
  isOpen,
  onClose,
  item,
  existingCategories = [],
  onSaved,
  onDeleted,
}: EditCatalogItemModalProps) {
  const isEditing = !!item?._id;

  // Form State
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState('');
  const [categoryType, setCategoryType] = useState<'cafe' | 'restaurant'>('cafe');
  const [description, setDescription] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState<number | string>('');
  const [tags, setTags] = useState('');
  const [order, setOrder] = useState<number>(0);

  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');

  // Options & Modifiers
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [modifiers, setModifiers] = useState<CatalogModifier[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Populate form on open / item change
  useEffect(() => {
    if (isOpen) {
      if (item) {
        setName(item.name || '');
        setNameEn(item.nameEn || '');
        setCategory(item.category || '');
        setCategoryType(item.categoryType || 'cafe');
        setDescription(item.description || '');
        setSuggestedPrice(item.suggestedPrice ?? '');
        setOrder(item.order ?? 0);
        setTags(Array.isArray(item.tags) ? item.tags.join(', ') : '');
        setImagePreview(item.image?.url || '');
        setImageUrl(item.image?.url || '');
        setImageFile(null);
        setOptions(JSON.parse(JSON.stringify(item.options || [])));
        setModifiers(JSON.parse(JSON.stringify(item.modifiers || [])));
      } else {
        setName('');
        setNameEn('');
        setCategory(existingCategories[0] || 'قهوة ومشروبات ساخنة');
        setCategoryType('cafe');
        setDescription('');
        setSuggestedPrice(50);
        setOrder(0);
        setTags('');
        setImagePreview('');
        setImageUrl('');
        setImageFile(null);
        setOptions([]);
        setModifiers([]);
      }
    }
  }, [isOpen, item, existingCategories]);

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صالح.');
        return;
      }
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  // Option Handlers
  const addOptionGroup = () => {
    setOptions([
      ...options,
      {
        name: 'الحجم',
        required: true,
        choices: [
          { name: 'وسط (Medium)', priceAdjustment: 0 },
          { name: 'كبير (Large)', priceAdjustment: 15 },
        ],
      },
    ]);
  };

  const removeOptionGroup = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const addOptionChoice = (groupIndex: number) => {
    const updated = [...options];
    updated[groupIndex].choices.push({ name: '', priceAdjustment: 0 });
    setOptions(updated);
  };

  const removeOptionChoice = (groupIndex: number, choiceIndex: number) => {
    const updated = [...options];
    updated[groupIndex].choices = updated[groupIndex].choices.filter((_, i) => i !== choiceIndex);
    setOptions(updated);
  };

  // Modifier Handlers
  const addModifierGroup = () => {
    setModifiers([
      ...modifiers,
      {
        name: 'إضافات واختيارات',
        choices: [{ name: 'إضافة مميزة', price: 10 }],
      },
    ]);
  };

  const removeModifierGroup = (index: number) => {
    setModifiers(modifiers.filter((_, i) => i !== index));
  };

  const addModifierChoice = (groupIndex: number) => {
    const updated = [...modifiers];
    updated[groupIndex].choices.push({ name: '', price: 10 });
    setModifiers(updated);
  };

  const removeModifierChoice = (groupIndex: number, choiceIndex: number) => {
    const updated = [...modifiers];
    updated[groupIndex].choices = updated[groupIndex].choices.filter((_, i) => i !== choiceIndex);
    setModifiers(updated);
  };

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الصنف بالعربية.');
      return;
    }
    if (!category.trim()) {
      toast.error('يرجى تحديد قسم الصنف.');
      return;
    }
    const priceNum = Number(suggestedPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('يرجى إدخال سعر مقترح صالح.');
      return;
    }

    try {
      setIsSubmitting(true);

      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Prepare payload
      if (imageFile) {
        // Multipart FormData for image upload
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('name', name.trim());
        formData.append('nameEn', nameEn.trim() || name.trim());
        formData.append('category', category.trim());
        formData.append('categoryType', categoryType);
        formData.append('description', description.trim());
        formData.append('suggestedPrice', String(priceNum));
        formData.append('order', String(order));
        formData.append('options', JSON.stringify(options));
        formData.append('modifiers', JSON.stringify(modifiers));
        formData.append('tags', JSON.stringify(parsedTags));

        if (isEditing) {
          await api.put(`/catalog/${item!._id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.post('/catalog', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else {
        // Standard JSON payload
        const payload: any = {
          name: name.trim(),
          nameEn: nameEn.trim() || name.trim(),
          category: category.trim(),
          categoryType,
          description: description.trim(),
          suggestedPrice: priceNum,
          order,
          options,
          modifiers,
          tags: parsedTags,
        };

        if (imageUrl) {
          payload.imageUrl = imageUrl;
          payload.imagePublicId = item?.image?.publicId || imageUrl;
        }

        if (isEditing) {
          await api.put(`/catalog/${item!._id}`, payload);
        } else {
          await api.post('/catalog', payload);
        }
      }

      toast.success(isEditing ? 'تم تحديث بيانات الصنف بالكتالوج بنجاح!' : 'تمت إضافة الصنف الجديد للكتالوج العام!');
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving catalog item:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ الصنف.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!item?._id) return;
    try {
      setIsDeleting(true);
      await api.delete(`/catalog/${item._id}`);
      toast.success('تم حذف الصنف من الكتالوج العام بنجاح.');
      setIsDeleteModalOpen(false);
      if (onDeleted) onDeleted();
      onClose();
    } catch (error: any) {
      console.error('Error deleting catalog item:', error);
      toast.error(error.response?.data?.message || 'تعذر حذف الصنف.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45 backdrop-blur-sm overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-white border border-zinc-200/90 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right text-zinc-900"
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-200/80 bg-zinc-50/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#801B2C]/10 border border-[#801B2C]/20 text-[#801B2C] flex items-center justify-center">
                {categoryType === 'restaurant' ? (
                  <UtensilsCrossed className="w-5 h-5 text-[#801B2C]" />
                ) : (
                  <Coffee className="w-5 h-5 text-[#801B2C]" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">
                  {isEditing ? `تعديل الصنف: ${item?.name}` : 'إضافة صنف أساسي جديد للكتالوج العام'}
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  بيانات الصنف ستكون متاحة لجميع المقاهي والمطاعم المشتركة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
            {/* Image Preview & Upload */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden flex-shrink-0 relative group">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold">بدون صورة</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-right w-full">
                <div className="text-xs font-extrabold text-zinc-800">صورة الصنف الحقيقية (Studio Photo)</div>
                <p className="text-[11px] text-zinc-500">
                  يمكنك رفع صورة من جهازك، وسيتم تحسينها وضغطها تلقائياً بصيغة WebP خفيفة وفائقة السرعة (800x800).
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#801B2C] hover:bg-[#9a2135] text-white text-xs font-bold transition-all shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة جديدة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {imageFile && (
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      تم اختيار: {imageFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  اسم الصنف (بالعربية) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: قهوة تركي محوجة"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  اسم الصنف (بالإنجليزية)
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="مثال: Turkish Coffee"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C] focus:bg-white transition-colors text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  القسم التابع له <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="catalog-categories-list"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="اكتب القسم أو اختر من القائمة"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C] focus:bg-white transition-colors"
                />
                <datalist id="catalog-categories-list">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  السعر المقترح (ج.م) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={suggestedPrice}
                  onChange={(e) => setSuggestedPrice(e.target.value)}
                  placeholder="50"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C] focus:bg-white transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  نوع النشاط
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryType('cafe')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      categoryType === 'cafe'
                        ? 'bg-[#801B2C] text-white border-[#801B2C] shadow-sm'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>كافيه ومشروبات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryType('restaurant')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      categoryType === 'restaurant'
                        ? 'bg-[#801B2C] text-white border-[#801B2C] shadow-sm'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>مطعم ومأكولات</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  الكلمات الدلالية للبحث (مفصولة بفواصل)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="قهوة، اسبريسو، بن..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                وصف الصنف
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف تسويقي جذاب يشرح مكونات وطريقة تقديم الصنف..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C] focus:bg-white transition-colors leading-relaxed resize-none"
              />
            </div>

            {/* Options Section */}
            <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#801B2C]" />
                    <span>مجموعات الخيارات والمقاسات (Options)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    مثل: الحجم (Medium, Large)، نوع البن، درجة السكر، إلخ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addOptionGroup}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#801B2C]" />
                  <span>+ إضافة مجموعة خيارات</span>
                </button>
              </div>

              {options.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-400 font-medium border border-dashed border-zinc-200 rounded-lg bg-white">
                  لا توجد خيارات مخصصة لهذا الصنف حالياً (صنف موحد السعر).
                </div>
              ) : (
                <div className="space-y-3">
                  {options.map((opt, gIdx) => (
                    <div
                      key={gIdx}
                      className="p-3.5 rounded-xl bg-white border border-zinc-200 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={opt.name}
                            onChange={(e) => {
                              const updated = [...options];
                              updated[gIdx].name = e.target.value;
                              setOptions(updated);
                            }}
                            placeholder="اسم المجموعة (مثال: الحجم والمقاس)"
                            className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C]"
                          />
                          <label className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={opt.required ?? false}
                              onChange={(e) => {
                                const updated = [...options];
                                updated[gIdx].required = e.target.checked;
                                setOptions(updated);
                              }}
                              className="accent-[#801B2C] rounded"
                            />
                            <span>إجباري؟</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOptionGroup(gIdx)}
                          className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Choices */}
                      <div className="space-y-1.5 pr-3 border-r-2 border-zinc-200">
                        {opt.choices.map((c, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => {
                                const updated = [...options];
                                updated[gIdx].choices[cIdx].name = e.target.value;
                                setOptions(updated);
                              }}
                              placeholder="اسم الاختيار (مثال: كبير Large)"
                              className="flex-1 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900"
                            />
                            <div className="flex items-center gap-1 w-28">
                              <span className="text-[10px] text-zinc-500 font-bold">+</span>
                              <input
                                type="number"
                                step="any"
                                value={c.priceAdjustment}
                                onChange={(e) => {
                                  const updated = [...options];
                                  updated[gIdx].choices[cIdx].priceAdjustment = Number(e.target.value);
                                  setOptions(updated);
                                }}
                                placeholder="0"
                                className="w-full px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 font-mono text-center"
                              />
                              <span className="text-[10px] text-zinc-500 font-bold">ج.م</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOptionChoice(gIdx, cIdx)}
                              className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOptionChoice(gIdx)}
                          className="text-[11px] text-[#801B2C] hover:underline font-bold flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>إضافة اختيار آخر</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modifiers Section (NO SPARKLES!) */}
            <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-[#801B2C]" />
                    <span>مجموعات الإضافات الاختيارية (Modifiers)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    مثل: صوصات إضافية، مكسرات، دبل شوت، إلخ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addModifierGroup}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#801B2C]" />
                  <span>+ إضافة مجموعة إضافات</span>
                </button>
              </div>

              {modifiers.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-400 font-medium border border-dashed border-zinc-200 rounded-lg bg-white">
                  لا توجد إضافات لهذا الصنف.
                </div>
              ) : (
                <div className="space-y-3">
                  {modifiers.map((mod, gIdx) => (
                    <div
                      key={gIdx}
                      className="p-3.5 rounded-xl bg-white border border-zinc-200 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={mod.name}
                          onChange={(e) => {
                            const updated = [...modifiers];
                            updated[gIdx].name = e.target.value;
                            setModifiers(updated);
                          }}
                          placeholder="اسم المجموعة (مثال: صوصات إضافية)"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C]"
                        />
                        <button
                          type="button"
                          onClick={() => removeModifierGroup(gIdx)}
                          className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Modifier Choices */}
                      <div className="space-y-1.5 pr-3 border-r-2 border-zinc-200">
                        {mod.choices.map((c, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => {
                                const updated = [...modifiers];
                                updated[gIdx].choices[cIdx].name = e.target.value;
                                setModifiers(updated);
                              }}
                              placeholder="اسم الإضافة (مثال: صوص شوكولاتة)"
                              className="flex-1 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900"
                            />
                            <div className="flex items-center gap-1 w-28">
                              <span className="text-[10px] text-zinc-500 font-bold">+</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={c.price}
                                onChange={(e) => {
                                  const updated = [...modifiers];
                                  updated[gIdx].choices[cIdx].price = Number(e.target.value);
                                  setModifiers(updated);
                                }}
                                placeholder="10"
                                className="w-full px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 font-mono text-center"
                              />
                              <span className="text-[10px] text-zinc-500 font-bold">ج.م</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeModifierChoice(gIdx, cIdx)}
                              className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addModifierChoice(gIdx)}
                          className="text-[11px] text-[#801B2C] hover:underline font-bold flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>إضافة خيار آخر</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between gap-3">
              <div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف من الكتالوج</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#801B2C] hover:bg-[#9a2135] text-white text-xs font-black shadow-md shadow-[#801B2C]/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isEditing ? 'حفظ التعديلات' : 'إضافة الصنف'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="حذف صنف من الكتالوج العام"
        message={`هل أنت متأكد من حذف "${item?.name}" من الكتالوج الأساسي؟ لن يظهر هذا الصنف للمطاعم الجديدة.`}
        confirmText="نعم، احذف الصنف"
        cancelText="تراجع"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
