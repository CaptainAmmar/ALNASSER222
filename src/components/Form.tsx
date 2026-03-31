import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../components/Sidebar';
import { Search, ChevronDown } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-sm font-bold text-slate-700 block">{label}</label>
    <input
      className={cn(
        "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm",
        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs font-medium text-red-500">{error}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className, ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-sm font-bold text-slate-700 block">{label}</label>
    <select
      className={cn(
        "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none",
        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
        className
      )}
      {...props}
    >
      <option value="">اختر...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-xs font-medium text-red-500">{error}</p>}
  </div>
);

interface SearchableSelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = "اختر...", 
  error,
  disabled,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-1.5 w-full relative", className)} ref={containerRef}>
      <label className="text-sm font-bold text-slate-700 block">{label}</label>
      <div 
        className={cn(
          "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer flex items-center justify-between transition-all text-sm",
          error && "border-red-500",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500/20 border-blue-500"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn(!selectedOption && "text-slate-400")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors",
                    opt.value === value && "bg-blue-50 text-blue-600 font-bold"
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">لا توجد نتائج</div>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-sm font-bold text-slate-700 block">{label}</label>
    <textarea
      className={cn(
        "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm",
        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs font-medium text-red-500">{error}</p>}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  };

  return (
    <button
      className={cn(
        "px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
