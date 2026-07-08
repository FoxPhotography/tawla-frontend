import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, MessageSquare, Info, CheckCircle2, User, Phone, MapPin } from 'lucide-react';
import type { Product } from '../../../shared/types';

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
  selectedOptions?: { name: string; value: string; priceAdjustment: number }[];
  selectedModifiers?: { name: string; value: string; price: number }[];
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  updateQuantity: (index: number, amount: number) => void;
  removeFromCart: (index: number) => void;
  updateItemNotes: (index: number, notes: string) => void;
  cartTotal: number;
  cartCount: number;
  specialNotes: string;
  setSpecialNotes: (notes: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  tableNumber?: string;
  isStaffOnline: boolean;
  restaurant: any;
  onSubmitOrder: () => void;
  isSubmitting: boolean;
  products: Product[];
}

const drawerVariants = {
  hidden: { y: '100%' },
  visible: { 
    y: 0,
    transition: { type: 'spring', damping: 30, stiffness: 220 }
  },
  exit: { 
    y: '100%',
    transition: { ease: 'easeInOut', duration: 0.25 }
  }
} as const;

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 0.5 },
  exit: { opacity: 0 }
} as const;

const itemVariants = {
  hidden: { x: 20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 350, damping: 25 } },
  exit: { x: -20, opacity: 0, transition: { duration: 0.18 } }
} as const;

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  removeFromCart,
  updateItemNotes,
  cartTotal,
  cartCount,
  specialNotes,
  setSpecialNotes,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  tableNumber,
  isStaffOnline,
  restaurant,
  onSubmitOrder,
  isSubmitting,
  products
}: CartDrawerProps) {
  const [activeItemNotesIndex, setActiveItemNotesIndex] = useState<number | null>(null);
  const [activeItemNotesText, setActiveItemNotesText] = useState('');

  if (!isOpen) return null;

  const isAnyItemUnavailable = cart.some(item => {
    const latestProduct = products?.find(p => p.id === item.product.id);
    return latestProduct ? !latestProduct.isAvailable : !item.product.isAvailable;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Drawer Body (Light Premium Theme) */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-0 inset-x-0 bg-white rounded-t-[32px] z-50 max-h-[90vh] flex flex-col border-t border-zinc-200/80 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] max-w-[430px] mx-auto text-zinc-900 text-right"
            dir="rtl"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-zinc-200 rounded-full mx-auto my-3 flex-shrink-0" />

            {/* Header */}
            <div className="px-6 pb-4 border-b border-zinc-100 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
                  <ShoppingBag className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">سلة الطلبات</h2>
                  <p className="text-[10px] text-zinc-500 font-bold mt-0.5">لديك {cartCount} أصناف جاهزة للتأكيد</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200/60 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide bg-zinc-50/30">
              {/* Cart Items List */}
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {cart.map((item, index) => {
                    const latestProduct = products?.find(p => p.id === item.product.id);
                    const isAvailable = latestProduct ? latestProduct.isAvailable : item.product.isAvailable;
                    const discountPercent = item.product.originalPrice && item.product.originalPrice > 0
                      ? (item.product.originalPrice - item.product.price) / item.product.originalPrice
                      : 0;

                    const selectedOptionValues = item.selectedOptions || [];
                    const baseOriginalPrice = selectedOptionValues.length > 0
                      ? selectedOptionValues[0].priceAdjustment
                      : (item.product.originalPrice || item.product.price);

                    const modsOriginalPrice = item.selectedModifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;
                    const originalTotal = baseOriginalPrice + modsOriginalPrice;
                    const itemUnitPrice = Number((originalTotal * (1 - discountPercent)).toFixed(2));

                    return (
                      <motion.div
                        key={index}
                        variants={itemVariants}
                        layout
                        className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-sm transition-all ${
                          !isAvailable ? 'border-red-200 bg-red-50/10' : 'border-zinc-200/60'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-center gap-3">
                            {item.product.image?.url ? (
                              <img src={item.product.image.url} alt="" className={`w-12 h-12 rounded-xl object-cover border border-zinc-100 ${!isAvailable ? 'opacity-40 grayscale' : ''}`} />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-extrabold text-sm text-zinc-955 flex items-center gap-2">
                                <span>{item.product.name}</span>
                                {!isAvailable && (
                                  <span className="text-[9px] bg-red-500 text-white font-extrabold px-1.5 py-0.5 rounded shadow">نفذ حالياً</span>
                                )}
                              </h4>
                              {discountPercent > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  <span className="text-xs text-orange-600 font-extrabold font-mono">
                                    {itemUnitPrice} ج.م
                                  </span>
                                  <span className="text-[10px] line-through text-zinc-400 font-bold font-mono">
                                    {originalTotal} ج.م
                                  </span>
                                  <span className="text-[8px] bg-red-500/10 text-red-500 px-1 py-0.5 rounded font-extrabold">
                                    -{Math.round(discountPercent * 100)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-orange-600 font-extrabold font-mono mt-1 block">{itemUnitPrice} ج.م</span>
                              )}
                              
                              {/* Display Custom Options & Modifiers in Cart */}
                              {((item.selectedOptions && item.selectedOptions.length > 0) || 
                                (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                                <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-zinc-500 font-semibold">
                                  {item.selectedOptions?.map((opt, i) => (
                                    <span key={i} className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                                      {opt.name}: {opt.value} ({opt.priceAdjustment} ج.م)
                                    </span>
                                  ))}
                                  {item.selectedModifiers?.map((mod, i) => (
                                    <span key={i} className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200/40">
                                      {mod.value} (+{mod.price} ج.م)
                                    </span>
                                  ))}
                                </div>
                              )}

                              {!isAvailable && (
                                <p className="text-[10px] text-red-500 font-extrabold mt-1">⚠️ هذا الصنف غير متوفر حالياً. يرجى حذفه لإتمام الطلب.</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="w-7 h-7 rounded-lg bg-zinc-50 border border-zinc-200/80 text-zinc-400 hover:text-red-500 hover:border-red-200/50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quantity & Notes Footer row */}
                        <div className="flex justify-between items-center gap-4 pt-1.5 border-t border-zinc-100">
                          {/* Quantity controls */}
                          <div className="flex items-center gap-2 bg-zinc-50 p-1 rounded-xl border border-zinc-200/80">
                            <button
                              onClick={() => updateQuantity(index, -1)}
                              className="w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black font-mono text-zinc-900 min-w-[20px] text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(index, 1)}
                              disabled={!isAvailable}
                              className="w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Item Notes Input or Trigger */}
                          <div className="flex-1 max-w-[180px]">
                            {activeItemNotesIndex === index ? (
                              <input
                                type="text"
                                placeholder="سكر زيادة، بدون بصل..."
                                value={activeItemNotesText}
                                onChange={(e) => {
                                  setActiveItemNotesText(e.target.value);
                                  updateItemNotes(index, e.target.value);
                                }}
                                onBlur={() => setActiveItemNotesIndex(null)}
                                autoFocus
                                className="w-full bg-white border border-zinc-200 text-zinc-800 rounded-xl px-3 py-1.5 text-xs text-right focus:border-orange-500/50 focus:outline-none placeholder:text-zinc-400 transition-colors"
                              />
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveItemNotesIndex(index);
                                  setActiveItemNotesText(item.notes || '');
                                }}
                                className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-orange-600 border border-zinc-200 hover:border-orange-500/20 bg-white rounded-xl px-3 py-1.5 transition-all font-bold w-full justify-center cursor-pointer shadow-sm"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-orange-500/70" />
                                <span className="truncate">{item.notes ? item.notes : 'إضافة ملاحظة'}</span>
                              </button>
                            )}
                          </div>

                          {/* Item Subtotal */}
                          <span className="text-sm font-black text-zinc-900 font-mono">
                            {itemUnitPrice * item.quantity} ج.م
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Special Order Notes Box */}
              <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 shadow-sm">
                <label className="block text-xs text-zinc-500 mb-2 font-black flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-orange-500" />
                  <span>ملاحظات إضافية على الطلب بالكامل</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: سرعة تحضير، التوصيل دفعة واحدة..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-800 rounded-xl p-3 text-xs text-right resize-none focus:border-orange-500/50 focus:outline-none placeholder:text-zinc-400 transition-colors"
                />
              </div>

              {/* Delivery Details Form */}
              {!tableNumber && (
                <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <h4 className="text-xs font-black text-zinc-900">🚚 بيانات التوصيل (الدليفري)</h4>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-orange-500/70" />
                      <span>الاسم بالكامل</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="الاسم لتسجيل الطلب"
                      className="w-full bg-white border border-zinc-200 focus:border-orange-500/50 text-zinc-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none placeholder:text-zinc-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3 text-orange-500/70" />
                      <span>رقم الموبايل للتواصل</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="مثال: 01012345678"
                      className="w-full bg-white border border-zinc-200 focus:border-orange-500/50 text-zinc-850 rounded-xl px-3 py-2.5 text-xs focus:outline-none text-left placeholder:text-zinc-400 transition-colors font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3 text-orange-500/70" />
                      <span>العنوان بالتفصيل</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="المنطقة، اسم الشارع، رقم العمارة، الدور..."
                      className="w-full bg-white border border-zinc-200 focus:border-orange-500/50 text-zinc-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none placeholder:text-zinc-400 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Footer */}
            <div className="p-6 border-t border-zinc-100 bg-white space-y-4 flex-shrink-0">
              <div className="flex justify-between items-center px-1">
                <span className="text-zinc-500 text-xs font-bold">إجمالي الحساب</span>
                <span className="text-xl font-black text-orange-600 font-mono">{cartTotal} ج.م</span>
              </div>
              
              {(() => {
                if (isAnyItemUnavailable) {
                  return (
                    <div className="w-full p-4 text-center rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm">
                      <span className="font-extrabold text-sm flex items-center gap-1.5">
                        ⚠️ تحتوي السلة على أصناف غير متوفرة
                      </span>
                      <span className="text-[10px] text-red-600/90 font-medium">يرجى حذف الأصناف المعلمة بـ (نفذ حالياً) لتتمكن من إتمام طلبك.</span>
                    </div>
                  );
                }

                if (!isStaffOnline) {
                  if (tableNumber) {
                    return (
                      <div className="w-full p-4 text-center rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-500 text-xs font-bold flex items-center justify-center gap-2">
                        <X className="w-4.5 h-4.5 text-red-500" />
                        <span>النظام غير متصل. يرجى إعطاء طلبك للويتر مباشرةً.</span>
                      </div>
                    );
                  } else {
                    const handleWhatsappCheckout = () => {
                      if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
                        alert('يرجى كتابة الاسم ورقم الهاتف وعنوان التوصيل لإرسال الطلب عبر واتساب.');
                        return;
                      }
                      const waNumber = restaurant.receiptSettings?.whatsapp || restaurant.receiptSettings?.phone || restaurant.phone;
                      let formattedWaNumber = waNumber ? waNumber.replace(/[^\d]/g, '') : '';
                      if (formattedWaNumber.startsWith('0')) {
                        formattedWaNumber = '2' + formattedWaNumber;
                      }
                      const cartSummary = `أود طلب:\n${cart.map(item => {
                        const optionsText = item.selectedOptions && item.selectedOptions.length > 0
                          ? ` (${item.selectedOptions.map(o => `${o.name}: ${o.value}`).join(', ')})`
                          : '';
                        const modifiersText = item.selectedModifiers && item.selectedModifiers.length > 0
                          ? ` [إضافات: ${item.selectedModifiers.map(m => m.value).join(', ')}]`
                          : '';
                        const itemNotesText = item.notes ? ` (ملحوظة: ${item.notes})` : '';
                        return `- ${item.product.name}${optionsText}${modifiersText} (عدد ${item.quantity})${itemNotesText}`;
                      }).join('\n')}${specialNotes ? `\n\nملحوظة خاصة بالطلب: ${specialNotes}` : ''}\n\nالاسم: ${customerName}\nالهاتف: ${customerPhone}\nالعنوان: ${customerAddress}`;
                      window.open(`https://wa.me/${formattedWaNumber}?text=${encodeURIComponent(cartSummary)}`, '_blank');
                    };

                    return (
                      <motion.button
                        onClick={handleWhatsappCheckout}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-[0_8px_24px_rgba(16,185,129,0.2)]"
                      >
                        <span>💬 إرسال الطلب وتأكيده عبر واتساب</span>
                      </motion.button>
                    );
                  }
                }

                return (
                  <motion.button
                    onClick={onSubmitOrder}
                    disabled={isSubmitting}
                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                    className="w-full py-4 text-sm font-black bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-[0_8px_24px_rgba(255,85,0,0.25)]"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                        <span>تأكيد وإرسال الطلب للمطبخ</span>
                      </>
                    )}
                  </motion.button>
                );
              })()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
