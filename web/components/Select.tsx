import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ThemeOption } from '../types';

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    currentTheme?: ThemeOption;
    className?: string;
    label?: string;
}

const Select: React.FC<SelectProps> = ({ 
    value, 
    onChange, 
    options, 
    placeholder = 'Select...', 
    currentTheme = 'dark',
    className = '',
    label
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listboxId = React.useId();

    // Reset highlight when opening
    useEffect(() => {
        if (isOpen) {
            const idx = options.findIndex(o => o.value === value);
            setHighlightedIndex(idx >= 0 ? idx : 0);
            // Compute fixed position from button's bounding rect
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setDropdownPos({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                });
            }
        }
    }, [isOpen, value, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const getThemeColors = () => {
        switch (currentTheme) {
            case 'cyberpunk':
                return {
                    bg: 'bg-[#050510]',
                    border: 'border-[#00FFFF]/20',
                    text: 'text-[#E0FFFF]',
                    activeBg: 'bg-[#00FFFF]/10',
                    activeText: 'text-[#00FFFF]',
                    hover: 'hover:bg-[#00FFFF]/5',
                    listBg: 'bg-[#0a0014]',
                    listBorder: 'border-[#00FFFF]/30'
                };
            case 'sunset':
                return {
                    bg: 'bg-rose-50/10',
                    border: 'border-rose-200/20',
                    text: 'text-rose-100', // Brighter text for better contrast
                    activeBg: 'bg-rose-500/20',
                    activeText: 'text-rose-50',
                    hover: 'hover:bg-rose-500/10',
                    listBg: 'bg-[#2a1b20]', // Darker background for sunset theme dropdown
                    listBorder: 'border-rose-400/30'
                };
            case 'onepiece':
                return {
                    bg: 'bg-[#1a1614]',
                    border: 'border-[#D4A574]/30',
                    text: 'text-[#E8DCD0]',
                    activeBg: 'bg-[#D4A574]/20',
                    activeText: 'text-[#D4A574]',
                    hover: 'hover:bg-[#D4A574]/10',
                    listBg: 'bg-[#14100c]',
                    listBorder: 'border-[#D4A574]/40'
                };
            case 'light':
                return {
                    bg: 'bg-white',
                    border: 'border-slate-200',
                    text: 'text-slate-700',
                    activeBg: 'bg-brand-50',
                    activeText: 'text-brand-600',
                    hover: 'hover:bg-slate-50',
                    listBg: 'bg-white',
                    listBorder: 'border-slate-200'
                };
            default: // dark
                return {
                    bg: 'bg-white/5',
                    border: 'border-white/10',
                    text: 'text-slate-200',
                    activeBg: 'bg-brand-500/20',
                    activeText: 'text-brand-400',
                    hover: 'hover:bg-white/5',
                    listBg: 'bg-[#0F172A]',
                    listBorder: 'border-slate-700'
                };
        }
    };

    const colors = getThemeColors();

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block tracking-wider font-mono">
                    {label}
                </label>
            )}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') { setIsOpen(false); e.stopPropagation(); }
                    if (e.key === 'Enter' && isOpen) {
                        e.preventDefault();
                        if (highlightedIndex >= 0) {
                            onChange(options[highlightedIndex].value);
                            setIsOpen(false);
                        }
                    }
                    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
                        e.preventDefault();
                        if (!isOpen) {
                            setIsOpen(true);
                        } else {
                            const nextIdx = e.key === 'ArrowDown'
                                ? Math.min(highlightedIndex + 1, options.length - 1)
                                : Math.max(highlightedIndex - 1, 0);
                            setHighlightedIndex(nextIdx);
                        }
                    }
                }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={isOpen ? listboxId : undefined}
                aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined}
                aria-label={label || placeholder}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${colors.bg} ${colors.border} ${isOpen ? 'ring-2 ring-opacity-50 ring-current' : ''}`}
            >
                <span className={`block truncate text-sm font-medium ${selectedOption ? colors.text : 'text-slate-500'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className={`ml-2 flex items-center transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                   {isOpen ? <ChevronUp size={16} className={colors.text} /> : <ChevronDown size={16} className={colors.text} />}
                </span>
            </button>

            {isOpen && ReactDOM.createPortal(
                <div
                    ref={dropdownRef}
                    id={listboxId}
                    role="listbox"
                    style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                        zIndex: 9999,
                    }}
                    className={`rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 border ${colors.listBg} ${colors.listBorder}`}
                >
                    <div className="max-h-60 overflow-auto py-1 custom-scrollbar">
                        {options.map((option, idx) => (
                            <div
                                key={option.value}
                                id={`${listboxId}-opt-${idx}`}
                                role="option"
                                aria-selected={value === option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                                    highlightedIndex === idx
                                        ? `${colors.activeBg} ${colors.activeText}`
                                        : value === option.value
                                            ? `${colors.text} font-semibold`
                                            : `${colors.text} ${colors.hover}`
                                }`}
                            >
                                <span className="block truncate">{option.label}</span>
                                {value === option.value && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Select;
