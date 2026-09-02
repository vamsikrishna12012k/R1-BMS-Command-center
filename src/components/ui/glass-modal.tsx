import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Info, Clock, FileText, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const GlassModal = DialogPrimitive.Root;
const GlassModalTrigger = DialogPrimitive.Trigger;
const GlassModalPortal = DialogPrimitive.Portal;
const GlassModalClose = DialogPrimitive.Close;

const GlassModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
GlassModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

const GlassModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <GlassModalPortal>
    <GlassModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-0 shadow-2xl duration-300',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        'rounded-2xl overflow-hidden',
        // Glassmorphism effect
        'bg-card/90 backdrop-blur-xl border border-border/50',
        'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 bg-muted/50 hover:bg-muted transition-colors ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4 text-foreground" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </GlassModalPortal>
));
GlassModalContent.displayName = DialogPrimitive.Content.displayName;

const GlassModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 p-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent',
      className
    )}
    {...props}
  />
);
GlassModalHeader.displayName = 'GlassModalHeader';

const GlassModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4 bg-gradient-to-t from-muted/30 to-transparent',
      className
    )}
    {...props}
  />
);
GlassModalFooter.displayName = 'GlassModalFooter';

const GlassModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-none tracking-tight text-foreground',
      className
    )}
    {...props}
  />
));
GlassModalTitle.displayName = DialogPrimitive.Title.displayName;

const GlassModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
GlassModalDescription.displayName = DialogPrimitive.Description.displayName;

// Info Modal Component for KPI/Chart Support
interface InfoModalProps {
  title: string;
  description: string;
  lastUpdated?: string;
  documentation?: string;
  dataSource?: string;
  children?: React.ReactNode;
}

export function InfoModal({
  title,
  description,
  lastUpdated,
  documentation,
  dataSource,
  children,
}: InfoModalProps) {
  return (
    <GlassModalContent className="max-w-md">
      <GlassModalHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <GlassModalTitle>{title}</GlassModalTitle>
        </div>
        <GlassModalDescription className="mt-2">
          {description}
        </GlassModalDescription>
      </GlassModalHeader>
      
      <div className="px-6 space-y-4">
        {documentation && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Documentation</p>
              <p className="text-xs text-muted-foreground">{documentation}</p>
            </div>
          </div>
        )}
        
        {dataSource && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <Image className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Data Source</p>
              <p className="text-xs text-muted-foreground">{dataSource}</p>
            </div>
          </div>
        )}
        
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        )}
        
        {children}
      </div>
      
      <GlassModalFooter>
        <GlassModalClose className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium">
          Got it
        </GlassModalClose>
      </GlassModalFooter>
    </GlassModalContent>
  );
}

export {
  GlassModal,
  GlassModalPortal,
  GlassModalOverlay,
  GlassModalClose,
  GlassModalTrigger,
  GlassModalContent,
  GlassModalHeader,
  GlassModalFooter,
  GlassModalTitle,
  GlassModalDescription,
};
