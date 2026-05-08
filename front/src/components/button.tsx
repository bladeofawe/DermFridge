import React from 'react';
import { useNavigate } from "react-router-dom";
import { ArrowRight } from 'lucide-react';

interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    href?: string;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
    loading?: boolean;
    icon?: 'arrow-right' | 'none';
    className?: string;
    fullWidth?: boolean;
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    href,
    onClick,
    type = 'button',
    disabled = false,
    loading = false,
    icon = 'none',
    className = '',
    fullWidth = false,
}: ButtonProps) {
    const navigate = useNavigate();

    const baseClasses = `inline-flex items-center justify-center rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 
    ${fullWidth ? 'w-full' : 'w-auto'}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
  `.trim();

    const variants = {
        primary: 'bg-[#A50034] text-white shadow-lg hover:bg-[#8E002C] focus:ring-[#E61A5F]',
        secondary: 'bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 focus:ring-emerald-500'
    };

    const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-5 py-3 text-base font-semibold', lg: 'px-6 py-4 text-lg font-semibold' };
    const finalClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`.trim();

    const renderIcon = () => {
        if (icon === 'arrow-right') return <ArrowRight className="ml-2 h-4 w-4" />;
        return null;
    };

    const buttonContent = (
        <>
            {loading ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    {children}
                </>
            ) : (
                <>
                    {children}
                    {renderIcon()}
                </>
            )}
        </>
    );

    // Link
    if (href) return (<a onClick={() => navigate(href)} className={finalClasses}>{buttonContent}</a>);
    // Button
    return (<button type={type} onClick={onClick} disabled={disabled || loading} className={finalClasses}>{buttonContent}</button>);
};