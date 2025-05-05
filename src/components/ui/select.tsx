import React, { createContext, useContext, useState } from 'react';

// Create a context to share the select state
const SelectContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Select = ({ value, defaultValue, onValueChange, children, disabled, className }: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || '');

  const actualValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    if (disabled) return;
    
    if (onValueChange) {
      onValueChange(newValue);
    }
    
    if (value === undefined) {
      setInternalValue(newValue);
    }
    
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: actualValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
      }}
    >
      <div className={`relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className = '', children, ...props }, ref) => {
    const { open, setOpen, value } = useContext(SelectContext);
    
    return (
      <button
        type="button"
        ref={ref}
        onClick={() => setOpen(!open)}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {children}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 opacity-50"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    );
  }
);

interface SelectValueProps {
  placeholder?: string;
}

const SelectValue = ({ placeholder }: SelectValueProps) => {
  const { value } = useContext(SelectContext);
  
  return (
    <span>
      {value || placeholder || 'Select an option'}
    </span>
  );
};

interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

const SelectContent = ({ className = '', children }: SelectContentProps) => {
  const { open } = useContext(SelectContext);
  
  if (!open) return null;
  
  return (
    <div
      className={`absolute top-full left-0 z-10 mt-1 w-full rounded-md border border-gray-200 bg-white p-1 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
};

interface SelectItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className = '', value, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useContext(SelectContext);
    const isSelected = selectedValue === value;
    
    return (
      <div
        ref={ref}
        className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-blue-50 ${
          isSelected ? 'bg-blue-50 font-medium text-blue-600' : ''
        } ${className}`}
        onClick={() => onValueChange?.(value)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Select.displayName = 'Select';
SelectTrigger.displayName = 'SelectTrigger';
SelectValue.displayName = 'SelectValue';
SelectContent.displayName = 'SelectContent';
SelectItem.displayName = 'SelectItem';

export {
  Select as default,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};