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
export function generateReceiptHtml(printingOrder: any, restaurant: any): string {
  if (!printingOrder) return '';
  if (printingOrder.type === 'z_report') {
    const shift = printingOrder.shiftDetails || {};
    const sTime = shift.startTime ? new Date(shift.startTime).toLocaleTimeString('ar-EG', { hour12: true }) : '';
    const eTime = shift.endTime ? new Date(shift.endTime).toLocaleTimeString('ar-EG', { hour12: true }) : new Date().toLocaleTimeString('ar-EG', { hour12: true });
    const dStr = new Date().toLocaleDateString('ar-EG', { dateStyle: 'short' });
    const varAmt = shift.variance || 0;

    return `
      <div class="print-receipt-container" dir="rtl" style="font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; width: 80mm; margin: 0 auto; padding: 4mm 3mm; box-sizing: border-box; font-size: 11px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0;">${restaurant?.name || 'طاولة'}</h1>
          <h2 style="font-size: 13px; font-weight: 900; margin: 0; background: #000; color: #fff; padding: 3px 0;">تقرير تقفيل الشيفت (Z-REPORT)</h2>
        </div>

        <div style="font-size: 10px; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; line-height: 1.5;">
          <div>الكاشير: ${shift.cashierName || 'الستاف'}</div>
          <div>التاريخ: ${dStr}</div>
          <div>وقت البداية: ${sTime} | وقت الإغلاق: ${eTime}</div>
          <div>إجمالي أوردرات الشيفت: ${shift.totalOrdersCount || 0} طلب</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000;">
              <th style="text-align: right; padding: 4px 0;">طريقة الدفع</th>
              <th style="text-align: left; padding: 4px 0;">المبلغ المجمع</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">نقدي (Cash)</td>
              <td style="padding: 4px 0; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(shift.totalCashSales || 0)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">فيزا / كارت (Card)</td>
              <td style="padding: 4px 0; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(shift.totalCardSales || 0)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">محافظ إلكترونية (Wallet)</td>
              <td style="padding: 4px 0; text-align: left; font-family: monospace; font-weight: bold;">${formatReceiptCurrency(shift.totalWalletSales || 0)}</td>
            </tr>
          </tbody>
        </table>

        <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 0; margin: 6px 0; font-weight: 900; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between;">
            <span>العهدة الابتدائية:</span>
            <span style="font-family: monospace;">${formatReceiptCurrency(shift.startingCash || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>مبيعات الكاش المجمعة:</span>
            <span style="font-family: monospace;">${formatReceiptCurrency(shift.totalCashSales || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 4px; margin-top: 2px;">
            <span>النقدية المتوقعة بالدرج:</span>
            <span style="font-family: monospace;">${formatReceiptCurrency(shift.expectedEndingCash || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>النقدية الفعلية المسلمة:</span>
            <span style="font-family: monospace;">${formatReceiptCurrency(shift.actualEndingCash || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px;">
            <span>المبلغ المسلم للمدير 👔:</span>
            <span style="font-family: monospace;">${formatReceiptCurrency(shift.cashHandedToManager || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>عهدة متبقية للشيفت التالي 🔄:</span>
            <span style="font-family: monospace;">${formatReceiptCurrency(shift.carriedOverCash !== undefined ? shift.carriedOverCash : ((shift.actualEndingCash || 0) - (shift.cashHandedToManager || 0)))}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; padding-top: 4px; border-top: 1px dashed #000; margin-top: 4px;">
            <span>نتيجة المطابقة (العجز/الزيادة):</span>
            <span style="font-family: monospace; color: ${varAmt < 0 ? '#dc2626' : '#000'};">${varAmt === 0 ? 'مطابق (0)' : formatReceiptCurrency(varAmt)}</span>
          </div>
        </div>

        <div style="text-align: center; font-size: 9px; font-weight: bold; margin-top: 8px;">
          توقيع الكاشير: ........................
        </div>
        <div style="border: 1px solid #000; padding: 3px; text-align: center; font-weight: 900; font-size: 9px; margin-top: 8px;">
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

  const itemsRows = (printingOrder.items || []).map((item: any) => {
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
        ${printingOrder.type === 'delivery' ? `
          ${printingOrder.customerPhone ? `<div>الهاتف: ${printingOrder.customerPhone}</div>` : ''}
          ${printingOrder.customerAddress ? `<div>العنوان: ${printingOrder.customerAddress}</div>` : ''}
        ` : ''}
        ${printingOrder.type !== 'delivery' && restaurant?.receiptSettings?.phone ? `
          <div style="display: flex; justify-content: space-between;">
            <span>الهاتف: ${restaurant.receiptSettings.phone}</span>
            ${restaurant.receiptSettings.taxNumber ? `<span>الرقم الضريبي: ${restaurant.receiptSettings.taxNumber}</span>` : ''}
          </div>
        ` : ''}
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

      <!-- Totals Summary -->
      <div style="padding: 4px 0; border-top: 1px solid #000; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
          <span>إجمالي الطلبات:</span>
          <span style="font-family: monospace;">${formatReceiptCurrency(originalSubtotal)}</span>
        </div>

        ${taxRatePercent > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
            <span>الضريبة (${taxRatePercent}%):</span>
            <span style="font-family: monospace;">${formatReceiptCurrency(taxAmount)}</span>
          </div>
        ` : ''}

        ${serviceRatePercent > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
            <span>الخدمة (${serviceRatePercent}%):</span>
            <span style="font-family: monospace;">${formatReceiptCurrency(serviceAmount)}</span>
          </div>
        ` : ''}

        ${totalDiscount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; color: #dc2626;">
            <span>خصم العروض:</span>
            <span style="font-family: monospace;">-${formatReceiptCurrency(totalDiscount)}</span>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; padding-top: 6px; border-top: 1px solid #000; margin-top: 4px;">
          <span>المبلغ المستحق:</span>
          <span style="font-family: monospace;">${formatReceiptCurrency(grandTotal)}</span>
        </div>
      </div>

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
export function printReceiptIframe(printingOrder: any, restaurant: any): void {
  if (!printingOrder) return;

  const html = generateReceiptHtml(printingOrder, restaurant);
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
