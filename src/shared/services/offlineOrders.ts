import { api } from './api';
import type { Order } from '../types';
import toast from 'react-hot-toast';

export interface OfflineOrder {
  id: string; // temporary local ID starting with 'offline_'
  restaurantId: string;
  tableNumber: number;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }[];
  specialNotes?: string;
  totalAmount: number;
  status: 'pending';
  createdAt: string;
  isOffline: boolean;
}

const STORAGE_KEY = 'tawla_offline_orders';

export const getOfflineOrders = (): OfflineOrder[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse offline orders:', e);
    return [];
  }
};

export const saveOfflineOrder = (order: OfflineOrder): void => {
  try {
    const orders = getOfflineOrders();
    orders.push(order);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Failed to save offline order:', e);
  }
};

export const removeOfflineOrder = (id: string): void => {
  try {
    const orders = getOfflineOrders();
    const filtered = orders.filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove offline order:', e);
  }
};

export const syncOfflineOrders = async (
  restaurantId: string,
  onSyncSuccess?: (tempId: string, syncedOrder: Order) => void
): Promise<boolean> => {
  const offlineOrders = getOfflineOrders();
  if (offlineOrders.length === 0) return false;

  console.log(`Starting sync for ${offlineOrders.length} offline orders...`);
  let syncedAny = false;

  for (const offlineOrder of offlineOrders) {
    try {
      const payload = {
        tableNumber: offlineOrder.tableNumber,
        items: offlineOrder.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        })),
        specialNotes: offlineOrder.specialNotes,
      };

      // Send to server
      const response = await api.post('/orders', payload, {
        headers: { 'x-restaurant-id': restaurantId },
      });

      if (response.data?.success) {
        const serverOrder = response.data.data as Order;
        removeOfflineOrder(offlineOrder.id);
        syncedAny = true;
        
        toast.success(`تم مزامنة طلب طاولة رقم ${offlineOrder.tableNumber} بنجاح!`);
        
        if (onSyncSuccess) {
          onSyncSuccess(offlineOrder.id, serverOrder);
        }
      }
    } catch (err: any) {
      console.error(`Failed to sync order ${offlineOrder.id}:`, err);
      // Stop syncing rest of the queue if connection is still flaky or server fails
      toast.error(`فشلت مزامنة طلب طاولة رقم ${offlineOrder.tableNumber}. سيتم المحاولة لاحقاً.`);
      break;
    }
  }

  return syncedAny;
};
