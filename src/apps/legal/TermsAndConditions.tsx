import LegalLayout from './LegalLayout.js';
import { Link } from 'react-router-dom';

export default function TermsAndConditions() {
  return (
    <LegalLayout
      title="الشروط والأحكام العامة"
      subtitle="اتفاقية شروط استخدام منصة وخدمات طاولة (Tawla) لإدارة المطاعم والكافيهات وتنظيم العلاقة القانونية بين المنصة والمشتركين."
    >
      {/* Overview Card */}
      <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10 text-sm text-[#4A4039] leading-relaxed">
        أهلاً بك في <strong>طاولة (Tawla)</strong>. باستخدامك لموقعنا الإلكتروني أو تسجيل حساب مطعم أو الاشتراك في أي من باقاتنا وخدماتنا، فإنك تقر وتوافق صراحة على الالتزام بجميع بنود وشروط هذه الاتفاقية وسياسة الاسترجاع وسياسة الخصوصية المكملة لها.
      </div>

      <hr className="border-[#801B2C]/10 my-6" />

      {/* 1. التعريفات */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">1</span>
          التعريفات الأساسية
        </h2>
        <ul className="space-y-2 pr-4 text-sm text-[#4A4039] list-disc marker:text-[#801B2C]">
          <li><strong>المنصة / طاولة:</strong> نظام ومنظومة طاولة لإدارة المطاعم والكافيهات السحابية ومواقع وقوائم الطعام التابعة لها.</li>
          <li><strong>المشترك / العميل:</strong> صاحب المطعم أو الكافيه أو الشخص المخول نظامياً بإنشاء الحساب والاشتراك في الخدمة.</li>
          <li><strong>الخدمة:</strong> برمجيات إدارة الطلبات، المنيو الرقمي (QR Code)، لوحات تحكم المطبخ والصالة، والتقارير التحليلية المقدمة كخدمة سحابية (SaaS).</li>
        </ul>
      </section>

      {/* 2. الحساب والتسجيل */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">2</span>
          إنشاء الحساب وأمان بيانات الدخول
        </h2>
        <ul className="space-y-2 pr-4 text-sm text-[#4A4039] list-disc marker:text-[#801B2C]">
          <li>يلتزم المشترك بتقديم معلومات صحيحة ودقيقة ومحدثة عند إنشاء الحساب (اسم المطعم، البريد الإلكتروني، رقم الهاتف، والبيانات الجغرافية).</li>
          <li>يتحمل المشترك كامل المسؤولية عن الحفاظ على سرية كلمات المرور وبيانات دخول موظفيه ومديريه، ويتحمل مسؤولية كافة العمليات التي تتم من خلال حسابه.</li>
        </ul>
      </section>

      {/* 3. الاشتراكات، الأسعار، والدفع */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">3</span>
          الاشتراكات، الأسعار، وبوابات الدفع
        </h2>
        <div className="space-y-3 text-sm text-[#4A4039]">
          <p>
            تتيح المنصة خطط اشتراك متنوعة (مثل: باقة Basic وباقة Pro) مع إمكانية الدفع الشهري أو السنوي وفقاً للأسعار المعلنة بالجنيه المصري (EGP).
          </p>
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10 space-y-2 text-xs">
            <p><strong>• الفترة التجريبية:</strong> نوفر تجربة مجانية بالكامل لمدة 14 يوماً لباقة Trial Plan لاختبار المنصة.</p>
            <p><strong>• التجديد وسداد الرسوم:</strong> بعد انتهاء التجربة المجانية، يتم سداد قيمة الباقة عبر بوابات الدفع الإلكتروني المعتمدة (بما فيها بوابة فواتيرك عبر البطاقات البنكية، المحافظ الإلكترونية، إنستاباي، أو فوري).</p>
            <p><strong>• عدم الاسترجاع:</strong> تسري أحكام <Link to="/refund" className="text-[#801B2C] font-bold underline">سياسة الاسترجاع والإلغاء</Link> المعتمدة، حيث لا يمكن استرداد المبالغ المسددة بعد تفعيل الخطة المدفوعة، مع حق العميل في إلغاء التجديد التلقائي في أي وقت.</p>
          </div>
        </div>
      </section>

      {/* 4. الاستخدام المقبول والمحظور */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">4</span>
          ضوابط الاستخدام المقبول والمحظورات
        </h2>
        <p className="text-sm text-[#5C524C]">
          يتعهد المشترك بعدم استخدام منصة طاولة في أي من الأغراض التالية:
        </p>
        <ul className="space-y-2 pr-4 text-sm text-[#4A4039] list-disc marker:text-[#801B2C]">
          <li>نشر أو ترويج محتوى مخالف للقوانين واللوائح المعمول بها في جمهورية مصر العربية.</li>
          <li>محاولة اختراق النظام أو إجراء هندسة عكسية (Reverse Engineering) أو تعطيل خوادم المنصة.</li>
          <li>إعادة بيع أو تأجير حساب المنصة لطرف ثالث غير مصرح له دون موافقة خطية مسبقة.</li>
        </ul>
      </section>

      {/* 5. الملكية الفكرية */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">5</span>
          حقوق الملكية الفكرية
        </h2>
        <p className="text-sm text-[#5C524C] leading-relaxed">
          جميع حقوق الملكية الفكرية، العلامات التجارية، الكود البرمجي، والتصاميم الخاصة بمنصة طاولة هي ملكية حصرية للمنصة ومحمية بموجب قوانين حماية الملكية الفكرية. يحتفظ المشترك بملكية محتواه الخاص (قوائم الطعام، الشعارات، والأسعار الخاصة به).
        </p>
      </section>

      {/* 6. إتاحة الخدمة وحدود المسؤولية */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">6</span>
          إتاحة الخدمة (Service Availability & SLA)
        </h2>
        <p className="text-sm text-[#5C524C] leading-relaxed">
          نبذل قصارى جهدنا لضمان استمرارية تشغيل النظام على مدار الساعة بنسبة إتاحة لا تقل عن 99.8%. لا تتحمل المنصة المسؤولية عن الانقطاعات الناتجة عن أعطال شبكات الاتصال المحلية لدى المشترك أو أعمال الصيانة الدورية المجدولة مسبقاً.
        </p>
      </section>

      {/* 7. القانون الحاكم والاختصاص القضائي */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">7</span>
          القانون الواجب التطبيق والاختصاص القضائي
        </h2>
        <p className="text-sm text-[#5C524C] leading-relaxed">
          تخضع هذه الاتفاقية وتفسر وفقاً للقوانين السارية في <strong>جمهورية مصر العربية</strong>. وفي حال نشوء أي نزاع قانوني، ينعقد الاختصاص القضائي الحصري للمحاكم المختصة بجمهورية مصر العربية.
        </p>
      </section>

      {/* 8. معلومات التواصل */}
      <section className="space-y-3 pt-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">8</span>
          معلومات التواصل الرسمية
        </h2>
        <div className="p-4 rounded-2xl bg-[#F4EFEB] text-sm space-y-1">
          <p><strong>البريد الإلكتروني:</strong> <span className="font-mono text-[#801B2C]" dir="ltr">support.tawla@gmail.com</span></p>
          <p><strong>المقر الرئيسي:</strong> مركز بلقاس - محافظة الدقهلية - جمهورية مصر العربية</p>
          <p><strong>هاتف وواتساب الدعم:</strong> <span className="font-mono" dir="ltr">+201066980953</span></p>
        </div>
      </section>

      <div className="pt-6 flex items-center justify-between flex-wrap gap-4 border-t border-[#801B2C]/10">
        <Link to="/checkout" className="bg-[#801B2C] hover:bg-[#5E1422] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all">
          الانتقال لصفحة الاشتراك والدفع
        </Link>
        <Link to="/refund" className="text-xs text-[#801B2C] hover:underline font-semibold">
          مراجعة سياسة الاسترجاع والإلغاء ←
        </Link>
      </div>
    </LegalLayout>
  );
}
