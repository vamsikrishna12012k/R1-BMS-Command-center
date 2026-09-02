import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconTileProps {
  icon: LucideIcon;
  status?: 'success' | 'warning' | 'critical' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Standardized icon tile component for consistent visual appearance across all tiles.
 * Ensures:
 * - Uniform icon size
 * - Consistent background style
 * - Standardized color theme by status
 * - Hover effects for interactivity
 */
export const IconTile = React.forwardRef<HTMLDivElement, IconTileProps>(
  ({ icon: Icon, status = 'neutral', size = 'md', className }, ref) => {
    const statusColors = {
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      critical: 'bg-destructive/10 text-destructive',
      neutral: 'bg-primary/10 text-primary',
    };

    const sizeStyles = {
      sm: {
        container: 'p-2 rounded-md',
        icon: 'w-4 h-4',
      },
      md: {
        container: 'p-2.5 rounded-lg',
        icon: 'w-5 h-5',
      },
      lg: {
        container: 'p-3 rounded-lg',
        icon: 'w-6 h-6',
      },
    };

    const sizeConfig = sizeStyles[size];

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center transition-transform duration-200 hover:scale-110',
          sizeConfig.container,
          statusColors[status],
          className
        )}
      >
        <Icon className={sizeConfig.icon} />
      </div>
    );
  }
);

IconTile.displayName = 'IconTile';
