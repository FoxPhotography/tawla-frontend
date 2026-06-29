import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'اختر من القائمة...',
  required = false,
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Hidden input to support native HTML5 form validation */}
      <input
        type="text"
        value={value}
        required={required}
        readOnly
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 w-full h-0 opacity-0 pointer-events-none"
      />

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-admin-bg-base hover:bg-admin-bg-base/70 border text-right transition-all duration-200 rounded-lg px-4 py-3 text-sm focus:outline-none outline-none cursor-pointer ${
          isOpen
            ? 'border-admin-accent shadow-[0_0_0_2px_rgba(197,168,92,0.15)]'
            : 'border-admin-border hover:border-admin-accent/55'
        }`}
      >
        <span className={`truncate font-bold ${selectedOption ? 'text-admin-text-primary' : 'text-admin-text-muted'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-admin-text-secondary flex-shrink-0 mr-2"
        >
          <ChevronDown className="w-4 h-4 text-admin-accent" />
        </motion.div>
      </button>

      {/* Options List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 mt-1.5 bg-admin-bg-elevated border border-admin-border shadow-admin-card rounded-xl p-1.5 z-50 overflow-hidden outline-none"
          >
            <div className="max-h-[220px] overflow-y-auto pl-1 space-y-0.5 scrollbar-thin scrollbar-thumb-admin-accent/30 scrollbar-track-transparent">
              {options.length === 0 ? (
                <div className="text-center text-xs py-4 text-admin-text-muted font-bold">
                  لا توجد خيارات متاحة
                </div>
              ) : (
                options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`w-full text-right px-3.5 py-2.5 rounded-lg text-xs transition-all outline-none focus:outline-none cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-admin-accent text-white font-extrabold shadow-sm'
                          : 'text-admin-text-secondary hover:bg-admin-accent/10 hover:text-admin-accent font-bold'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <motion.div
                          layoutId="selected-dot"
                          className="flex items-center justify-center mr-2"
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
