import React from 'react';

interface AlertProps {
  variant?: 'default' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative w-full rounded-lg border p-4 ${
          variant === 'destructive'
            ? 'border-red-500 bg-red-50 text-red-700'
            : 'border-gray-200 bg-white text-gray-900'
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

interface AlertTitleProps {
  className?: string;
  children: React.ReactNode;
}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h5
        ref={ref}
        className={`mb-1 font-medium leading-none tracking-tight ${className}`}
        {...props}
      >
        {children}
      </h5>
    );
  }
);

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`text-sm ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
AlertTitle.displayName = 'AlertTitle';
AlertDescription.displayName = 'AlertDescription';

export { Alert as default, AlertTitle, AlertDescription };