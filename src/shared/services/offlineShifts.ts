import { api } from './api';
import toast from 'react-hot-toast';

export interface OfflineShift {
  id: string;
  _id?: string;
  restaurantId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  status: 'open' | 'closed';
  startingCash: number;
  actualEndingCash?: number;
  expectedEndingCash?: number;
  cashHandedToManager?: number;
  carriedOverCash?: number;
  variance?: number;
  totalCashSales: number;
  totalCardSales: number;
  totalWalletSales: number;
  totalOrdersCount: number;
  notes?: string;
  isOffline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftLiveStats {
  totalOrdersCount: number;
  totalCashSales: number;
  totalCardSales: number;
  totalWalletSales: number;
  expectedEndingCash: number;
  totalSales: number;
}

const ACTIVE_SHIFT_KEY = 'tawla_active_shift';
const SHIFTS_QUEUE_KEY = 'tawla_offline_shifts_queue';
const LAST_CARRIED_CASH_KEY = 'tawla_last_carried_cash';

export const getLocalActiveShift = (): OfflineShift | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
    if (!raw) return null;
    const shift = JSON.parse(raw);
    if (shift && shift.status === 'open') {
      return shift;
    }
    return null;
  } catch (e) {
    console.error('Failed to get local active shift:', e);
    return null;
  }
};

export const setLocalActiveShift = (shift: any): void => {
  try {
    if (!shift) {
      localStorage.removeItem(ACTIVE_SHIFT_KEY);
    } else {
      localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(shift));
    }
  } catch (e) {
    console.error('Failed to save local active shift:', e);
  }
};

export const clearLocalActiveShift = (): void => {
  try {
    localStorage.removeItem(ACTIVE_SHIFT_KEY);
  } catch (e) {
    console.error('Failed to clear local active shift:', e);
  }
};

export const getLastCarriedCash = (): number => {
  try {
    const val = localStorage.getItem(LAST_CARRIED_CASH_KEY);
    return val ? Number(val) || 0 : 0;
  } catch (e) {
    return 0;
  }
};

export const setLastCarriedCash = (cash: number): void => {
  try {
    localStorage.setItem(LAST_CARRIED_CASH_KEY, String(cash));
  } catch (e) {
    console.error('Failed to save last carried cash:', e);
  }
};

export const formatCashierDisplayName = (user: any): string => {
  if (!user) return 'الستاف';
  const name = user.name?.trim();
  const username = user.username?.trim();
  if (name && username && name !== username && !name.includes(username)) {
    return `${name} - ${username}`;
  }
  return name || username || 'الستاف';
};

/**
 * Calculates live sales metrics for a shift using local and server orders
 */
export const computeShiftLiveStats = (shift: OfflineShift | null, orders: any[] = []): ShiftLiveStats => {
  if (!shift) {
    return {
      totalOrdersCount: 0,
      totalCashSales: 0,
      totalCardSales: 0,
      totalWalletSales: 0,
      expectedEndingCash: 0,
      totalSales: 0,
    };
  }

  const shiftStartMs = new Date(shift.startTime).getTime();
  
  // Filter paid/settled orders created during this shift
  const shiftOrders = orders.filter((order) => {
    if (!order) return false;
    const orderCreatedMs = new Date(order.createdAt).getTime();
    const isDuringShift = orderCreatedMs >= shiftStartMs;
    const isCompleted = order.status === 'completed' || order.status === 'delivered' || order.isSettled;
    return isDuringShift && isCompleted;
  });

  let totalCash = 0;
  let totalCard = 0;
  let totalWallet = 0;

  shiftOrders.forEach((o) => {
    const amount = Number(o.totalAmount) || 0;
    const method = o.paymentMethod || 'cash';
    if (method === 'card' || method === 'visa') {
      totalCard += amount;
    } else if (method === 'wallet' || method === 'instapay') {
      totalWallet += amount;
    } else {
      totalCash += amount;
    }
  });

  const startingCash = Number(shift.startingCash) || 0;
  const expectedEndingCash = startingCash + totalCash;
  const totalSales = totalCash + totalCard + totalWallet;

  return {
    totalOrdersCount: shiftOrders.length,
    totalCashSales: totalCash,
    totalCardSales: totalCard,
    totalWalletSales: totalWallet,
    expectedEndingCash,
    totalSales,
  };
};

/**
 * Starts an offline shift and queues it for sync
 */
