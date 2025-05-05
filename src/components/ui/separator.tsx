import React from 'react';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = '', orientation = 'horizontal', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${
          orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px'
        } bg-gray-200 ${className}`}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';

export default Separator;