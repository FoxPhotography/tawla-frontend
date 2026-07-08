import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusCircle, XCircle, ChevronDown, ShoppingBag, Search, LayoutGrid, UtensilsCrossed, Printer, Plus, Minus, Trash2, User, Phone, MapPin, Gift, Trophy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../../shared/store/authStore';
import type { Table } from '../../../shared/types';

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
  orders
}: CreateOrderModalProps) {
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | ''>('');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState<string>('all');
  const [newOrderCart, setNewOrderCart] = useState<{ product: any; quantity: number; notes: string; selectedOptions?: any[]; selectedModifiers?: any[]; originalPrice?: number; calculatedPrice: number }[]>([]);
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

  const { restaurant } = useAuthStore();

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

  const isLoyaltyFeatureAllowed = () => {
    if (!systemSettings) return false;
    const allowedPlansForLoyalty = systemSettings.features?.loyalty || ['pro'];
    return allowedPlansForLoyalty.includes(plan);
  };

  const isDatabaseEnabled = isLoyaltyFeatureAllowed() && 
    (restaurant?.loyaltySettings?.mode === 'database_only' || 
     restaurant?.loyaltySettings?.mode === 'loyalty_enabled' || 
     restaurant?.loyaltySettings?.enabled === true);

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
    const rewardName = loyaltyStatus.rewardValue as string;

    const itemsList = [
      ...(orderType === 'dine_in' && activeOrderForTable ? activeOrderForTable.items.map((i: any) => ({ name: i.name, price: i.price })) : []),
      ...newOrderCart.map(i => ({ name: i.product.name, price: i.calculatedPrice }))
    ];

    if (itemsList.length === 0) return 0;

    // 1. Try to find direct name match
    const nameMatch = itemsList.find(i => 
      i.name.toLowerCase().includes(rewardName.toLowerCase()) ||
      rewardName.toLowerCase().includes(i.name.toLowerCase())
    );
    if (nameMatch) return nameMatch.price;

    // 2. Try to find drink match if reward contains "مشروب" or "مياه" or "عصير"
    const isDrinkReward = rewardName.includes('مشروب') || rewardName.includes('عصير') || rewardName.includes('شاي') || rewardName.includes('قهوة') || rewardName.includes('مياه');
    if (isDrinkReward) {
      const drinkKeywords = ['شاي', 'قهوة', 'مشروب', 'عصير', 'بيبسي', 'كولا', 'سفن', 'فانتا', 'مياه', 'سحلب', 'كابتشينو', 'لاتيه', 'نسكافيه', 'اسبريسو', 'شوكولاتة', 'ليمون', 'مانجو', 'جوافة', 'فراولة', 'نعناع', 'كركدية', 'ينسون', 'soda', 'water', 'tea', 'coffee', 'juice'];
      const drinkMatch = itemsList.find(i => 
        drinkKeywords.some(keyword => i.name.toLowerCase().includes(keyword))
      );
      if (drinkMatch) return drinkMatch.price;
    }

    // 3. Absolute fallback: Return the price of the first item in the list
    return itemsList[0].price;
  };

  const handleSearchCustomer = async (phoneStr: string) => {
    if (!phoneStr.trim()) return;
    setIsSearchingCustomer(true);
    try {
      const res = await api.get(`/customers/search?phone=${phoneStr.trim()}`);
      const data = res.data.data;
      if (data.customer) {
        setCustomerName(data.customer.name);
        setCustomerAddress(data.customer.address || '');
        toast.success(`تم العثور على العميل: ${data.customer.name}`);
      } else {
        toast.error('عميل جديد غير مسجل في قاعدة البيانات.');
      }
      setLoyaltyStatus(data.loyalty);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  useEffect(() => {
    if (customerPhone.trim().length === 11) {
      handleSearchCustomer(customerPhone);
    }
  }, [customerPhone]);

  // Customization States
  const [customizingProduct, setCustomizingProduct] = useState<any | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, { value: string; priceAdjustment: number }>>({});
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, { value: string; price: number }>>({});
  const [customizingNotes, setCustomizingNotes] = useState('');
  const [customizingQty, setCustomizingQty] = useState(1);

  // Pre-select table when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultTableNumber) {
        setSelectedTableNumber(defaultTableNumber);
        setOrderType('dine_in');
      } else {
        setSelectedTableNumber('');
        setOrderType('dine_in');
      }
    }
  }, [isOpen, defaultTableNumber]);

  // Click outside custom table select dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tableDropdownRef.current && !tableDropdownRef.current.contains(event.target as Node)) {
        setIsTableDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync customization options when dialog opens
  useEffect(() => {
    if (customizingProduct) {
      const defaultOpts: Record<string, { value: string; priceAdjustment: number }> = {};
      customizingProduct.options?.forEach((opt: any) => {
        if (opt.required && opt.choices.length > 0) {
          defaultOpts[opt.name] = {
            value: opt.choices[0].name,
            priceAdjustment: opt.choices[0].priceAdjustment,
          };
        }
      });
      setSelectedOptions(defaultOpts);
      setSelectedModifiers({});
      setCustomizingNotes('');
      setCustomizingQty(1);
    }
  }, [customizingProduct]);

  const handleSelectOption = (groupName: string, choiceName: string, priceAdjustment: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: { value: choiceName, priceAdjustment },
    }));
  };

  const handleToggleModifier = (choiceName: string, price: number) => {
    setSelectedModifiers((prev) => {
      const copy = { ...prev };
      if (copy[choiceName]) {
        delete copy[choiceName];
      } else {
        copy[choiceName] = { value: choiceName, price };
      }
      return copy;
    });
  };

  const getProductDiscountInfo = (prod: any) => {
    const plan = restaurant?.subscription?.plan || 'trial';
    const allowedPlans = systemSettings?.features?.customDiscounts || ['pro'];
    const isDiscountAllowed = allowedPlans.includes(plan);

    if (!isDiscountAllowed || !restaurant || !restaurant.settings?.discountConfig) {
      return { discountActive: false, price: prod.price, originalPrice: prod.price, percent: 0 };
    }

    const config = restaurant.settings.discountConfig;
    if (!config.enabled) {
      return { discountActive: false, price: prod.price, originalPrice: prod.price, percent: 0 };
    }

    // 1. Verify schedule
    const now = new Date();
    if (config.scheduleType === 'weekly') {
      const weekdayStr = new Intl.DateTimeFormat('en-US', {
        timeZone: restaurant.settings.timezone || 'Africa/Cairo',
        weekday: 'long',
      }).format(now);

      const weekdayMap: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6,
      };

      const cairoDay = weekdayMap[weekdayStr];
      if (config.daysOfWeek === undefined || !config.daysOfWeek.includes(cairoDay)) {
        return { discountActive: false, price: prod.price, originalPrice: prod.price, percent: 0 };
      }
    } else if (config.scheduleType === 'custom_range') {
      const currentTime = now.getTime();
      if (config.startDate) {
        const start = new Date(config.startDate).getTime();
        if (currentTime < start) return { discountActive: false, price: prod.price, originalPrice: prod.price, percent: 0 };
      }
      if (config.endDate) {
        const end = new Date(config.endDate).getTime();
        if (currentTime > end) return { discountActive: false, price: prod.price, originalPrice: prod.price, percent: 0 };
      }
    }

    // 2. Verify scope
    let applies = false;
    if (config.discountType === 'all') {
      applies = true;
    } else if (config.discountType === 'categories') {
      if (prod.categoryId && config.targetIds?.includes(prod.categoryId)) {
        applies = true;
      }
    } else if (config.discountType === 'products') {
      if (prod.id && config.targetIds?.includes(prod.id)) {
        applies = true;
      }
    }

    if (!applies) {
      return { discountActive: false, price: prod.price, originalPrice: prod.price, percent: 0 };
    }

    // 3. Calculate discount
    let discountAmount = 0;
    if (config.valueType === 'percentage') {
      discountAmount = prod.price * (config.value / 100);
    } else if (config.valueType === 'fixed') {
      discountAmount = config.value;
    }

    discountAmount = Math.max(0, Math.min(prod.price, discountAmount));
    const finalPrice = Math.max(0, prod.price - discountAmount);
    const percent = prod.price > 0 ? (discountAmount / prod.price) : 0;

    return {
      discountActive: discountAmount > 0,
      price: Number(finalPrice.toFixed(2)),
      originalPrice: prod.price,
      percent,
    };
  };

  const calculatedCustomTotal = useMemo(() => {
    if (!customizingProduct) return 0;
    
    const discInfo = getProductDiscountInfo(customizingProduct);
    
    const selectedOptionValues = Object.values(selectedOptions);
    const baseOriginalPrice = selectedOptionValues.length > 0 
      ? selectedOptionValues[0].priceAdjustment 
      : customizingProduct.price;

    const modsOriginalPrice = Object.values(selectedModifiers).reduce((sum, m) => sum + m.price, 0);
    const originalTotal = baseOriginalPrice + modsOriginalPrice;
    
    return originalTotal * (1 - discInfo.percent);
  }, [customizingProduct, selectedOptions, selectedModifiers, restaurant, systemSettings]);

  const addToCart = (
    product: any,
    quantity = 1,
    notes = '',
    selectedOptions?: { name: string; value: string; priceAdjustment: number }[],
    selectedModifiers?: { name: string; value: string; price: number }[]
  ) => {
    const discInfo = getProductDiscountInfo(product);

    const selectedOptionValues = selectedOptions || [];
    const baseOriginalPrice = selectedOptionValues.length > 0 
      ? selectedOptionValues[0].priceAdjustment 
      : product.price;

    const modsOriginalPrice = (selectedModifiers || []).reduce((sum, m) => sum + m.price, 0);
    const originalTotal = baseOriginalPrice + modsOriginalPrice;
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
    toast.success(`أضيف ${product.name}`);
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

  const handleProductClick = (product: any) => {
    const isCustom = (product.options && product.options.length > 0) || (product.modifiers && product.modifiers.length > 0);
    if (isCustom) {
      setCustomizingProduct(product);
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
        if (response.data?.success) {
          toast.success('تم إرسال الطلب بنجاح.');
          
          if ((orderType === 'takeaway' || orderType === 'delivery') && response.data.data) {
            onPrintReceipt(response.data.data);
          }

          onOrderCreated();

          // Reset fields
          setNewOrderCart([]);
          setNewOrderSpecialNotes('');
          setCustomerName('');
          setCustomerPhone('');
          setCustomerAddress('');
          setDiscountAmount(0);
          setLoyaltyStatus(null);
          setRedeemLoyalty(false);
          setSelectedTableNumber('');
          setOrderType('dine_in');
          setPaymentMethod('cash');
          onClose();
        }
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'فشل إرسال الطلب للسيرفر.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Offline fallback
      const tempId = `offline_${Date.now()}`;
      const tempOrder = {
        ...orderPayload,
        id: tempId,
        isOffline: true
      };
      
      try {
        const list = localStorage.getItem('tawla_offline_orders');
        const offlineOrders = list ? JSON.parse(list) : [];
        offlineOrders.push(tempOrder);
        localStorage.setItem('tawla_offline_orders', JSON.stringify(offlineOrders));

        if (orderType === 'dine_in') {
          updateLocalTableStatus(Number(selectedTableNumber), 'occupied', tempId);
          toast.success('تم حفظ الطلب محلياً بنجاح.');
        } else {
          toast.success('تم حفظ الطلب محلياً وجاري طباعة الفاتورة.');
          onPrintReceipt(tempOrder);
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
    <div className="fixed inset-0 bg-[#09090B]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 no-print" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 28 } }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-staff-bg-elevated border border-staff-border rounded-3xl w-full max-w-[94vw] 2xl:max-w-[1400px] h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-staff-border bg-staff-bg-elevated flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-staff-accent-soft flex items-center justify-center text-staff-accent border border-staff-accent-glow">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base text-staff-text-primary">إنشاء طلب جديد (ويتر)</h2>
              <p className="text-[10px] text-staff-text-muted font-bold">تسجيل الوجبات وتأكيد الطاولات والمطبخ</p>
            </div>
          </div>
          <button 
            onClick={() => {
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
            className="w-8 h-8 rounded-full hover:bg-red-500/10 text-staff-text-muted hover:text-red-500 flex items-center justify-center transition-all cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Column: Cart & Table details (40%) - Dark obsidian layout */}
          <div className="w-full md:w-[380px] border-l border-staff-border flex flex-col h-full bg-[#09090B] flex-shrink-0 text-white overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            {/* Table & Notes selection */}
            <div className="p-5 border-b border-white/5 space-y-4">
              
              {/* Order Type Toggle */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-zinc-400 font-body">نوع الطلب:</label>
                <div className={`grid ${isDeliveryEnabled ? 'grid-cols-3' : 'grid-cols-2'} gap-2 bg-[#18181B] p-1 rounded-xl border border-white/5`}>
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer font-body ${
                      orderType === 'dine_in'
                        ? 'bg-staff-accent text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    صالة (طاولة)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('takeaway');
                      setSelectedTableNumber('');
                    }}
                    className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer font-body ${
                      orderType === 'takeaway'
                        ? 'bg-staff-accent text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    تيك أواي سفري
                  </button>
                  {isDeliveryEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderType('delivery');
                        setSelectedTableNumber('');
                      }}
                      className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer font-body ${
                        orderType === 'delivery'
                          ? 'bg-staff-accent text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
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
                  <label className="block text-[10px] font-black text-zinc-400 font-body">اختر رقم الطاولة:</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTableDropdownOpen(prev => !prev)}
                      className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl pr-3.5 pl-4 py-3.5 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 font-black transition-all text-right flex justify-between items-center cursor-pointer font-body"
                    >
                      <span className="truncate">
                        {selectedTableNumber 
                          ? `طاولة ${selectedTableNumber} (${
                              tables.find((t: Table) => t.number === selectedTableNumber)?.status === 'occupied' 
                                ? 'مشغولة' 
                                : tables.find((t: Table) => t.number === selectedTableNumber)?.status === 'waitingBill' 
                                ? 'تطلب الحساب' 
                                : 'متاحة'
                            })` 
                          : '-- اختر رقم الطاولة --'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-205 ${isTableDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isTableDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute right-0 left-0 mt-2 bg-[#18181B] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-hide text-zinc-200 font-body"
                        >
                          <div className="p-1.5 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTableNumber('');
                                setIsTableDropdownOpen(false);
                              }}
                              className="w-full text-right px-3 py-2 text-xs text-zinc-500 hover:bg-white/5 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                              -- اختر رقم الطاولة --
                            </button>
                            {tables.map((t: Table) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTableNumber(t.number);
                                  setIsTableDropdownOpen(false);
                                }}
                                className={`w-full text-right px-3 py-2.5 text-xs rounded-lg transition-colors flex justify-between items-center cursor-pointer ${
                                  selectedTableNumber === t.number
                                    ? 'bg-staff-accent text-white font-black shadow-md'
                                    : 'text-zinc-200 hover:bg-white/5'
                                }`}
                              >
                                <span className="font-bold">طاولة {t.number}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                                  t.status === 'occupied' 
                                    ? 'bg-white/10 text-zinc-300' 
                                    : t.status === 'waitingBill' 
                                    ? 'bg-staff-accent/20 text-staff-accent animate-pulse' 
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {t.status === 'occupied' ? 'مشغولة' : t.status === 'waitingBill' ? 'طلب حساب' : 'متاحة'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-zinc-400 font-body">طريقة الدفع (دفع فوري):</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-[#18181B] p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer font-body border ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm font-bold'
                          : 'text-zinc-400 hover:text-white border-transparent'
                      }`}
                    >
                      نقدي
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer font-body border ${
                        paymentMethod === 'card'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm font-bold'
                          : 'text-zinc-400 hover:text-white border-transparent'
                      }`}
                    >
                      فيزا
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      className={`py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer font-body border ${
                        paymentMethod === 'wallet'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm font-bold'
                          : 'text-zinc-400 hover:text-white border-transparent'
                      }`}
                    >
                      محفظة
                    </button>
                  </div>
                </div>
              )}

              {/* Customer Phone Search & Name details (For dine_in, takeaway & delivery) */}
              {isDatabaseEnabled ? (
                <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                  {/* Phone input with search */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-zinc-400 flex items-center gap-1 font-body">
                      <Phone className="w-3.5 h-3.5 text-staff-accent" />
                      <span>رقم الهاتف (للبحث أو التسجيل):</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="tel"
                          placeholder="مثال: 01012345678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl pr-3.5 pl-4 py-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 transition-all font-mono text-left font-bold"
                          dir="ltr"
                        />
                        {isSearchingCustomer && (
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-staff-accent border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSearchCustomer(customerPhone)}
                        disabled={!customerPhone.trim()}
                        className="px-3 bg-staff-accent text-white rounded-xl text-xs font-bold hover:bg-staff-accent/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center font-body"
                      >
                        بحث
                      </button>
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-zinc-400 flex items-center gap-1 font-body">
                      <User className="w-3.5 h-3.5 text-staff-accent" />
                      <span>اسم العميل:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="اسم العميل الكامل..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl px-3.5 py-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 transition-all placeholder:text-zinc-650 font-body font-bold"
                    />
                  </div>

                  {/* Delivery Address */}
                  {(orderType === 'delivery' || customerPhone) && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-zinc-400 flex items-center gap-1 font-body">
                        <MapPin className="w-3.5 h-3.5 text-staff-accent" />
                        <span>عنوان التوصيل بالتفصيل:</span>
                      </label>
                      <input
                        type="text"
                        placeholder="المنطقة، الشارع، البناية، رقم الشقة..."
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl px-3.5 py-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 transition-all placeholder:text-zinc-650 font-body font-bold"
                      />
                    </div>
                  )}

                  {/* Loyalty Progress Card */}
                  {loyaltyStatus && loyaltyStatus.enabled && (
                    <div className="bg-[#09090B] border border-white/10 rounded-xl p-3 space-y-2 text-right font-body">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5 text-amber-500" />
                          <span>نظام الهدايا والمكافآت</span>
                        </span>
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-black">
                          {loyaltyStatus.progress} / {loyaltyStatus.target} طلبات
                        </span>
                      </div>

                      {loyaltyStatus.isEligible ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 space-y-2">
                          <p className="text-[10px] text-emerald-400 font-black leading-relaxed flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            <span>مؤهل للحصول على مكافأة: {loyaltyStatus.rewardType === 'discount' ? `خصم ${loyaltyStatus.rewardValue}%` : loyaltyStatus.rewardValue}!</span>
                          </p>
                          {loyaltyStatus.rewardType === 'discount' ? (
                            redeemLoyalty ? (
                              <div className="flex flex-col gap-2">
                                <div className="text-[9px] text-emerald-400 font-bold bg-[#18181B] border border-emerald-500/20 px-3 py-2 rounded-xl text-center leading-relaxed">
                                  تم تطبيق خصم الهدايا بنجاح وسوف يتم استهلاك المكافأة عند إتمام الطلب.
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDiscountAmount(0);
                                    setRedeemLoyalty(false);
                                    toast.success('تم إلغاء تطبيق مكافأة الهدايا');
                                  }}
                                  className="w-full py-2 bg-[#18181B] hover:bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl text-[9px] font-bold transition-all cursor-pointer active:scale-[0.98]"
                                >
                                  إلغاء المكافأة
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const subTotal = getInitialInvoiceSubtotal();
                                  const disc = Math.round(subTotal * (Number(loyaltyStatus.rewardValue) / 100));
                                  setDiscountAmount(disc);
                                  setRedeemLoyalty(true);
                                  toast.success(`تم تطبيق خصم الهدايا: ${disc} ج.م`);
                                }}
                                className="w-full py-2 bg-[#18181B] hover:bg-[#27272A] text-staff-accent border border-staff-accent/25 hover:border-staff-accent/50 rounded-xl text-[10px] font-black transition-all cursor-pointer select-none active:scale-[0.98]"
                              >
                                تطبيق الخصم المستحق
                              </button>
                            )
                          ) : (
                            redeemLoyalty ? (
                              <div className="flex flex-col gap-2">
                                <div className="text-[9px] text-emerald-400 font-bold bg-[#18181B] border border-emerald-500/20 px-3 py-2 rounded-xl text-center leading-relaxed">
                                  تم تحديد تسليم الهدية ({loyaltyStatus.rewardValue}) وسيتم تصفير النقاط عند إتمام الطلب.
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDiscountAmount(0);
                                    setRedeemLoyalty(false);
                                    toast.success('تم إلغاء استهلاك المكافأة');
                                  }}
                                  className="w-full py-2 bg-[#18181B] hover:bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl text-[9px] font-bold transition-all cursor-pointer active:scale-[0.98]"
                                >
                                  إلغاء المكافأة
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const freeItemPrice = findFreeProductPrice();
                                  setDiscountAmount(freeItemPrice);
                                  setRedeemLoyalty(true);
                                  toast.success(`تم تطبيق الهدية المجانية (${loyaltyStatus.rewardValue}) بقيمة: ${freeItemPrice} ج.م`);
                                }}
                                className="w-full py-2 bg-[#18181B] hover:bg-[#27272A] text-staff-accent border border-staff-accent/25 hover:border-staff-accent/50 rounded-xl text-[10px] font-black transition-all cursor-pointer select-none active:scale-[0.98]"
                              >
                                تأكيد تسليم الهدية المجانية للعميل
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="w-full bg-[#18181B] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${(loyaltyStatus.progress / loyaltyStatus.target) * 100}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-zinc-500 font-bold">
                            متبقي له {loyaltyStatus.target - loyaltyStatus.progress} طلبات للحصول على مكافأة {loyaltyStatus.rewardType === 'discount' ? `خصم ${loyaltyStatus.rewardValue}%` : loyaltyStatus.rewardValue}.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                orderType === 'delivery' && (
                  <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-zinc-400 flex items-center gap-1 font-body">
                        <Phone className="w-3.5 h-3.5 text-staff-accent" />
                        <span>رقم هاتف العميل:</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="مثال: 01012345678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl pr-3.5 pl-4 py-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 transition-all font-mono text-left font-bold"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-zinc-400 flex items-center gap-1 font-body">
                        <User className="w-3.5 h-3.5 text-staff-accent" />
                        <span>اسم العميل:</span>
                      </label>
                      <input
                        type="text"
                        placeholder="اسم العميل الكامل..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl px-3.5 py-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 transition-all placeholder:text-zinc-650 font-body font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-zinc-400 flex items-center gap-1 font-body">
                        <MapPin className="w-3.5 h-3.5 text-staff-accent" />
                        <span>عنوان التوصيل بالتفصيل:</span>
                      </label>
                      <input
                        type="text"
                        placeholder="المنطقة، الشارع، البناية، رقم الشقة..."
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl px-3.5 py-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 transition-all placeholder:text-zinc-650 font-body font-bold"
                      />
                    </div>
                  </div>
                )
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-zinc-400 font-body">ملاحظات عامة للطلب:</label>
                <textarea
                  placeholder="مثال: البهارات خفيفة، بدون بصل، فواتير الطاولة السابقة..."
                  value={newOrderSpecialNotes}
                  onChange={(e) => setNewOrderSpecialNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl p-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 resize-none transition-all placeholder:text-zinc-600 font-body font-bold"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-5 space-y-3 bg-black/5">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 font-body">مكونات الطلب</h4>
              {newOrderCart.length === 0 ? (
                <div className="h-full border border-dashed border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-white/[0.01] min-h-[220px]">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h5 className="text-xs font-bold text-zinc-300 mb-1 font-body">السلة فارغة</h5>
                  <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed font-body">
                    لم يتم إضافة أصناف بعد. اختر من القائمة الجانبية للبدء.
                  </p>
                </div>
              ) : (
                newOrderCart.map((item, idx) => (
                  <div key={idx} className="bg-[#18181B] border border-white/5 rounded-xl p-3 space-y-2.5 shadow-sm text-right font-body">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h5 className="text-xs font-black text-white leading-snug">{item.product.name}</h5>
                        {item.originalPrice && item.originalPrice > item.calculatedPrice ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-staff-accent font-black font-mono">{item.calculatedPrice} ج.م</span>
                            <span className="text-[9px] line-through text-zinc-500 font-mono">{item.originalPrice} ج.م</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-staff-accent font-black font-mono">{item.calculatedPrice} ج.م</span>
                        )}
                        
                        {/* Options & Modifiers display */}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="text-[9px] text-zinc-400 font-bold mt-1">
                            {item.selectedOptions.map((o: any) => `${o.name}: ${o.value}`).join(' | ')}
                          </div>
                        )}
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="text-[9px] text-zinc-400 font-bold mt-0.5">
                            الإضافات: {item.selectedModifiers.map((m: any) => m.value).join(', ')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setNewOrderCart(prev => prev.filter((_, i) => i !== idx))}
                        className="w-6 h-6 rounded-md hover:bg-red-500/15 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    {/* Quantity and Notes */}
                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5">
                      <div className="flex items-center bg-[#09090B] border border-white/10 rounded-lg p-0.5">
                        <button
                          onClick={() => {
                            setNewOrderCart(prev => prev.map((i, index) => 
                              index === idx 
                                ? { ...i, quantity: Math.max(1, i.quantity - 1) } 
                                : i
                            ));
                          }}
                          className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center active:scale-95 transition-all text-zinc-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-black w-6 text-center text-white">{item.quantity}</span>
                        <button
                          onClick={() => {
                            setNewOrderCart(prev => prev.map((i, index) => 
                              index === idx 
                                ? { ...i, quantity: i.quantity + 1 } 
                                : i
                            ));
                          }}
                          className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center active:scale-95 transition-all text-zinc-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <input
                        type="text"
                        placeholder="إضافة ملاحظة على الوجبة..."
                        value={item.notes}
                        onChange={(e) => {
                          setNewOrderCart(prev => prev.map((i, index) => 
                            index === idx 
                              ? { ...i, notes: e.target.value } 
                              : i
                          ));
                        }}
                        className="flex-1 bg-[#09090B] border border-white/10 text-[9.5px] rounded-lg px-2.5 py-1.5 outline-none text-white placeholder:text-zinc-650 focus:border-staff-accent/50 transition-colors font-bold"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Submit Panel */}
            <div className="p-5 border-t border-white/5 bg-white/[0.01] space-y-3 flex-shrink-0">
              <div className="space-y-2">
                {/* Custom Discount Input */}
                <div className="flex justify-between items-center bg-[#09090B]/50 border border-white/10 px-4 py-2 rounded-xl text-zinc-400 text-[10px] font-body font-bold">
                  <span>تطبيق خصم مخصص:</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setDiscountAmount(prev => Math.max(0, prev - 1))}
                      className="w-4 h-4 bg-[#18181B] hover:bg-[#27272A] border border-white/5 text-zinc-400 hover:text-white flex items-center justify-center rounded transition-colors cursor-pointer select-none active:scale-95"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="w-10 bg-transparent border-none text-center font-mono text-[10px] font-bold text-white focus:outline-none focus:ring-0 placeholder:text-zinc-700 p-0 h-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setDiscountAmount(prev => prev + 1)}
                      className="w-4 h-4 bg-[#18181B] hover:bg-[#27272A] border border-white/5 text-zinc-400 hover:text-white flex items-center justify-center rounded transition-colors cursor-pointer select-none active:scale-95"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                    <span className="font-mono text-zinc-400 text-[10px] mr-0.5">ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-[#09090B]/50 border border-white/10 px-4 py-2 rounded-xl text-zinc-400 text-[10px] font-body font-bold">
                  <span>قيمة الطلبات:</span>
                  <span className="font-mono">{newOrderCart.reduce((acc, item) => acc + item.calculatedPrice * item.quantity, 0)} ج.م</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center bg-red-500/5 border border-red-500/25 px-4 py-2 rounded-xl text-red-400 text-[10px] font-body font-bold">
                    <span>الخصم المطبق:</span>
                    <span className="font-mono">-{discountAmount} ج.م</span>
                  </div>
                )}

                <div className="flex justify-between items-center bg-[#09090B] border border-white/10 px-4 py-3 rounded-xl font-body font-bold">
                  <span className="text-[10px] font-black text-zinc-400">المبلغ النهائي للدفع:</span>
                  <span className="font-mono text-base font-black text-staff-accent">
                    {Math.max(0, newOrderCart.reduce((acc, item) => acc + item.calculatedPrice * item.quantity, 0) - discountAmount)} ج.م
                  </span>
                </div>
              </div>

              <button
                onClick={handleCreateOrderSubmit}
                disabled={isSubmitting}
                className="w-full bg-staff-accent hover:bg-staff-accent/90 text-white font-black py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] text-xs flex items-center justify-center gap-2 cursor-pointer border border-staff-accent-glow"
              >
                {orderType === 'takeaway' || orderType === 'delivery' ? (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري التأكيد والطباعة...' : 'تأكيد وطباعة الطلب'}</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Menu catalog & Categories (60%) - White Premium layout */}
          <div className="flex-1 flex flex-col overflow-hidden bg-staff-bg-base">
            
            {/* Search Bar */}
            <div className="p-5 border-b border-staff-border flex items-center gap-2 bg-staff-bg-elevated">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-staff-text-muted" />
                <input
                  type="text"
                  placeholder="ابحث في المنيو عن وجبة، مشروب، أو صنف..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full bg-staff-bg-base border border-staff-border text-staff-text-primary text-xs rounded-xl pr-10 pl-4 py-3.5 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/30 font-black transition-all placeholder:text-staff-text-muted"
                />
              </div>
            </div>

            {/* Categories Scrollbar */}
            <div className="flex gap-2.5 overflow-x-auto p-5 border-b border-staff-border/80 scrollbar-hide flex-shrink-0 bg-staff-bg-elevated">
              <button
                onClick={() => setMenuSelectedCategory('all')}
                className={`py-2 px-5 rounded-full text-xs font-black transition-all border whitespace-nowrap cursor-pointer ${
                  menuSelectedCategory === 'all'
                    ? 'bg-staff-text-primary text-white border-staff-text-primary'
                    : 'bg-staff-bg-base text-staff-text-secondary border-staff-border hover:border-staff-text-muted'
                }`}
              >
                الكل
              </button>
              {(menuData?.categories || []).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setMenuSelectedCategory(cat.id)}
                  className={`py-2 px-5 rounded-full text-xs font-black transition-all border whitespace-nowrap cursor-pointer ${
                    menuSelectedCategory === cat.id
                      ? 'bg-staff-text-primary text-white border-staff-text-primary'
                      : 'bg-staff-bg-base text-staff-text-secondary border-staff-border hover:border-staff-text-muted'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Product Grid Area */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-stretch content-start scrollbar-hide">
              <AnimatePresence>
                {modalFilteredProducts.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center text-center py-20 text-staff-text-muted">
                    <LayoutGrid className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-xs font-bold">لا توجد أطباق مطابقة للبحث</p>
                  </div>
                ) : (
                  modalFilteredProducts.map((prod: any) => {
                    const qtyInCart = newOrderCart
                      .filter((item) => item.product.id === prod.id)
                      .reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <div key={prod.id} className="flex h-full">
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          className="w-full bg-staff-bg-elevated border border-staff-border rounded-xl p-2.5 flex flex-col justify-between hover:border-staff-accent/40 transition-all group overflow-hidden shadow-sm hover:shadow-md"
                        >
                          <div className="flex flex-col gap-1.5">
                            {prod.image?.url ? (
                              <div className="w-full aspect-square relative rounded-lg overflow-hidden mb-1.5 border border-staff-border bg-staff-bg-panel">
                                <img
                                  src={prod.image.url}
                                  alt={prod.name}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            ) : (
                              <div className="w-full aspect-square relative rounded-lg bg-staff-bg-panel border border-staff-border flex items-center justify-center text-staff-text-muted mb-1.5">
                                <UtensilsCrossed className="w-6 h-6 opacity-30 absolute" />
                              </div>
                              )}
                            <div className="px-0.5">
                              <h5 className="text-[14px] font-extrabold text-staff-text-primary leading-snug line-clamp-2 group-hover:text-staff-accent transition-colors font-cairo">{prod.name}</h5>
                              {prod.description ? (
                                <p className="text-[9.5px] text-staff-text-secondary leading-tight mt-0.5 line-clamp-1">{prod.description}</p>
                              ) : (
                                <p className="text-[9.5px] text-staff-text-muted italic leading-tight mt-0.5">لا يوجد وصف إضافي</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-staff-border/60 px-0.5">
                            {(() => {
                              const disc = getProductDiscountInfo(prod);
                              return disc.discountActive ? (
                                <div className="flex flex-col text-right">
                                  <span className="font-mono text-[13px] font-black text-staff-accent leading-none">
                                    {disc.price} <span className="text-[8px] font-bold">ج.م</span>
                                  </span>
                                  <span className="font-mono text-[9px] line-through text-zinc-500 mt-0.5 leading-none">
                                    {disc.originalPrice} ج.م
                                  </span>
                                </div>
                              ) : (
                                <span className="font-mono text-[13px] font-black text-staff-text-primary">
                                  {prod.price} <span className="text-[9px] font-bold text-staff-text-muted">ج.م</span>
                                </span>
                              );
                            })()}
                            <button
                              onClick={() => handleProductClick(prod)}
                              className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
                                qtyInCart > 0 
                                  ? 'bg-staff-text-primary text-white'
                                  : 'bg-staff-accent-soft hover:bg-staff-accent text-staff-accent hover:text-white border border-staff-accent-glow'
                              }`}
                            >
                              {qtyInCart > 0 ? `مضاف (${qtyInCart})` : 'إضافة +'}
                            </button>
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

      {/* ===== Product Customization Dialog ===== */}
      <AnimatePresence>
        {customizingProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingProduct(null)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-[#18181B] border-t border-white/10 rounded-t-3xl z-50 p-6 shadow-xl text-right max-w-[430px] mx-auto max-h-[85vh] overflow-y-auto text-white"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                <h3 className="font-extrabold text-white text-base">تخصيص الصنف</h3>
                <button
                  onClick={() => setCustomizingProduct(null)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 flex items-center gap-3">
                {customizingProduct.image?.url && (
                  <img src={customizingProduct.image.url} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/5" />
                )}
                <div>
                  <h4 className="font-bold text-white text-sm">{customizingProduct.name}</h4>
                  <p className="text-xs text-zinc-400 mt-1">{customizingProduct.description || 'اختر إضافات وتفاصيل طلبك'}</p>
                </div>
              </div>

              {/* Options Groups */}
              {customizingProduct.options?.map((option: any, groupIdx: number) => {
                const selected = selectedOptions[option.name];
                return (
                  <div key={groupIdx} className="mb-5 bg-[#09090B] p-3 rounded-2xl border border-white/5">
                    <h5 className="font-bold text-xs text-white mb-3 flex justify-between">
                      <span>{option.name}</span>
                      {option.required && (
                        <span className="text-[10px] bg-staff-accent/15 text-staff-accent px-1.5 py-0.5 rounded font-extrabold">مطلوب</span>
                      )}
                    </h5>
                    <div className="space-y-2">
                      {option.choices.map((choice: any, choiceIdx: number) => (
                        <label key={choiceIdx} className="flex justify-between items-center cursor-pointer text-xs p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`option-${option.name}`}
                              checked={selected?.value === choice.name}
                              onChange={() => handleSelectOption(option.name, choice.name, choice.priceAdjustment)}
                              className="text-staff-accent focus:ring-staff-accent h-4 w-4"
                            />
                            <span className="text-white font-bold">{choice.name}</span>
                          </div>
                          {(() => {
                            const discInfo = getProductDiscountInfo(customizingProduct);
                            const originalOptionPrice = choice.priceAdjustment;
                            const finalOptionPrice = originalOptionPrice * (1 - discInfo.percent);

                            return discInfo.percent > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-500 font-mono line-through text-[9px]">{originalOptionPrice} ج.م</span>
                                <span className="text-staff-accent font-mono font-bold">{finalOptionPrice.toFixed(2)} ج.م</span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 font-mono">{originalOptionPrice} ج.م</span>
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
                <div key={groupIdx} className="mb-5 bg-[#09090B] p-3 rounded-2xl border border-white/5">
                  <h5 className="font-bold text-xs text-white mb-3">{modifier.name}</h5>
                  <div className="space-y-2">
                    {modifier.choices.map((choice: any, choiceIdx: number) => {
                      const isSelected = !!selectedModifiers[choice.name];
                      return (
                        <label key={choiceIdx} className="flex justify-between items-center cursor-pointer text-xs p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleModifier(choice.name, choice.price)}
                              className="text-staff-accent focus:ring-staff-accent h-4 w-4 rounded font-mono"
                            />
                            <span className="text-white font-bold">{choice.name}</span>
                          </div>
                          {(() => {
                            const discInfo = getProductDiscountInfo(customizingProduct);
                            const originalModifierPrice = choice.price;
                            const finalModifierPrice = originalModifierPrice * (1 - discInfo.percent);

                            return discInfo.percent > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-500 font-mono line-through text-[9px] font-bold">+{originalModifierPrice} ج.م</span>
                                <span className="text-staff-accent font-mono font-extrabold">+{finalModifierPrice.toFixed(2)} ج.م</span>
                              </div>
                            ) : (
                              choice.price > 0 ? (
                                <span className="text-zinc-400 font-mono">+{choice.price} ج.م</span>
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
              <div className="mb-6">
                <label className="block text-xs font-bold text-zinc-400 mb-2">ملاحظات الصنف:</label>
                <input
                  type="text"
                  placeholder="مثال: زيادة صوص، بدون ثوم..."
                  value={customizingNotes}
                  onChange={(e) => setCustomizingNotes(e.target.value)}
                  className="w-full bg-[#09090B] border border-white/10 text-white text-xs rounded-xl px-3.5 py-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 transition-colors"
                />
              </div>

              {/* Bottom Customization Add Panel */}
              <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                <div className="flex items-center bg-[#09090B] border border-white/10 rounded-xl p-1">
                  <button
                    onClick={() => setCustomizingQty(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-sm font-black w-8 text-center text-white">{customizingQty}</span>
                  <button
                    onClick={() => setCustomizingQty(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleConfirmCustomization}
                  className="flex-1 bg-staff-accent text-white font-black py-3 rounded-xl hover:opacity-95 transition-opacity text-xs"
                >
                  إضافة {customizingQty} للطلب ({calculatedCustomTotal * customizingQty} ج.م)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
