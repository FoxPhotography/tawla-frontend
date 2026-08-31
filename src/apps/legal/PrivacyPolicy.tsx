import LegalLayout from './LegalLayout.js';
import { Shield, Lock, Database, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="سياسة الخصوصية وحماية البيانات"
      subtitle="نلتزم في منصة طاولة بأعلى معايير الأمان وحماية خصوصية بيانات المطاعم الشريكة، الموظفين، ورواد المطاعم وفقاً للقوانين المصرية والمعايير الدولية."
    >
      {/* Security Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#801B2C]/10 text-[#801B2C] flex items-center justify-center mx-auto mb-2">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs text-[#1C1612] mb-1">تشفير كامل TLS 1.3</h4>
          <p className="text-[11px] text-[#5C524C]">جميع البيانات منقولة عبر بروتوكولات مشفرة وآمنة تماماً.</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#801B2C]/10 text-[#801B2C] flex items-center justify-center mx-auto mb-2">
            <Shield className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs text-[#1C1612] mb-1">معايير PCI-DSS</h4>
          <p className="text-[11px] text-[#5C524C]">لا نخزن بيانات البطاقات البنكية ويتم الدفع عبر بوابات مرخصة.</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#801B2C]/10 text-[#801B2C] flex items-center justify-center mx-auto mb-2">
            <Database className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs text-[#1C1612] mb-1">عزل بيانات المطاعم</h4>
          <p className="text-[11px] text-[#5C524C]">نظام Multi-tenant يضمن عزل وسرية بيانات كل مطعم.</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#801B2C]/10 text-[#801B2C] flex items-center justify-center mx-auto mb-2">
            <FileCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs text-[#1C1612] mb-1">قانون 151 لسنة 2020</h4>
          <p className="text-[11px] text-[#5C524C]">امتثال كامل لقانون حماية البيانات الشخصية المصري.</p>
        </div>
      </div>

      <hr className="border-[#801B2C]/10 my-6" />

      {/* 1. المقدمة */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">1</span>
          المقدمة ونطاق التطبيق
        </h2>
        <p className="text-[#5C524C]">
          تعتبر خصوصية وأمان بياناتك وبيانات عملائك من أسمى أولوياتنا في منصة <strong>طاولة (Tawla)</strong>. تشرح هذه السياسة كيفية جمع، استخدام، وحماية المعلومات عند استخدامك لموقعنا الإلكتروني، تطبيقات الإدارة، أو قوائم الطعام الرقمية (QR Menu).
        </p>
      </section>

      {/* 2. البيانات التي نجمعها */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">2</span>
          البيانات التي نقوم بجمعها
        </h2>
        <div className="space-y-3 text-sm text-[#4A4039]">
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10">
            <h3 className="font-bold text-[#1C1612] mb-1">أ. بيانات حساب المطعم والاشتراك:</h3>
            <p className="text-xs text-[#5C524C]">الاسم التجاري للمطعم، اسم المدير المسؤول، البريد الإلكتروني، رقم الهاتف، العنوان الفعلي، وبيانات الفواتير.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10">
            <h3 className="font-bold text-[#1C1612] mb-1">ب. بيانات التشغيل وقوائم الطعام:</h3>
            <p className="text-xs text-[#5C524C]">أصناف الطعام، الأسعار، صور المنتجات، عدد الطاولات، وحركات الطلبات المسجلة في صالة المطعم أو الدليفري.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#801B2C]/10">
            <h3 className="font-bold text-[#1C1612] mb-1">ج. بيانات عملاء ورواد المطاعم (Customers):</h3>
            <p className="text-xs text-[#5C524C]">عند قيام العميل بالطلب عبر المنيو الرقمي، قد نجمع بيانات اختيارية (الاسم، رقم الهاتف لتأكيد الطلب أو برامج الولاء، وعنوان التوصيل لطلبات الدليفري) لغرض تنفيذ الطلب لصالح المطعم المعني فقط.</p>
          </div>
        </div>
      </section>

      {/* 3. أمان المدفوعات والبطاقات البنكية */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">3</span>
          أمان المدفوعات والبطاقات البنكية (Payment Processing & Security)
        </h2>
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 text-sm text-emerald-950 space-y-2">
          <p className="font-bold text-emerald-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700" /> لا نخزن أي بيانات حساسة للبطاقات:
          </p>
          <p className="leading-relaxed text-xs">
            تؤكد منصة طاولة أنها <strong>لا تقوم على الإطلاق بتخزين أو تسجيل أو معالجة أرقام البطاقات الائتمانية أو رموز الأمان (CVV)</strong> على خوادمها الخاصة.
          </p>
          <p className="leading-relaxed text-xs">
            تتم كافة المعاملات المالية واشتراكات الباقات عبر بوابات دفع إلكترونية معتمدة ومرخصة من البنك المركزي المصري (بما فيها بوابة <strong>فواتيرك - Fawaterk</strong>) والحاصلة على شهادات الأمان العالمية المرموقة <strong>PCI-DSS Level 1</strong> بأعلى درجات التشفير والامتثال البنكي.
          </p>
        </div>
      </section>

      {/* 4. كيف نستخدم بياناتك */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">4</span>
          أغراض استخدام البيانات
        </h2>
        <ul className="space-y-2 pr-4 text-sm text-[#4A4039] list-disc marker:text-[#801B2C]">
          <li>تقديم وتشغيل خدمات المنصة (المنيو الإلكتروني، شاشات المطبخ، لوحات التحكم).</li>
          <li>إصدار الفواتير الإلكترونية وإدارة الاشتراكات والتجديدات.</li>
          <li>تقديم الدعم الفني، التدريب، وتحديثات النظام.</li>
          <li>منع عمليات الاحتيال وضمان استقرار وحماية النظام التقني.</li>
          <li><strong>نلتزم بعدم بيع، تأجير، أو مشاركة بياناتك مع أي طرف ثالث لأغراض إعلانية دون موافقتك الصريحة.</strong></li>
        </ul>
      </section>

      {/* 5. حقوق المستخدمين وأصحاب المطاعم */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">5</span>
          حقوقك والتحكم في البيانات (Your Data Rights)
        </h2>
        <p className="text-sm text-[#5C524C]">
          بموجب قانون حماية البيانات الشخصية، يحق لك دائماً:
        </p>
        <ul className="space-y-2 pr-4 text-sm text-[#4A4039] list-disc marker:text-[#801B2C]">
          <li>الوصول إلى نسختك من بيانات المنيو والمبيعات المسجلة وتصديرها.</li>
          <li>تعديل أو تصحيح بيانات الحساب والمطعم في أي وقت.</li>
          <li>طلب حذف الحساب وجميع البيانات المرتبطة به نهائياً عند إنهاء التعاقد.</li>
        </ul>
      </section>

      {/* 6. مسؤول حماية البيانات والتواصل */}
      <section className="space-y-3 pt-4">
        <h2 className="text-xl font-bold text-[#1C1612] flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#801B2C]/10 text-[#801B2C] text-sm flex items-center justify-center font-bold">6</span>
          التواصل بخصوص الخصوصية
        </h2>
        <p className="text-sm text-[#5C524C]">
          لممارسة حقوقك أو تقديم أية استفسارات متعلقة بسياسة الخصوصية وحماية البيانات:
        </p>
        <div className="p-4 rounded-2xl bg-[#F4EFEB] text-sm space-y-1">
          <p><strong>مسؤول الخصوصية:</strong> إدارة أمن المعلومات بمنصة طاولة</p>
          <p><strong>البريد الإلكتروني المباشر:</strong> <span className="font-mono text-[#801B2C]" dir="ltr">support.tawla@gmail.com</span></p>
          <p><strong>المقر:</strong> مركز بلقاس - محافظة الدقهلية - جمهورية مصر العربية</p>
        </div>
      </section>

      <div className="pt-6 flex items-center justify-between flex-wrap gap-4 border-t border-[#801B2C]/10">
        <Link to="/terms" className="text-xs text-[#801B2C] hover:underline font-semibold">
          الانتقال إلى الشروط والأحكام العامة ←
        </Link>
        <Link to="/refund" className="text-xs text-[#801B2C] hover:underline font-semibold">
          الانتقال إلى سياسة الاسترجاع والإلغاء ←
        </Link>
      </div>
    </LegalLayout>
  );
}
