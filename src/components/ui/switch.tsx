import React from 'react';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'checked'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className = '', checked, onCheckedChange, ...props }, ref) => {
    // Combine the passed checked prop with the internal state
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(event.target.checked);
      }
    };

    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            ref={ref}
            checked={checked}
            onChange={handleChange}
            {...props}
          />
          <div
            className={`block w-10 h-6 rounded-full ${
              checked ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
          <div
            className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
              checked ? 'transform translate-x-4' : ''
            }`}
          />
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;