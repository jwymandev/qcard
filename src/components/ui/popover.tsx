import React, { createContext, useContext, useState, useRef } from 'react';

const PopoverContext = createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  contentRef: React.RefObject<HTMLDivElement>;
}>({
  open: false,
  setOpen: () => {},
  contentRef: { current: null },
});

interface PopoverProps {
  children: React.ReactNode;
}

const Popover = ({ children }: PopoverProps) => {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <PopoverContext.Provider value={{ open, setOpen, contentRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
};

interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ asChild = false, children, className = '', ...props }, ref) => {
    const { setOpen } = useContext(PopoverContext);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setOpen(prev => !prev);
      if (props.onClick) {
        props.onClick(e);
      }
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  }
);

interface PopoverContentProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ children, align = 'center', className = '', ...props }, ref) => {
    const { open, contentRef } = useContext(PopoverContext);

    if (!open) {
      return null;
    }

    return (
      <div
        ref={contentRef}
        className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-md ${
          align === 'start'
            ? 'left-0'
            : align === 'end'
            ? 'right-0'
            : 'left-1/2 -translate-x-1/2'
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PopoverTrigger.displayName = 'PopoverTrigger';
PopoverContent.displayName = 'PopoverContent';

export { Popover as default, PopoverTrigger, PopoverContent };