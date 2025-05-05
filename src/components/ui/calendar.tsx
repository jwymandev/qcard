import React from 'react';

interface CalendarProps {
  mode: 'single' | 'range' | 'multiple';
  selected?: Date | Date[] | Date[][] | null | undefined;
  onSelect?: (date: Date | null) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  initialFocus?: boolean;
}

// This is a simplified calendar component
// In a real-world application, you'd use a proper date picker library
const Calendar = ({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className = '',
  initialFocus,
}: CalendarProps) => {
  // Simple month display for demonstration
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  
  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Create calendar grid
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // Empty cells for days before the 1st
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  // Handle day selection
  const handleDayClick = (date: Date) => {
    if (disabled && disabled(date)) {
      return;
    }
    
    if (onSelect) {
      onSelect(date);
    }
  };
  
  // Check if a date is selected
  const isSelected = (date: Date) => {
    if (!selected) return false;
    
    if (mode === 'single' && selected instanceof Date) {
      return date.toDateString() === selected.toDateString();
    }
    
    // Simplified for this example
    return false;
  };
  
  return (
    <div className={`p-3 ${className}`}>
      <div className="text-center font-medium mb-2">
        {monthNames[month]} {year}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-xs font-medium text-center">
        <div>Su</div>
        <div>Mo</div>
        <div>Tu</div>
        <div>We</div>
        <div>Th</div>
        <div>Fr</div>
        <div>Sa</div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mt-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-9 w-9"></div>;
          }
          
          const isToday = day.toDateString() === today.toDateString();
          const isDaySelected = isSelected(day);
          const isDisabled = disabled ? disabled(day) : false;
          
          return (
            <button
              key={day.toDateString()}
              type="button"
              className={`h-9 w-9 rounded-md flex items-center justify-center text-sm ${
                isToday ? 'font-bold' : ''
              } ${
                isDaySelected
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100'
              } ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              tabIndex={initialFocus && index === 0 ? 0 : -1}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;