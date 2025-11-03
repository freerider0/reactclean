import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  className?: string;
}

/**
 * EmptyState component for displaying empty states in lists/grids
 * Used when there's no data to display yet
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  message,
  description,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{message}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
    </div>
  );
};

export default EmptyState;
