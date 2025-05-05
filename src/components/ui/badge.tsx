import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success';
  className?: string;
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';

    const variantClasses = {
      default: 'bg-blue-600 text-white',
      secondary: 'bg-gray-200 text-gray-900',
      outline: 'border border-gray-300 text-gray-900',
      destructive: 'bg-red-600 text-white',
      success: 'bg-green-600 text-white',
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;