import LegalLayout from './LegalLayout.js';
import { CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RefundPolicy() {
  return (
    <LegalLayout
      title="سياسة الاسترجاع والإلغاء"
      subtitle="توضح هذه السياسة حقوق المشتركين بخصوص الفترة التجريبية المجانية، شروط سداد الاشتراكات، وسياسات إلغاء وتجديد الباقات في منصة طاولة."
    >
      {/* Quick Summary Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-950">
          <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-800">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>14 يوماً تجربة مجانية</span>
          </div>
          <p className="text-xs text-emerald-800/90 leading-relaxed">
            استمتع بكافة مميزات المنصة مجاناً بالكامل لمدة 14 يوماً لاختبار النظام في مطعمك دون دفع أي رسوم.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950">
          <div className="flex items-center gap-2 font-bold text-sm mb-1 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>إلغاء الاشتراك بأي وقت</span>
          </div>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            لك كامل الحرية في إلغاء التجديد التلقائي للاشتراك في أي لحظة مباشرة من لوحة التحكم وبدون تعقيدات.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-950">
          <div className="flex items-center gap-2 font-bold text-sm mb-1 text-rose-800">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>سياسة عدم الاسترجاع بعد التفعيل</span>
          </div>
          <p className="text-xs text-rose-800/90 leading-relaxed">
            بعد انقضاء الـ 14 يوماً المجانية وبدء الاشتراك المدفوع لا يتوفر استرجاع للمبالغ، مع استمرار الخدمة لنهاية المدة.
          </p>
        </div>
      </div>

      <hr className="border-[#801B2C]/10 my-6" />

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">1</span>
          الفترة التجريبية المجانية (14 Days Free Trial)
        </h2>
        <p className="text-[#5C524C]">
          تتيح منصة <strong>طاولة (Tawla)</strong> لجميع المطاعم والكافيهات الجديدة إمكانية تجربة المنصة بكافة خصائصها ومميزاتها مجاناً بالكامل لمدة <strong>14 يوماً تقويمياً (Trial Plan)</strong> تبدأ من تاريخ إنشاء الحساب.
        </p>
        <ul className="space-y-2 pr-4 text-sm text-[#4A4039] list-disc marker:text-[#801B2C]">
          <li>لا يتم فرض أي رسوم إجبارية أثناء فترة الـ 14 يوماً التجريبية.</li>
          <li>تتيح الفترة التجريبية لصاحب المطعم وفريق العمل فحص جميع الموديلات (المنيو الرقمي بالباركود، إدارة الطاولات، نظام المطبخ والكاشير، وتجربة تجاوب النظام).</li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">2</span>
          التحويل للخطط المدفوعة وسداد الرسوم
        </h2>
        <p className="text-[#5C524C]">
          عند انتهاء فترة الـ 14 يوماً المجانية، ورغبة العميل في استمرار الاستفادة من خدمات منصة طاولة، يتم الترقية إلى إحدى الباقات المدفوعة (مثل: باقة Basic أو باقة Pro):
        </p>
        <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#801B2C]/10 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#801B2C] mt-0.5 shrink-0" />
            <span>يتم تحصيل قيمة الاشتراك المحددة للباقة بالجنيه المصري (EGP) عبر بوابات الدفع الإلكتروني المعتمدة (بما في ذلك بوابة <strong>فواتيرك - Fawaterk</strong> عبر البطاقات البنكية، المحافظ الإلكترونية، إنستاباي، أو فوري).</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#801B2C] mt-0.5 shrink-0" />
            <span>طالما لم يقم العميل بإلغاء حسابه أو طلب إيقاف الخدمة أثناء الـ 14 يوماً التجريبية وتم الانتقال للخطة المدفوعة، يعتبر ذلك موافقة صريحة على تفعيل الاشتراك وسداد الرسوم.</span>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">3</span>
          سياسة عدم الاسترجاع (No Refund Policy)
        </h2>
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 text-sm text-rose-950 space-y-2">
          <p className="font-bold text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" /> تنبيه هام بخصوص المبالغ المسددة:
          </p>
          <p className="leading-relaxed">
            نظراً لأن منصة طاولة تقدم فترة تجريبية مجانية كافية (14 يوماً) قبل سداد أي مبلغ، فإنه <strong>لا يحق للمشترك طلب استرداد أي مبالغ مالية</strong> تم دفعها بعد تفعيل الخطة المدفوعة أو بعد انتهاء فترة التجربة المجانية.
          </p>
        </div>
        <p className="text-sm text-[#5C524C]">
          في حال قرر المشترك عدم الرغبة في الاستمرار بعد الدفع، يظل حسابه نشطاً ومتاحاً للاستخدام بجميع صلاحيات الباقة حتى نهاية الفترة الزمنية التي تم سدادها (شهر أو سنة)، ولن يتم رد القيمة المتبقية من المدة.
        </p>
      </section>

      {/* Section 4 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">4</span>
          ترقية وتغيير الباقات (Plan Upgrades & Downgrades)
        </h2>
        <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#801B2C]/10 space-y-3 text-sm text-[#5C524C]">
          <p className="leading-relaxed">
            يحق للمشترك في أي وقت ترقية باقته الحالية (مثلاً: من Basic إلى Pro) أو تخفيضها أو الانتقال بين دورات الفوترة (شهري / سنوي).
          </p>
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">⚠️ تنبيه احتساب المدة وسياسة عدم استرداد المتبقي:</p>
            <p className="leading-relaxed">
              عند سداد رسوم الباقة الجديدة، يبدأ سريان وصلاحية الخطة الجديدة فوراً (لمدة شهر أو سنة كاملة) من تاريخ السداد، ويتم إلغاء واستبدال أي فترة أو أيام متبقية من الباقة السابقة تلقائياً دون استحقاق أي استرداد مالي أو تعويض عن المدة المتبقية.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">5</span>
          إلغاء الاشتراك وإيقاف التجديد التلقائي
        </h2>
        <p className="text-[#5C524C]">
          يحق لأي مطعم مشترك إلغاء اشتراكه في أي وقت باتباع الخطوات البسيطة التالية:
        </p>
        <ol className="space-y-2 pr-4 text-sm text-[#4A4039] list-decimal marker:text-[#801B2C]">
          <li>الدخول إلى لوحة تحكم المطعم (Admin Dashboard) والانتقال إلى قسم <strong>الاشتراكات والفواتير</strong>.</li>
          <li>الضغط على خيار <strong>"إلغاء التجديد التلقائي"</strong> أو إرسال طلب للدعم الفني عبر البريد الإلكتروني أو الواتساب.</li>
          <li>عند الإلغاء، لن يتم خصم أية مبالغ جديدة في دورة الفوترة القادمة، ويبقى حساب المطعم نشطاً حتى تاريخ انتهاء الاشتراك الحالي.</li>
        </ol>
      </section>

      {/* Section 6 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">6</span>
          استثناءات الأخطاء التقنية والخصم المزدوج
        </h2>
        <p className="text-[#5C524C]">
          الحالة الوحيدة التي يتم فيها رد المبالغ هي حدوث <strong>خطأ تقني مؤكد</strong> في بوابة الدفع، مثل:
        </p>
        <ul className="space-y-2 pr-4 text-sm text-[#4A4039] list-disc marker:text-[#801B2C]">
          <li>خصم قيمة الفاتورة أكثر من مرة عن نفس المعاملة (Duplicate Transaction / Double Billing).</li>
          <li>خصم مبلغ بالخطأ دون تفعيل الحساب أو تجديده بسبب عطل فني في بوابة الدفع.</li>
        </ul>
        <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#801B2C]/10 text-xs text-[#5C524C] leading-relaxed">
          في هذه الحالات، يجب على المشترك إرسال إشعار الخصم ورقم المعاملة إلى <a href="mailto:support.tawla@gmail.com" className="text-[#801B2C] font-bold underline" dir="ltr">support.tawla@gmail.com</a> خلال 48 ساعة من العملية. يتم فحص المعاملة ورد المبلغ الزائد إلى نفس وسيلة الدفع الأصلية خلال مدة تتراوح بين <strong>7 إلى 14 يوم عمل</strong> وفقاً لسياسات البنك المصدر للبطاقة.
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-3 pt-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">6</span>
          تواصل معنا
        </h2>
        <p className="text-sm text-[#5C524C]">
          إذا كان لديك أي استفسار بشأن سياسة الاسترجاع والإلغاء، يرجى مراسلتنا:
        </p>
        <div className="p-4 rounded-2xl bg-[#F4EFEB] text-sm space-y-1">
          <p><strong>البريد الإلكتروني:</strong> <span className="font-mono text-[#801B2C]" dir="ltr">support.tawla@gmail.com</span></p>
          <p><strong>المقر:</strong> مركز بلقاس - محافظة الدقهلية - جمهورية مصر العربية</p>
          <p><strong>هاتف وواتساب الدعم:</strong> <span className="font-mono" dir="ltr">+201066980953</span></p>
        </div>
      </section>

      <div className="pt-6 flex items-center justify-between flex-wrap gap-4 border-t border-[#801B2C]/10">
        <Link to="/checkout" className="bg-[#801B2C] hover:bg-[#5E1422] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all">
          ابدأ تجربتك المجانية 14 يوماً الآن
        </Link>
        <Link to="/privacy" className="text-xs text-[#801B2C] hover:underline font-semibold">
          الانتقال إلى سياسة الخصوصية وأمان البيانات ←
        </Link>
      </div>
    </LegalLayout>
  );
}
