import React from "react";

interface DatePickerInputProps {
  placeholder: string;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({ 
  placeholder, 
  date, 
  setDate 
}) => {
  return (
    <input
      type="date"
      className="w-full px-4 py-2 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-red-500"
      placeholder={placeholder}
      value={date ? date.toISOString().split('T')[0] : ''}
      onChange={(e) => {
        const value = e.target.value;
        if (value) {
          setDate(new Date(value));
        } else {
          setDate(undefined);
        }
      }}
    />
  );
};

export default DatePickerInput;
