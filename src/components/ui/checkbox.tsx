import React from 'react';

export type CheckedState = boolean | 'indeterminate';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'checked'> {
  checked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  className?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(event.target.checked);
      }
    };

    return (
      <div className={`inline-flex items-center ${className}`}>
        <input
          type="checkbox"
          ref={ref}
          checked={checked === 'indeterminate' ? false : checked}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;