export const startLocalShift = (params: {
  startingCash: number;
  notes?: string;
  user: any;
  restaurantId: string;
}): OfflineShift => {
  const newShift: OfflineShift = {
    id: 'offline_shift_' + Date.now(),
    restaurantId: params.restaurantId,
    cashierName: formatCashierDisplayName(params.user),
    startTime: new Date().toISOString(),
    status: 'open',
    startingCash: Math.max(0, params.startingCash),
    totalCashSales: 0,
    totalCardSales: 0,
    totalWalletSales: 0,
    totalOrdersCount: 0,
    notes: params.notes || '',
    isOffline: true,
    createdAt: new Date().toISOString(),
  };

  setLocalActiveShift(newShift);

  // Queue event for server sync
  enqueueShiftEvent({
    type: 'start',
    shift: newShift,
    timestamp: Date.now(),
  });

  return newShift;
};

/**
 * Closes an offline shift, computes end numbers, and prepares Z-Report
 */
export const closeLocalShift = (params: {
  actualEndingCash: number;
  cashHandedToManager: number;
  notes?: string;
  orders?: any[];
}): OfflineShift | null => {
  const active = getLocalActiveShift();
  if (!active) return null;

  const stats = computeShiftLiveStats(active, params.orders || []);
  const actualEndingCash = Math.max(0, params.actualEndingCash);
  const handedToManager = Math.min(actualEndingCash, Math.max(0, params.cashHandedToManager));
  const carriedOver = Math.max(0, actualEndingCash - handedToManager);
  const variance = actualEndingCash - stats.expectedEndingCash;

  const closedShift: OfflineShift = {
    ...active,
    status: 'closed',
    endTime: new Date().toISOString(),
    actualEndingCash,
    expectedEndingCash: stats.expectedEndingCash,
    cashHandedToManager: handedToManager,
    carriedOverCash: carriedOver,
    variance,
    totalCashSales: stats.totalCashSales,
    totalCardSales: stats.totalCardSales,
    totalWalletSales: stats.totalWalletSales,
    totalOrdersCount: stats.totalOrdersCount,
    notes: params.notes || active.notes,
    isOffline: true,
    updatedAt: new Date().toISOString(),
  };

  setLastCarriedCash(carriedOver);
  clearLocalActiveShift();

  // Queue event for server sync
  enqueueShiftEvent({
    type: 'close',
    shift: closedShift,
    timestamp: Date.now(),
  });

  return closedShift;
};

/**
 * Enqueue shift event to local queue
 */
const enqueueShiftEvent = (event: { type: 'start' | 'close'; shift: OfflineShift; timestamp: number }): void => {
  try {
    const raw = localStorage.getItem(SHIFTS_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(event);
    localStorage.setItem(SHIFTS_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to enqueue shift event:', e);
  }
};

/**
 * Sync offline shifts queue to the cloud backend
 */
export const syncOfflineShifts = async (restaurantId: string): Promise<boolean> => {
  if (!navigator.onLine) return false;

  try {
    const raw = localStorage.getItem(SHIFTS_QUEUE_KEY);
    if (!raw) return false;
    const queue: Array<{ type: 'start' | 'close'; shift: OfflineShift; timestamp: number }> = JSON.parse(raw);
    if (queue.length === 0) return false;

    console.log(`[ShiftSync] Syncing ${queue.length} offline shift events...`);
    const remainingQueue = [];

    for (const item of queue) {
      try {
        if (item.type === 'start') {
          await api.post('/shifts/start', {
            startingCash: item.shift.startingCash,
            notes: item.shift.notes ? `${item.shift.notes} (مفتوح أوفلاين)` : 'تم البدء في وضع الأوفلاين/LAN',
            cashierName: item.shift.cashierName,
          }, {
            headers: { 'x-restaurant-id': restaurantId }
          });
        } else if (item.type === 'close') {
          await api.post('/shifts/close', {
            actualEndingCash: item.shift.actualEndingCash,
            cashHandedToManager: item.shift.cashHandedToManager,
            notes: item.shift.notes ? `${item.shift.notes} (مغلق أوفلاين)` : 'تم التقفيل في وضع الأوفلاين/LAN',
          }, {
            headers: { 'x-restaurant-id': restaurantId }
          });
        }
      } catch (err: any) {
        console.warn('[ShiftSync] Failed item sync:', err?.response?.data || err.message);
        // If the server says shift is already open or closed, we don't block
        if (err?.response?.status !== 400) {
          remainingQueue.push(item);
        }
      }
    }

    if (remainingQueue.length === 0) {
      localStorage.removeItem(SHIFTS_QUEUE_KEY);
      console.log('[ShiftSync] All offline shift events synced successfully.');
      toast.success('تمت مزامنة بيانات الورديات المحلية مع الخادم بنجاح 🔄');
      return true;
    } else {
      localStorage.setItem(SHIFTS_QUEUE_KEY, JSON.stringify(remainingQueue));
      return false;
    }
  } catch (e) {
    console.error('[ShiftSync] Sync error:', e);
    return false;
  }
};
