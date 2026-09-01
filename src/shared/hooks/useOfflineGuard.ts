import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

export interface OfflineGuardStatus {
  isOnline: boolean;
  isClockTampered: boolean;
  isLeaseExpired: boolean;
  isOfflinePermitted: boolean;
  maxOfflineHours: number;
  remainingOfflineHours: number;
  reason?: 'clock_tampered' | 'trial_offline_expired' | 'subscription_expired' | null;
}

const OFFLINE_START_KEY = '_tawla_offline_start_tick';
const LAST_KNOWN_TICK_KEY = '_tawla_last_tick';

export function useOfflineGuard(): OfflineGuardStatus {
  const { restaurant, offlineLease, lastServerSyncTime, updateLastServerSyncTime } = useAuthStore();

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isClockTampered, setIsClockTampered] = useState<boolean>(false);
  const [isLeaseExpired, setIsLeaseExpired] = useState<boolean>(false);
  const [reason, setReason] = useState<'clock_tampered' | 'trial_offline_expired' | 'subscription_expired' | null>(null);
  const [remainingHours, setRemainingHours] = useState<number>(12);

  const plan = restaurant?.subscription?.plan || offlineLease?.plan || 'trial';
  const isPaid = (plan === 'basic' || plan === 'pro') && restaurant?.subscription?.status === 'active';
  const maxOfflineHours = offlineLease?.maxOfflineHours || (isPaid ? 168 : 12);

  // Evaluate offline validity
  const evaluateOfflineSecurity = useCallback(() => {
    const now = Date.now();

    // 1. Clock Rollback Detection
    // If the local computer clock is set to a time earlier than our recorded server sync time
    if (lastServerSyncTime && now < lastServerSyncTime - 120_000) {
      setIsClockTampered(true);
      setReason('clock_tampered');
      return;
    }

    // Monotonic tick sanity check
    const lastSavedTick = Number(localStorage.getItem(LAST_KNOWN_TICK_KEY) || 0);
    if (lastSavedTick > 0 && now < lastSavedTick - 60_000) {
      setIsClockTampered(true);
      setReason('clock_tampered');
      return;
    }

    // Update forward monotonic tick
    localStorage.setItem(LAST_KNOWN_TICK_KEY, now.toString());
    setIsClockTampered(false);

    // 2. Subscription Expiry Check
    const expiryTimestamp = offlineLease?.expiresAt 
      ? offlineLease.expiresAt 
      : (restaurant?.subscription?.expiresAt ? new Date(restaurant.subscription.expiresAt).getTime() : 0);

    if (expiryTimestamp > 0 && now > expiryTimestamp) {
      setIsLeaseExpired(true);
      setReason('subscription_expired');
      return;
    }

    // 3. Offline Lease Duration Check
    if (!navigator.onLine) {
      let offlineStart = Number(localStorage.getItem(OFFLINE_START_KEY) || 0);
      if (!offlineStart) {
        offlineStart = now;
        localStorage.setItem(OFFLINE_START_KEY, offlineStart.toString());
      }

      const elapsedMs = now - offlineStart;
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const remaining = Math.max(0, maxOfflineHours - elapsedHours);
      setRemainingHours(Number(remaining.toFixed(1)));

      if (elapsedHours >= maxOfflineHours) {
        setIsLeaseExpired(true);
        setReason(plan === 'trial' ? 'trial_offline_expired' : 'subscription_expired');
        return;
      }
    } else {
      // If back online, clear offline timer and update sync
      localStorage.removeItem(OFFLINE_START_KEY);
      setIsLeaseExpired(false);
      setReason(null);
      setRemainingHours(maxOfflineHours);
    }
  }, [restaurant, offlineLease, lastServerSyncTime, maxOfflineHours, plan, isPaid]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateLastServerSyncTime(Date.now());
      localStorage.removeItem(OFFLINE_START_KEY);
      evaluateOfflineSecurity();
    };

    const handleOffline = () => {
      setIsOnline(false);
      localStorage.setItem(OFFLINE_START_KEY, Date.now().toString());
      evaluateOfflineSecurity();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic evaluation every 30 seconds
    const interval = setInterval(() => {
      evaluateOfflineSecurity();
    }, 30_000);

    evaluateOfflineSecurity();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [evaluateOfflineSecurity, updateLastServerSyncTime]);

  const isOfflinePermitted = !isClockTampered && !isLeaseExpired;

  return {
    isOnline,
    isClockTampered,
    isLeaseExpired,
    isOfflinePermitted,
    maxOfflineHours,
    remainingOfflineHours: remainingHours,
    reason,
  };
}
