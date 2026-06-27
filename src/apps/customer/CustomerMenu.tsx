import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ShoppingCart, Bell, Receipt, Plus, Minus, 
  Trash2, X, CheckCircle2 
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

  // 1. Fetch Menu data
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

  // 2. Client-side Search and Category Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      return matchesSearch && matchesCategory && product.isAvailable;
    });
  }, [products, searchQuery, selectedCategory]);

  // 3. Cart Actions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      toast.success(`تم إضافة ${product.name} للسلة`);
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

  // 4. Mutations (Order, Call Waiter, Request Bill)
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
      // Send tenant ID in headers
      const response = await api.post('/orders', payload, {
        headers: { 'x-restaurant-id': restaurant?.id },
      });
      return response.data.data;
    },
    onSuccess: (order) => {
      toast.success('تم إرسال طلبك للمطبخ!');
      setCart([]);
      setIsCartOpen(false);
      // Redirect to Order Track Screen
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
      toast.success('تم استدعاء الويتر، وجاري الحضور إليك.');
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
      toast.success('تم طلب الحساب، الكاشير هيحضرلك فوراً.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل طلب الحساب.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-height-screen py-20 text-dark-300">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg">جاري تحميل المنيو...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-height-screen py-20 text-center px-4">
        <h2 className="text-2xl font-bold text-red-500 mb-2">عذراً، حدث خطأ ما</h2>
        <p className="text-dark-400">لم نتمكن من الوصول للمنيو المطلوبة. يرجى إعادة مسح الـ QR Code.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 pb-24" dir="rtl">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header Panel */}
      <div className="relative h-48 bg-gradient-to-b from-dark-900 to-dark-950 border-b border-dark-800 flex items-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url(${restaurant.logo?.url || ''})` }}></div>
        <div className="relative flex items-center gap-4 z-10">
          {restaurant.logo?.url ? (
            <img src={restaurant.logo.url} alt={restaurant.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-500/30" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-dark-800 flex items-center justify-center text-primary-500 text-2xl font-bold">
              {restaurant.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{restaurant.name}</h1>
            <p className="text-sm text-dark-400">ترابيزة رقم <span className="text-primary-500 font-bold">{tableNumber}</span></p>
          </div>
        </div>
      </div>

      {/* Call Waiter & Request Bill Buttons */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <button 
          onClick={() => callWaiterMutation.mutate()}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-dark-900 border border-primary-500/20 hover:border-primary-500/50 hover:bg-dark-800 active:scale-95 transition-all text-sm font-medium text-primary-500"
        >
          <Bell className="w-4 h-4" />
          <span>استدعاء ويتر</span>
        </button>
        <button 
          onClick={() => requestBillMutation.mutate()}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-dark-900 border border-primary-500/20 hover:border-primary-500/50 hover:bg-dark-800 active:scale-95 transition-all text-sm font-medium text-primary-500"
        >
          <Receipt className="w-4 h-4" />
          <span>طلب الحساب</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث عن مشروب أو أكلة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900 border border-dark-800 text-white rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary-500 transition-colors text-right"
          />
          <Search className="absolute right-4 top-3.5 w-5 h-5 text-dark-500" />
        </div>
      </div>

      {/* Categories Tabs Scrollable */}
      <div className="overflow-x-auto whitespace-nowrap px-4 mb-6 scrollbar-hide">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary-500 text-dark-950 font-bold shadow-lg shadow-primary-500/20'
                : 'bg-dark-900 text-dark-400 hover:bg-dark-800'
            }`}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary-500 text-dark-950 font-bold shadow-lg shadow-primary-500/20'
                  : 'bg-dark-900 text-dark-400 hover:bg-dark-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-4 space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-10 text-dark-500">
            لا توجد منتجات مطابقة للبحث.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <motion.div
              layout
              key={product.id}
              className="flex gap-3 bg-dark-900 p-3 rounded-2xl border border-dark-800/60 hover:border-dark-800 transition-all"
            >
              {product.image?.url ? (
                <img src={product.image.url} alt={product.name} className="w-24 h-24 rounded-xl object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-dark-850 flex items-center justify-center text-dark-500 text-xs">
                  بدون صورة
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white text-base mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-dark-400 line-clamp-2 leading-relaxed">{product.description}</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-primary-500 text-lg">
                    {product.price} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <button
                    onClick={() => addToCart(product)}
                    className="p-2 bg-primary-500 text-dark-950 rounded-xl hover:bg-primary-400 active:scale-90 transition-transform shadow-lg shadow-primary-500/10"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Sticky Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-dark-950 to-dark-950/90 backdrop-blur-md z-40 border-t border-dark-800">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-primary-500 text-dark-950 py-3.5 px-6 rounded-2xl font-bold flex justify-between items-center shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="bg-dark-950 text-primary-500 text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </div>
            <span>عرض السلة وتأكيد الطلب</span>
            <span className="text-lg">{cartTotal} ج.م</span>
          </button>
        </div>
      )}

      {/* Cart Sliding Modal Sheet */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black z-50"
            ></motion.div>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-dark-900 rounded-t-[2.5rem] border-t border-dark-800 z-50 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-dark-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary-500" />
                  <h2 className="text-lg font-bold text-white">سلة المشتريات</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-dark-850 rounded-full text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-dark-950 p-4 rounded-2xl border border-dark-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{item.product.name}</h4>
                        <span className="text-xs text-primary-500 font-semibold">{item.product.price} ج.م</span>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-dark-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      {/* Quantity Toggles */}
                      <div className="flex items-center gap-3 bg-dark-900 p-1.5 rounded-xl border border-dark-800">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 text-dark-400 hover:text-white">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold text-white min-w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 text-dark-400 hover:text-white">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Custom Item Notes trigger */}
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
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveItemNotes({ productId: item.product.id, text: item.notes })}
                          className="text-xs text-dark-400 hover:text-primary-500 border border-dark-800 rounded-lg px-2 py-1"
                        >
                          {item.notes ? `تعديل الملاحظة: ${item.notes}` : '+ إضافة ملاحظة'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* General Special Notes */}
                <div className="mt-4">
                  <label className="block text-xs text-dark-400 mb-2">ملاحظات إضافية على الطلب بالكامل</label>
                  <textarea
                    rows={2}
                    placeholder="مثال: سرعة تحضير، التوصيل دفعة واحدة..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-primary-500 text-right"
                  />
                </div>
              </div>

              {/* Checkout footer */}
              <div className="p-6 border-t border-dark-800 bg-dark-950/60 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-dark-400 font-medium">الإجمالي</span>
                  <span className="text-2xl font-bold text-primary-500">{cartTotal} ج.م</span>
                </div>
                <button
                  onClick={() => submitOrderMutation.mutate()}
                  disabled={submitOrderMutation.isPending}
                  className="w-full bg-primary-500 text-dark-950 py-3.5 rounded-2xl font-bold text-center flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitOrderMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تأكيد وإرسال الطلب</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
