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
  };
  receiptSettings?: {
    showLogo: boolean;
    phone?: string;
    address?: string;
    taxNumber?: string;
    taxRate: number;
    serviceRate: number;
    headerText?: string;
    footerText?: string;
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
  currentOrderId?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  specialNotes?: string;
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
