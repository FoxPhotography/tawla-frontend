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
      {label && <label className="block text-xs font-black text-slate-300 mb-2">{label}</label>}
      
      {/* Selector trigger button - with interactive indigo color */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-100 rounded-xl px-4 py-3 text-sm transition-all focus:outline-none outline-none focus:ring-1 focus:ring-indigo-500/10 cursor-pointer shadow-inner"
      >
        <span className="font-bold text-slate-100 group-hover:text-indigo-300">{selectedOption?.label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-indigo-400 group-hover:text-indigo-300 transition-colors"
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
            className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-1.5 z-40 overflow-hidden outline-none"
          >
            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-right px-4 py-2.5 rounded-xl text-sm transition-all outline-none focus:outline-none cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-300 hover:bg-indigo-550/15 hover:text-indigo-400 font-bold'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-1.5 h-1.5 rounded-full bg-indigo-300 shadow-sm"
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
