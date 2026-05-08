import React from 'react';
import Error from './error';

interface InputProps {
    label?: string | React.ReactNode;
    name: string;
    className?: string;
    id: string;
    type?: string;
    value: string | number;
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    required?: boolean;
    maxLength?: number;
    placeholder?: string;
    autocomplete?: string;
    error?: string;
    rows?: number;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    onFocus?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    disabled?: boolean;
}

export default function Input({
    label,
    name,
    className,
    id,
    type = 'text',
    value,
    onChange,
    required = false,
    maxLength,
    placeholder,
    autocomplete,
    error,
    rows,
    min,
    max,
    step,
    onFocus,
    onKeyDown,
    disabled = false
}: InputProps) {
    const isTextarea = type === 'textarea';
    const baseClasses = `mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-[#A50034] bg-white text-black placeholder:text-sm 
    ${error && "border-[#7A003C]"}
    ${disabled && "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed opacity-60"}`;

    return (
        <div className={`mb-4 ${className || ''}`}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-white">
                    {label}
                </label>
            )}

            {isTextarea ? (
                <textarea
                    id={id}
                    name={name}
                    value={value}
                    onChange={onChange}
                    rows={rows || 3}
                    placeholder={placeholder}
                    className={`${baseClasses}`}
                    required={required}
                    disabled={disabled}
                />
            ) : (
                <input
                    id={id}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={onFocus}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className={baseClasses}
                    required={required}
                    maxLength={maxLength}
                    min={min}
                    max={max}
                    step={step}
                    autoComplete={type === 'password' ? 'on' : autocomplete}
                    disabled={disabled}
                />
            )}

            {error && <Error message={error} />}
        </div>
    );
};
