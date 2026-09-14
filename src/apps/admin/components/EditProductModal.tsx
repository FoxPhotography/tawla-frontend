import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit2,
  Plus,
  ListPlus,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { Category, Product, ProductOption, ProductModifier } from '../../../shared/types';
import { ImageUploadZone } from './ImageUploadZone';
import { ImageCropperModal } from './ImageCropperModal';
import CustomSelect from './CustomSelect';

interface EditProductModalProps {
  product: Product | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProductModal({
  product,
  categories,
  isOpen,
  onClose,
  onSuccess,
}: EditProductModalProps) {
  // Form states
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [catId, setCatId] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Custom Options & Modifiers
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);

  // Cropper states
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  // Populate form on product change or open
  useEffect(() => {
    if (product && isOpen) {
      setName(product.name || '');
      setDesc(product.description || '');
      setPrice(String(product.price || ''));
      setCatId(product.categoryId || '');
      setImage(null);
      setImagePreview(product.image?.url || null);
      setOptions(product.options ? JSON.parse(JSON.stringify(product.options)) : []);
      setModifiers(product.modifiers ? JSON.parse(JSON.stringify(product.modifiers)) : []);
    }
  }, [product, isOpen]);

  // Mutation
  const editMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      return api.put(`/products/${product?.id}`, fd);
    },
    onSuccess: () => {
      toast.success('تم تعديل الصنف بنجاح.');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل حفظ التعديلات.');
    },
  });

  // Image handling
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCropperFile(file);
      setCropperSrc(URL.createObjectURL(file));
      e.target.value = '';
    }
  };

  const handleCropConfirm = (croppedFile: File) => {
    setImage(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    setCropperFile(null);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropCancel = () => {
    setCropperFile(null);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  // Options Handlers
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

  // Modifiers Handlers
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

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim() || !catId) {
      return toast.error('يرجى ملء جميع الحقول المطلوبة.');
    }

    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', desc);
    fd.append('price', price);
    fd.append('categoryId', catId);
    fd.append('options', JSON.stringify(options));
    fd.append('modifiers', JSON.stringify(modifiers));

    if (image) {
      fd.append('image', image);
    }
    editMutation.mutate(fd);
  };

  if (!isOpen || !product) return null;

  return (
    <>
      <AnimatePresence>
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" 
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-admin-bg-elevated border border-admin-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border bg-admin-bg-base/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-admin-accent/10 text-admin-accent rounded-xl border border-admin-accent/20">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-admin-text-primary text-sm sm:text-base flex items-center gap-2">
                    <span>تعديل الصنف:</span>
                    <span className="text-admin-accent">{product.name}</span>
                  </h3>
                  <p className="text-[11px] text-admin-text-muted mt-0.5">
                    عدّل تفاصيل الصنف، الأسعار، المقاسات والإضافات بحرية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-admin-text-muted hover:text-admin-text-primary rounded-xl hover:bg-admin-bg-subtle transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="edit-product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-right">
              {/* Name & Base Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs text-admin-text-secondary font-bold">اسم المنتج *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-xs text-admin-text-secondary font-bold">القسم / التصنيف *</label>
                <CustomSelect
                  value={catId}
                  onChange={(val) => setCatId(val)}
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="اختر قسم المنتج..."
                  className="text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs text-admin-text-secondary font-bold">مكونات أو تفاصيل الصنف (وصف)</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="تفاصيل المكونات أو الحجم..."
                  className="w-full bg-admin-bg-base border border-admin-border text-admin-text-primary text-xs rounded-lg px-3 py-2.5 focus:border-admin-accent focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Product Image */}
              <div className="space-y-1.5">
                <label className="block text-xs text-admin-text-secondary font-bold">صورة المنتج</label>
                <ImageUploadZone
                  preview={imagePreview}
                  onFileChange={handleImageChange}
                  onClear={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                />
              </div>

              {/* PRODUCT CUSTOMIZATION SECTION */}
              <div className="pt-4 border-t border-admin-border space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-xs text-admin-text-primary">مجموعات المقاسات والخيارات</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addOptionGroup}
                      className="flex items-center gap-1 text-[10px] font-black text-admin-accent bg-admin-accent/10 border border-admin-accent/20 px-2.5 py-1.5 rounded-lg hover:bg-admin-accent/20 transition-all cursor-pointer"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span>+ مجموعة مقاسات</span>
                    </button>
                    <button
                      type="button"
                      onClick={addModifierGroup}
                      className="flex items-center gap-1 text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ مجموعة إضافات</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Options List */}
                {options.map((opt, gIdx) => (
                  <div key={gIdx} className="bg-admin-bg-subtle p-3.5 rounded-xl border border-admin-border space-y-3">
                    <div className="flex justify-between items-center">
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => updateOptionGroupTitle(gIdx, e.target.value)}
                        className="bg-transparent border-b border-admin-border text-admin-text-primary font-bold text-xs focus:border-admin-accent focus:outline-none pb-0.5"
                      />
                      <button type="button" onClick={() => removeOptionGroup(gIdx)} className="text-red-500 hover:text-red-600 p-1">
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
                            className="flex-1 bg-admin-bg-base border border-admin-border text-admin-text-primary text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={choice.priceAdjustment}
                            onChange={(e) => updateOptionChoicePrice(gIdx, cIdx, Number(e.target.value))}
                            placeholder="سعر المقاس"
                            className="w-20 bg-admin-bg-base border border-admin-border text-admin-text-primary text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none text-left font-mono"
                          />
                          <button type="button" onClick={() => removeOptionChoice(gIdx, cIdx)} className="text-zinc-400 hover:text-red-500 p-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOptionChoice(gIdx)}
                        className="text-[10px] font-black text-admin-accent hover:opacity-85 pt-1"
                      >
                        + إضافة خيار
                      </button>
                    </div>
                  </div>
                ))}

                {/* Dynamic Modifiers List */}
                {modifiers.map((mod, gIdx) => (
                  <div key={gIdx} className="bg-admin-bg-subtle p-3.5 rounded-xl border border-admin-border space-y-3">
                    <div className="flex justify-between items-center">
                      <input
                        type="text"
                        value={mod.name}
                        onChange={(e) => updateModifierGroupTitle(gIdx, e.target.value)}
                        className="bg-transparent border-b border-admin-border text-admin-text-primary font-bold text-xs focus:border-admin-accent focus:outline-none pb-0.5"
                      />
                      <button type="button" onClick={() => removeModifierGroup(gIdx)} className="text-red-500 hover:text-red-600 p-1">
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
                            className="flex-1 bg-admin-bg-base border border-admin-border text-admin-text-primary text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={choice.price}
                            onChange={(e) => updateModifierChoicePrice(gIdx, cIdx, Number(e.target.value))}
                            placeholder="السعر"
                            className="w-20 bg-admin-bg-base border border-admin-border text-admin-text-primary text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none text-left font-mono"
                          />
                          <button type="button" onClick={() => removeModifierChoice(gIdx, cIdx)} className="text-zinc-400 hover:text-red-500 p-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addModifierChoice(gIdx)}
                        className="text-[10px] font-black text-indigo-500 hover:opacity-85 pt-1"
                      >
                        + إضافة اختيار
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-admin-border bg-admin-bg-base/80 backdrop-blur-xs">
              <button
                type="button"
                onClick={onClose}
                disabled={editMutation.isPending}
                className="px-5 py-2.5 rounded-xl border border-admin-border text-admin-text-secondary font-bold text-xs hover:bg-admin-bg-base transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <motion.button
                type="submit"
                form="edit-product-form"
                disabled={editMutation.isPending}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-2.5 bg-admin-accent text-white font-bold text-xs rounded-xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-admin-accent cursor-pointer"
              >
                {editMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التعديلات</span>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Image Cropper Modal for cropping uploaded image */}
      {cropperFile && cropperSrc && (
        <ImageCropperModal
          src={cropperSrc}
          file={cropperFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
