import { createPortal } from 'react-dom';

export interface ReceiptPrintTemplateProps {
  printingOrder: any | null;
  restaurant: any;
}

/**
 * Formats numbers to Egyptian Pounds currency string
 */
export const formatReceiptCurrency = (val: number) => {
  return (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
};

/**
 * Generates clean, high-contrast HTML markup for an 80mm thermal receipt
 */
export function generateReceiptHtml(printingOrder: any, restaurant: any, stationFilter: 'all' | 'kitchen' | 'bar' = 'all'): string {
  if (!printingOrder) return '';

  // Filter items by station if requested
  const isDrinkOrDessert = (name: string, cat?: string) => {
    return (name || '').match(/(عصير|كولا|بيبسي|قهوة|شاي|إسبريسو|مياه|موهيتو|مشروب|حلويات|وافل|أيس كريم)/i) ||
           (cat || '').match(/(drinks|beverages|desserts|مشروبات|عصائر|حلويات)/i);
  };

  let targetItems = printingOrder.items || [];
  let stationBadge = '';

  if (stationFilter === 'kitchen') {
    targetItems = targetItems.filter((i: any) => !isDrinkOrDessert(i.name, i.category));
    stationBadge = '<div style="background:#000; color:#fff; text-align:center; padding:2px; font-weight:900; margin-bottom:4px;">بون المطبخ الرئيسي (KITCHEN)</div>';
  } else if (stationFilter === 'bar') {
    targetItems = targetItems.filter((i: any) => isDrinkOrDessert(i.name, i.category));
    stationBadge = '<div style="background:#801B2C; color:#fff; text-align:center; padding:2px; font-weight:900; margin-bottom:4px;">بون البار والمشروبات (BAR)</div>';
  }
  
  if (printingOrder.type === 'refund_receipt') {
    const items = printingOrder.items || [];
    const dStr = new Date().toLocaleDateString('ar-EG', { dateStyle: 'short' });
    const tStr = new Date().toLocaleTimeString('ar-EG', { hour12: true });

    const rows = items.map((item: any) => `
      <tr style="border-bottom: 1px solid #000;">
        <td style="padding: 5px 6px; text-align: right; font-weight: bold; border-left: 1px solid #000;">
          <div>${item.name}</div>
          <div style="font-size: 8.5px; color: #3f3f46; font-weight: normal;">السبب: ${item.reason}</div>
        </td>
        <td style="padding: 5px 6px; text-align: center; font-family: monospace; font-weight: 900; border-left: 1px solid #000;">${item.quantity}</td>
        <td style="padding: 5px 6px; text-align: left; font-family: monospace; font-weight: 900;">${formatReceiptCurrency(item.refundAmount)}</td>
      </tr>
    `).join('');

    return `
      <div class="print-receipt-container" dir="rtl" style="font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; width: 80mm; margin: 0 auto; padding: 4mm 3mm; box-sizing: border-box; font-size: 11px;">
        <!-- Header -->
        <div style="text-align: center; border: 1.5px solid #000; padding: 6px; margin-bottom: 6px; background: #fff;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 4px 0;">${restaurant?.name || 'طاولة'}</h1>
          <h2 style="font-size: 12px; font-weight: 900; margin: 0; background: #dc2626; color: #fff; padding: 4px 0; border-radius: 2px;">إيصال مرتجع أصناف (REFUND)</h2>
        </div>

        <!-- Metadata Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; border: 1.5px solid #000; font-size: 10.5px;">
          <tbody>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4px 6px; font-weight: bold; background: #f4f4f5; width: 35%; border-left: 1px solid #000;">مرتجع لأوردر:</td>
              <td style="padding: 4px 6px; font-weight: 900; font-family: monospace;">#${printingOrder.originalOrderId || printingOrder.id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4px 6px; font-weight: bold; background: #f4f4f5; border-left: 1px solid #000;">الطاولة / الجهة:</td>
              <td style="padding: 4px 6px; font-weight: bold;">طاولة ${printingOrder.tableNumber || 'الاستلام'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold; background: #f4f4f5; border-left: 1px solid #000;">التاريخ والوقت:</td>
              <td style="padding: 4px 6px; font-weight: bold; font-family: monospace;">${dStr} - ${tStr}</td>
            </tr>
          </tbody>
        </table>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; border: 1.5px solid #000; font-size: 10.5px;">
          <thead>
            <tr style="background: #000; color: #fff;">
              <th style="text-align: right; padding: 5px 6px; font-weight: 900; border-left: 1px solid #fff;">الصنف المرتجع</th>
              <th style="text-align: center; padding: 5px 6px; font-weight: 900; width: 45px; border-left: 1px solid #fff;">العدد</th>
              <th style="text-align: left; padding: 5px 6px; font-weight: 900;">المسترد</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <!-- Total Box -->
        <div style="border: 2px solid #dc2626; background: #fef2f2; padding: 6px 8px; margin-bottom: 6px; font-weight: 900; display: flex; justify-content: space-between; font-size: 12.5px; color: #991b1b;">
          <span>إجمالي المبلغ المسترد:</span>
          <span style="font-family: monospace;">${formatReceiptCurrency(printingOrder.totalAmount)}</span>
        </div>

        <!-- Signature Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; border: 1.5px solid #000; font-size: 10px;">
          <tbody>
            <tr>
              <td style="width: 50%; padding: 8px 6px; text-align: center; border-left: 1px solid #000; font-weight: bold;">
                توقيع الكاشير<br /><br />_____________________
              </td>
              <td style="width: 50%; padding: 8px 6px; text-align: center; font-weight: bold;">
                توقيع المسئول<br /><br />_____________________
              </td>
            </tr>
          </tbody>
        </table>

        <div style="border: 1.5px solid #000; border-top: none; background: #000; color: #fff; padding: 3px; text-align: center; font-weight: 900; font-size: 9px;">
          Powered by: tawla.site
        </div>
      </div>
    `;
  }

  if (printingOrder.type === 'z_report') {
    const shift = printingOrder.shiftDetails || {};
    const sTime = shift.startTime ? new Date(shift.startTime).toLocaleTimeString('ar-EG', { hour12: true }) : '';
    const eTime = shift.endTime ? new Date(shift.endTime).toLocaleTimeString('ar-EG', { hour12: true }) : new Date().toLocaleTimeString('ar-EG', { hour12: true });
    const dStr = new Date().toLocaleDateString('ar-EG', { dateStyle: 'short' });
    const varAmt = shift.variance || 0;

    return `
      <div class="print-receipt-container" dir="rtl" style="font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; width: 80mm; margin: 0 auto; padding: 4mm 3mm; box-sizing: border-box; font-size: 11px;">
        <!-- Header Section -->
        <div style="text-align: center; border: 1.5px solid #000; padding: 6px; margin-bottom: 6px; background: #fff;">
          <h1 style="font-size: 17px; font-weight: 900; margin: 0 0 4px 0; color: #000;">${restaurant?.name || 'طاولة'}</h1>
          <h2 style="font-size: 12px; font-weight: 900; margin: 0; background: #000; color: #fff; padding: 4px 0; border-radius: 2px;">تقرير تقفيل الشيفت (Z-REPORT)</h2>
        </div>

        <!-- 1. Shift Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; border: 1.5px solid #000; font-size: 10.5px;">
          <tbody>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4px 6px; font-weight: bold; background: #f4f4f5; width: 38%; border-left: 1px solid #000;">الكاشير المسؤول:</td>
              <td style="padding: 4px 6px; font-weight: 900;">${shift.cashierName || 'الستاف'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4px 6px; font-weight: bold; background: #f4f4f5; border-left: 1px solid #000;">التاريخ:</td>
              <td style="padding: 4px 6px; font-weight: bold; font-family: monospace;">${dStr}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4px 6px; font-weight: bold; background: #f4f4f5; border-left: 1px solid #000;">أوقات العمل:</td>
              <td style="padding: 4px 6px; font-weight: bold; font-size: 9.5px;">البداية: ${sTime} | الإغلاق: ${eTime}</td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold; background: #f4f4f5; border-left: 1px solid #000;">إجمالي الأوردرات:</td>
              <td style="padding: 4px 6px; font-weight: 900; font-family: monospace;">${shift.totalOrdersCount || 0} طلب</td>
            </tr>
          </tbody>
        </table>

        <!-- 2. Payment Methods Breakdown Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; border: 1.5px solid #000; font-size: 11px;">
          <thead>
            <tr style="background: #000; color: #fff;">
              <th style="text-align: right; padding: 5px 6px; font-weight: 900; border-left: 1px solid #fff;">طريقة الدفع</th>
              <th style="text-align: left; padding: 5px 6px; font-weight: 900;">المبلغ المجمع</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">نقدي (Cash)</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: 900;">${formatReceiptCurrency(shift.totalCashSales || 0)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">فيزا / كارت (Card)</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: 900;">${formatReceiptCurrency(shift.totalCardSales || 0)}</td>
            </tr>
            <tr>
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">محافظ إلكترونية (Wallet)</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: 900;">${formatReceiptCurrency(shift.totalWalletSales || 0)}</td>
            </tr>
          </tbody>
        </table>

        <!-- 3. Cash Drawer & Reconciliation Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; border: 1.5px solid #000; font-size: 11px;">
          <thead>
            <tr style="background: #18181b; color: #fff;">
              <th colspan="2" style="text-align: center; padding: 4px 6px; font-weight: 900; font-size: 10.5px;">
                تسوية وتدقيق عهدة الدرج (CASH RECONCILIATION)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">العهدة الابتدائية:</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(shift.startingCash || 0)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">مبيعات الكاش المجمعة:</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(shift.totalCashSales || 0)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000; background: #f4f4f5;">
              <td style="padding: 5px 6px; font-weight: 900; border-left: 1px solid #000;">النقدية المتوقعة بالدرج:</td>
              <td style="padding: 5px 6px; text-align: left; font-family: monospace; font-weight: 900; font-size: 11.5px;">${formatReceiptCurrency(shift.expectedEndingCash || 0)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000; background: #f4f4f5;">
              <td style="padding: 5px 6px; font-weight: 900; border-left: 1px solid #000;">النقدية الفعلية المسلمة:</td>
              <td style="padding: 5px 6px; text-align: left; font-family: monospace; font-weight: 900; font-size: 11.5px;">${formatReceiptCurrency(shift.actualEndingCash || 0)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">المبلغ المسلم للمدير:</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(shift.cashHandedToManager || 0)}</td>
            </tr>
            <tr style="border-bottom: 1.5px solid #000;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">عهدة متبقية للشيفت التالي:</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(shift.carriedOverCash !== undefined ? shift.carriedOverCash : ((shift.actualEndingCash || 0) - (shift.cashHandedToManager || 0)))}</td>
            </tr>
            <tr style="background: ${varAmt < 0 ? '#fef2f2' : '#f0fdf4'};">
              <td style="padding: 6px 6px; font-weight: 900; font-size: 11.5px; border-left: 1px solid #000;">نتيجة المطابقة (العجز/الزيادة):</td>
              <td style="padding: 6px 6px; text-align: left; font-family: monospace; font-weight: 900; font-size: 12px; color: ${varAmt < 0 ? '#dc2626' : '#166534'};">
                ${varAmt === 0 ? 'مطابق (0)' : formatReceiptCurrency(varAmt)}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 4. Signatures Box -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; border: 1.5px solid #000; font-size: 10px;">
          <tbody>
            <tr>
              <td style="width: 50%; padding: 8px 6px; text-align: center; border-left: 1px solid #000; font-weight: bold;">
                توقيع الكاشير<br /><br />_____________________
              </td>
              <td style="width: 50%; padding: 8px 6px; text-align: center; font-weight: bold;">
                توقيع المدير / المستلم<br /><br />_____________________
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Powered By Footer -->
        <div style="border: 1.5px solid #000; border-top: none; background: #000; color: #fff; padding: 4px; text-align: center; font-weight: 900; font-size: 10px; letter-spacing: 0.5px;">
          Powered by: tawla.site
        </div>
      </div>
    `;
  }

  const isTakeaway = printingOrder.type === 'takeaway' || printingOrder.tableNumber === 0;
  const serviceRatePercent = isTakeaway ? 0 : (restaurant?.receiptSettings?.serviceRate ?? 0);
  const taxRatePercent = restaurant?.receiptSettings?.taxRate ?? 0;
  
  const originalSubtotal = (printingOrder.items || []).reduce(
    (acc: number, item: any) => acc + (item.originalPrice || item.price || 0) * (item.quantity || 1), 
    0
  );
  const currentItemsTotal = (printingOrder.items || []).reduce(
    (acc: number, item: any) => acc + (item.price || 0) * (item.quantity || 1), 
    0
  );
  const scheduledDiscount = Math.max(0, originalSubtotal - currentItemsTotal);
  const manualDiscount = printingOrder.discountAmount || 0;
  const totalDiscount = scheduledDiscount + manualDiscount;
  const afterDiscount = Math.max(0, originalSubtotal - totalDiscount);

  const taxAmount = afterDiscount * (taxRatePercent / 100);
  const serviceAmount = afterDiscount * (serviceRatePercent / 100);
  const grandTotal = afterDiscount + taxAmount + serviceAmount;

  const orderNumberStr = printingOrder.id ? `#${printingOrder.id.slice(-6).toUpperCase()}` : '#000000';
  const dateStr = printingOrder.createdAt 
    ? new Date(printingOrder.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'short' }) 
    : new Date().toLocaleDateString('ar-EG', { dateStyle: 'short' });
  const timeStr = new Date().toLocaleTimeString('ar-EG', { hour12: true });

  let orderTypeHeader = '';
  if (printingOrder.type === 'delivery') {
    orderTypeHeader = 'الطلب : توصيل (دليفري)';
  } else if (printingOrder.type === 'takeaway') {
    orderTypeHeader = 'الطلب : خارجي (تيك أواي)';
  } else {
    orderTypeHeader = `طاولة : ${printingOrder.tableNumber}`;
  }

  const itemsRows = (targetItems || []).map((item: any) => {
    const itemPrice = item.originalPrice || item.price || 0;
    const itemTotal = itemPrice * (item.quantity || 1);

    const optionsHtml = item.selectedOptions && item.selectedOptions.length > 0
      ? `<div style="font-size: 8.5px; color: #27272a; font-weight: 500; margin-top: 1px;">- ${item.selectedOptions.map((o: any) => `${o.name}: ${o.value}`).join(', ')}</div>`
      : '';

    const modifiersHtml = item.selectedModifiers && item.selectedModifiers.length > 0
      ? `<div style="font-size: 8.5px; color: #27272a; font-weight: 500; margin-top: 1px;">- الإضافات: ${item.selectedModifiers.map((m: any) => m.value).join(', ')}</div>`
      : '';

    const notesHtml = item.notes
      ? `<div style="font-size: 8.5px; color: #27272a; font-style: italic; font-weight: 500; margin-top: 1px;">* ملاحظة: ${item.notes}</div>`
      : '';

    return `
      <tr>
        <td style="text-align: center; font-family: monospace; font-weight: 900; font-size: 11px; border: 1.5px solid #000; padding: 4px 6px;">${item.quantity}</td>
        <td style="text-align: right; font-weight: bold; border: 1.5px solid #000; padding: 4px 6px;">
          <div>${item.name}</div>
          ${optionsHtml}
          ${modifiersHtml}
          ${notesHtml}
        </td>
        <td style="text-align: center; font-family: monospace; font-weight: bold; font-size: 10.5px; border: 1.5px solid #000; padding: 4px 6px;">${itemPrice.toFixed(2)}</td>
        <td style="text-align: left; font-family: monospace; font-weight: 900; font-size: 10.5px; border: 1.5px solid #000; padding: 4px 6px;">${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="print-receipt-container" dir="rtl" style="font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif; color: #000; background: #fff; width: 80mm; margin: 0 auto; padding: 4mm 3mm; box-sizing: border-box; line-height: 1.4; font-size: 11px;">
      
      <!-- Header section -->
      <div style="text-align: center; padding-bottom: 8px;">
        ${restaurant?.receiptSettings?.showLogo && restaurant?.logo?.url ? `
          <div style="margin-bottom: 8px;">
            <img src="${restaurant.logo.url}" alt="logo" style="margin: 0 auto; max-height: 56px; object-fit: contain; border-radius: 6px;" />
          </div>
        ` : ''}
        <h1 style="font-size: 16px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; margin: 0 0 2px 0; color: #000;">${restaurant?.name || ''}</h1>
        ${restaurant?.receiptSettings?.headerText ? `
          <p style="font-size: 10px; color: #18181b; font-weight: bold; line-height: 1.2; margin: 4px auto 0 auto; max-width: 90%;">${restaurant.receiptSettings.headerText}</p>
        ` : ''}
      </div>

      ${stationBadge}
      <!-- Big Bold Table / Area Header -->
      <div style="text-align: center; font-weight: 900; font-size: 14px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 4px 0;">
        ${orderTypeHeader}
      </div>

      <!-- Metadata Details -->
      <div style="font-size: 10px; font-weight: bold; padding: 6px 0; border-bottom: 1px dashed #000; line-height: 1.5;">
        <div style="display: flex; justify-content: space-between;">
          <span>رقم الطلب: ${orderNumberStr}</span>
          <span>التاريخ: ${dateStr}</span>
        </div>
        ${printingOrder.customerName ? `<div>العميل: ${printingOrder.customerName}</div>` : ''}
        ${printingOrder.customerPhone ? `<div>الهاتف: ${printingOrder.customerPhone}</div>` : ''}
        ${printingOrder.type === 'delivery' && printingOrder.customerAddress ? `<div>العنوان: ${printingOrder.customerAddress}</div>` : ''}
        ${restaurant?.receiptSettings?.taxNumber ? `<div>الرقم الضريبي: ${restaurant.receiptSettings.taxNumber}</div>` : ''}
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 8px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="width: 48px; text-align: center; font-size: 11px; text-transform: uppercase; border: 1.5px solid #000; padding: 4px 6px; font-weight: bold;">الكمية</th>
            <th style="text-align: right; font-size: 11px; text-transform: uppercase; border: 1.5px solid #000; padding: 4px 6px; font-weight: bold;">الصنف</th>
            <th style="width: 64px; text-align: center; font-size: 11px; text-transform: uppercase; border: 1.5px solid #000; padding: 4px 6px; font-weight: bold;">السعر</th>
            <th style="width: 64px; text-align: left; font-size: 11px; text-transform: uppercase; border: 1.5px solid #000; padding: 4px 6px; font-weight: bold;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals Summary Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 6px; border: 1.5px solid #000; font-size: 11px;">
        <tbody>
          <tr style="border-bottom: 1px solid #000;">
            <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">إجمالي الطلبات:</td>
            <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(originalSubtotal)}</td>
          </tr>
          ${taxRatePercent > 0 ? `
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">الضريبة (${taxRatePercent}%):</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(taxAmount)}</td>
            </tr>
          ` : ''}
          ${serviceRatePercent > 0 ? `
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">الخدمة (${serviceRatePercent}%):</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(serviceAmount)}</td>
            </tr>
          ` : ''}
          ${totalDiscount > 0 ? `
            <tr style="border-bottom: 1px solid #000; color: #dc2626;">
              <td style="padding: 4.5px 6px; font-weight: bold; border-left: 1px solid #000;">خصم العروض:</td>
              <td style="padding: 4.5px 6px; text-align: left; font-family: monospace; font-weight: bold;">-${formatReceiptCurrency(totalDiscount)}</td>
            </tr>
          ` : ''}
          <tr style="background: #f4f4f5;">
            <td style="padding: 6px; font-weight: 900; font-size: 12.5px; border-left: 1px solid #000;">المبلغ المستحق:</td>
            <td style="padding: 6px; text-align: left; font-family: monospace; font-weight: 900; font-size: 13px;">${formatReceiptCurrency(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Welcome Footer Text -->
      <div style="text-align: center; margin-top: 14px; line-height: 1.4;">
        ${restaurant?.receiptSettings?.footerText ? `
          <p style="font-size: 9.5px; color: #09090b; font-weight: bold; padding: 0 8px; margin: 0 0 6px 0;">
            ${restaurant.receiptSettings.footerText}
          </p>
        ` : ''}

        <div style="border: 1.5px solid #000; padding: 4px; text-align: center; font-weight: 900; font-size: 10px; margin-top: 8px; letter-spacing: 0.5px;">
          Powered by: tawla.site
        </div>

        <div style="font-size: 8px; font-weight: bold; color: #18181b; font-family: monospace; padding-top: 4px;">
          وقت الطباعة : ${timeStr}
        </div>
      </div>
    </div>
  `;
}

/**
 * Bulletproof print function using an isolated hidden iframe.
 * This guarantees:
 * 1. Huawei and Android tablets print ONLY the thermal receipt (never the dashboard or webpage).
 * 2. On PC with Chrome/Edge running with --kiosk-printing, it prints instantly in the background silently.
 * 3. The receipt document is NEVER prematurely unmounted or destroyed while print spooler renders.
 */
export function printReceiptIframe(printingOrder: any, restaurant: any, stationFilter: 'all' | 'kitchen' | 'bar' = 'all'): void {
  if (!printingOrder) return;

  const html = generateReceiptHtml(printingOrder, restaurant, stationFilter);
  if (!html) return;

  let iframe = document.getElementById('receipt-print-frame') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '80mm';
    iframe.style.height = '100px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.warn('[ReceiptPrinter]: could not access iframe document, fallback to window.print');
    window.print();
    return;
  }

  const fullDocument = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>فاتورة طاولة</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            background: #fff !important;
            color: #000 !important;
            font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif !important;
            direction: rtl;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  doc.open();
  doc.write(fullDocument);
  doc.close();

  const doPrint = () => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch (e) {
      console.warn('[ReceiptPrinter]: iframe.print() failed, falling back to window.print()', e);
      window.print();
    }
  };

  // Wait for images to load if logo exists
  const images = iframe.contentDocument?.images || [];
  if (images.length === 0) {
    setTimeout(doPrint, 150);
  } else {
    let loaded = 0;
    let printed = false;
    const checkAndPrint = () => {
      loaded++;
      if (loaded >= images.length && !printed) {
        printed = true;
        setTimeout(doPrint, 100);
      }
    };

    for (let i = 0; i < images.length; i++) {
      if (images[i].complete) {
        checkAndPrint();
      } else {
        images[i].onload = checkAndPrint;
        images[i].onerror = checkAndPrint;
      }
    }

    // Safety timeout after 400ms
    setTimeout(() => {
      if (!printed) {
        printed = true;
        doPrint();
      }
    }, 400);
  }
}

/**
 * Standard React Component fallback for backwards compatibility
 */
export default function ReceiptPrintTemplate({ printingOrder, restaurant }: ReceiptPrintTemplateProps) {
  if (!printingOrder) return null;

  return createPortal(
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: 80mm auto;
          margin: 0 !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif !important;
            width: 80mm !important;
          }
          #root, header, aside, main, footer, .toast, .no-print, [role="dialog"] {
            display: none !important;
          }
          .print-receipt-container {
            display: block !important;
            width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm 3mm !important;
            box-sizing: border-box !important;
            background: white !important;
          }
        }
      `}} />
      <div 
        dangerouslySetInnerHTML={{ __html: generateReceiptHtml(printingOrder, restaurant) }} 
        className="hidden print:block"
      />
    </>,
    document.body
  );
}
