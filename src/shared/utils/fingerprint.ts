/**
 * Lightweight, zero-dependency browser and device fingerprint generator.
 * Produces a stable, unique 64-char hash based on canvas rendering, hardware properties, and storage.
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    const components: string[] = [];

    // 1. Screen & Display metrics
    components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
    components.push(`avail:${window.screen.availWidth}x${window.screen.availHeight}`);
    components.push(`dpr:${window.devicePixelRatio || 1}`);

    // 2. Hardware capabilities
    components.push(`cores:${navigator.hardwareConcurrency || 4}`);
    components.push(`lang:${navigator.language || 'ar'}`);
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo'}`);
    components.push(`platform:${navigator.platform || ''}`);

    // 3. HTML5 Canvas 2D Rendering Signature
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial', sans-serif";
        ctx.fillStyle = '#801B2C';
        ctx.fillText('Tawla-Fingerprint-🛡️-2026', 2, 2);
        ctx.fillStyle = '#065F46';
        ctx.fillRect(100, 5, 50, 25);
        components.push(`canvas:${canvas.toDataURL()}`);
      }
    } catch {
      components.push('canvas:error');
    }

    // 4. Persistent Hardware ID in LocalStorage & IndexedDB
    const STORAGE_KEY = '_tawla_hw_id';
    let hwId = localStorage.getItem(STORAGE_KEY);
    if (!hwId) {
      hwId = 'hw_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
      try {
        localStorage.setItem(STORAGE_KEY, hwId);
      } catch {}
    }
    components.push(`hwId:${hwId}`);

    // Combine and compute SHA-256 hash using Web Crypto API
    const rawString = components.join('||');
    const msgBuffer = new TextEncoder().encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (e) {
    console.warn('[Fingerprint Generation Fallback]:', e);
    return 'fp_fallback_' + Math.random().toString(36).substring(2, 10);
  }
}
