import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ShoppingCart, Bell, Receipt, Plus, Minus, 
  Trash2, X, CheckCircle2, UtensilsCrossed, MessageSquare
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import type { Product, Category, Restaurant } from '../../shared/types';

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export default function CustomerMenu() {
  const { restaurantSlug, tableNumber } = useParams<{ restaurantSlug: string; tableNumber: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  const [activeItemNotes, setActiveItemNotes] = useState<{ productId: string; text: string } | null>(null);

  // Fetch Menu
  const { data: menuData, isLoading, error } = useQuery({
    queryKey: ['menu', restaurantSlug],
    queryFn: async () => {
      const response = await api.get(`/menu/${restaurantSlug}`);
      return response.data.data as { restaurant: Restaurant; categories: Category[]; products: Product[] };
    },
    enabled: !!restaurantSlug,
    staleTime: 5 * 60 * 1000,
  });

  const restaurant = menuData?.restaurant;
  const categories = menuData?.categories || [];
  const products = menuData?.products || [];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      return matchesSearch && matchesCategory && product.isAvailable;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart Actions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      toast.success(`تم إضافة ${product.name} للسلة`, { icon: '🛒' });
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (productId: string, amount: number) => {
    setCart((prev) => 
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + amount;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[]
    );
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart((prev) => 
      prev.map((item) => item.product.id === productId ? { ...item, notes } : item)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    toast.error('تم الحذف من السلة');
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  // Mutations
  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        restaurantId: restaurant?.id,
        tableNumber: Number(tableNumber),
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        specialNotes,
      };
      const response = await api.post('/orders', payload, {
        headers: { 'x-restaurant-id': restaurant?.id },
      });
      return response.data.data;
    },
    onSuccess: (order) => {
      toast.success('تم إرسال طلبك للمطبخ! 🎉');
      setCart([]);
      setIsCartOpen(false);
      navigate(`/order/${order.id}/track`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل إرسال الطلب. حاول مجدداً.');
    },
  });

  const callWaiterMutation = useMutation({
    mutationFn: async () => {
      await api.post('/orders/call-waiter', { tableNumber }, {
        headers: { 'x-restaurant-id': restaurant?.id },
      });
    },
    onSuccess: () => {
      toast.success('تم استدعاء الويتر، وجاري الحضور إليك. 🔔');
    },
    onError: () => {
      toast.error('فشل استدعاء الويتر. يرجى المحاولة لاحقاً.');
    },
  });

  const requestBillMutation = useMutation({
    mutationFn: async () => {
      await api.post('/orders/request-bill', { tableNumber }, {
        headers: { 'x-restaurant-id': restaurant?.id },
      });
    },
    onSuccess: () => {
      toast.success('تم طلب الحساب، الكاشير هيحضرلك فوراً. 💳');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل طلب الحساب.');
    },
  });

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center">
        <div className="w-14 h-14 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-500 text-sm animate-pulse">جاري تحميل المنيو...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 border border-red-100 shadow-sm">
          <UtensilsCrossed className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">عذراً، حدث خطأ ما</h2>
        <p className="text-stone-600 text-sm">لم نتمكن من الوصول للمنيو. يرجى إعادة مسح الـ QR Code.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-28 relative overflow-hidden noise" dir="rtl">
      {/* Premium floating background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="glow-blob bg-emerald-100 top-1/4 -right-1/4 w-[400px] h-[400px]" />
        <div className="glow-blob bg-stone-200 bottom-1/4 -left-1/4 w-[350px] h-[350px]" />
        <div className="absolute inset-0 dot-pattern opacity-60" />
      </div>

      <Toaster position="top-center" toastOptions={{
        style: { background: '#ffffff', color: '#1c1917', border: '1px solid rgba(120,113,108,0.15)', fontSize: '14px' }
      }} />

      {/* ===== Hero Header ===== */}
      <div className="relative overflow-hidden z-10">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-200/40 via-stone-100/70 to-stone-50" />
        {restaurant.logo?.url && (
          <div className="absolute inset-0 bg-cover bg-center opacity-[0.03]" style={{ backgroundImage: `url(${restaurant.logo.url})` }} />
        )}
        
        <div className="relative px-5 pt-8 pb-6 flex items-center gap-4 z-10">
          {restaurant.logo?.url ? (
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={restaurant.logo.url} 
              alt={restaurant.name} 
              className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shadow-sm animate-float" 
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 text-2xl font-extrabold shadow-sm">
              {restaurant.name.charAt(0)}
            </div>
          )}
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-extrabold text-stone-900 mb-0.5"
            >
              {restaurant.name}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xs text-stone-500 font-bold"
            >
              طاولة رقم <span className="text-emerald-800 font-extrabold text-sm">{tableNumber}</span>
            </motion.p>
          </div>
        </div>
      </div>

      {/* ===== Action Buttons ===== */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3 relative z-10">
        <motion.button 
          onClick={() => callWaiterMutation.mutate()}
          whileTap={{ scale: 0.95 }}
          className="organic-surface flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-emerald-800 hover:border-emerald-600/50 transition-all bg-white"
        >
          <Bell className="w-4 h-4 text-emerald-700" />
          <span>استدعاء ويتر</span>
        </motion.button>
        <motion.button 
          onClick={() => requestBillMutation.mutate()}
          whileTap={{ scale: 0.95 }}
          className="organic-surface flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-emerald-800 hover:border-emerald-600/50 transition-all bg-white"
        >
          <Receipt className="w-4 h-4 text-emerald-700" />
          <span>طلب الحساب</span>
        </motion.button>
      </div>

      {/* ===== Search ===== */}
      <div className="px-4 mb-4 relative z-10">
        <div className="relative group">
          <input
            type="text"
            placeholder="ابحث عن مشروب أو أكلة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-premium pr-11 text-right text-sm"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400 group-focus-within:text-emerald-700 transition-colors" />
        </div>
      </div>

      {/* ===== Category Tabs ===== */}
      <div className="overflow-x-auto whitespace-nowrap px-4 mb-5 scrollbar-hide relative z-10">
        <div className="flex gap-2">
          <motion.button
            onClick={() => setSelectedCategory('all')}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-emerald-800 text-white shadow-sm font-bold'
                : 'organic-surface text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 bg-white'
            }`}
          >
            الكل
          </motion.button>
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              whileTap={{ scale: 0.95 }}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'organic-surface text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 bg-white'
              }`}
            >
              {cat.image?.url && (
                <img src={cat.image.url} alt="" className="w-5 h-5 rounded-full object-cover" />
              )}
              {cat.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ===== Products Grid ===== */}
      <div className="px-4 space-y-3 relative z-10">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 border border-stone-200">
              <Search className="w-6 h-6 text-stone-400" />
            </div>
            <p className="text-stone-500 text-sm font-medium">لا توجد منتجات مطابقة للبحث.</p>
          </div>
        ) : (
          filteredProducts.map((product, idx) => (
            <motion.div
              layout
              key={product.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="border-glow-gold rounded-3xl overflow-hidden flex gap-0 relative z-10 bg-white"
            >
              {/* Product Image */}
              {product.image?.url ? (
                <img 
                  src={product.image.url} 
                  alt={product.name} 
                  className="w-28 h-28 object-cover flex-shrink-0" 
                />
              ) : (
                <div className="w-28 h-28 bg-stone-100 flex items-center justify-center flex-shrink-0 border-l border-stone-200">
                  <UtensilsCrossed className="w-6 h-6 text-stone-400" />
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                <div>
                  <h3 className="font-extrabold text-stone-900 text-[15px] mb-1 truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-[12px] text-stone-500 line-clamp-2 leading-relaxed font-medium">{product.description}</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-emerald-800 text-base">
                    {product.price} <span className="text-[11px] font-normal text-stone-500">ج.م</span>
                  </span>

                  {/* Check if in cart */}
                  {cart.find(i => i.product.id === product.id) ? (
                    <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-1 border border-stone-200">
                      <button onClick={() => updateQuantity(product.id, -1)} className="p-1.5 text-stone-600 hover:text-stone-950 transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-extrabold text-stone-900 min-w-[16px] text-center">
                        {cart.find(i => i.product.id === product.id)?.quantity}
                      </span>
                      <button onClick={() => updateQuantity(product.id, 1)} className="p-1.5 text-stone-600 hover:text-stone-950 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => addToCart(product)}
                      whileTap={{ scale: 0.85 }}
                      className="p-2.5 bg-emerald-800 text-white rounded-xl shadow-sm hover:bg-emerald-700"
                    >
                      <Plus className="w-4.5 h-4.5" />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ===== Floating Cart Bar ===== */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 p-4 z-40"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-stone-50/90 to-transparent pointer-events-none" />
            <motion.button
              onClick={() => setIsCartOpen(true)}
              whileTap={{ scale: 0.98 }}
              className="relative w-full bg-emerald-800 text-white py-4 px-6 rounded-2xl font-bold flex justify-between items-center shadow-lg hover:bg-emerald-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5" />
                <span className="bg-white text-emerald-800 text-xs w-6 h-6 rounded-full flex items-center justify-center font-extrabold">
                  {cartCount}
                </span>
              </div>
              <span className="text-sm font-bold">عرض السلة وتأكيد الطلب</span>
              <span className="text-base font-extrabold">{cartTotal} ج.م</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Cart Sheet ===== */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-stone-900/40 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 max-h-[92vh] flex flex-col border-t border-stone-200 shadow-xl"
            >
              {/* Cart Header */}
              <div className="p-5 border-b border-stone-200 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-5 h-5 text-emerald-800" />
                  <h2 className="text-lg font-extrabold text-stone-900">سلة المشتريات</h2>
                  <span className="badge-neutral">{cartCount} عنصر</span>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="btn-icon">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {cart.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    className="organic-surface rounded-2xl p-4 space-y-3 bg-white"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {item.product.image?.url ? (
                          <img src={item.product.image.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center">
                            <UtensilsCrossed className="w-4 h-4 text-stone-400" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-extrabold text-stone-900 text-sm">{item.product.name}</h4>
                          <span className="text-xs text-emerald-800 font-extrabold">{item.product.price} ج.م</span>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-stone-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      {/* Quantity */}
                      <div className="flex items-center gap-3 bg-stone-50 p-1.5 rounded-xl border border-stone-200">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1.5 text-stone-500 hover:text-stone-900 transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-extrabold text-stone-900 min-w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1.5 text-stone-500 hover:text-stone-900 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item Notes */}
                      {activeItemNotes?.productId === item.product.id ? (
                        <div className="flex-1 mr-3">
                          <input
                            type="text"
                            placeholder="سكر زيادة، بدون بصل..."
                            value={activeItemNotes.text}
                            onChange={(e) => {
                              setActiveItemNotes({ productId: item.product.id, text: e.target.value });
                              updateItemNotes(item.product.id, e.target.value);
                            }}
                            onBlur={() => setActiveItemNotes(null)}
                            autoFocus
                            className="input-premium text-xs py-2"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveItemNotes({ productId: item.product.id, text: item.notes })}
                          className="flex items-center gap-1 text-xs text-stone-500 hover:text-emerald-700 border border-stone-200 rounded-lg px-2.5 py-1.5 transition-colors bg-white font-medium"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-750" />
                          {item.notes ? `${item.notes}` : 'ملاحظة'}
                        </button>
                      )}

                      {/* Subtotal */}
                      <span className="text-sm font-extrabold text-stone-900">
                        {item.product.price * item.quantity} ج.م
                      </span>
                    </div>
                  </motion.div>
                ))}

                {/* Special Notes */}
                <div className="mt-2">
                  <label className="block text-xs text-stone-600 mb-2 font-bold">ملاحظات إضافية على الطلب بالكامل</label>
                  <textarea
                    rows={2}
                    placeholder="مثال: سرعة تحضير، التوصيل دفعة واحدة..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="input-premium text-sm text-right resize-none bg-white"
                  />
                </div>
              </div>

              {/* Checkout Footer */}
              <div className="p-5 border-t border-stone-200 space-y-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600 font-bold">الإجمالي</span>
                  <span className="text-2xl font-extrabold text-emerald-800">{cartTotal} ج.م</span>
                </div>
                <motion.button
                  onClick={() => submitOrderMutation.mutate()}
                  disabled={submitOrderMutation.isPending}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2.5"
                >
                  {submitOrderMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تأكيد وإرسال الطلب</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
