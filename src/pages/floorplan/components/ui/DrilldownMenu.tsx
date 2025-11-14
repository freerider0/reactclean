/**
 * DrilldownMenu - Hierarchical navigation menu with floating button style
 * Supports multi-level navigation with smooth transitions
 *
 * @example Basic usage with flat menu
 * ```tsx
 * const items = [
 *   {
 *     id: 'settings',
 *     label: 'Settings',
 *     icon: <SettingsIcon />,
 *     onSelect: () => // console.log('Settings clicked')
 *   }
 * ];
 *
 * <DrilldownMenu
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   items={items}
 *   title="Menu"
 * />
 * ```
 *
 * @example Nested submenus
 * ```tsx
 * const items = [
 *   {
 *     id: 'draw',
 *     label: 'Draw Tools',
 *     icon: <PencilIcon />,
 *     submenu: [
 *       {
 *         id: 'rectangle',
 *         label: 'Rectangle',
 *         icon: <RectIcon />,
 *         onSelect: () => drawRectangle()
 *       },
 *       {
 *         id: 'circle',
 *         label: 'Circle',
 *         icon: <CircleIcon />,
 *         onSelect: () => drawCircle()
 *       }
 *     ]
 *   },
 *   {
 *     id: 'settings',
 *     label: 'Settings',
 *     icon: <SettingsIcon />,
 *     submenu: [
 *       {
 *         id: 'display',
 *         label: 'Display',
 *         icon: <DisplayIcon />,
 *         submenu: [
 *           {
 *             id: 'theme',
 *             label: 'Theme',
 *             icon: <ThemeIcon />,
 *             onSelect: () => openThemeSettings()
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * ];
 * ```
 */

import React, { useState } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon: JSX.Element;
  onSelect?: () => void;
  submenu?: MenuItem[];
}

interface DrilldownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  title?: string;
}

export function DrilldownMenu({
  isOpen,
  onClose,
  items,
  title = 'Menu'
}: DrilldownMenuProps) {
  const [navigationStack, setNavigationStack] = useState<MenuItem[][]>([items]);
  const [prevStack, setPrevStack] = useState<MenuItem[][] | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const currentItems = navigationStack[navigationStack.length - 1];
  const isAtRoot = navigationStack.length === 1;

  const handleClose = () => {
    // Reset to root when closing
    setNavigationStack([items]);
    setPrevStack(null);
    // Blur any focused element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.submenu) {
      // Navigate to submenu
      setPrevStack(navigationStack);
      setDirection('forward');
      setNavigationStack([...navigationStack, item.submenu]);

      // Clear prev stack after animation
      setTimeout(() => setPrevStack(null), 200);
    } else if (item.onSelect) {
      // Execute action
      item.onSelect();
      handleClose();
    }
  };

  const handleBack = () => {
    if (!isAtRoot) {
      setPrevStack(navigationStack);
      setDirection('back');
      setNavigationStack(navigationStack.slice(0, -1));

      // Clear prev stack after animation
      setTimeout(() => setPrevStack(null), 200);
    }
  };

  const getCurrentTitle = (stack: MenuItem[][]) => {
    if (stack.length === 1) return title;
    // Try to find the parent item that led to current submenu
    if (stack.length >= 2) {
      const parentLevel = stack[stack.length - 2];
      const currentLevel = stack[stack.length - 1];
      const parentItem = parentLevel.find(item => item.submenu === currentLevel);
      return parentItem?.label || title;
    }
    return title;
  };

  const renderMenuColumn = (stack: MenuItem[][], isExiting: boolean) => {
    const items = stack[stack.length - 1];
    const animationClass = isExiting
      ? direction === 'forward'
        ? 'animate-slide-out-left'
        : 'animate-slide-out-right'
      : direction === 'forward'
        ? 'animate-slide-in-right'
        : 'animate-slide-in-left';

    return (
      <div
        key={stack.length}
        className={`flex flex-col gap-2 ${animationClass} ${isExiting ? 'absolute inset-0' : ''}`}
      >
        {/* Back/Title button */}
        <button
          onClick={stack.length === 1 ? handleClose : handleBack}
          className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 focus:outline-none select-none"
          disabled={isExiting}
        >
          <div className="text-gray-600 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </div>
          <span className="truncate">{getCurrentTitle(stack)}</span>
        </button>

        {/* Menu items */}
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 focus:outline-none select-none group"
            title={item.label}
            disabled={isExiting}
          >
            <div className="text-gray-600 flex-shrink-0">
              {item.icon}
            </div>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.submenu && (
              <div className="text-gray-400 flex-shrink-0 group-hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-full ml-2 z-40 w-48 overflow-hidden">
      <div className="relative">
        {/* Exiting menu */}
        {prevStack && renderMenuColumn(prevStack, true)}

        {/* Entering menu */}
        {renderMenuColumn(navigationStack, false)}
      </div>
    </div>
  );
}
