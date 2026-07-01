import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusCircle, XCircle, ChevronDown, ShoppingBag, Search, LayoutGrid, UtensilsCrossed, Printer, Plus, Minus, Trash2, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';
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
  defaultTableNumber
}: CreateOrderModalProps) {
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | ''>('');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState<string>('all');
  const [newOrderCart, setNewOrderCart] = useState<{ product: any; quantity: number; notes: string }[]>([]);
  const [newOrderSpecialNotes, setNewOrderSpecialNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const tableDropdownRef = useRef<HTMLDivElement>(null);

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
    if (newOrderCart.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للطلب.');
      return;
    }
    if (!restaurantId) {
      toast.error('لم يتم العثور على بيانات المطعم.');
      return;
    }

    setIsSubmitting(true);
    const totalAmount = newOrderCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

    const orderPayload = {
      restaurantId,
      tableNumber: orderType === 'takeaway' ? 0 : Number(selectedTableNumber),
      items: newOrderCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        notes: item.notes
      })),
      specialNotes: newOrderSpecialNotes,
      totalAmount,
      status: 'accepted' as const,
      type: orderType,
      paymentMethod: orderType === 'takeaway' ? paymentMethod : 'cash',
      createdAt: new Date().toISOString(),
      customerName: customerName || undefined
    };

    if (networkStatus === 'online') {
      try {
        const payload = {
          tableNumber: orderPayload.tableNumber,
          items: orderPayload.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes
          })),
          specialNotes: orderPayload.specialNotes,
          status: 'accepted',
          type: orderType,
          paymentMethod: orderType === 'takeaway' ? paymentMethod : 'cash',
          customerName: customerName || undefined
        };
        const response = await api.post('/orders', payload, {
          headers: { 'x-restaurant-id': restaurantId }
        });
        if (response.data?.success) {
          toast.success('تم إرسال الطلب بنجاح.');
          
          if (orderType === 'takeaway' && response.data.data) {
            onPrintReceipt(response.data.data);
          }

          onOrderCreated();

          // Reset fields
          setNewOrderCart([]);
          setNewOrderSpecialNotes('');
          setCustomerName('');
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
        className="bg-staff-bg-elevated border border-staff-border rounded-3xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden shadow-2xl relative"
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
          <div className="w-full md:w-[380px] border-l border-staff-border flex flex-col h-full bg-[#09090B] flex-shrink-0 text-white">
            {/* Table & Notes selection */}
            <div className="p-5 border-b border-white/5 space-y-4">
              
              {/* Order Type Toggle */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-zinc-400 font-body">نوع الطلب:</label>
                <div className="grid grid-cols-2 gap-2 bg-[#18181B] p-1 rounded-xl border border-white/5">
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
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isTableDropdownOpen ? 'rotate-180' : ''}`} />
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
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-zinc-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-staff-accent" />
                  <span>اسم الزبون (اختياري):</span>
                </label>
                <input
                  type="text"
                  placeholder="اسم الزبون للتفريق بين الطلبات..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl px-3.5 py-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 transition-all placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-zinc-400">ملاحظات عامة للطلب:</label>
                <textarea
                  placeholder="مثال: البهارات خفيفة، بدون بصل، فواتير الطاولة السابقة..."
                  value={newOrderSpecialNotes}
                  onChange={(e) => setNewOrderSpecialNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#18181B] border border-white/10 text-white text-xs rounded-xl p-3 outline-none focus:border-staff-accent focus:ring-1 focus:ring-staff-accent/50 resize-none transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-hide">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">مكونات الطلب</h4>
              {newOrderCart.length === 0 ? (
                <div className="h-full border border-dashed border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-white/[0.01] min-h-[220px]">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h5 className="text-xs font-bold text-zinc-300 mb-1">السلة فارغة</h5>
                  <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed">
                    لم يتم إضافة أصناف بعد. اختر من القائمة الجانبية للبدء.
                  </p>
                </div>
              ) : (
                newOrderCart.map((item, idx) => (
                  <div key={idx} className="bg-[#18181B] border border-white/5 rounded-xl p-3 space-y-2.5 shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h5 className="text-xs font-black text-white leading-snug">{item.product.name}</h5>
                        <span className="text-[10px] text-staff-accent font-black font-mono">{item.product.price} ج.م</span>
                      </div>
                      <button
                        onClick={() => setNewOrderCart(prev => prev.filter(i => i.product.id !== item.product.id))}
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
                            setNewOrderCart(prev => prev.map(i => 
                              i.product.id === item.product.id 
                                ? { ...i, quantity: Math.max(1, i.quantity - 1) } 
                                : i
                            ));
                          }}
                          className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center active:scale-95 transition-all text-zinc-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-black w-6 text-center text-white">{item.quantity}</span>
                        <button
                          onClick={() => {
                            setNewOrderCart(prev => prev.map(i => 
                              i.product.id === item.product.id 
                                ? { ...i, quantity: i.quantity + 1 } 
                                : i
                            ));
                          }}
                          className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center active:scale-95 transition-all text-zinc-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <input
                        type="text"
                        placeholder="إضافة ملاحظة على الوجبة..."
                        value={item.notes}
                        onChange={(e) => {
                          setNewOrderCart(prev => prev.map(i => 
                            i.product.id === item.product.id 
                              ? { ...i, notes: e.target.value } 
                              : i
                          ));
                        }}
                        className="flex-1 bg-[#09090B] border border-white/10 text-[9.5px] rounded-lg px-2.5 py-1.5 outline-none text-white placeholder:text-zinc-600 focus:border-staff-accent/50 transition-colors"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Submit Panel */}
            <div className="p-5 border-t border-white/5 bg-white/[0.01] space-y-4">
              <div className="flex justify-between items-center bg-[#09090B] border border-white/10 px-4 py-3 rounded-xl">
                <span className="text-[10px] font-black text-zinc-400">إجمالي الحساب:</span>
                <span className="font-mono text-base font-black text-staff-accent">
                  {newOrderCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)} ج.م
                </span>
              </div>

              <button
                onClick={handleCreateOrderSubmit}
                disabled={isSubmitting}
                className="w-full bg-staff-accent hover:bg-staff-accent/90 text-white font-black py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] text-xs flex items-center justify-center gap-2 cursor-pointer border border-staff-accent-glow"
              >
                {orderType === 'takeaway' ? (
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
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-stretch content-start scrollbar-hide">
              <AnimatePresence>
                {modalFilteredProducts.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center text-center py-20 text-staff-text-muted">
                    <LayoutGrid className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-xs font-bold">لا توجد أطباق مطابقة للبحث</p>
                  </div>
                ) : (
                  modalFilteredProducts.map((prod: any) => {
                    const inCart = newOrderCart.find(i => i.product.id === prod.id);
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
                            <span className="font-mono text-[13px] font-black text-staff-text-primary">
                              {prod.price} <span className="text-[9px] font-bold text-staff-text-muted">ج.م</span>
                            </span>
                            <button
                              onClick={() => {
                                if (inCart) {
                                  setNewOrderCart(prev => prev.map(i => 
                                    i.product.id === prod.id 
                                      ? { ...i, quantity: i.quantity + 1 } 
                                      : i
                                  ));
                                } else {
                                  setNewOrderCart(prev => [...prev, { product: prod, quantity: 1, notes: '' }]);
                                  toast.success(`أضيف ${prod.name}`);
                                }
                              }}
                              className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
                                inCart 
                                  ? 'bg-staff-text-primary text-white'
                                  : 'bg-staff-accent-soft hover:bg-staff-accent text-staff-accent hover:text-white border border-staff-accent-glow'
                              }`}
                            >
                              {inCart ? `مضاف (${inCart.quantity})` : 'إضافة +'}
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
    </div>,
    document.body
  );
}
