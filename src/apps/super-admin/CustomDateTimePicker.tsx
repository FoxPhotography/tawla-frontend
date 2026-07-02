import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

interface CustomDateTimePickerProps {
  value: string; // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
  onChange: (val: string) => void;
  type: 'date' | 'datetime';
  label?: string;
  required?: boolean;
}

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const WEEKDAYS_AR = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

export default function CustomDateTimePicker({
  value,
  onChange,
  type,
  label,
  required = false
}: CustomDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'calendar' | 'hours' | 'minutes'>('calendar');
  
  // Date parsing
  const parsedDate = value ? new Date(value.includes('T') ? value : `${value}T12:00:00`) : new Date();
  const [currentYear, setCurrentYear] = useState(parsedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(parsedDate.getMonth()); // 0-11
  
  // Selected components
  const [selectedDay, setSelectedDay] = useState<number>(parsedDate.getDate());
  const [selectedHour, setSelectedHour] = useState<number>(parsedDate.getHours() % 12 || 12);
  const [selectedMinute, setSelectedMinute] = useState<number>(Math.round(parsedDate.getMinutes() / 5) * 5 % 60);
  const [isPM, setIsPM] = useState<boolean>(parsedDate.getHours() >= 12);

  // Sync state with incoming value
  useEffect(() => {
    if (value) {
      const d = new Date(value.includes('T') ? value : `${value}T12:00:00`);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
        setSelectedDay(d.getDate());
        const rawHour = d.getHours();
        setSelectedHour(rawHour % 12 || 12);
        setSelectedMinute(Math.round(d.getMinutes() / 5) * 5 % 60);
        setIsPM(rawHour >= 12);
      }
    }
  }, [value]);

  // Calendar calculations
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleMonthPrev = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleMonthNext = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    if (type === 'date') {
      const yyyy = currentYear;
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
      setIsOpen(false);
    } else {
      setStep('hours');
    }
  };

  const triggerChange = (dayNum = selectedDay, hourNum = selectedHour, minNum = selectedMinute, pmFlag = isPM) => {
    const yyyy = currentYear;
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');

    if (type === 'date') {
      onChange(`${yyyy}-${mm}-${dd}`);
    } else {
      let finalHour = hourNum;
      if (pmFlag && finalHour !== 12) {
        finalHour += 12;
      } else if (!pmFlag && finalHour === 12) {
        finalHour = 0;
      }
      const hourStr = String(finalHour).padStart(2, '0');
      const minStr = String(minNum).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}T${hourStr}:${minStr}`);
    }
  };

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    setStep('minutes');
    triggerChange(selectedDay, hour, selectedMinute, isPM);
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    triggerChange(selectedDay, selectedHour, minute, isPM);
    setIsOpen(false);
  };

  const togglePM = (pm: boolean) => {
    setIsPM(pm);
    triggerChange(selectedDay, selectedHour, selectedMinute, pm);
  };

  const applyShortcut = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    setSelectedDay(target.getDate());
    
    if (type === 'date') {
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, '0');
      const dd = String(target.getDate()).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
      setIsOpen(false);
    } else {
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, '0');
      const dd = String(target.getDate()).padStart(2, '0');
      const h = String(selectedHour === 12 ? (isPM ? 12 : 0) : (isPM ? selectedHour + 12 : selectedHour)).padStart(2, '0');
      const m = String(selectedMinute).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}T${h}:${m}`);
      setStep('hours');
    }
  };

  const getFormattedValue = () => {
    if (!value) return required ? 'اختر التاريخ...' : 'غير محدد';
    try {
      const d = new Date(value.includes('T') ? value : `${value}T12:00:00`);
      if (isNaN(d.getTime())) return value;
      
      const weekday = d.toLocaleDateString('ar-EG', { weekday: 'long' });
      const day = d.getDate();
      const month = MONTHS_AR[d.getMonth()];
      const year = d.getFullYear();
      
      if (type === 'date') {
        return `${weekday}، ${day} ${month} ${year}`;
      } else {
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const period = h >= 12 ? 'مساءً' : 'صباحاً';
        const displayH = h % 12 || 12;
        return `${weekday}، ${day} ${month} ${year} - ${displayH}:${m} ${period}`;
      }
    } catch {
      return value;
    }
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
  const calendarCells = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(<div key={`pad-${i}`} className="w-8 h-8" />);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected = day === selectedDay && currentYear === parsedDate.getFullYear() && currentMonth === parsedDate.getMonth();
    const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
    
    calendarCells.push(
      <button
        key={`day-${day}`}
        type="button"
        onClick={() => handleDaySelect(day)}
        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center outline-none focus:outline-none cursor-pointer ${
          isSelected 
            ? 'bg-admin-accent text-white shadow-md' 
            : isToday
            ? 'bg-admin-accent/10 text-admin-accent font-extrabold border border-admin-accent/20'
            : 'text-admin-text-secondary hover:bg-admin-accent/10 hover:text-admin-accent'
        }`}
      >
        {day}
      </button>
    );
  }

  const getClockItemCoords = (index: number, total: number, radius = 72) => {
    const angle = ((index * (360 / total)) - 90) * (Math.PI / 180);
    return {
      x: 100 + radius * Math.cos(angle),
      y: 100 + radius * Math.sin(angle)
    };
  };

  return (
    <div className="relative w-full">
      {label && <label className="block text-[11px] font-bold text-admin-text-secondary mb-1.5">{label} {required && '*'}</label>}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => { setIsOpen(true); setStep('calendar'); }}
        className="w-full flex items-center justify-between bg-admin-bg-base hover:bg-admin-bg-subtle border border-admin-border text-admin-text-primary rounded-xl px-4 py-3 text-xs font-bold transition-all focus:outline-none outline-none focus:ring-1 focus:ring-admin-accent/10 cursor-pointer shadow-sm text-right"
      >
        <span className="truncate group-hover:text-admin-accent transition-colors">{getFormattedValue()}</span>
        <div className="flex items-center gap-1.5 text-admin-text-secondary group-hover:text-admin-accent transition-colors">
          {type === 'datetime' ? <Clock className="w-4 h-4" /> : <CalendarIcon className="w-4 h-4" />}
        </div>
      </button>

      {/* Popover Centered Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-[320px] bg-admin-bg-elevated border border-admin-border shadow-admin-elevated rounded-2xl p-5 text-admin-text-primary relative overflow-hidden flex flex-col focus:outline-none outline-none"
            >
              {/* Header block with close button */}
              <div className="flex items-center justify-between pb-3.5 border-b border-admin-border mb-3.5">
                <span className="text-xs font-bold text-admin-text-secondary">
                  {type === 'datetime' ? 'إعدادات الجدولة والترخيص' : 'تحديد تاريخ الصلاحية'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-admin-bg-base text-admin-text-secondary hover:text-admin-text-primary transition-colors cursor-pointer outline-none focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step Stepper navigation */}
              {type === 'datetime' && (
                <div className="flex items-center justify-between border-b border-admin-border pb-3 mb-3.5 text-[10px] font-bold text-admin-text-secondary">
                  <button
                    type="button"
                    onClick={() => setStep('calendar')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer outline-none focus:outline-none ${step === 'calendar' ? 'text-admin-accent bg-admin-accent/10 font-bold' : 'hover:text-admin-accent'}`}
                  >
                    1. اليوم
                  </button>
                  <ChevronLeft className="w-3 h-3 text-admin-border-strong" />
                  <button
                    type="button"
                    onClick={() => setStep('hours')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer outline-none focus:outline-none ${step === 'hours' ? 'text-admin-accent bg-admin-accent/10 font-bold' : 'hover:text-admin-accent'}`}
                  >
                    2. الساعة
                  </button>
                  <ChevronLeft className="w-3 h-3 text-admin-border-strong" />
                  <button
                    type="button"
                    onClick={() => setStep('minutes')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer outline-none focus:outline-none ${step === 'minutes' ? 'text-admin-accent bg-admin-accent/10 font-bold' : 'hover:text-admin-accent'}`}
                  >
                    3. الدقيقة
                  </button>
                </div>
              )}

              {/* Stepper Content */}
              <div className="relative min-h-[250px] flex flex-col justify-between">
                
                {/* STEP 1: CALENDAR */}
                {step === 'calendar' && (
                  <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-3"
                  >
                    {/* Month header selector */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={handleMonthPrev}
                        className="p-1.5 rounded-lg hover:bg-admin-bg-base text-admin-text-secondary hover:text-admin-text-primary transition-colors cursor-pointer outline-none focus:outline-none"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      <span className="text-xs font-bold text-admin-text-primary">
                        {MONTHS_AR[currentMonth]} {currentYear}
                      </span>
                      
                      <button
                        type="button"
                        onClick={handleMonthNext}
                        className="p-1.5 rounded-lg hover:bg-admin-bg-base text-admin-text-secondary hover:text-admin-text-primary transition-colors cursor-pointer outline-none focus:outline-none"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Week days header */}
                    <div className="grid grid-cols-7 text-center gap-y-1 mb-1 text-[9px] font-bold text-admin-text-muted">
                      {WEEKDAYS_AR.map((wd, i) => (
                        <span key={`wd-${i}`}>{wd}</span>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 text-center gap-y-1 mb-2">
                      {calendarCells}
                    </div>

                    {/* Subscription Quick Shortcuts */}
                    <div className="border-t border-admin-border pt-3 mt-1.5 space-y-1.5">
                      <span className="text-[10px] font-bold text-admin-text-secondary block text-right">جدولة سريعة:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: '+30 يوم', val: 30 },
                          { label: '+3 أشهر', val: 90 },
                          { label: '+سنة', val: 365 }
                        ].map((sc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => applyShortcut(sc.val)}
                            className="py-1 rounded-lg border border-admin-border bg-admin-bg-base text-admin-text-secondary hover:bg-admin-accent hover:text-white hover:border-admin-accent text-[10px] font-bold transition-all cursor-pointer text-center outline-none focus:outline-none"
                          >
                            {sc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: WALL CLOCK HOUR */}
                {step === 'hours' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center space-y-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-admin-text-secondary">حدد ساعة الموعد</span>
                      {/* AM/PM toggle pill */}
                      <div className="flex bg-admin-bg-base border border-admin-border p-0.5 rounded-lg text-[9px] font-bold shadow-sm" dir="ltr">
                        <button
                          type="button"
                          onClick={() => togglePM(false)}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer outline-none focus:outline-none ${!isPM ? 'bg-admin-accent text-white shadow-sm' : 'text-admin-text-secondary hover:text-admin-accent hover:bg-admin-accent/10'}`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePM(true)}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer outline-none focus:outline-none ${isPM ? 'bg-admin-accent text-white shadow-sm' : 'text-admin-text-secondary hover:text-admin-accent hover:bg-admin-accent/10'}`}
                        >
                          PM
                        </button>
                      </div>
                    </div>

                    {/* Circular clock dial */}
                    <div className="relative w-[190px] h-[190px] bg-admin-bg-base border border-admin-border rounded-full flex items-center justify-center shadow-inner mt-1">
                      {/* Clock center cap */}
                      <div className="absolute w-2 h-2 bg-admin-accent rounded-full z-20 shadow-md" />
                      
                      {/* Clock pointer hand */}
                      <motion.div
                        className="absolute bottom-1/2 left-1/2 w-0.5 bg-admin-accent origin-bottom z-10"
                        style={{
                          height: '58px',
                          transform: `translate(-50%, 0) rotate(${selectedHour * 30}deg)`,
                        }}
                        animate={{ transform: `translate(-50%, 0) rotate(${selectedHour * 30}deg)` }}
                        transition={{ type: 'spring', stiffness: 130, damping: 15 }}
                      />
                      
                      {/* Dial Numbers */}
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                        const pos = getClockItemCoords(h, 12, 66);
                        const isSelected = h === selectedHour;
                        
                        return (
                          <button
                            key={`hour-${h}`}
                            type="button"
                            onClick={() => handleHourSelect(h)}
                            style={{
                              left: `${pos.x}px`,
                              top: `${pos.y}px`,
                              transform: 'translate(-50%, -50%)'
                            }}
                            className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer outline-none focus:outline-none z-20 ${
                              isSelected 
                                ? 'bg-admin-accent text-white shadow-md' 
                                : 'text-admin-text-secondary hover:bg-admin-accent hover:text-white hover:scale-110'
                            }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: WALL CLOCK MINUTE */}
                {step === 'minutes' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center space-y-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-admin-text-secondary">حدد الدقيقة للموعد</span>
                      <span className="text-[10px] font-bold text-admin-accent font-mono bg-admin-accent/10 px-2 py-0.5 rounded border border-admin-accent/20">
                        {selectedHour}:{String(selectedMinute).padStart(2, '0')} {isPM ? 'م' : 'ص'}
                      </span>
                    </div>

                    {/* Circular clock dial */}
                    <div className="relative w-[190px] h-[190px] bg-admin-bg-base border border-admin-border rounded-full flex items-center justify-center shadow-inner mt-1">
                      {/* Clock center cap */}
                      <div className="absolute w-2 h-2 bg-admin-accent rounded-full z-20 shadow-md" />
                      
                      {/* Clock pointer hand */}
                      <motion.div
                        className="absolute bottom-1/2 left-1/2 w-0.5 bg-admin-accent origin-bottom z-10"
                        style={{
                          height: '62px',
                          transform: `translate(-50%, 0) rotate(${selectedMinute * 6}deg)`,
                        }}
                        animate={{ transform: `translate(-50%, 0) rotate(${selectedMinute * 6}deg)` }}
                        transition={{ type: 'spring', stiffness: 130, damping: 15 }}
                      />
                      
                      {/* Dial Minutes */}
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, idx) => {
                        const pos = getClockItemCoords(idx || 12, 12, 66);
                        const isSelected = m === selectedMinute;
                        
                        return (
                          <button
                            key={`min-${m}`}
                            type="button"
                            onClick={() => handleMinuteSelect(m)}
                            style={{
                              left: `${pos.x}px`,
                              top: `${pos.y}px`,
                              transform: 'translate(-50%, -50%)'
                            }}
                            className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all cursor-pointer outline-none focus:outline-none z-20 ${
                              isSelected 
                                ? 'bg-admin-accent text-white shadow-md' 
                                : 'text-admin-text-secondary hover:bg-admin-accent hover:text-white hover:scale-110'
                            }`}
                          >
                            {String(m).padStart(2, '0')}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Navigation Footer */}
                <div className="flex items-center justify-between border-t border-admin-border pt-3 mt-4 gap-2 text-xs">
                  {step !== 'calendar' ? (
                    <button
                      type="button"
                      onClick={() => setStep(step === 'minutes' ? 'hours' : 'calendar')}
                      className="py-1.5 px-3.5 rounded-lg border border-admin-border bg-admin-bg-base text-admin-text-secondary font-bold hover:bg-admin-bg-subtle hover:text-admin-text-primary transition-colors cursor-pointer outline-none focus:outline-none"
                    >
                      السابق
                    </button>
                  ) : (
                    <div className="w-10" />
                  )}

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="py-1.5 px-4.5 rounded-lg bg-admin-accent hover:opacity-95 text-white font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-md shadow-admin-accent outline-none focus:outline-none"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تأكيد الاختيار</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
