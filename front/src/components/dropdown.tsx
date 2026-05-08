import { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  id: number;
  name: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  selected?: number;
  onChange: (id: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export default function Dropdown({ 
  label, 
  options, 
  selected, 
  onChange, 
  placeholder = "Sélectionner une option",
  className = "",
  disabled = false,
  error = false
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(option => option.id === selected);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gestion du clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(selected ? options.findIndex(opt => opt.id === selected) : 0);
        } else if (focusedIndex >= 0) {
          onChange(options[focusedIndex].id);
          setIsOpen(false);
          setFocusedIndex(-1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex(prev => (prev + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => prev <= 0 ? options.length - 1 : prev - 1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Scroll vers l'élément focusé
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleOptionClick = (optionId: number) => {
    onChange(optionId);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const baseClasses = `
    relative w-full min-w-0 
    ${className}
  `;

  const buttonClasses = `
    w-full mt-1 px-4 py-2 text-left bg-white dark:bg-gray-700 
    border rounded-lg shadow-sm transition-all duration-200
    flex items-center justify-between
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
    ${error 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
    }
    ${disabled 
      ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
      : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600'
    }
    ${isOpen ? 'ring-2 ring-green-500 border-green-500' : ''}
  `;

  const menuClasses = `
    absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 
    border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg 
    max-h-60 overflow-auto z-50
    transform transition-all duration-200 origin-top
    ${isOpen 
      ? 'opacity-100 scale-y-100 visible' 
      : 'opacity-0 scale-y-95 invisible'
    }
  `;

  const optionClasses = (index: number, optionId: number) => `
    px-4 py-3 cursor-pointer transition-colors duration-150
    flex items-center text-gray-900 dark:text-gray-100
    ${focusedIndex === index 
      ? 'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100' 
      : 'hover:bg-gray-100 dark:hover:bg-gray-600'
    }
    ${selected === optionId 
      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium' 
      : ''
    }
  `;

  return (
    <div className={baseClasses} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <button
        type="button"
        className={buttonClasses}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${label}-label` : undefined}
      >
        <span className={`block truncate ${!selectedOption ? 'text-gray-500 dark:text-gray-400' : ''}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <span className="ml-2 flex-shrink-0">
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <div className={menuClasses}>
        <ul 
          ref={listRef}
          role="listbox" 
          aria-labelledby={label ? `${label}-label` : undefined}
          className="py-1"
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
              Aucune option disponible
            </li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.id}
                className={optionClasses(index, option.id)}
                onClick={() => handleOptionClick(option.id)}
                role="option"
                aria-selected={selected === option.id}
              >
                <span className="block truncate">{option.name}</span>
                {selected === option.id && (
                  <span className="ml-auto flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}