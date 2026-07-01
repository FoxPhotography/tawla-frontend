import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Crown, Sparkles, BarChart3, Clock, ShoppingBag, MapPin, ArrowUpRight } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../../shared/store/authStore';

// Heatmap Matrix Generator Helper
const generateHeatmapMatrix = (peakHours: any[]) => {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days.map((day, dayIdx) => {
    const targetDayOfWeek = dayIdx + 1;
    return {
      day,
      hours: Array.from({ length: 24 }).map((_, hour) => {
        const peakMatched = peakHours ? peakHours.find(
          (h: any) => h.dayOfWeek === targetDayOfWeek && h.hour === hour
        ) : null;
        return peakMatched ? peakMatched.ordersCount : 0;
      })
    };
  });
};

export default function AnalyticsTab() {
  const { restaurant } = useAuthStore();
  const plan = restaurant?.subscription?.plan || 'trial';
  const isLocked = plan !== 'pro';

  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [densityViewMode, setDensityViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [densitySelectedDayIdx, setDensitySelectedDayIdx] = useState(0);

  // Queries (only active if unlocked to avoid wasted backend loads)
  const { data: salesData = { sales: [], totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 } } = useQuery({
    queryKey: ['admin-analytics-sales', period],
    queryFn: async () => {
      const res = await api.get(`/analytics/sales?period=${period}`);
      return res.data.data;
    },
    enabled: !isLocked,
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ['admin-analytics-products'],
    queryFn: async () => {
      const res = await api.get('/analytics/products?limit=5');
      return res.data.data;
    },
    enabled: !isLocked,
  });

  const { data: tableStats = [] } = useQuery({
    queryKey: ['admin-analytics-tables'],
    queryFn: async () => {
      const res = await api.get('/analytics/tables');
      return res.data.data;
    },
    enabled: !isLocked,
  });

  const { data: peakHours = [] } = useQuery({
    queryKey: ['admin-analytics-peak-hours'],
    queryFn: async () => {
      const res = await api.get('/analytics/peak-hours');
      return res.data.data;
    },
    enabled: !isLocked,
  });

  if (isLocked) {
    return (
      <div className="relative border border-admin-border bg-admin-bg-elevated rounded-2xl p-8 text-center max-w-2xl mx-auto my-12 overflow-hidden shadow-admin-card text-right" dir="rtl">
        {/* Decorative elements */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-admin-accent/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-admin-accent/15 rounded-full blur-2xl" />

        <div className="w-16 h-16 rounded-2xl bg-admin-accent/15 flex items-center justify-center mx-auto mb-6 text-admin-accent">
          <Crown className="w-8 h-8 animate-bounce" />
        </div>

        <h3 className="font-extrabold text-admin-text-primary text-lg mb-2">قسم التقارير والتحليلات البيعية مغلق</h3>
        <p className="text-xs text-admin-text-secondary leading-relaxed max-w-md mx-auto mb-8 font-semibold">
          عذراً، تتوفر إحصائيات المبيعات، ومخططات الأداء، وتقارير أوقات الذروة بشكل حصري لمشتركي الباقة الاحترافية <strong className="text-admin-accent font-black">PRO</strong>.
        </p>

        <div className="bg-admin-bg-subtle p-5 rounded-xl text-xs space-y-3 font-semibold text-admin-text-secondary max-w-sm mx-auto mb-8 border border-admin-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-admin-accent" />
            <span>مخططات تفاعلية لحجم المبيعات والأرباح اليومية والسنوية</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-admin-accent" />
            <span>خريطة ذروة الطلبات لتنظيم نوبات عمل الكاشير والمطبخ</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-admin-accent" />
            <span>تحليلات أكثر الأصناف مبيعاً ومعدلات إشغال الطاولات</span>
          </div>
        </div>

        <div className="p-3 bg-admin-bg-subtle text-[11px] text-zinc-400 rounded-lg max-w-xs mx-auto leading-relaxed border border-admin-border">
          لتفعيل هذا القسم فوراً، توجه لعلامة تبويب <strong>الاشتراك</strong> لتفعيل ترقية حسابك.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header & Period selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-admin-text-primary">لوحة التقارير والتحليلات البيعية</h2>
          <p className="text-xs text-admin-text-secondary mt-1">شاشات تفاعلية لرصد حركة مبيعات المطعم</p>
        </div>
        <div className="flex bg-admin-bg-subtle p-1 rounded-xl border border-admin-border">
          {(['day', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === p
                  ? 'bg-admin-accent text-white shadow-sm'
                  : 'text-admin-text-secondary hover:text-admin-text-primary'
              }`}
            >
              {p === 'day' ? 'اليوم' : p === 'week' ? 'هذا الأسبوع' : p === 'month' ? 'هذا الشهر' : 'السنة'}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-admin-text-secondary">
            <span className="text-xs font-bold">إجمالي المبيعات</span>
            <BarChart3 className="w-4.5 h-4.5 text-admin-accent" />
          </div>
          <h3 className="text-xl font-black text-admin-text-primary font-mono">{salesData.totalRevenue} ج.م</h3>
        </div>

        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-admin-text-secondary">
            <span className="text-xs font-bold">عدد الطلبات المكتملة</span>
            <ShoppingBag className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-admin-text-primary font-mono">{salesData.totalOrders} طلب</h3>
        </div>

        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-admin-text-secondary">
            <span className="text-xs font-bold">متوسط قيمة الطلب الواحد</span>
            <ArrowUpRight className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <h3 className="text-xl font-black text-admin-text-primary font-mono">{Math.round(salesData.averageOrderValue)} ج.م</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart Card */}
        <div className="lg:col-span-2 bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-admin-text-primary text-sm mb-4">مخطط حجم المبيعات الإجمالي</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData.sales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c5a85c" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#c5a85c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis dataKey="label" stroke="#8c95a5" fontSize={10} tickLine={false} />
                <YAxis stroke="#8c95a5" fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#c5a85c" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top selling items */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-admin-text-primary text-sm mb-4">الأكثر طلباً ومبيعاً</h3>
          <div className="space-y-3.5 flex-1 overflow-y-auto">
            {topProducts.length === 0 ? (
              <p className="text-xs text-admin-text-muted text-center py-10">لا توجد مبيعات مسجلة حتى الآن.</p>
            ) : (
              topProducts.map((p: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-xs py-2 border-b border-admin-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-400 font-mono font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-admin-text-primary">{p.name}</span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-admin-accent font-bold block">{p.quantity} طلب</span>
                    <span className="text-[10px] text-admin-text-secondary">{p.revenue} ج.م</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Peak Hours Density Map */}
      <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-admin-border/50 pb-3">
          <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-admin-accent" />
            <span>خريطة ذروة طلبات الصالة</span>
          </h3>

          <div className="flex bg-admin-bg-subtle p-1 rounded-lg border border-admin-border">
            <button
              onClick={() => setDensityViewMode('weekly')}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                densityViewMode === 'weekly' ? 'bg-admin-accent text-white shadow-sm' : 'text-admin-text-secondary hover:text-admin-text-primary'
              }`}
            >
              أسبوعي (شبكة)
            </button>
            <button
              onClick={() => setDensityViewMode('daily')}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                densityViewMode === 'daily' ? 'bg-admin-accent text-white shadow-sm' : 'text-admin-text-secondary hover:text-admin-text-primary'
              }`}
            >
              يومي (أعمدة)
            </button>
          </div>
        </div>

        {densityViewMode === 'daily' && (
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-hide border-b border-admin-border/40">
            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, idx) => (
              <button
                key={idx}
                onClick={() => setDensitySelectedDayIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all cursor-pointer border ${
                  densitySelectedDayIdx === idx
                    ? 'bg-admin-accent/15 border-admin-accent/40 text-admin-accent'
                    : 'bg-white/5 border-transparent text-admin-text-secondary hover:text-admin-text-primary'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto pb-4 scrollbar-hide">
          {densityViewMode === 'weekly' ? (
            <div className="min-w-[760px] space-y-2">
              <div className="flex items-center gap-1.5 mr-[64px] pb-1 border-b border-admin-border/30">
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div key={hour} className="flex-1 text-center text-[9px] font-mono text-admin-text-muted">
                    {hour === 0 ? '12ص' : hour === 12 ? '12م' : hour > 12 ? `${hour - 12}م` : `${hour}ص`}
                  </div>
                ))}
              </div>

              {(() => {
                const heatmapMatrix = generateHeatmapMatrix(peakHours);
                const maxVal = Math.max(...heatmapMatrix.flatMap(d => d.hours), 1);

                return heatmapMatrix.map((row, dayIdx) => (
                  <div key={dayIdx} className="flex items-center gap-1.5">
                    <div className="w-[60px] text-xs font-bold text-admin-text-secondary truncate text-right">
                      {row.day}
                    </div>
                    <div className="flex-1 flex gap-1.5">
                      {row.hours.map((val, hourIdx) => {
                        const level = Math.min(5, Math.floor((val / maxVal) * 5));
                        return (
                          <div
                            key={hourIdx}
                            className={`flex-1 aspect-square rounded-sm transition-all duration-300 density-cell level-${level} hover:scale-110 cursor-pointer relative group`}
                            title={`${row.day} - ساعة ${hourIdx}: ${val} طلب`}
                          >
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#1e2330] text-white text-[9px] font-bold py-1 px-2 rounded-md whitespace-nowrap z-50">
                              {val} طلبات
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}

              <div className="flex justify-end gap-3 pt-4 text-[10px] text-admin-text-muted font-semibold items-center">
                <span>أقل نشاطاً</span>
                <div className="w-3.5 h-3.5 rounded-sm bg-[#f1f3f5]" />
                <div className="w-3.5 h-3.5 rounded-sm bg-[#fdf6e2]" />
                <div className="w-3.5 h-3.5 rounded-sm bg-[#f7e7c4]" />
                <div className="w-3.5 h-3.5 rounded-sm bg-[#f3d492]" />
                <div className="w-3.5 h-3.5 rounded-sm bg-[#e5b95a]" />
                <div className="w-3.5 h-3.5 rounded-sm bg-[#c5a85c]" />
                <span>أكثر نشاطاً</span>
              </div>
            </div>
          ) : (
            <div className="min-w-[600px] h-[260px]">
              {(() => {
                const heatmapMatrix = generateHeatmapMatrix(peakHours);
                const selectedDayData = heatmapMatrix[densitySelectedDayIdx] || { day: '', hours: [] };
                const barChartData = (selectedDayData.hours || []).map((count, hour) => ({
                  hourLabel: hour === 0 ? '12ص' : hour === 12 ? '12م' : hour > 12 ? `${hour - 12}م` : `${hour}ص`,
                  'عدد الطلبات': count,
                }));

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="hourLabel" stroke="#8c95a5" fontSize={10} tickLine={false} />
                      <YAxis stroke="#8c95a5" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <ChartTooltip
                        contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', fontSize: '11px' }}
                        labelFormatter={(value) => `الساعة: ${value}`}
                      />
                      <Bar dataKey="عدد الطلبات" fill="#c5a85c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
