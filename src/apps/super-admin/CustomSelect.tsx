import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  label?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  label
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full text-right" ref={containerRef}>
      {label && <label className="block text-xs font-bold text-admin-text-secondary mb-2">{label}</label>}
      
      {/* Selector trigger button - with interactive admin accent color */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-admin-bg-base hover:bg-admin-bg-subtle border border-admin-border hover:border-admin-accent/50 text-admin-text-primary rounded-xl px-4 py-3 text-xs font-bold transition-all focus:outline-none outline-none focus:ring-1 focus:ring-admin-accent/10 cursor-pointer shadow-sm"
      >
        <span className="group-hover:text-admin-accent">{selectedOption?.label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-admin-text-secondary group-hover:text-admin-accent transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {/* Options list dropdown overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 mt-2 bg-admin-bg-elevated border border-admin-border-strong shadow-admin-elevated rounded-xl p-1.5 z-40 overflow-hidden outline-none"
          >
            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-right px-4 py-2.5 rounded-lg text-xs font-bold transition-all outline-none focus:outline-none cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-admin-accent text-white shadow-sm'
                        : 'text-admin-text-secondary hover:bg-admin-accent/10 hover:text-admin-accent'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-1.5 h-1.5 rounded-full bg-white shadow-sm"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
