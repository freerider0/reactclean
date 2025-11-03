import React, { useState, useRef, useEffect } from 'react';

interface InlineEditTagsProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  isAIGenerated?: boolean;
}

export const InlineEditTags: React.FC<InlineEditTagsProps> = ({
  tags,
  onAdd,
  onRemove,
  isAIGenerated = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering add mode
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleSave = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      onAdd(tagInput.trim());
      setTagInput('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setTagInput('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-0.5 px-2.5">
        Etiquetas
        {isAIGenerated && tags.length > 0 && (
          <span className="ml-2 text-[10px] text-primary">(AI generadas)</span>
        )}
      </label>

      <div className="space-y-1.5">
        {/* Existing tags as pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
              >
                {tag}
                <button
                  onClick={() => onRemove(tag)}
                  className="hover:opacity-70 transition-opacity"
                  title="Eliminar etiqueta"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add new tag */}
        {isAdding ? (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nueva etiqueta..."
              className="w-full px-2.5 py-1.5 pr-20 text-sm bg-background text-foreground border border-primary rounded-md focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
            />
            {/* Save/Cancel buttons */}
            <div className="absolute right-1.5 top-1.5 flex gap-1">
              <button
                onClick={handleSave}
                className="p-1 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                title="Agregar"
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
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar etiqueta
          </button>
        )}
      </div>
    </div>
  );
};

export default InlineEditTags;
