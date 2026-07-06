export interface Restaurant {
  id?: string;
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  logo?: {
    url: string;
    publicId: string;
  };
  subscription: {
    plan: 'trial' | 'basic' | 'pro';
    status: 'active' | 'inactive' | 'expired';
    expiresAt: string;
  };
  settings: {
    currency: string;
    language: 'ar' | 'en';
    timezone: string;
    menuTitle?: string;
    menuDescription?: string;
    isDeliveryEnabled?: boolean;
  };
  receiptSettings?: {
    showLogo: boolean;
    phone?: string;
    whatsapp?: string;
    address?: string;
    taxNumber?: string;
    taxRate: number;
    serviceRate: number;
    headerText?: string;
    footerText?: string;
  };
  loyaltySettings?: {
    enabled: boolean;
    targetOrderCount: number;
    rewardType: 'free_product' | 'discount';
    rewardProductName?: string;
    rewardDiscountPercent?: number;
  };
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  image?: {
    url: string;
    publicId: string;
  };
  order: number;
  isActive: boolean;
  delayLimit?: number;
}

export interface ProductOption {
  name: string;
  required: boolean;
  choices: {
    name: string;
    priceAdjustment: number;
  }[];
}

export interface ProductModifier {
  name: string;
  choices: {
    name: string;
    price: number;
  }[];
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  image?: {
    url: string;
    publicId: string;
  };
  isAvailable: boolean;
  order: number;
  options?: ProductOption[];
  modifiers?: ProductModifier[];
}

export interface Table {
  id: string;
  restaurantId: string;
  number: number;
  label?: string;
  qrCode: {
    url: string;
    generatedAt: string;
  };
  status: 'empty' | 'occupied' | 'waitingBill';
  currentOrderId?: string | null;
}

export interface SelectedOption {
  name: string;
  value: string;
  priceAdjustment: number;
}

export interface SelectedModifier {
  name: string;
  value: string;
  price: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  selectedOptions?: SelectedOption[];
  selectedModifiers?: SelectedModifier[];
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId?: string;
  tableNumber: number;
  type?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMethod?: 'cash' | 'card' | 'wallet';
  items: OrderItem[];
  totalAmount: number;
  discountAmount?: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  specialNotes?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  restaurantId?: string;
  name: string;
  username: string;
  role: 'super_admin' | 'admin' | 'cashier' | 'waiter';
  isActive: boolean;
}

export interface SerialKey {
  id: string;
  key: string;
  plan: 'trial' | 'basic' | 'pro';
  durationDays: number;
  isUsed: boolean;
  usedByRestaurantId?: string;
  usedByRestaurantName?: string;
  usedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id?: string;
  pricing: {
    basic: number;
    pro: number;
  };
  offer: {
    active: boolean;
    title: string;
    basicPrice: number;
    proPrice: number;
    endsAt?: string;
  };
  limits: {
    trial: number;
    basic: number;
    pro: number;
    tables?: { trial: number; basic: number; pro: number };
    products?: { trial: number; basic: number; pro: number };
    categories?: { trial: number; basic: number; pro: number };
  };
  features?: {
    analytics?: ('trial' | 'basic' | 'pro')[];
    audit?: ('trial' | 'basic' | 'pro')[];
    delivery?: ('trial' | 'basic' | 'pro')[];
  };
}
