import { createPortal } from 'react-dom';

interface ReceiptPrintTemplateProps {
  printingOrder: any | null;
  restaurant: any;
}

export default function ReceiptPrintTemplate({ printingOrder, restaurant }: ReceiptPrintTemplateProps) {
  if (!printingOrder) return null;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
  };

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
            font-family: 'Segoe UI', Arial, sans-serif !important;
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
        
        /* Table Styles from the image */
        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
        }
        .receipt-table th, .receipt-table td {
          border: 1.5px solid #000 !important;
          padding: 4px 6px !important;
          font-weight: bold !important;
          color: #000 !important;
          vertical-align: middle !important;
        }
        .receipt-table th {
          font-size: 11px !important;
          text-transform: uppercase;
          background-color: #f3f4f6 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt-table td {
          font-size: 10.5px !important;
        }
      `}} />
      <div className="print-receipt-container hidden print:block text-black bg-white leading-relaxed text-[11px]" dir="rtl" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        
        {/* Header section */}
        <div className="text-center pb-2">
          {/* Logo if active */}
          {restaurant?.receiptSettings?.showLogo && restaurant?.logo?.url && (
            <div className="mb-2">
              <img src={restaurant.logo.url} alt="logo" className="mx-auto max-h-14 object-contain rounded-md" />
            </div>
          )}
          {/* Restaurant Name */}
          <h1 className="text-base font-black tracking-tight uppercase mb-0.5 text-black">{restaurant?.name}</h1>
          {/* Header Text */}
          {restaurant?.receiptSettings?.headerText && (
            <p className="text-[10px] text-zinc-900 leading-tight mt-1 max-w-[90%] mx-auto font-bold">{restaurant.receiptSettings.headerText}</p>
          )}
        </div>

        {/* Big Bold Table / Area Header like in the image */}
        <div className="text-center font-black text-sm border-t-2 border-b-2 border-black py-1 my-1">
          {printingOrder.type === 'delivery' ? (
            <span>الطلب : توصيل (دليفري)</span>
          ) : printingOrder.type === 'takeaway' ? (
            <span>الطلب : خارجي (تيك أواي)</span>
          ) : (
            <span>طاولة : {printingOrder.tableNumber}</span>
          )}
        </div>

        {/* Metadata Details */}
        <div className="text-[10px] font-bold py-1.5 space-y-0.5 border-b border-dashed border-black">
          <div className="flex justify-between">
            <span>رقم الطلب: #{printingOrder.id.slice(-6).toUpperCase()}</span>
            <span>التاريخ: {new Date(printingOrder.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'short' })}</span>
          </div>
          {printingOrder.customerName && (
            <div>العميل: {printingOrder.customerName}</div>
          )}
          {printingOrder.type === 'delivery' && (
            <>
              {printingOrder.customerPhone && <div>الهاتف: {printingOrder.customerPhone}</div>}
              {printingOrder.customerAddress && <div>العنوان: {printingOrder.customerAddress}</div>}
            </>
          )}
          {printingOrder.type !== 'delivery' && restaurant?.receiptSettings?.phone && (
            <div className="flex justify-between">
              <span>الهاتف: {restaurant.receiptSettings.phone}</span>
              {restaurant.receiptSettings.taxNumber && (
                <span>الرقم الضريبي: {restaurant.receiptSettings.taxNumber}</span>
              )}
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="receipt-table">
          <thead>
            <tr>
              <th className="w-12 text-center">الكمية</th>
              <th className="text-right">الصنف</th>
              <th className="w-16 text-center">السعر</th>
              <th className="w-16 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {printingOrder.items.map((item: any, idx: number) => {
              return (
                 <tr key={idx}>
                  <td className="text-center font-mono font-black text-[11px]">{item.quantity}</td>
                  <td className="text-right font-bold">
                    <div>{item.name}</div>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="text-[8.5px] text-zinc-800 font-medium">
                        - {item.selectedOptions.map((o: any) => `${o.name}: ${o.value}`).join(', ')}
                      </div>
                    )}
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="text-[8.5px] text-zinc-800 font-medium">
                        - الإضافات: {item.selectedModifiers.map((m: any) => m.value).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[8.5px] text-zinc-800 mr-1 font-medium italic">
                        * ملاحظة: {item.notes}
                      </div>
                    )}
                  </td>
                  <td className="text-center font-mono font-bold">
                    {(item.originalPrice || item.price).toFixed(2)}
                  </td>
                  <td className="text-left font-mono font-black">
                    {((item.originalPrice || item.price) * item.quantity).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals Summary */}
        {(() => {
          const isTakeaway = printingOrder.type === 'takeaway' || printingOrder.tableNumber === 0;
          const serviceRatePercent = isTakeaway ? 0 : (restaurant?.receiptSettings?.serviceRate ?? 0);
          const taxRatePercent = restaurant?.receiptSettings?.taxRate ?? 0;
          
          const originalSubtotal = printingOrder.items.reduce((acc: number, item: any) => acc + (item.originalPrice || item.price) * item.quantity, 0);
          const currentItemsTotal = printingOrder.items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
          const scheduledDiscount = Math.max(0, originalSubtotal - currentItemsTotal);
          const manualDiscount = printingOrder.discountAmount || 0;
          const totalDiscount = scheduledDiscount + manualDiscount;
          const afterDiscount = Math.max(0, originalSubtotal - totalDiscount);

          const taxAmount = afterDiscount * (taxRatePercent / 100);
          const serviceAmount = afterDiscount * (serviceRatePercent / 100);
          const grandTotal = afterDiscount + taxAmount + serviceAmount;

          return (
            <div className="space-y-1 py-1 border-t border-black">
              {/* Items Subtotal */}
              <div className="flex justify-between font-bold text-[11px]">
                <span>إجمالي الطلبات:</span>
                <span className="font-mono">{formatCurrency(originalSubtotal)}</span>
              </div>
              
              {/* VAT Tax */}
              {taxRatePercent > 0 && (
                <div className="flex justify-between font-bold text-[11px]">
                  <span>الضريبة ({taxRatePercent}%):</span>
                  <span className="font-mono">{formatCurrency(taxAmount)}</span>
                </div>
              )}

              {/* Service Charge */}
              {serviceRatePercent > 0 && (
                <div className="flex justify-between font-bold text-[11px]">
                  <span>الخدمة ({serviceRatePercent}%):</span>
                  <span className="font-mono">{formatCurrency(serviceAmount)}</span>
                </div>
              )}

              {/* Discount under Service charge */}
              {totalDiscount > 0 && (
                <div className="flex justify-between font-bold text-[11px]" style={{ color: '#dc2626' }}>
                  <span>خصم العروض:</span>
                  <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}

              {/* Grand Total - Large & Bold */}
              <div className="flex justify-between text-sm font-black pt-1.5 border-t border-black">
                <span>المبلغ المستحق:</span>
                <span className="font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          );
        })()}

        {/* Welcome Footer Text */}
        <div className="text-center mt-3.5 space-y-1.5">
          {restaurant?.receiptSettings?.footerText && (
            <p className="text-[9.5px] text-zinc-950 font-bold px-2 leading-relaxed">
              {restaurant.receiptSettings.footerText}
            </p>
          )}

          {/* Powered by branded boxed footer */}
          <div style={{ border: '1.5px solid #000', padding: '4px', textAlign: 'center', fontWeight: '900', fontSize: '10px', marginTop: '10px', letterSpacing: '0.5px' }}>
            Powered by: tawla.site
          </div>
          
          {/* Printing Time */}
          <div className="text-[8px] font-bold text-zinc-900 font-mono pt-1">
            وقت الطباعة : {new Date().toLocaleTimeString('ar-EG', { hour12: true })}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
