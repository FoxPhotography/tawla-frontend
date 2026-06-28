import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ShoppingCart, Bell, Receipt, Plus, Minus, 
  Trash2, X, CheckCircle2, UtensilsCrossed, MessageSquare, Clock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import type { Product, Category, Restaurant } from '../../shared/types';

// ============ Framer Motion Animations ============
const productCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.055,
      duration: 0.38,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
    }
  })
};

const addButtonTap = {
  scale: [1, 0.88, 1.05, 1],
  transition: { duration: 0.3, ease: "easeOut" as const }
};

const fabVariants = {
  hidden: { y: 40, opacity: 0, scale: 0.9 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 28 }
  }
};

const confirmationVariants = {
  hidden: { scale: 0.85, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

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
  
  // Custom states for Tawla Luxury navigation
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isNoOrderModalOpen, setIsNoOrderModalOpen] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  // Cache restaurant details for navigation back from order tracking
  useEffect(() => {
    if (restaurantSlug && tableNumber) {
      localStorage.setItem('tawla_restaurant_slug', restaurantSlug);
      localStorage.setItem('tawla_table_number', tableNumber);
    }
  }, [restaurantSlug, tableNumber]);

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
      toast.success('تم إرسال طلبك للمطبخ بنجاح');
      localStorage.setItem('tawla_active_order_id', order.id);
      setCart([]);
      setIsCartOpen(false);
      setSubmittedOrder(order);
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
      toast.success('تم استدعاء الويتر، وجاري الحضور إليك');
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
      toast.success('تم طلب الحساب، الكاشير هيحضرلك فوراً');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'فشل طلب الحساب.');
    },
  });

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-customer-bg-base flex flex-col items-center justify-center text-customer-text-primary">
        <div className="w-12 h-12 border-2 border-customer-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-customer-text-secondary text-sm animate-pulse">جاري تحميل المنيو...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-customer-bg-base flex flex-col items-center justify-center text-center px-6 text-customer-text-primary">
        <div className="w-16 h-16 rounded-2xl bg-customer-bg-elevated flex items-center justify-center mb-4 border border-customer-border shadow-customer-card">
          <UtensilsCrossed className="w-7 h-7 text-customer-accent" />
        </div>
        <h2 className="text-xl font-bold text-customer-text-primary mb-2">عذراً، حدث خطأ ما</h2>
        <p className="text-customer-text-secondary text-sm">لم نتمكن من الوصول للمنيو. يرجى إعادة مسح الـ QR Code.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-customer-bg-base text-customer-text-primary pb-28 relative overflow-hidden noise" dir="rtl">
      {/* Premium floating background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="glow-blob bg-customer-accent-glow top-1/4 -right-1/4 w-[400px] h-[400px]" />
        <div className="glow-blob bg-customer-accent-subtle bottom-1/4 -left-1/4 w-[350px] h-[350px]" />
        <div className="absolute inset-0 dot-pattern animate-pulse" />
      </div>

      <Toaster position="top-center" toastOptions={{
        style: { background: '#1a1a1e', color: '#f5f5f0', border: '1px solid rgba(255,255,255,0.08)', fontSize: '14px' }
      }} />

      {/* ===== Hero Header ===== */}
      <div className="hero relative overflow-hidden z-10">
        <div className="table-badge">
          <UtensilsCrossed className="w-3 h-3" />
          <span>طاولة {tableNumber}</span>
        </div>
        <h1 className="restaurant-name">{restaurant.name}</h1>
        <div className="restaurant-sub">أهلاً بك في تجربة طعام فاخرة ومميزة</div>
      </div>

      {/* ===== Quick Action Row ===== */}
      <div className="action-row relative z-10">
        <motion.button 
          whileTap={{ scale: 0.97 }}
          onClick={() => callWaiterMutation.mutate()}
          className="action-btn"
        >
          <Bell className="w-4 h-4" />
          <span>استدعاء ويتر</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.97 }}
          onClick={() => requestBillMutation.mutate()}
          className="action-btn"
        >
          <Receipt className="w-4 h-4" />
          <span>طلب الحساب</span>
        </motion.button>
      </div>

      {/* ===== Search ===== */}
      <div className="search-box relative z-10">
        <Search className="w-4 h-4" />
        <input
          type="text"
          placeholder="ابحث عن مشروب أو أكلة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* ===== Category Tabs ===== */}
      <div className="cat-tabs relative z-10">
        <div
          onClick={() => setSelectedCategory('all')}
          className={`cat-tab ${selectedCategory === 'all' ? 'active' : ''}`}
        >
          الكل
        </div>
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`cat-tab ${selectedCategory === cat.id ? 'active' : ''}`}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {/* ===== Products List ===== */}
      <div className="px-4 py-4 space-y-3.5 relative z-10 max-w-[428px] mx-auto">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-customer-bg-elevated flex items-center justify-center mx-auto mb-3 border border-customer-border shadow-customer-card">
              <Search className="w-6 h-6 text-customer-text-muted" />
            </div>
            <p className="text-customer-text-secondary text-sm font-medium">لا توجد منتجات مطابقة للبحث.</p>
          </div>
        ) : (
          filteredProducts.map((product, idx) => {
            const inCartItem = cart.find(i => i.product.id === product.id);
            const isAvailable = product.isAvailable;
            
            return (
              <motion.div
                layout
                key={product.id}
                variants={productCardVariants}
                initial="hidden"
                animate="visible"
                custom={idx}
                onClick={() => isAvailable && addToCart(product)}
                className={`product-card relative ${inCartItem ? 'in-cart' : ''} ${!isAvailable ? 'unavailable' : ''}`}
              >
                {/* Image on the Right (First child in RTL) */}
                {product.image?.url ? (
                  <img 
                    src={product.image.url} 
                    alt={product.name} 
                    className="product-img" 
                  />
                ) : (
                  <div className="product-img-placeholder">
                    <UtensilsCrossed className="w-5.5 h-5.5" />
                  </div>
                )}

                {/* Text Info on the Left (Second child in RTL) */}
                <div className="product-info">
                  <div>
                    <h3 className="product-name">{product.name}</h3>
                    {product.description && (
                      <p className="product-desc">{product.description}</p>
                    )}
                  </div>
                  <div className="product-footer">
                    <span className="product-price">
                      {product.price}
                      <span className="currency">ج.م</span>
                    </span>

                    {/* Quantity Adjustment / Add button */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {inCartItem ? (
                        <div className="flex items-center gap-2 bg-customer-bg-overlay rounded-full p-0.5 border border-customer-border">
                          <button onClick={() => updateQuantity(product.id, -1)} className="p-1 text-customer-text-secondary hover:text-customer-text-primary transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-customer-text-primary min-w-[12px] text-center">
                            {inCartItem.quantity}
                          </span>
                          <button onClick={() => updateQuantity(product.id, 1)} className="p-1 text-customer-text-secondary hover:text-customer-text-primary transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <motion.div
                          whileTap={addButtonTap}
                          onClick={() => addToCart(product)}
                          className="add-btn"
                        >
                          <Plus className="w-4 h-4" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {!isAvailable && (
                  <div className="out-of-stock-tag">نفد</div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* ===== Floating Cart FAB ===== */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={fabVariants}
            className="fixed bottom-[84px] inset-x-0 px-4 z-35 pointer-events-none flex justify-center"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="cart-fab pointer-events-auto"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-4.5 h-4.5" />
                <span className="count-badge">
                  {cartCount}
                </span>
              </div>
              <span>عرض السلة وتأكيد الطلب</span>
              <span className="font-extrabold">{cartTotal} ج.م</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Cart Sheet ===== */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-customer-bg-overlay rounded-t-3xl z-50 max-h-[92vh] flex flex-col border-t border-customer-border shadow-customer-elevated max-w-[430px] mx-auto"
            >
              {/* Cart Header */}
              <div className="p-5 border-b border-customer-border flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-5 h-5 text-customer-accent" />
                  <h2 className="text-lg font-extrabold text-customer-text-primary">سلة المشتريات</h2>
                  <span className="badge bg-customer-accent/10 border border-customer-accent/20 text-customer-accent px-2 py-0.5 rounded-full text-xs font-bold">{cartCount} عنصر</span>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="bg-customer-bg-elevated border border-customer-border text-customer-text-secondary hover:text-customer-text-primary p-2 rounded-xl">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {cart.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    className="bg-customer-bg-elevated border border-customer-border rounded-xl p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {item.product.image?.url ? (
                          <img src={item.product.image.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-customer-bg-overlay border border-customer-border flex items-center justify-center">
                            <UtensilsCrossed className="w-4 h-4 text-customer-text-muted" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-extrabold text-customer-text-primary text-sm">{item.product.name}</h4>
                          <span className="text-xs text-customer-accent font-extrabold">{item.product.price} ج.م</span>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-customer-text-muted hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      {/* Quantity */}
                      <div className="flex items-center gap-3 bg-customer-bg-overlay p-1.5 rounded-xl border border-customer-border">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1.5 text-customer-text-secondary hover:text-customer-text-primary transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-extrabold text-customer-text-primary min-w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1.5 text-customer-text-secondary hover:text-customer-text-primary transition-colors">
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
                            className="w-full bg-customer-bg-overlay border border-customer-border text-customer-text-primary rounded-xl px-3 py-1.5 text-xs focus:border-customer-accent focus:outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveItemNotes({ productId: item.product.id, text: item.notes })}
                          className="flex items-center gap-1 text-xs text-customer-text-secondary hover:text-customer-accent border border-customer-border rounded-lg px-2.5 py-1.5 transition-colors bg-customer-bg-overlay font-medium"
                        >
                          <MessageSquare className="w-3 h-3 text-customer-accent" />
                          <span>{item.notes ? `${item.notes}` : 'ملاحظة'}</span>
                        </button>
                      )}

                      {/* Subtotal */}
                      <span className="text-sm font-extrabold text-customer-text-primary">
                        {item.product.price * item.quantity} ج.م
                      </span>
                    </div>
                  </motion.div>
                ))}

                {/* Special Notes */}
                <div className="mt-2">
                  <label className="block text-xs text-customer-text-secondary mb-2 font-bold">ملاحظات إضافية على الطلب بالكامل</label>
                  <textarea
                    rows={2}
                    placeholder="مثال: سرعة تحضير، التوصيل دفعة واحدة..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full bg-customer-bg-elevated border border-customer-border text-customer-text-primary rounded-xl p-3 text-sm text-right resize-none focus:border-customer-accent focus:outline-none placeholder:text-customer-text-muted"
                  />
                </div>
              </div>

              {/* Checkout Footer */}
              <div className="p-5 border-t border-customer-border space-y-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-customer-text-secondary font-bold">الإجمالي</span>
                  <span className="text-2xl font-extrabold text-customer-accent">{cartTotal} ج.م</span>
                </div>
                <motion.button
                  onClick={() => submitOrderMutation.mutate()}
                  disabled={submitOrderMutation.isPending}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 text-base font-bold bg-customer-accent text-customer-bg-base rounded-xl flex items-center justify-center gap-2.5 hover:opacity-95 transition-opacity"
                >
                  {submitOrderMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-customer-bg-base border-t-transparent rounded-full animate-spin" />
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

      {/* ===== persistent Bottom Navigation Bar ===== */}
      <div className="fixed bottom-0 inset-x-0 bottom-nav z-40 max-w-[430px] mx-auto rounded-t-2xl shadow-customer-elevated">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="bottom-nav-item active"
        >
          <UtensilsCrossed />
          <span>المنيو</span>
        </button>

        <button
          onClick={() => setIsServiceOpen(true)}
          className="bottom-nav-item"
        >
          <Bell />
          <span>الخدمات</span>
        </button>

        <button
          onClick={() => {
            const activeOrderId = localStorage.getItem('tawla_active_order_id');
            if (activeOrderId) {
              navigate(`/order/${activeOrderId}/track`);
            } else {
              setIsNoOrderModalOpen(true);
            }
          }}
          className="bottom-nav-item"
        >
          <Clock />
          <span>طلباتي</span>
        </button>
      </div>

      {/* ===== Service Drawer ===== */}
      <AnimatePresence>
        {isServiceOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsServiceOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-customer-bg-overlay rounded-t-3xl z-50 p-6 border-t border-customer-border shadow-customer-elevated max-w-[430px] mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-customer-text-primary text-base flex items-center gap-2">
                  <Bell className="w-5 h-5 text-customer-accent" />
                  <span>طلب خدمة أو مساعدة</span>
                </h3>
                <button 
                  onClick={() => setIsServiceOpen(false)} 
                  className="w-8 h-8 rounded-full bg-customer-bg-elevated border border-customer-border flex items-center justify-center text-customer-text-secondary hover:text-customer-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <motion.button
                  onClick={() => {
                    callWaiterMutation.mutate();
                    setIsServiceOpen(false);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-customer-bg-elevated border border-customer-border hover:border-customer-accent/30 flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl text-sm font-bold text-customer-accent transition-colors shadow-customer-card"
                >
                  <div className="w-12 h-12 rounded-full bg-customer-accent/10 border border-customer-accent/20 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-customer-accent" />
                  </div>
                  <span>استدعاء ويتر</span>
                </motion.button>
                <motion.button
                  onClick={() => {
                    requestBillMutation.mutate();
                    setIsServiceOpen(false);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-customer-bg-elevated border border-customer-border hover:border-customer-accent/30 flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl text-sm font-bold text-customer-accent transition-colors shadow-customer-card"
                >
                  <div className="w-12 h-12 rounded-full bg-customer-accent/10 border border-customer-accent/20 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-customer-accent" />
                  </div>
                  <span>طلب الحساب</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Empty Active Order Warning Drawer ===== */}
      <AnimatePresence>
        {isNoOrderModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoOrderModalOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-customer-bg-overlay rounded-t-3xl z-50 p-6 border-t border-customer-border shadow-customer-elevated text-center max-w-[430px] mx-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-customer-bg-elevated border border-customer-border flex items-center justify-center mx-auto mb-4 shadow-customer-card">
                <Clock className="w-7 h-7 text-customer-accent" />
              </div>
              <h3 className="font-extrabold text-customer-text-primary text-base mb-2">لا توجد طلبات نشطة حالياً</h3>
              <p className="text-xs text-customer-text-secondary leading-relaxed mb-6 max-w-xs mx-auto">
                يمكنك تتبع حالة طعامك ونداء الخدمات فور إرسال أول طلب للمطبخ من المنيو.
              </p>
              <button
                onClick={() => setIsNoOrderModalOpen(false)}
                className="w-full bg-customer-accent text-customer-bg-base font-bold py-3.5 rounded-xl hover:opacity-95 transition-opacity"
              >
                فهمت، تصفح المنيو
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Order Confirmation Screen ===== */}
      <AnimatePresence>
        {submittedOrder && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={confirmationVariants}
            className="order-confirmation"
          >
            <div className="confirm-icon">
              <CheckCircle2 className="w-10 h-10 text-customer-accent" />
            </div>
            
            <h2 className="confirm-title">تم إرسال طلبك للمطبخ</h2>
            <p className="confirm-sub">الشيف بدأ في تحضير طعامك وسيكون جاهزاً قريباً</p>
            
            {/* Order Number */}
            <div className="order-number">
              <div className="order-number-label">رقم الطلب</div>
              <div className="order-number-value">
                #{submittedOrder.id.slice(-6).toUpperCase()}
              </div>
            </div>
            
            {/* Status steps tracker */}
            <div className="order-steps mb-8 max-w-[280px] mx-auto">
              <div className="order-step done" />
              <div className="order-step active" />
              <div className="order-step" />
              <div className="order-step" />
            </div>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const orderId = submittedOrder.id;
                setSubmittedOrder(null);
                navigate(`/order/${orderId}/track`);
              }}
              className="w-full max-w-[280px] py-3.5 text-sm font-bold bg-[#D4A853] text-[#0A0A0B] rounded-full shadow-gold hover:opacity-95 transition-opacity"
            >
              متابعة حالة الطلب
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
