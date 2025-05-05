import React, { createContext, useContext, useState } from 'react';

// Create a context to share the tabs state
const TabsContext = createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {},
});

interface TabsProps {
  value: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

const Tabs = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  className = '',
  children,
}: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    }
    
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
  };
  
  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className = '', value, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useContext(TabsContext);
    const isSelected = selectedValue === value;
    
    return (
      <button
        ref={ref}
        type="button"
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
          isSelected
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-900'
        } ${className}`}
        onClick={() => onValueChange(value)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className = '', value, children, ...props }, ref) => {
    const { value: selectedValue } = useContext(TabsContext);
    
    if (selectedValue !== value) {
      return null;
    }
    
    return (
      <div
        ref={ref}
        className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

export {
  Tabs as default,
  TabsList,
  TabsTrigger,
  TabsContent,
};