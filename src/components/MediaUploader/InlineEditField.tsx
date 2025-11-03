import React, { useState, useRef, useEffect } from 'react';

interface InlineEditFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'select';
  isAIFilled?: boolean;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  label,
  value,
  onSave,
  placeholder = 'Click para agregar...',
  type = 'text',
  isAIFilled = false,
  rows = 3,
  options = [],
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Update tempValue when value prop changes
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // .select() only works on input and textarea, not on select elements
      if (type !== 'select' && 'select' in inputRef.current) {
        (inputRef.current as HTMLInputElement | HTMLTextAreaElement).select();
      }
    }
  }, [isEditing, type]);

  const handleSave = () => {
    onSave(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && type === 'text') {
      e.preventDefault();
      handleSave();
    }
  };

  // For select type, always show the select (no edit mode needed)
  if (type === 'select') {
    return (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-0.5 px-2.5">
          {label}
          {isAIFilled && (
            <span className="ml-2 text-[10px] text-primary">(AI)</span>
          )}
        </label>
        <select
          value={value}
          onChange={(e) => onSave(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm bg-background text-foreground border border-border rounded-md focus:ring-primary focus:border-primary hover:border-primary transition-colors cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-0.5 px-2.5">
          {label}
          {isAIFilled && (
            <span className="ml-2 text-[10px] text-primary">(AI)</span>
          )}
        </label>
        <div className="relative">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={rows}
              className="w-full px-2.5 py-1.5 pr-20 text-sm bg-background text-foreground border border-primary rounded-md focus:ring-primary focus:border-primary resize-none placeholder:text-muted-foreground"
              placeholder={placeholder}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-2.5 py-1.5 pr-20 text-sm bg-background text-foreground border border-primary rounded-md focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
              placeholder={placeholder}
            />
          )}
          {/* Save/Cancel buttons - Hide for select since it auto-saves */}
          {type !== 'select' && (
            <div className="absolute right-1.5 top-1.5 flex gap-1">
              <button
                onClick={handleSave}
                className="p-1 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                title="Guardar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={handleCancel}
                className="p-1 bg-red-500 dark:bg-red-600 text-white rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                title="Cancelar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Read mode
  // For select, display the label instead of the value
  const displayValue = type === 'select' && value
    ? options.find(opt => opt.value === value)?.label || value
    : value;

  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-0.5 px-2.5">
        {label}
        {isAIFilled && (
          <span className="ml-2 text-[10px] text-primary">(AI)</span>
        )}
      </label>
      <div
        onClick={() => setIsEditing(true)}
        className="group relative px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted cursor-pointer transition-all duration-150 min-h-[32px]"
      >
        {/* Content */}
        {displayValue ? (
          <p className={`text-sm text-foreground ${type === 'textarea' ? 'line-clamp-3' : ''}`}>
            {displayValue}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {placeholder}
          </p>
        )}

        {/* Pencil icon on hover */}
        <div className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default InlineEditField;
