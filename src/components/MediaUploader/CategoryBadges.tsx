import React, { useState } from 'react';
import {
  MAIN_CATEGORIES,
  getSubcategories,
  getMainCategoryFromSubcategory
} from './classificationConstants';

interface CategoryBadgesProps {
  value: string; // subcategory value (e.g., "Cocina", "DNI")
  onSave: (newValue: string) => void;
  isAIFilled?: boolean;
}

export const CategoryBadges: React.FC<CategoryBadgesProps> = ({
  value,
  onSave,
  isAIFilled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempMainCategory, setTempMainCategory] = useState<string>(
    getMainCategoryFromSubcategory(value) || ''
  );
  const [tempSubcategory, setTempSubcategory] = useState(value);

  const handleSave = () => {
    onSave(tempSubcategory);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempMainCategory(getMainCategoryFromSubcategory(value) || '');
    setTempSubcategory(value);
    setIsEditing(false);
  };

  const handleMainCategoryChange = (newMainCategory: string) => {
    setTempMainCategory(newMainCategory);
    setTempSubcategory(''); // Reset subcategory when main changes
  };

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black/30 [backdrop-filter:blur(4px)] z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-lg shadow-xl p-6 max-w-md w-full space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Editar Categoría
            {isAIFilled && (
              <span className="ml-2 text-xs text-primary">(AI)</span>
            )}
          </h3>

          {/* Main Category Select */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tipo
            </label>
            <select
              value={tempMainCategory}
              onChange={(e) => handleMainCategoryChange(e.target.value)}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="">Seleccionar tipo...</option>
              {Object.values(MAIN_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Select (dependent) */}
          {tempMainCategory && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Categoría específica
              </label>
              <select
                value={tempSubcategory}
                onChange={(e) => setTempSubcategory(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="">Seleccionar categoría...</option>
                {getSubcategories(tempMainCategory).map((subcat) => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Save/Cancel buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-foreground hover:bg-muted rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!tempSubcategory}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Read mode - show as badges
  const mainCategory = getMainCategoryFromSubcategory(value);

  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-0.5 px-2.5">
        Categoría
        {isAIFilled && (
          <span className="ml-2 text-[10px] text-primary">(AI)</span>
        )}
      </label>
      <div
        onClick={() => setIsEditing(true)}
        className="group relative px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted cursor-pointer transition-all duration-150 min-h-[32px] flex items-center"
      >
        {/* Breadcrumb-style badges */}
        {value ? (
          <div className="flex items-center gap-1.5">
            {mainCategory && (
              <>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                  {mainCategory}
                </span>
                <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary text-primary-foreground">
              {value}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Click para seleccionar categoría...
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

export default CategoryBadges;
