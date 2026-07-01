import { createPortal } from 'react-dom';

interface ReceiptPrintTemplateProps {
  printingOrder: any | null;
  restaurant: any;
}

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
            font-family: 'Segoe UI', System-UI, sans-serif !important;
            width: 80mm !important;
          }
          #root, header, aside, main, footer, .toast, .no-print, [role="dialog"] {
            display: none !important;
          }
          .print-receipt-container {
            display: block !important;
            width: 80mm !important;
            margin: 0 auto !important;
            padding: 6mm 4mm !important;
            box-sizing: border-box !important;
            background: white !important;
          }
        }
      `}} />
      <div className="print-receipt-container hidden print:block text-black bg-white leading-relaxed text-[11px]" dir="rtl" style={{ fontFamily: "'Segoe UI', sans-serif" }}>
        {/* Header Welcome banner */}
        <div className="text-center border-b-2 border-double border-black pb-3 mb-3">
          {/* Logo if active */}
          {restaurant?.receiptSettings?.showLogo && restaurant?.logo?.url && (
            <div className="mb-2">
              <img src={restaurant.logo.url} alt="logo" className="mx-auto max-h-16 object-contain rounded-md" />
            </div>
          )}
          {/* Restaurant Name */}
          <h1 className="text-base font-extrabold tracking-tight uppercase mb-0.5 text-black">{restaurant?.name}</h1>
          {/* Header Text */}
          {restaurant?.receiptSettings?.headerText && (
            <p className="text-[10px] text-zinc-800 leading-tight mt-1 max-w-[90%] mx-auto font-medium">{restaurant.receiptSettings.headerText}</p>
          )}
        </div>

        {/* Receipt title */}
        <div className="text-center font-bold text-[12px] tracking-widest my-2 border-b border-dashed border-black pb-2">
          *** فـاتـورة حـسـاب ***
        </div>

        {/* Metadata Info */}
        <table className="w-full text-right text-[10px] mb-3 leading-normal border-b border-dashed border-black pb-2.5">
          <tbody>
            <tr>
              <td className="py-0.5 font-bold text-zinc-700 w-[75px]">رقم الطلب:</td>
              <td className="py-0.5 font-mono font-bold text-black">#{printingOrder.id.slice(-6).toUpperCase()}</td>
            </tr>
            {printingOrder.customerName && (
              <tr>
                <td className="py-0.5 font-bold text-zinc-700">الزبون:</td>
                <td className="py-0.5 font-bold text-black">{printingOrder.customerName}</td>
              </tr>
            )}
            <tr>
              {printingOrder.type === 'delivery' ? (
                <>
                  <td className="py-0.5 font-bold text-zinc-700">نوع الطلب:</td>
                  <td className="py-0.5 font-bold text-black">دليفري</td>
                </>
              ) : printingOrder.type === 'takeaway' ? (
                <>
                  <td className="py-0.5 font-bold text-zinc-700">نوع الطلب:</td>
                  <td className="py-0.5 font-bold text-black">تيك أواي</td>
                </>
              ) : (
                <>
                  <td className="py-0.5 font-bold text-zinc-700">رقم الطاولة:</td>
                  <td className="py-0.5 font-bold text-black">طاولة {printingOrder.tableNumber}</td>
                </>
              )}
            </tr>
            <tr>
              <td className="py-0.5 font-bold text-zinc-700">التاريخ:</td>
              <td className="py-0.5 text-zinc-900 font-mono text-[9.5px]">
                {new Date(printingOrder.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
              </td>
            </tr>
            {restaurant?.receiptSettings?.phone && (
              <tr>
                <td className="py-0.5 font-bold text-zinc-700">الهاتف:</td>
                <td className="py-0.5 font-mono text-zinc-900">{restaurant.receiptSettings.phone}</td>
              </tr>
            )}
            {restaurant?.receiptSettings?.address && (
              <tr>
                <td className="py-0.5 font-bold text-zinc-700">العنوان:</td>
                <td className="py-0.5 text-zinc-900">{restaurant.receiptSettings.address}</td>
              </tr>
            )}
            {restaurant?.receiptSettings?.taxNumber && (
              <tr>
                <td className="py-0.5 font-bold text-zinc-700">الرقم الضريبي:</td>
                <td className="py-0.5 font-mono text-zinc-900">{restaurant.receiptSettings.taxNumber}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Items Table */}
        <table className="w-full text-right text-[10px] my-3 border-b-2 border-double border-black pb-3">
          <thead>
            <tr className="border-b border-dashed border-black text-[10px] text-zinc-800 font-black">
              <th className="pb-1.5 text-right">الصنف</th>
              <th className="pb-1.5 text-center w-12">الكمية</th>
              <th className="pb-1.5 text-left w-24">السعر</th>
            </tr>
          </thead>
          <tbody>
            {printingOrder.items.map((item: any, idx: number) => (
              <tr key={idx} className="font-bold border-b border-zinc-100 last:border-b-0">
                <td className="py-2 pr-1">
                  <div className="leading-tight text-black">{item.name}</div>
                  {item.notes && (
                    <div className="text-[8.5px] text-zinc-700 mr-2 mt-0.5 font-medium leading-tight">
                      * ملاحظة: {item.notes}
                    </div>
                  )}
                </td>
                <td className="py-2 text-center font-mono text-[11px] font-black text-black">{item.quantity}</td>
                <td className="py-2 text-left font-mono text-[11px] font-black text-black">{item.price * item.quantity} ج.م</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        {(() => {
          const isTakeaway = printingOrder.type === 'takeaway' || printingOrder.tableNumber === 0;
          const serviceRatePercent = isTakeaway ? 0 : (restaurant?.receiptSettings?.serviceRate ?? 0);
          const taxRatePercent = restaurant?.receiptSettings?.taxRate ?? 0;
          
          const subtotal = printingOrder.totalAmount;
          const taxAmount = subtotal * (taxRatePercent / 100);
          const serviceAmount = subtotal * (serviceRatePercent / 100);
          const grandTotal = subtotal + taxAmount + serviceAmount;

          return (
            <>
              <div className="space-y-1.5 font-bold text-[10px] pr-1 py-1 border-b border-dashed border-black pb-3">
                <div className="flex justify-between">
                  <span className="text-zinc-700">الإجمالي الفرعي:</span>
                  <span className="font-mono text-black">{subtotal} ج.م</span>
                </div>
                {taxRatePercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-700">ضريبة القيمة المضافة ({taxRatePercent}%):</span>
                    <span className="font-mono text-black">{taxAmount.toFixed(1)} ج.م</span>
                  </div>
                )}
                {serviceRatePercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-700">رسوم الخدمة ({serviceRatePercent}%):</span>
                    <span className="font-mono text-black">{serviceAmount.toFixed(1)} ج.م</span>
                  </div>
                )}
              </div>

              {/* Net Grand Total */}
              <div className="flex justify-between text-[13px] font-black py-2.5 my-1 border-b-2 border-double border-black">
                <span>الإجمالي الكلي:</span>
                <span className="font-mono text-black">{grandTotal.toFixed(1)} ج.م</span>
              </div>
            </>
          );
        })()}

        {/* Welcome Footer Text */}
        <div className="text-center mt-4 space-y-2">
          {restaurant?.receiptSettings?.footerText && (
            <p className="text-[9.5px] text-zinc-800 font-bold px-2 leading-relaxed">
              {restaurant.receiptSettings.footerText}
            </p>
          )}
          
          <div className="text-[8px] text-zinc-500 font-medium tracking-wider pt-2">
            نظام إدارة المنيو الذكي - Tawla OS
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
