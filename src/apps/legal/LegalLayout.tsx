import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, FileText, RotateCcw, Mail, MapPin, Phone, Lock } from 'lucide-react';
import logoImg from '../../assets/TAWLA_Logo.png';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalLayout({
  title,
  subtitle,
  lastUpdated = '31 أغسطس 2026',
  children,
}: LegalLayoutProps) {
  const location = useLocation();

  const navLinks = [
    { path: '/refund', label: 'سياسة الاسترجاع والإلغاء', icon: RotateCcw },
    { path: '/privacy', label: 'سياسة الخصوصية وأمان البيانات', icon: Shield },
    { path: '/terms', label: 'الشروط والأحكام العامة', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1612] font-sans antialiased selection:bg-[#801B2C]/15 selection:text-[#801B2C]" dir="rtl">
      {/* Top Notification / Trust Bar */}
      <div className="bg-[#1C1612] text-white/80 py-2.5 px-4 text-[12px] border-b border-white/10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>نظام طاولة معتمد وممتثل لسياسات الدفع الإلكتروني وحماية البيانات في جمهورية مصر العربية</span>
          </div>
          <div className="flex items-center gap-4 text-white/60">
            <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-emerald-400" /> تشفير آمن 256-bit SSL</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#801B2C]/10 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoImg} alt="طاولة - Tawla" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-[19px] font-extrabold text-[#1C1612] tracking-tight" style={{ fontFamily: '"Tajawal", sans-serif' }}>
                طـاولـة <span className="text-[#801B2C]">.</span>
              </span>
              <span className="text-[10px] text-[#5C524C]/70 -mt-1 font-medium">الوثائق القانونية والشروط</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/checkout"
              className="bg-[#801B2C] hover:bg-[#5E1422] text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-[0_4px_16px_rgba(128,27,44,0.2)] transition-all flex items-center gap-2"
            >
              <span>الاشتراك في الباقات</span>
            </Link>
            <Link
              to="/"
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#5C524C] hover:text-[#801B2C] hover:bg-[#801B2C]/5 transition-all flex items-center gap-1.5"
            >
              <span>الرئيسية</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative py-16 px-6 overflow-hidden border-b border-[#801B2C]/10 bg-gradient-to-b from-[#F4EFEB] to-[#FAF8F5]">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[#801B2C]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#801B2C]/10 text-[#801B2C] text-[12px] font-bold mb-3">
              <Shield className="w-3.5 h-3.5" /> وثيقة رسمية معتمدة
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C1612] tracking-tight leading-tight" style={{ fontFamily: '"Tajawal", sans-serif' }}>
              {title}
            </h1>
            <p className="text-[#5C524C] text-[15px] sm:text-[16px] max-w-2xl mx-auto mt-3 leading-relaxed">
              {subtitle}
            </p>
            <div className="pt-2 text-[12px] text-[#5C524C]/70">
              آخر تحديث وتدقيق قانوني: <span className="font-semibold text-[#1C1612]">{lastUpdated}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sub Navigation Bar for Legal Pages */}
      <div className="sticky top-20 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#801B2C]/10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto py-3 no-scrollbar">
          {navLinks.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#801B2C] text-white shadow-md'
                    : 'text-[#5C524C] hover:text-[#801B2C] hover:bg-[#801B2C]/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Document Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-[0_4px_30px_rgba(28,22,18,0.04)] border border-[#801B2C]/10 space-y-10 leading-relaxed text-[15px] text-[#332A24]">
          {children}
        </div>

        {/* Official Contact Card for Legal Inquiries */}
        <div className="mt-10 bg-gradient-to-br from-[#F4EFEB] to-white rounded-3xl p-8 border border-[#801B2C]/15 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#801B2C]/10 flex items-center justify-center text-[#801B2C]">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1C1612]">تواصل مع الفريق القانوني والدعم الفني</h3>
              <p className="text-xs text-[#5C524C]">لأية استفسارات أو طلبات بخصوص الشروط وسياسات الخصوصية والاسترجاع</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-[#801B2C]/10 flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#801B2C] mt-1 shrink-0" />
              <div>
                <span className="text-[11px] text-[#5C524C] block">البريد الإلكتروني الرسمي</span>
                <a href="mailto:support.tawla@gmail.com" className="text-[13px] font-bold text-[#801B2C] hover:underline" dir="ltr">
                  support.tawla@gmail.com
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#801B2C]/10 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#801B2C] mt-1 shrink-0" />
              <div>
                <span className="text-[11px] text-[#5C524C] block">المقر والعنوان الفعلي</span>
                <span className="text-[12px] font-semibold text-[#1C1612] leading-tight block">
                  مركز بلقاس - الدقهلية - جمهورية مصر العربية
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#801B2C]/10 flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#801B2C] mt-1 shrink-0" />
              <div>
                <span className="text-[11px] text-[#5C524C] block">خدمة العملاء والواتساب</span>
                <a href="https://wa.me/201066980953" target="_blank" rel="noreferrer" className="text-[13px] font-bold text-[#1C1612] hover:text-[#801B2C]" dir="ltr">
                  +20 106 698 0953
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-[#801B2C]/10 bg-white px-6 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-[12px] text-[#5C524C]">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="طاولة" className="h-8 w-auto object-contain" />
            <span className="font-bold text-[#1C1612]">طاولة © {new Date().getFullYear()}</span>
            <span className="text-zinc-300">•</span>
            <span>نظام إدارة المطاعم والكافيهات الذكي — جميع الحقوق محفوظة</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link to="/refund" className="hover:text-[#801B2C] transition-colors">سياسة الاسترجاع</Link>
            <Link to="/privacy" className="hover:text-[#801B2C] transition-colors">سياسة الخصوصية</Link>
            <Link to="/terms" className="hover:text-[#801B2C] transition-colors">الشروط والأحكام</Link>
            <Link to="/checkout" className="hover:text-[#801B2C] font-bold transition-colors text-[#801B2C]">الاشتراكات والدفع</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
