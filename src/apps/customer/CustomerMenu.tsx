import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Bell, Receipt, Plus, Minus, 
  UtensilsCrossed, Clock, FolderPlus, ShoppingBag, CheckCircle2, X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../shared/services/api';
import { socket } from '../../shared/services/socket.js';
import type { Product, Category, Restaurant } from '../../shared/types';
import CartFAB from './components/CartFAB';
import CartDrawer from './components/CartDrawer';
import OrderConfirmationModal from './components/OrderConfirmationModal';

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

  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  
  // Custom states for Tawla Luxury navigation
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isNoOrderModalOpen, setIsNoOrderModalOpen] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  // Delivery customer details states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isStaffOnline, setIsStaffOnline] = useState(true);

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
      return response.data.data as { restaurant: Restaurant; categories: Category[]; products: Product[]; isStaffOnline?: boolean };
    },
    enabled: !!restaurantSlug,
    staleTime: 5 * 60 * 1000,
  });

  const restaurant = menuData?.restaurant;
  const categories = menuData?.categories || [];
  const products = menuData?.products || [];

  useEffect(() => {
    if (menuData) {
      setIsStaffOnline((menuData as any).isStaffOnline !== false);
    }
  }, [menuData]);

  // Set document title dynamically based on customized menu title
  useEffect(() => {
    if (restaurant) {
      document.title = restaurant.settings?.menuTitle || restaurant.name;
    }
  }, [restaurant]);

  const popularProducts = useMemo(() => {
    const available = products.filter(p => p.isAvailable);
    return available.sort((a, b) => {
      const catA = categories.find(c => c.id === a.categoryId);
      const catB = categories.find(c => c.id === b.categoryId);
      
      const orderCatA = catA ? catA.order : 9999;
      const orderCatB = catB ? catB.order : 9999;

      if (orderCatA !== orderCatB) {
        return orderCatA - orderCatB;
      }
      return a.order - b.order;
    }).slice(0, 5);
  }, [products, categories]);

  // Real-time Socket.io menu updates listener
  useEffect(() => {
    if (!restaurant?.id) return;
    
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.emit('join_menu', restaurant.id);
    
    socket.on('menu_updated', () => {
      console.log('Menu updated via socket, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantSlug] });
    });

    socket.on('staff_status', (data: { isStaffOnline: boolean }) => {
      console.log('Staff status updated via socket:', data.isStaffOnline);
      setIsStaffOnline(data.isStaffOnline);
    });
    
    return () => {
      socket.off('menu_updated');
      socket.off('staff_status');
    };
  }, [restaurant?.id, restaurantSlug, queryClient]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      return matchesSearch && matchesCategory && product.isAvailable;
    });

    return filtered.sort((a, b) => {
      const catA = categories.find(c => c.id === a.categoryId);
      const catB = categories.find(c => c.id === b.categoryId);
      
      const orderCatA = catA ? catA.order : 9999;
      const orderCatB = catB ? catB.order : 9999;

      if (orderCatA !== orderCatB) {
        return orderCatA - orderCatB;
      }
      return a.order - b.order;
    });
  }, [products, categories, searchQuery, selectedCategory]);

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
      if (!tableNumber) {
        if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
          throw new Error('MANDATORY_FIELDS_REQUIRED');
        }
      }

      const payload = {
        restaurantId: restaurant?.id,
        tableNumber: Number(tableNumber || 0),
        type: tableNumber ? 'dine_in' : 'delivery',
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        specialNotes,
        customerName: tableNumber ? undefined : customerName,
        customerPhone: tableNumber ? undefined : customerPhone,
        customerAddress: tableNumber ? undefined : customerAddress,
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
      if (err.message === 'MANDATORY_FIELDS_REQUIRED') {
        toast.error('يرجى كتابة الاسم ورقم الهاتف وعنوان التوصيل لإكمال طلب الدليفري.');
        return;
      }
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
        {tableNumber ? (
          <div className="table-badge">
            <UtensilsCrossed className="w-3 h-3" />
            <span>طاولة {tableNumber}</span>
          </div>
        ) : (
          <div className="table-badge bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <ShoppingBag className="w-3 h-3" />
            <span>طلب توصيل / خارجي</span>
          </div>
        )}
        <h1 className="restaurant-name">{restaurant.settings?.menuTitle || restaurant.name}</h1>
        <div className="restaurant-sub">{restaurant.settings?.menuDescription || 'أهلاً بك في تجربة طعام فاخرة ومميزة'}</div>
      </div>

      {/* ===== Offline Notice ===== */}
      {!isStaffOnline && (
        <div className="mx-4 mt-4 relative z-10 max-w-[428px] md:mx-auto bg-amber-50 border border-amber-200/60 rounded-2xl p-4 space-y-3 font-body text-right shadow-sm">
          <div className="flex items-center gap-2 text-amber-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h3 className="font-extrabold text-sm">⚠️ الخدمة معطلة مؤقتاً</h3>
          </div>
          {tableNumber ? (
            <p className="text-xs text-amber-900 leading-relaxed">
              النظام غير متصل بالإنترنت حالياً في المطعم. يرجى طلب الخدمة وإعطاء طلبك مباشرةً للويتر.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-amber-900 leading-relaxed">
                تلقي الطلبات المباشرة معطل مؤقتاً لعدم اتصال الكاشير. يمكنك إرسال طلبك مباشرةً وتأكيده عبر الواتساب.
              </p>
              {(() => {
                const waNumber = (restaurant.receiptSettings as any)?.whatsapp || restaurant.receiptSettings?.phone || restaurant.phone;
                let formattedWaNumber = waNumber ? waNumber.replace(/[^\d]/g, '') : '';
                if (formattedWaNumber.startsWith('0')) {
                  formattedWaNumber = '2' + formattedWaNumber;
                }
                const cartSummary = cart.length > 0 
                  ? `أود طلب:\n${cart.map(item => `- ${item.product.name} (عدد ${item.quantity})`).join('\n')}\nالإجمالي: ${cartTotal} ج.م`
                  : 'أود الاستفسار عن الطلبات من المنيو';
                const waUrl = `https://wa.me/${formattedWaNumber}?text=${encodeURIComponent(cartSummary)}`;
                
                return waNumber ? (
                  <a 
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-2.5 px-4 rounded-xl text-xs font-bold w-full"
                  >
                    <span>💬 الطلب عبر واتساب</span>
                  </a>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

      {/* ===== Quick Action Row ===== */}
      {tableNumber && (
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
      )}

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

      {/* ===== Most Popular Carousel ===== */}
      {!searchQuery && popularProducts.length > 0 && (
        <div className="mt-6 mb-2 relative z-10 px-4 max-w-[428px] mx-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-extrabold text-customer-text-primary text-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-customer-accent animate-pulse" />
              الأكثر طلباً 🔥
            </h3>
            <span className="text-[10px] text-customer-text-muted font-medium">اسحب للمزيد</span>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide direction-rtl -mx-4 px-4">
            {popularProducts.map((prod) => {
              const inCartItem = cart.find(i => i.product.id === prod.id);
              
              return (
                <div 
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className={`flex-shrink-0 w-36 bg-customer-bg-elevated border rounded-2xl p-3 flex flex-col justify-between shadow-customer-card relative overflow-hidden cursor-pointer transition-all ${
                    inCartItem 
                      ? 'border-customer-accent ring-1 ring-customer-accent/20' 
                      : 'border-customer-border hover:border-customer-accent/40'
                  }`}
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-customer-bg-base border border-customer-border flex items-center justify-center">
                    {prod.image?.url ? (
                      <img src={prod.image.url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-customer-text-muted" />
                    )}
                  </div>
                  
                  <div className="min-w-0 mb-2.5">
                    <h4 className="font-bold text-customer-text-primary text-xs truncate">{prod.name}</h4>
                    <span className="text-[11px] font-bold text-customer-accent block mt-0.5">{prod.price} ج.م</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(prod);
                    }}
                    className={`w-full py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      inCartItem
                        ? 'bg-customer-accent text-customer-bg-base border-customer-accent'
                        : 'bg-customer-accent/10 border-customer-accent/20 text-customer-accent hover:bg-customer-accent hover:text-customer-bg-base'
                    }`}
                  >
                    {inCartItem ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>تمت الإضافة</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>إضافة</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Category Circles Selector ===== */}
      <div className="relative z-10 max-w-[428px] mx-auto mt-5 mb-2">
        <h3 className="font-extrabold text-customer-text-primary text-sm px-4 mb-3">الأقسام</h3>
        <div className="flex gap-4 overflow-x-auto py-2 px-4 scrollbar-hide direction-rtl">
          <div 
            onClick={() => setSelectedCategory('all')}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
              selectedCategory === 'all' 
                ? 'border-customer-accent bg-customer-accent/15 scale-105 ring-2 ring-customer-accent/20' 
                : 'border-customer-border bg-customer-bg-elevated hover:border-customer-accent/50'
            }`}>
              <UtensilsCrossed className={`w-5 h-5 ${selectedCategory === 'all' ? 'text-customer-accent' : 'text-customer-text-muted'}`} />
            </div>
            <span className={`text-[10px] font-bold transition-colors ${
              selectedCategory === 'all' ? 'text-customer-accent' : 'text-customer-text-secondary'
            }`}>
              الكل
            </span>
          </div>
          {categories.map((cat) => (
            <div 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            >
              <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all flex items-center justify-center bg-customer-bg-elevated ${
                selectedCategory === cat.id 
                  ? 'border-customer-accent scale-105 ring-2 ring-customer-accent/20' 
                  : 'border-customer-border hover:border-customer-accent/50'
              }`}>
                {cat.image?.url ? (
                  <img src={cat.image.url} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-customer-text-muted">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-bold transition-colors ${
                selectedCategory === cat.id ? 'text-customer-accent' : 'text-customer-text-secondary'
              }`}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>
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
          <CartFAB
            cartCount={cartCount}
            cartTotal={cartTotal}
            onClick={() => setIsCartOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* ===== Cart Sheet ===== */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        updateItemNotes={updateItemNotes}
        cartTotal={cartTotal}
        cartCount={cartCount}
        specialNotes={specialNotes}
        setSpecialNotes={setSpecialNotes}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerAddress={customerAddress}
        setCustomerAddress={setCustomerAddress}
        tableNumber={tableNumber}
        isStaffOnline={isStaffOnline}
        restaurant={restaurant}
        onSubmitOrder={() => submitOrderMutation.mutate()}
        isSubmitting={submitOrderMutation.isPending}
      />

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
          <OrderConfirmationModal
            order={submittedOrder}
            onTrack={() => {
              const orderId = submittedOrder.id;
              setSubmittedOrder(null);
              navigate(`/order/${orderId}/track`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
