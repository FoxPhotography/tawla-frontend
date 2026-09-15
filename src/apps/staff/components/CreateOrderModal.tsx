import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusCircle, ChevronDown, ChevronLeft, ChevronRight, ShoppingBag, Search, LayoutGrid, UtensilsCrossed, 
  Printer, Plus, Minus, Trash2, User, Phone, MapPin, Gift, Trophy, X, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../../shared/store/authStore';
import type { Table } from '../../../shared/types';
import { staffAudio } from '../services/staffAudio';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  menuData: { products: any[]; categories: any[] };
  restaurantId: string;
  onPrintReceipt: (order: any) => void;
  networkStatus: 'online' | 'offline';
  updateLocalTableStatus: (tableNumber: number, status: 'empty' | 'occupied' | 'waitingBill', currentOrderId: string | null) => void;
  onOrderCreated: () => void;
  defaultTableNumber?: number | '';
  orders?: any[];
  hasActiveShift?: boolean;
  onOpenShiftModal?: () => void;
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  tables,
  menuData,
  restaurantId,
  onPrintReceipt,
  networkStatus,
  updateLocalTableStatus,
  onOrderCreated,
  defaultTableNumber,
  orders,
  hasActiveShift = true,
  onOpenShiftModal
}: CreateOrderModalProps) {
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | ''>('');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState<string>('all');
  const [newOrderCart, setNewOrderCart] = useState<{ 
    product: any; 
    quantity: number; 
    notes: string; 
    selectedOptions?: any[]; 
    selectedModifiers?: any[]; 
    originalPrice?: number; 
    calculatedPrice: number 
  }[]>([]);
  const [newOrderSpecialNotes, setNewOrderSpecialNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const tableDropdownRef = useRef<HTMLDivElement>(null);

  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [loyaltyStatus, setLoyaltyStatus] = useState<any>(null);
  const [redeemLoyalty, setRedeemLoyalty] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { restaurant } = useAuthStore();

  // Smart Upsell pairing recommendations for waiter/staff
  const smartUpsellProducts = useMemo(() => {
    if (!menuData?.products) return [];
    return menuData.products
      .filter((p: any) => p.price <= 60 || (p.name || '').match(/(كولا|عصير|بطاطس|قهوة|إسبريسو|وافل|شوكولاتة|بيبسي|مياه|موهيتو|جبنة)/i))
      .slice(0, 6);
  }, [menuData]);

  const activeOrderForTable = useMemo(() => {
    if (!selectedTableNumber || !orders) return null;
    return orders.find(o => 
      Number(o.tableNumber) === Number(selectedTableNumber) && 
      !['delivered', 'cancelled'].includes(o.status)
    );
  }, [selectedTableNumber, orders]);

  useEffect(() => {
    if (orderType === 'dine_in' && selectedTableNumber) {
      if (activeOrderForTable) {
        setCustomerPhone(activeOrderForTable.customerPhone || '');
        setCustomerName(activeOrderForTable.customerName || '');
        setCustomerAddress(activeOrderForTable.customerAddress || '');
      } else {
        setCustomerPhone('');
        setCustomerName('');
        setCustomerAddress('');
      }
    }
  }, [selectedTableNumber, activeOrderForTable, orderType]);
  
  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await api.get('/system-settings');
      return res.data.data;
    }
  });

  const plan = restaurant?.subscription?.plan || 'trial';
  const allowedPlans = systemSettings?.features?.delivery || ['pro'];
  const isDeliveryAllowedByPlan = allowedPlans.includes(plan);
  const isDeliveryEnabled = isDeliveryAllowedByPlan && restaurant?.settings?.isDeliveryEnabled !== false;



  // Helper to find initial invoice subtotal for discount calculation
  const getInitialInvoiceSubtotal = () => {
    if (orderType === 'dine_in' && activeOrderForTable) {
      return activeOrderForTable.items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    }
    return newOrderCart.reduce((acc, item) => acc + item.calculatedPrice * item.quantity, 0);
  };

  // Helper to find free product price in table items or cart items
  const findFreeProductPrice = () => {
    if (!loyaltyStatus || !loyaltyStatus.rewardValue) return 0;
    const rewardName = String(loyaltyStatus.rewardValue);
    const rewardScope = loyaltyStatus.rewardScope;
    const rewardCategoryId = loyaltyStatus.rewardCategoryId;
    const rewardProductIds = loyaltyStatus.rewardProductIds as string[] | undefined;

    // Collect order items with their category IDs and product IDs
    const itemsList: Array<{ name: string; price: number; categoryId?: string; productId?: string }> = [
      ...(orderType === 'dine_in' && activeOrderForTable 
        ? activeOrderForTable.items.map((i: any) => {
            const product = (menuData?.products || []).find((p: any) => p.id === i.productId);
            return { name: i.name, price: i.price, categoryId: product?.categoryId, productId: i.productId };
          }) 
        : []),
      ...newOrderCart.map(i => ({ 
        name: i.product.name, 
        price: i.calculatedPrice, 
        categoryId: i.product.categoryId,
        productId: i.product.id
      }))
    ];

    if (itemsList.length === 0) return 0;

    // 1. If reward is tied to specific menu products
    if (rewardScope === 'products' || (rewardProductIds && rewardProductIds.length > 0)) {
      if (rewardProductIds && rewardProductIds.length > 0) {
        const productMatches = itemsList.filter(i => i.productId && rewardProductIds.includes(i.productId));
        if (productMatches.length > 0) {
          // Discount the lowest-priced matching item to protect margins
          return Math.min(...productMatches.map(i => i.price));
        }
        return 0;
      }
    }

    // 2. If reward is tied to a specific menu category
    if (rewardScope === 'category' || rewardCategoryId) {
      if (rewardCategoryId) {
        const categoryItems = itemsList.filter(i => i.categoryId === rewardCategoryId);
        if (categoryItems.length > 0) {
          // Discount the lowest-priced item from this category to protect margins
          return Math.min(...categoryItems.map(i => i.price));
        }
        // If order does not have any item from the reward category, return 0
        return 0;
      }
    }

    // 3. Exact or partial name match with rewardProductName
    const nameMatch = itemsList.find(i => 
      i.name.toLowerCase().includes(rewardName.toLowerCase()) ||
      rewardName.toLowerCase().includes(i.name.toLowerCase())
    );
    if (nameMatch) return nameMatch.price;

    // 4. Fallback for legacy drink keywords if no category or product list was explicitly specified
    const isDrinkReward = rewardName.includes('مشروب') || rewardName.includes('عصير') || rewardName.includes('شاي') || rewardName.includes('قهوة') || rewardName.includes('مياه');
    if (isDrinkReward) {
      const drinkKeywords = ['شاي', 'قهوة', 'مشروب', 'عصير', 'بيبسي', 'كولا', 'سفن', 'فانتا', 'مياه', 'سحلب', 'كابتشينو', 'لاتيه', 'نسكافيه', 'اسبريسو', 'شوكولاتة', 'ليمون', 'مانجو', 'جوافة', 'فراولة', 'نعناع', 'كركدية', 'ينسون', 'soda', 'water', 'tea', 'coffee', 'juice'];
      const drinkMatches = itemsList.filter(i => 
        drinkKeywords.some(keyword => i.name.toLowerCase().includes(keyword))
      );
      if (drinkMatches.length > 0) {
        return Math.min(...drinkMatches.map(i => i.price));
      }
      return 0;
    }

    // 5. Default: return 0 if no matching item found
    return 0;
  };

  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<'phone' | 'name'>('phone');

  // Live Instant Customer Search on typing in Name or Phone
  useEffect(() => {
    const term = activeSearchField === 'phone' ? customerPhone.trim() : customerName.trim();
    const fallbackTerm = term || (activeSearchField === 'phone' ? customerName.trim() : customerPhone.trim());
    
    if (fallbackTerm.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomer(true);
      try {
        const res = await api.get(`/customers/search?query=${encodeURIComponent(fallbackTerm)}`);
        if (res.data?.success && res.data.data) {
          const data = res.data.data;
          const customersList = data.customers || (data.customer ? [data.customer] : []);
          setCustomerSearchResults(customersList);
          
          // Auto match customer if phone or name matches
          const exactPhoneMatch = customersList.find((c: any) => c.phone && c.phone.trim() === customerPhone.trim());
          const exactNameMatch = customersList.find((c: any) => c.name && c.name.trim() === customerName.trim());
          const matched = exactPhoneMatch || exactNameMatch || data.customer;

          if (matched) {
            setSelectedCustomer(matched);
            if (matched.name && !customerName) setCustomerName(matched.name);
            if (matched.address && !customerAddress) setCustomerAddress(matched.address);
          }
          if (data.loyalty) {
            setLoyaltyStatus(data.loyalty);
          }
        } else {
          setCustomerSearchResults([]);
        }
      } catch (e) {
        console.warn('[LiveCustomerSearch]:', e);
        setCustomerSearchResults([]);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerPhone, customerName, activeSearchField]);

  const { data: customDiscounts = [] } = useQuery({
    queryKey: ['custom-discounts'],
    queryFn: async () => {
      try {
        const res = await api.get('/discounts');
        return res.data.data || [];
      } catch (err) {
        return [];
      }
    }
  });

  const getProductDiscountInfo = (product: any) => {
    const defaultRes = {
      price: product.price,
      originalPrice: product.price,
      discountActive: false,
      percent: 0,
    };

    if (!customDiscounts || customDiscounts.length === 0) return defaultRes;

    const matchedDiscount = customDiscounts.find((d: any) => {
      if (!d.isActive) return false;
      if (d.applicableType === 'all') return true;
      if (d.applicableType === 'categories') {
        return d.applicableCategories?.includes(product.categoryId);
      }
      if (d.applicableType === 'products') {
        return d.applicableProducts?.includes(product.id);
      }
      return false;
    });

    if (!matchedDiscount) return defaultRes;

    const percent = matchedDiscount.percentage / 100;
    const discountedPrice = Math.round(product.price * (1 - percent));

    return {
      price: discountedPrice,
      originalPrice: product.price,
      discountActive: true,
      percent: percent,
    };
  };

  // Customization State
  const [customizingProduct, setCustomizingProduct] = useState<any | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, { value: string; priceAdjustment: number }>>({});
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, { value: string; price: number }>>({});
  const [customizingQty, setCustomizingQty] = useState(1);
  const [customizingNotes, setCustomizingNotes] = useState('');

  useEffect(() => {
    if (defaultTableNumber) {
      setSelectedTableNumber(defaultTableNumber);
    }
  }, [defaultTableNumber]);

  useEffect(() => {
    if (customizingProduct) {
      const initialOptions: Record<string, { value: string; priceAdjustment: number }> = {};
      customizingProduct.options?.forEach((opt: any) => {
        if (opt.required && opt.choices?.length > 0) {
          initialOptions[opt.name] = {
            value: opt.choices[0].name,
            priceAdjustment: opt.choices[0].priceAdjustment,
          };
        }
      });
      setSelectedOptions(initialOptions);
      setSelectedModifiers({});
      setCustomizingQty(1);
      setCustomizingNotes('');
    }
  }, [customizingProduct]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tableDropdownRef.current && !tableDropdownRef.current.contains(event.target as Node)) {
        setIsTableDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (groupName: string, choiceName: string, priceAdjustment: number) => {
    staffAudio.play('click');
    setSelectedOptions(prev => ({
      ...prev,
      [groupName]: { value: choiceName, priceAdjustment },
    }));
  };

  const handleToggleModifier = (modName: string, price: number) => {
    staffAudio.play('click');
    setSelectedModifiers(prev => {
      const next = { ...prev };
      if (next[modName]) {
        delete next[modName];
      } else {
        next[modName] = { value: modName, price };
      }
      return next;
    });
  };

  const calculatedCustomTotal = useMemo(() => {
    if (!customizingProduct) return 0;
    const discInfo = getProductDiscountInfo(customizingProduct);
    const baseOriginalPrice = customizingProduct.originalPrice || customizingProduct.price || 0;
    const optionsOriginalPrice = Object.values(selectedOptions).reduce((sum, opt) => sum + (opt.priceAdjustment || 0), 0);
    const modsOriginalPrice = Object.values(selectedModifiers).reduce((sum, m) => sum + (m.price || 0), 0);
    const originalTotal = baseOriginalPrice + optionsOriginalPrice + modsOriginalPrice;
    return Math.round(originalTotal * (1 - discInfo.percent));
  }, [customizingProduct, selectedOptions, selectedModifiers, customDiscounts]);

  const addToCart = (
    product: any, 
    quantity = 1, 
    notes = '', 
    selectedOptions: any[] = [], 
    selectedModifiers: any[] = []
  ) => {
    staffAudio.play('click');
    const discInfo = getProductDiscountInfo(product);
    const baseOriginalPrice = product.originalPrice || product.price || 0;
    const optionsOriginalPrice = (selectedOptions || []).reduce((sum: number, opt: any) => sum + (opt.priceAdjustment || 0), 0);
    const modsOriginalPrice = (selectedModifiers || []).reduce((sum: number, m: any) => sum + (m.price || 0), 0);
    const originalTotal = baseOriginalPrice + optionsOriginalPrice + modsOriginalPrice;
    const calculatedPrice = Number((originalTotal * (1 - discInfo.percent)).toFixed(2));

    setNewOrderCart((prev) => {
      const existingIdx = prev.findIndex((item) => {
        const matchesProduct = item.product.id === product.id;
        const matchesOptions = JSON.stringify(item.selectedOptions || []) === JSON.stringify(selectedOptions || []);
        const matchesModifiers = JSON.stringify(item.selectedModifiers || []) === JSON.stringify(selectedModifiers || []);
        return matchesProduct && matchesOptions && matchesModifiers;
      });

      if (existingIdx > -1) {
        return prev.map((item, idx) => {
          if (idx === existingIdx) {
            return { ...item, quantity: item.quantity + quantity };
          }
          return item;
        });
      } else {
        return [...prev, {
          product,
          quantity,
          notes,
          selectedOptions,
          selectedModifiers,
          originalPrice: Number(originalTotal.toFixed(2)),
          calculatedPrice
        }];
      }
    });
    toast.success(`أضيف ${product.name} للسلة`);
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    const missing = customizingProduct.options?.filter((o: any) => o.required && !selectedOptions[o.name]);
    if (missing && missing.length > 0) {
      toast.error(`يرجى تحديد: ${missing.map((o: any) => o.name).join(', ')}`);
      return;
    }

    const optionsArr = Object.entries(selectedOptions).map(([name, detail]) => ({
      name,
      value: detail.value,
      priceAdjustment: detail.priceAdjustment,
    }));

    const modifiersArr = Object.values(selectedModifiers).map(detail => ({
      name: 'الإضافات',
      value: detail.value,
      price: detail.price,
    }));

    addToCart(customizingProduct, customizingQty, customizingNotes, optionsArr, modifiersArr);
    setCustomizingProduct(null);
  };

  const normalizeProductOptions = (prod: any): any => {
    if (!prod.options || prod.options.length === 0) return prod;
    const numPrice = Number(prod.price) || 0;
    if (numPrice <= 0) return prod;

    const normalizedOptions = prod.options.map((opt: any) => {
      if (opt.required && opt.choices && opt.choices.length > 0) {
        const firstAdj = Number(opt.choices[0].priceAdjustment) || 0;
        if (firstAdj === numPrice) {
          return {
            ...opt,
            choices: opt.choices.map((c: any) => ({
              ...c,
              priceAdjustment: Math.max(0, (Number(c.priceAdjustment) || 0) - numPrice),
            })),
          };
        }
      }
      return opt;
    });

    return { ...prod, options: normalizedOptions };
  };

  const handleProductClick = (product: any) => {
    const isCustom = (product.options && product.options.length > 0) || (product.modifiers && product.modifiers.length > 0);
    if (isCustom) {
      staffAudio.play('click');
      setCustomizingProduct(normalizeProductOptions(product));
    } else {
      addToCart(product);
    }
  };

  const modalFilteredProducts = useMemo(() => {
    const products = menuData?.products || [];
    return products.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(menuSearchQuery.toLowerCase()));
      const matchesCategory = menuSelectedCategory === 'all' || p.categoryId === menuSelectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuData?.products, menuSearchQuery, menuSelectedCategory]);

  const handleCreateOrderSubmit = async () => {
    if (hasActiveShift === false) {
      staffAudio.play('action');
      toast.error('لا يمكن إتمام الطلب: يجب بدء الوردية واستلام العهدة أولاً.');
      if (onOpenShiftModal) {
        onClose();
        onOpenShiftModal();
      }
      return;
    }
    if (orderType === 'dine_in' && !selectedTableNumber) {
      toast.error('يرجى اختيار رقم الطاولة.');
      return;
    }
    if (orderType === 'delivery') {
      if (!customerPhone.trim() || !customerAddress.trim()) {
        toast.error('يرجى إدخال رقم الهاتف وعنوان التوصيل لطلبات الدليفري.');
        return;
      }
    }
    if (newOrderCart.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للطلب.');
      return;
    }
    if (!restaurantId) {
      toast.error('لم يتم العثور على بيانات المطعم.');
      return;
    }

    setIsSubmitting(true);
    staffAudio.play('action');

    const subTotal = newOrderCart.reduce((acc, item) => acc + item.calculatedPrice * item.quantity, 0);
    const totalAmount = Math.max(0, subTotal - discountAmount);

    const orderPayload = {
      restaurantId,
      tableNumber: orderType === 'takeaway' || orderType === 'delivery' ? 0 : Number(selectedTableNumber),
      items: newOrderCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.calculatedPrice,
        quantity: item.quantity,
        notes: item.notes,
        selectedOptions: item.selectedOptions,
        selectedModifiers: item.selectedModifiers
      })),
      specialNotes: newOrderSpecialNotes,
      totalAmount,
      discountAmount,
      status: 'accepted' as const,
      type: orderType,
      paymentMethod: orderType === 'dine_in' ? 'cash' : paymentMethod,
      createdAt: new Date().toISOString(),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerAddress: customerAddress || undefined,
    };

    if (networkStatus === 'online') {
      try {
        const payload = {
          tableNumber: orderPayload.tableNumber,
          items: orderPayload.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
            selectedOptions: item.selectedOptions,
            selectedModifiers: item.selectedModifiers
          })),
          specialNotes: orderPayload.specialNotes,
          status: 'accepted',
          type: orderType,
          paymentMethod: orderType === 'dine_in' ? 'cash' : paymentMethod,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          customerAddress: customerAddress || undefined,
          discountAmount: discountAmount || undefined,
          redeemLoyalty: redeemLoyalty || undefined
        };
        const response = await api.post('/orders', payload, {
          headers: { 'x-restaurant-id': restaurantId }
        });
        
        staffAudio.play('success');

        if (orderType === 'takeaway' || orderType === 'delivery') {
          onPrintReceipt(response.data.data);
        }

        onOrderCreated();
        setNewOrderCart([]);
        setNewOrderSpecialNotes('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setDiscountAmount(0);
        setLoyaltyStatus(null);
        setRedeemLoyalty(false);
        setSelectedTableNumber('');
        onClose();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'فشل في إرسال الطلب، تأكد من الاتصال.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Offline fallback
      try {
        const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const localOrder = {
          ...orderPayload,
          id: offlineId,
          isOffline: true
        };

        const existingOffline = JSON.parse(localStorage.getItem('tawla_offline_orders') || '[]');
        existingOffline.push(localOrder);
        localStorage.setItem('tawla_offline_orders', JSON.stringify(existingOffline));

        if (orderType === 'dine_in') {
          updateLocalTableStatus(Number(selectedTableNumber), 'occupied', offlineId);
        }

        staffAudio.play('success');
        toast.success('تم حفظ الطلب محلياً بنجاح (يعمل بدون إنترنت).');

        if (orderType === 'takeaway' || orderType === 'delivery') {
          onPrintReceipt(localOrder);
        }

        onOrderCreated();
        setNewOrderCart([]);
        setNewOrderSpecialNotes('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setDiscountAmount(0);
        setLoyaltyStatus(null);
        setRedeemLoyalty(false);
        setSelectedTableNumber('');
        onClose();
      } catch (e) {
        toast.error('فشل في حفظ الطلب محلياً.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 no-print font-body" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 28 } }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white border border-zinc-200/90 rounded-3xl w-full max-w-[95vw] 2xl:max-w-[1400px] h-[92vh] flex flex-col overflow-hidden shadow-2xl relative"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-200/80 bg-white flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#801B2C]/10 flex items-center justify-center text-[#801B2C] border border-[#801B2C]/20 shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base text-zinc-900 font-cairo">تسجيل طلب جديد (ويتر / كاشير)</h2>
              <p className="text-[11px] text-zinc-500 font-bold font-body">اختر الأصناف لتسجيل وحفظ الطلب مباشرة للمطبخ</p>
            </div>
          </div>
          <button 
            onClick={() => {
              staffAudio.play('click');
              setNewOrderCart([]);
              setSelectedTableNumber('');
              setNewOrderSpecialNotes('');
              setCustomerName('');
              setOrderType('dine_in');
              setPaymentMethod('cash');
              setLoyaltyStatus(null);
              setRedeemLoyalty(false);
              onClose();
            }} 
            className="w-9 h-9 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Column: Cart & Table details (Clean Light Luxury Panel) */}
          <div className="w-full md:w-[400px] border-l border-zinc-200/80 flex flex-col h-full bg-zinc-50/70 flex-shrink-0 text-zinc-900 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200">
            
            {/* Table & Notes selection */}
            <div className="p-5 border-b border-zinc-200/80 space-y-4">
              
              {/* Order Type Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-zinc-700 font-body">نوع الطلب:</label>
                <div className={`grid ${isDeliveryEnabled ? 'grid-cols-3' : 'grid-cols-2'} gap-2 bg-white p-1.5 rounded-2xl border border-zinc-200/80 shadow-xs`}>
                  <button
                    type="button"
                    onClick={() => {
                      staffAudio.play('click');
                      setOrderType('dine_in');
                    }}
                    className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer font-body ${
                      orderType === 'dine_in'
                        ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/15'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    صالة (طاولة)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      staffAudio.play('click');
                      setOrderType('takeaway');
                      setSelectedTableNumber('');
                    }}
                    className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer font-body ${
                      orderType === 'takeaway'
                        ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/15'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    تيك أواي سفري
                  </button>
                  {isDeliveryEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        staffAudio.play('click');
                        setOrderType('delivery');
                        setSelectedTableNumber('');
                      }}
                      className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer font-body ${
                        orderType === 'delivery'
                          ? 'bg-[#801B2C] text-white shadow-md shadow-[#801B2C]/15'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      توصيل دليفري
                    </button>
                  )}
                </div>
              </div>

              {/* Conditional Table Selector or Payment Selector */}
              {orderType === 'dine_in' ? (
                <div className="space-y-1.5" ref={tableDropdownRef}>
                  <label className="block text-xs font-black text-zinc-700 font-body">اختر رقم الطاولة:</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTableDropdownOpen(prev => !prev)}
                      className="w-full bg-white border border-zinc-200/90 text-zinc-900 text-xs rounded-2xl pr-4 pl-4 py-3.5 outline-none focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 font-black transition-all text-right flex justify-between items-center cursor-pointer font-body shadow-xs"
                    >
                      <span className="truncate">
                        {selectedTableNumber 
                          ? `طاولة رقم ${selectedTableNumber} (${
                              tables.find((t: Table) => t.number === selectedTableNumber)?.status === 'occupied' 
                                ? 'مشغولة' 
                                : tables.find((t: Table) => t.number === selectedTableNumber)?.status === 'waitingBill' 
                                ? 'تطلب الحساب' 
                                : 'متاحة'
                            })` 
                          : '-- اضغط لاختيار رقم الطاولة --'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isTableDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isTableDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute right-0 left-0 mt-2 bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto scrollbar-hide text-zinc-800 font-body p-1.5 space-y-1"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTableNumber('');
                              setIsTableDropdownOpen(false);
                            }}
                            className="w-full text-right px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                          >
                            -- إلغاء تحديد الطاولة --
                          </button>
                          {tables.map((t: Table) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                staffAudio.play('click');
                                setSelectedTableNumber(t.number);
                                setIsTableDropdownOpen(false);
                              }}
                              className={`w-full text-right px-3 py-2.5 text-xs rounded-xl transition-colors flex justify-between items-center cursor-pointer ${
                                selectedTableNumber === t.number
                                  ? 'bg-[#801B2C] text-white font-black shadow-sm'
                                  : 'text-zinc-800 hover:bg-zinc-100'
                              }`}
                            >
                              <span className="font-bold">طاولة {t.number}</span>
                              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                                t.status === 'occupied' 
                                  ? 'bg-zinc-100 text-zinc-700' 
                                  : t.status === 'waitingBill' 
                                  ? 'bg-amber-100 text-amber-800 animate-pulse' 
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {t.status === 'occupied' ? 'مشغولة' : t.status === 'waitingBill' ? 'طلب حساب' : 'متاحة'}
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-zinc-700 font-body">طريقة الدفع (دفع فوري):</label>
                  <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl border border-zinc-200/80 shadow-xs">
                    <button
                      type="button"
                      onClick={() => {
                        staffAudio.play('click');
                        setPaymentMethod('cash');
                      }}
                      className={`py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer font-body border ${
                        paymentMethod === 'cash'
                          ? 'bg-[#801B2C] text-white border-[#801B2C] shadow-sm'
                          : 'text-zinc-600 hover:text-zinc-950 border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      نقدي Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        staffAudio.play('click');
                        setPaymentMethod('card');
                      }}
                      className={`py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer font-body border ${
                        paymentMethod === 'card'
                          ? 'bg-[#801B2C] text-white border-[#801B2C] shadow-sm'
                          : 'text-zinc-600 hover:text-zinc-950 border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      فيزا Visa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        staffAudio.play('click');
                        setPaymentMethod('wallet');
                      }}
                      className={`py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer font-body border ${
                        paymentMethod === 'wallet'
                          ? 'bg-[#801B2C] text-white border-[#801B2C] shadow-sm'
                          : 'text-zinc-600 hover:text-zinc-950 border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      محفظة Wallet
                    </button>
                  </div>
                </div>
              )}

              {/* Customer Phone & Name with Live Instant Dropdown */}
              <div className="space-y-3 bg-white border border-zinc-200/80 p-3.5 rounded-2xl shadow-xs">
                {/* Customer Phone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-zinc-700 flex items-center gap-1.5 font-body">
                    <Phone className="w-3.5 h-3.5 text-[#801B2C]" />
                    <span>رقم الهاتف (يبحث تلقائياً بالرقم أو الاسم):</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="أدخل رقم الموبايل أو الاسم..."
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setActiveSearchField('phone');
                      }}
                      className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl pr-3.5 pl-8 py-2.5 outline-none focus:border-[#801B2C] focus:ring-1 focus:ring-[#801B2C]/20 transition-all font-mono text-left font-bold"
                      dir="ltr"
                    />
                    {isSearchingCustomer && activeSearchField === 'phone' && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#801B2C] border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>

                {/* Customer Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-zinc-700 flex items-center gap-1.5 font-body">
                    <User className="w-3.5 h-3.5 text-[#801B2C]" />
                    <span>اسم العميل:</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="اسم العميل (يبحث تلقائياً)..."
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setActiveSearchField('name');
                      }}
                      className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#801B2C] focus:ring-1 focus:ring-[#801B2C]/20 transition-all placeholder:text-zinc-400 font-body font-bold"
                    />
                    {isSearchingCustomer && activeSearchField === 'name' && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#801B2C] border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>

                {/* Floating Instant Customer Search Results Dropdown */}
                {customerSearchResults && customerSearchResults.length > 0 && (
                  <div className="relative z-30">
                    <div className="bg-white border-2 border-[#801B2C] rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-zinc-100 font-body">
                      <div className="bg-rose-50/80 px-3 py-1.5 text-[10px] font-black text-[#801B2C] flex items-center justify-between">
                        <span>نتائج العثور في قاعدة البيانات ({customerSearchResults.length})</span>
                        <span className="text-[9px] text-zinc-400 font-normal">اضغط لاختيار العميل</span>
                      </div>
                      {customerSearchResults.map((c: any) => (
                        <button
                          key={c.id || c.phone}
                          type="button"
                          onClick={() => {
                            staffAudio.play('click');
                            setSelectedCustomer(c);
                            if (c.name) setCustomerName(c.name);
                            if (c.phone) setCustomerPhone(c.phone);
                            if (c.address) setCustomerAddress(c.address);
                            setCustomerSearchResults([]);
                          }}
                          className="w-full text-right px-3.5 py-2.5 hover:bg-rose-50 transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-black text-zinc-900 group-hover:text-[#801B2C] flex items-center gap-1.5">
                              <span>{c.name || 'عميل مسجل'}</span>
                              {(c.orderCount > 0 || c.totalSpent > 0) && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                  {c.orderCount || 1} طلب سابق
                                </span>
                              )}
                            </div>
                            {c.phone && (
                              <div className="text-[11px] text-zinc-600 font-mono" dir="ltr">
                                📞 {c.phone}
                              </div>
                            )}
                            {c.address && (
                              <div className="text-[10px] text-zinc-400 truncate max-w-xs">
                                📍 {c.address}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-[#801B2C] font-bold group-hover:underline bg-rose-100/60 px-2 py-1 rounded-lg">
                            اختيار ↵
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Customer Status Badge */}
                {(() => {
                  const currentPhone = customerPhone.trim();
                  const currentName = customerName.trim();
                  
                  if (!currentPhone && !currentName) return null;

                  const matched = selectedCustomer || customerSearchResults.find((c: any) => 
                    (c.phone && currentPhone && c.phone === currentPhone) ||
                    (c.name && currentName && c.name === currentName)
                  );

                  if (matched) {
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold p-2.5 rounded-xl flex items-center justify-between font-body shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-base">👤</span>
                          <span>
                            عميل مسجل سابقاً ({matched.name || 'العميل'}) — {matched.orderCount || 1} طلب سابق
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                          موثق بالحساب 💾
                        </span>
                      </div>
                    );
                  }

                  if (isSearchingCustomer) return null;

                  if (currentPhone.length >= 3 || currentName.length >= 2) {
                    if (customerSearchResults.length === 0) {
                      return (
                        <div className="bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold p-2.5 rounded-xl flex items-center gap-2 font-body shadow-xs">
                          <span className="text-base">👤</span>
                          <span>عميل جديد — سيتم تسجيل حسابه وتوثيقه تلقائياً في قاعدة البيانات عند إتمام الطلب 💾</span>
                        </div>
                      );
                    }
                  }

                  return null;
                })()}

                {/* Customer Address */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-zinc-700 flex items-center gap-1.5 font-body">
                    <MapPin className="w-3.5 h-3.5 text-[#801B2C]" />
                    <span>عنوان التوصيل بالتفصيل {orderType !== 'delivery' && '(اختياري)'}:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="المنطقة، الشارع، البناية، رقم الشقة..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#801B2C] focus:ring-1 focus:ring-[#801B2C]/20 transition-all placeholder:text-zinc-400 font-body font-bold"
                  />
                </div>

                  {/* Loyalty Progress Card */}
                  {loyaltyStatus && loyaltyStatus.enabled && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-right font-body">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-amber-900 font-black flex items-center gap-1">
                          <Gift className="w-4 h-4 text-amber-600" />
                          <span>نظام الهدايا والولاء</span>
                        </span>
                        <span className="text-[10px] bg-amber-200/60 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-mono font-black">
                          {loyaltyStatus.progress} / {loyaltyStatus.target} طلبات
                        </span>
                      </div>

                      {loyaltyStatus.isEligible ? (
                        <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2">
                          <p className="text-xs text-emerald-700 font-black leading-relaxed flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span>مؤهل للمكافأة: {loyaltyStatus.rewardType === 'discount' ? `خصم ${loyaltyStatus.rewardValue}%` : loyaltyStatus.rewardValue}!</span>
                          </p>
                          {loyaltyStatus.rewardType === 'discount' ? (
                            redeemLoyalty ? (
                              <div className="flex flex-col gap-2">
                                <div className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center">
                                  تم تطبيق الخصم المستحق بنجاح!
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    staffAudio.play('click');
                                    setDiscountAmount(0);
                                    setRedeemLoyalty(false);
                                    toast.success('تم إلغاء تطبيق مكافأة الهدايا');
                                  }}
                                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  إلغاء تطبيق المكافأة
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  staffAudio.play('action');
                                  const subTotal = getInitialInvoiceSubtotal();
                                  const disc = Math.round(subTotal * (Number(loyaltyStatus.rewardValue) / 100));
                                  setDiscountAmount(disc);
                                  setRedeemLoyalty(true);
                                  toast.success(`تم تطبيق خصم الهدايا: ${disc} ج.م`);
                                }}
                                className="w-full py-2 bg-[#801B2C] hover:bg-[#962436] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                              >
                                تطبيق الخصم المستحق
                              </button>
                            )
                          ) : (
                            redeemLoyalty ? (
                              <div className="flex flex-col gap-2">
                                <div className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center">
                                  تم تحديد تسليم الهدية ({loyaltyStatus.rewardValue})
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    staffAudio.play('click');
                                    setDiscountAmount(0);
                                    setRedeemLoyalty(false);
                                    toast.success('تم إلغاء تسليم المكافأة');
                                  }}
                                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  إلغاء تسليم الهدية
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  staffAudio.play('action');
                                  const freeItemPrice = findFreeProductPrice();
                                  if (freeItemPrice <= 0) {
                                    let errorMsg = 'يرجى إضافة صنف مؤهل للهدية المجانية إلى الطلب أولاً!';
                                    if (loyaltyStatus.rewardProductIds && loyaltyStatus.rewardProductIds.length > 0) {
                                      errorMsg = 'الطلب لا يحتوي على أي صنف من الأصناف المحددة للهدية المجانية!';
                                    } else if (loyaltyStatus.rewardCategoryName) {
                                      errorMsg = `الطلب لا يحتوي على أي صنف من قسم (${loyaltyStatus.rewardCategoryName}) لتطبيق الهدية المجانية!`;
                                    }
                                    toast.error(errorMsg);
                                    return;
                                  }
                                  setDiscountAmount(freeItemPrice);
                                  setRedeemLoyalty(true);
                                  toast.success(`تم تطبيق الهدية المجانية (${loyaltyStatus.rewardValue}) بقيمة: ${freeItemPrice} ج.م`);
                                }}
                                className="w-full py-2 bg-[#801B2C] hover:bg-[#962436] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                              >
                                تأكيد تسليم الهدية المجانية
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="w-full bg-amber-200/80 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${(loyaltyStatus.progress / loyaltyStatus.target) * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-amber-800 font-bold">
                            متبقي له {loyaltyStatus.target - loyaltyStatus.progress} طلبات للحصول على المكافأة.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              {/* Special Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-zinc-700 font-body">ملاحظات عامة للطلب:</label>
                <textarea
                  placeholder="مثال: البهارات خفيفة، بدون بصل..."
                  value={newOrderSpecialNotes}
                  onChange={(e) => setNewOrderSpecialNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-zinc-200/90 text-zinc-900 text-xs rounded-2xl p-3 outline-none focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 resize-none transition-all placeholder:text-zinc-400 font-body font-bold shadow-xs"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-5 space-y-3 flex-1">
              <h4 className="text-xs font-black text-zinc-700 uppercase tracking-widest mb-2 font-cairo">مكونات الطلب ({newOrderCart.length})</h4>
              {newOrderCart.length === 0 ? (
                <div className="border border-dashed border-zinc-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center bg-white min-h-[180px]">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-3 text-zinc-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-black text-zinc-800 mb-1 font-cairo">السلة فارغة</h5>
                  <p className="text-[11px] text-zinc-500 max-w-[200px] leading-relaxed font-body">
                    اضغط على أي صنف من قائمة المنيو لإضافته للسلة مباشرة.
                  </p>
                </div>
              ) : (
                newOrderCart.map((item, idx) => (
                  <div key={idx} className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs text-right font-body">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h5 className="text-xs font-black text-zinc-900 leading-snug">{item.product.name}</h5>
                        {item.originalPrice && item.originalPrice > item.calculatedPrice ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-[#801B2C] font-black font-mono">{item.calculatedPrice} ج.م</span>
                            <span className="text-[10px] line-through text-zinc-400 font-mono">{item.originalPrice} ج.م</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#801B2C] font-black font-mono">{item.calculatedPrice} ج.م</span>
                        )}
                        
                        {/* Options & Modifiers display */}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="text-[10px] text-zinc-500 font-bold mt-1">
                            {item.selectedOptions.map((o: any) => `${o.name}: ${o.value}${o.priceAdjustment > 0 ? ` (+${o.priceAdjustment} ج.م)` : ''}`).join(' | ')}
                          </div>
                        )}
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="text-[10px] text-zinc-500 font-bold mt-0.5">
                            الإضافات: {item.selectedModifiers.map((m: any) => `${m.value}${m.price > 0 ? ` (+${m.price} ج.م)` : ''}`).join(', ')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          staffAudio.play('click');
                          setNewOrderCart(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="w-6 h-6 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    {/* Quantity and Notes */}
                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-zinc-100">
                      <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-0.5">
                        <button
                          onClick={() => {
                            staffAudio.play('click');
                            setNewOrderCart(prev => prev.map((i, index) => 
                              index === idx 
                                ? { ...i, quantity: Math.max(1, i.quantity - 1) } 
                                : i
                            ));
                          }}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-zinc-200 flex items-center justify-center active:scale-95 transition-all text-zinc-800 cursor-pointer shadow-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-black w-6 text-center text-zinc-900">{item.quantity}</span>
                        <button
                          onClick={() => {
                            staffAudio.play('click');
                            setNewOrderCart(prev => prev.map((i, index) => 
                              index === idx 
                                ? { ...i, quantity: i.quantity + 1 } 
                                : i
                            ));
                          }}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-zinc-200 flex items-center justify-center active:scale-95 transition-all text-zinc-800 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <input
                        type="text"
                        placeholder="إضافة ملاحظة على الصنف..."
                        value={item.notes}
                        onChange={(e) => {
                          setNewOrderCart(prev => prev.map((i, index) => 
                            index === idx 
                              ? { ...i, notes: e.target.value } 
                              : i
                          ));
                        }}
                        className="flex-1 bg-zinc-50 border border-zinc-200 text-[10px] rounded-xl px-3 py-1.5 outline-none text-zinc-900 placeholder:text-zinc-400 focus:border-[#801B2C] transition-colors font-bold"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Smart Upsell Recommendations Carousel */}
            {smartUpsellProducts.length > 0 && (
              <div className="px-4 py-2.5 bg-amber-50/80 border-t border-amber-200/80 space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-900 flex items-center gap-1 font-cairo">
                    <Gift className="w-3.5 h-3.5 text-amber-600" />
                    <span>💡 اقتراحات الـ Upselling لزيادة متوسط الفاتورة</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-amber-700 font-bold font-body hidden sm:inline">إضافة سريعة بنقرة واحدة</span>
                    {/* Navigation buttons for mouse/non-touch users */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const container = document.getElementById('upsell-carousel-container');
                          if (container) container.scrollBy({ left: 180, behavior: 'smooth' });
                        }}
                        className="w-5 h-5 rounded-full bg-white border border-amber-300 hover:bg-amber-200/80 flex items-center justify-center text-amber-900 transition-colors shadow-2xs cursor-pointer active:scale-95"
                        title="تمرير لليمين"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const container = document.getElementById('upsell-carousel-container');
                          if (container) container.scrollBy({ left: -180, behavior: 'smooth' });
                        }}
                        className="w-5 h-5 rounded-full bg-white border border-amber-300 hover:bg-amber-200/80 flex items-center justify-center text-amber-900 transition-colors shadow-2xs cursor-pointer active:scale-95"
                        title="تمرير لليسار"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div 
                  id="upsell-carousel-container" 
                  className="flex gap-2 overflow-x-auto pb-2 pt-0.5 scrollbar-thin scrollbar-thumb-amber-300 hover:scrollbar-thumb-amber-400 scrollbar-track-amber-100/70 rounded-xl"
                >
                  {smartUpsellProducts.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        addToCart(p);
                      }}
                      className="flex-shrink-0 bg-white hover:bg-amber-100/60 border border-amber-200 rounded-xl px-2.5 py-1 flex items-center gap-2 text-right transition-all cursor-pointer shadow-2xs group select-none"
                    >
                      <div>
                        <div className="text-[11px] font-black text-zinc-900 group-hover:text-[#801B2C] line-clamp-1">{p.name}</div>
                        <div className="text-[10px] font-mono text-emerald-700 font-bold">+{p.price} ج.م</div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit & Payment Panel */}
            <div className="p-5 border-t border-zinc-200/80 bg-white space-y-3 flex-shrink-0">
              <div className="space-y-2">
                {/* Custom Discount Input */}
                <div className="flex justify-between items-center bg-zinc-50 border border-zinc-200/80 px-4 py-2.5 rounded-2xl text-zinc-600 text-xs font-body font-bold">
                  <span>تطبيق خصم يدوي:</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        staffAudio.play('click');
                        setDiscountAmount(prev => Math.max(0, prev - 1));
                      }}
                      className="w-5 h-5 bg-white hover:bg-zinc-200 border border-zinc-200 text-zinc-800 flex items-center justify-center rounded-lg transition-colors cursor-pointer select-none active:scale-95 shadow-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="w-12 bg-white border border-zinc-200 rounded-lg text-center font-mono text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#801B2C] p-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        staffAudio.play('click');
                        setDiscountAmount(prev => prev + 1);
                      }}
                      className="w-5 h-5 bg-white hover:bg-zinc-200 border border-zinc-200 text-zinc-800 flex items-center justify-center rounded-lg transition-colors cursor-pointer select-none active:scale-95 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-zinc-500 text-xs mr-0.5">ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-zinc-50 border border-zinc-200/80 px-4 py-2 rounded-2xl text-zinc-600 text-xs font-body font-bold">
                  <span>مجموع الأصناف:</span>
                  <span className="font-mono font-bold text-zinc-800">
                    {newOrderCart.reduce((acc, item) => acc + item.calculatedPrice * item.quantity, 0)} ج.م
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center bg-red-50 border border-red-200 px-4 py-2 rounded-2xl text-red-700 text-xs font-body font-bold">
                    <span>الخصم المطبق:</span>
                    <span className="font-mono font-black">-{discountAmount} ج.م</span>
                  </div>
                )}

                <div className="flex justify-between items-center bg-zinc-100 border border-zinc-200/80 px-4 py-3 rounded-2xl font-body font-bold">
                  <span className="text-xs font-black text-zinc-700">المبلغ الإجمالي النهائي:</span>
                  <span className="font-mono text-lg font-black text-[#801B2C]">
                    {Math.max(0, newOrderCart.reduce((acc, item) => acc + item.calculatedPrice * item.quantity, 0) - discountAmount)} ج.م
                  </span>
                </div>

                {hasActiveShift === false && (
                  <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3 text-amber-900 flex items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold block text-[11px]">الوردية غير مفتوحة حالياً</span>
                        <span className="text-[10px] text-amber-700 block">يجب بدء الوردية أولاً لتسجيل الطلبات</span>
                      </div>
                    </div>
                    {onOpenShiftModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenShiftModal();
                        }}
                        className="px-2.5 py-1 bg-[#801B2C] hover:bg-[#962436] text-white rounded-xl text-[10px] font-bold shadow-xs whitespace-nowrap cursor-pointer transition-all"
                      >
                        بدء الوردية 🟢
                      </button>
                    )}
                  </div>
                )}
              </div>

              <motion.button
                whileHover={hasActiveShift ? { scale: 1.01 } : {}}
                whileTap={hasActiveShift ? { scale: 0.97 } : {}}
                onClick={handleCreateOrderSubmit}
                disabled={isSubmitting || hasActiveShift === false}
                className={`w-full font-black py-3.5 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-2 font-body border ${
                  hasActiveShift === false
                    ? 'bg-zinc-200 border-zinc-300 text-zinc-400 cursor-not-allowed shadow-none'
                    : 'bg-[#801B2C] hover:bg-[#962436] text-white shadow-[#801B2C]/20 cursor-pointer border-[#801B2C]'
                }`}
              >
                {hasActiveShift === false ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>يجب بدء الوردية أولاً لتأكيد الطلب</span>
                  </>
                ) : orderType === 'takeaway' || orderType === 'delivery' ? (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري التأكيد والطباعة...' : 'تأكيد وطباعة الطلب'}</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري تأكيد الطلب...' : 'تأكيد وإرسال الطلب للمطبخ'}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Right Column: Menu catalog & Categories (Clean Light Layout) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            
            {/* Search Bar */}
            <div className="p-4 border-b border-zinc-200/80 flex items-center gap-2 bg-white">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="ابحث في المنيو عن وجبة، مشروب، أو صنف..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-2xl pr-10 pl-4 py-3 outline-none focus:border-[#801B2C] focus:ring-2 focus:ring-[#801B2C]/10 font-bold transition-all placeholder:text-zinc-400 font-body shadow-xs"
                />
              </div>
            </div>

            {/* Categories Scrollbar */}
            <div className="flex gap-2.5 overflow-x-auto p-4 border-b border-zinc-200/80 scrollbar-hide flex-shrink-0 bg-white font-body items-center">
              <button
                onClick={() => {
                  staffAudio.play('click');
                  setMenuSelectedCategory('all');
                }}
                className={`py-2.5 px-6 rounded-2xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer shadow-xs min-w-[90px] text-center ${
                  menuSelectedCategory === 'all'
                    ? 'bg-[#801B2C] text-white border-[#801B2C] shadow-md shadow-[#801B2C]/20'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                كل الأصناف
              </button>
              {(menuData?.categories || []).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    staffAudio.play('click');
                    setMenuSelectedCategory(cat.id);
                  }}
                  className={`py-2.5 px-6 rounded-2xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer shadow-xs min-w-[90px] text-center ${
                    menuSelectedCategory === cat.id
                      ? 'bg-[#801B2C] text-white border-[#801B2C] shadow-md shadow-[#801B2C]/20'
                      : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Product Grid Area */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch content-start scrollbar-hide">
              <AnimatePresence>
                {modalFilteredProducts.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center text-center py-20 text-zinc-400">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-3 text-zinc-300">
                      <LayoutGrid className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="text-xs font-bold font-body text-zinc-600">لا توجد أطباق مطابقة لبحثك</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">جرّب البحث باسم وجبة أخرى أو غيّر القسم</p>
                  </div>
                ) : (
                  modalFilteredProducts.map((prod: any) => {
                    const qtyInCart = newOrderCart
                      .filter((item) => item.product.id === prod.id)
                      .reduce((sum, item) => sum + item.quantity, 0);
                    const disc = getProductDiscountInfo(prod);

                    return (
                      <div key={prod.id} className="flex h-full">
                        <motion.div
                          layout
                          whileHover={{ y: -3, boxShadow: '0 12px 24px -4px rgba(0,0,0,0.08)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleProductClick(prod)}
                          className={`w-full bg-white rounded-3xl p-3 flex flex-col justify-between transition-all group overflow-hidden shadow-xs cursor-pointer border ${
                            qtyInCart > 0 
                              ? 'border-[#801B2C]/40 ring-2 ring-[#801B2C]/10 bg-gradient-to-b from-[#801B2C]/[0.02] to-white' 
                              : 'border-zinc-200/90 hover:border-[#801B2C]/30'
                          }`}
                        >
                          <div className="flex flex-col gap-2">
                            {/* Image Container with Floating Badges */}
                            <div className="w-full aspect-square relative rounded-2xl overflow-hidden mb-1 border border-zinc-100 bg-zinc-50">
                              {prod.image?.url ? (
                                <img
                                  src={prod.image.url}
                                  alt={prod.name}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                  <UtensilsCrossed className="w-8 h-8 opacity-25" />
                                </div>
                              )}

                              {/* Floating In-Cart Badge */}
                              {qtyInCart > 0 && (
                                <motion.span 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#801B2C] text-white text-[11px] font-black font-mono flex items-center justify-center shadow-md border-2 border-white z-10"
                                >
                                  {qtyInCart}
                                </motion.span>
                              )}

                              {/* Floating Discount Pill */}
                              {disc.discountActive && (
                                <span className="absolute top-2 right-2 bg-red-500/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
                                  خصم {Math.round(disc.percent * 100)}%
                                </span>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="px-1">
                              <h5 className="text-[13px] font-black text-zinc-900 leading-snug line-clamp-1 group-hover:text-[#801B2C] transition-colors font-cairo">
                                {prod.name}
                              </h5>
                              {prod.description ? (
                                <p className="text-[10px] text-zinc-400 leading-tight mt-0.5 line-clamp-1 font-body">
                                  {prod.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          
                          {/* Price & Action Area */}
                          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-100 px-1">
                            {disc.discountActive ? (
                              <div className="flex flex-col text-right">
                                <span className="font-mono text-[13px] font-black text-[#801B2C] leading-none">
                                  {disc.price} <span className="text-[9px] font-bold font-body">ج.م</span>
                                </span>
                                <span className="font-mono text-[9px] line-through text-zinc-400 mt-0.5 leading-none">
                                  {disc.originalPrice} ج.م
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-[13px] font-black text-zinc-900">
                                {prod.price} <span className="text-[9px] font-bold text-zinc-500 font-body">ج.م</span>
                              </span>
                            )}

                            {/* Quick Add / Stepper */}
                            <div onClick={(e) => e.stopPropagation()}>
                              {qtyInCart > 0 ? (
                                <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded-xl p-0.5">
                                  <button
                                    onClick={() => {
                                      staffAudio.play('click');
                                      setNewOrderCart(prev => {
                                        const idx = prev.findIndex(item => item.product.id === prod.id);
                                        if (idx === -1) return prev;
                                        if (prev[idx].quantity <= 1) {
                                          return prev.filter((_, i) => i !== idx);
                                        }
                                        return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity - 1 } : item);
                                      });
                                    }}
                                    className="w-6 h-6 rounded-lg bg-white hover:bg-zinc-200 flex items-center justify-center text-zinc-800 transition-colors shadow-xs"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="font-mono text-xs font-black w-5 text-center text-zinc-900">
                                    {qtyInCart}
                                  </span>
                                  <button
                                    onClick={() => handleProductClick(prod)}
                                    className="w-6 h-6 rounded-lg bg-[#801B2C] text-white hover:bg-[#962436] flex items-center justify-center transition-colors shadow-xs"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleProductClick(prod)}
                                  className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all font-body bg-[#801B2C]/5 group-hover:bg-[#801B2C] text-[#801B2C] group-hover:text-white border border-[#801B2C]/20 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>إضافة</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== Product Customization Dialog (Clean Light Modal) ===== */}
      <AnimatePresence>
        {customizingProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingProduct(null)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-0 m-auto bg-white border border-zinc-200 rounded-3xl z-50 p-6 shadow-2xl text-right max-w-md w-full max-h-[85vh] overflow-y-auto text-zinc-900 h-fit"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100">
                <div>
                  <h3 className="font-black text-zinc-900 text-base font-cairo">تخصيص الوجبة</h3>
                  <p className="text-[11px] text-zinc-500 font-bold font-body">حدد الحجم والإضافات المفضلة</p>
                </div>
                <button
                  onClick={() => setCustomizingProduct(null)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 flex items-center gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80">
                {customizingProduct.image?.url && (
                  <img src={customizingProduct.image.url} alt="" className="w-14 h-14 rounded-xl object-cover border border-zinc-200" />
                )}
                <div>
                  <h4 className="font-black text-zinc-900 text-sm font-cairo">{customizingProduct.name}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5 font-body">{customizingProduct.description || 'اختر إضافات وتفاصيل طلبك'}</p>
                </div>
              </div>

              {/* Options Groups */}
              {customizingProduct.options?.map((option: any, groupIdx: number) => {
                const selected = selectedOptions[option.name];
                return (
                  <div key={groupIdx} className="mb-4 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 font-body">
                    <h5 className="font-black text-xs text-zinc-900 mb-2.5 flex justify-between items-center">
                      <span>{option.name}</span>
                      {option.required && (
                        <span className="text-[10px] bg-[#801B2C]/10 text-[#801B2C] px-2 py-0.5 rounded-md font-black">مطلوب</span>
                      )}
                    </h5>
                    <div className="space-y-1.5">
                      {option.choices.map((choice: any, choiceIdx: number) => (
                        <label key={choiceIdx} className="flex justify-between items-center cursor-pointer text-xs p-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200/60 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name={`option-${option.name}`}
                              checked={selected?.value === choice.name}
                              onChange={() => handleSelectOption(option.name, choice.name, choice.priceAdjustment)}
                              className="text-[#801B2C] focus:ring-[#801B2C] h-4 w-4"
                            />
                            <span className="text-zinc-900 font-bold">{choice.name}</span>
                          </div>
                          {(() => {
                            const discInfo = getProductDiscountInfo(customizingProduct);
                            const originalOptionPrice = choice.priceAdjustment || 0;
                            const finalOptionPrice = originalOptionPrice * (1 - discInfo.percent);

                            if (originalOptionPrice === 0) {
                              return (
                                <span className="text-zinc-400 font-bold text-[10px]">
                                  {option.required && choiceIdx === 0 ? 'الأساسي' : 'مجاناً'}
                                </span>
                              );
                            }

                            return discInfo.percent > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-400 font-mono line-through text-[10px]">+{originalOptionPrice} ج.م</span>
                                <span className="text-[#801B2C] font-mono font-black">+{finalOptionPrice.toFixed(2)} ج.م</span>
                              </div>
                            ) : (
                              <span className="text-zinc-600 font-mono font-bold">+{originalOptionPrice} ج.م</span>
                            );
                          })()}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Modifiers Groups */}
              {customizingProduct.modifiers?.map((modifier: any, groupIdx: number) => (
                <div key={groupIdx} className="mb-4 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 font-body">
                  <h5 className="font-black text-xs text-zinc-900 mb-2.5">{modifier.name}</h5>
                  <div className="space-y-1.5">
                    {modifier.choices.map((choice: any, choiceIdx: number) => {
                      const isSelected = !!selectedModifiers[choice.name];
                      return (
                        <label key={choiceIdx} className="flex justify-between items-center cursor-pointer text-xs p-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200/60 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleModifier(choice.name, choice.price)}
                              className="text-[#801B2C] focus:ring-[#801B2C] h-4 w-4 rounded font-mono"
                            />
                            <span className="text-zinc-900 font-bold">{choice.name}</span>
                          </div>
                          {(() => {
                            const discInfo = getProductDiscountInfo(customizingProduct);
                            const originalModifierPrice = choice.price;
                            const finalModifierPrice = originalModifierPrice * (1 - discInfo.percent);

                            return discInfo.percent > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-400 font-mono line-through text-[10px]">+{originalModifierPrice} ج.م</span>
                                <span className="text-[#801B2C] font-mono font-black">+{finalModifierPrice.toFixed(2)} ج.م</span>
                              </div>
                            ) : (
                              choice.price > 0 ? (
                                <span className="text-zinc-600 font-mono font-bold">+{choice.price} ج.م</span>
                              ) : null
                            );
                          })()}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Customization Note */}
              <div className="mb-5 font-body">
                <label className="block text-xs font-black text-zinc-700 mb-1.5">ملاحظات مخصصة للصنف:</label>
                <input
                  type="text"
                  placeholder="مثال: زيادة صوص، بدون ثوم..."
                  value={customizingNotes}
                  onChange={(e) => setCustomizingNotes(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#801B2C] focus:ring-1 focus:ring-[#801B2C]/20 transition-colors font-bold"
                />
              </div>

              {/* Bottom Customization Add Panel */}
              <div className="flex items-center gap-3 border-t border-zinc-100 pt-4 font-body">
                <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-1">
                  <button
                    onClick={() => {
                      staffAudio.play('click');
                      setCustomizingQty(prev => Math.max(1, prev - 1));
                    }}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-zinc-200 flex items-center justify-center text-zinc-800 cursor-pointer shadow-xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-sm font-black w-8 text-center text-zinc-900">{customizingQty}</span>
                  <button
                    onClick={() => {
                      staffAudio.play('click');
                      setCustomizingQty(prev => prev + 1);
                    }}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-zinc-200 flex items-center justify-center text-zinc-800 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleConfirmCustomization}
                  className="flex-1 bg-[#801B2C] hover:bg-[#962436] text-white font-black py-3 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-[#801B2C]/20"
                >
                  إضافة {customizingQty} للطلب ({calculatedCustomTotal * customizingQty} ج.م)
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
