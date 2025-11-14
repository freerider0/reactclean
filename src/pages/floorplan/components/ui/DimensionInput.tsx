/**
 * DimensionInput - Overlay input for editing dimension values
 * Appears when user clicks a dimension label
 */

import React, { useState, useEffect, useRef } from 'react';

export interface DimensionInputProps {
  position: { x: number; y: number };
  currentValue: number;  // In cm
  onSubmit: (newValueCm: number) => void;
  onCancel: () => void;
}

export const DimensionInput: React.FC<DimensionInputProps> = ({
  position,
  currentValue,
  onSubmit,
  onCancel
}) => {
  // Convert cm to meters for display
  const currentMeters = currentValue / 100;
  const [inputValue, setInputValue] = useState(currentMeters.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);

  // Auto-focus and select all when mounted
  useEffect(() => {
    // console.log('DimensionInput mounted at position:', position);

    // Mark as mounted after a small delay to prevent immediate blur
    const timer = setTimeout(() => {
      // console.log('DimensionInput ready for blur detection');
      mountedRef.current = true;
    }, 100);

    if (inputRef.current) {
      // console.log('Focusing input');
      inputRef.current.focus();
      inputRef.current.select();
    }

    return () => {
      // console.log('DimensionInput unmounting');
      clearTimeout(timer);
    };
  }, [position]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSubmit = () => {
    // console.log('handleSubmit called, inputValue:', inputValue);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0) {
      // Convert meters back to cm
      const newValueCm = parsed * 100;
      // console.log('Submitting new value:', newValueCm, 'cm');
      onSubmit(newValueCm);
    } else {
      // console.log('Invalid input, canceling');
      onCancel();
    }
  };

  const handleBlur = () => {
    // console.log('handleBlur called, mountedRef.current:', mountedRef.current);
    // Only submit on blur if component has been mounted for a bit
    // This prevents immediate blur on mount from closing the input
    if (mountedRef.current) {
      handleSubmit();
    } else {
      // console.log('Ignoring blur - component just mounted');
    }
  };

  return (
    <div
      className="absolute z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto'
      }}
    >
      <div className="flex items-center gap-2 bg-white rounded-lg shadow-xl border-4 border-blue-500 p-3">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0.00"
        />
        <span className="text-sm font-medium text-gray-700">m</span>
        <div className="flex gap-1">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            ✓
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onCancel();
            }}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-1 text-center whitespace-nowrap">
        Press Enter to lock dimension
      </div>
    </div>
  );
};
