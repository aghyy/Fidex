'use client';

import {
  useState,
  useId,
  useRef,
  useEffect,
  createContext,
  useContext,
  isValidElement,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  Transition,
  Variants,
} from 'motion/react';
import useClickOutside from '@/components/motion-primitives/useClickOutside';
import { cn } from '@/lib/utils';

const TRANSITION: Transition = {
  type: 'spring',
  bounce: 0.1,
  duration: 0.4,
};

type MorphingPopoverContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  uniqueId: string;
  variants?: Variants;
};

const MorphingPopoverContext =
  createContext<MorphingPopoverContextValue | null>(null);

export function useMorphingPopover() {
  const context = useContext(MorphingPopoverContext);
  if (!context) {
    throw new Error(
      "useMorphingPopover must be used within MorphingPopover"
    );
  }
  return context;
}

function usePopoverLogic({
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const uniqueId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const isOpen = controlledOpen ?? uncontrolledOpen;

  const open = () => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(true);
    }
    onOpenChange?.(true);
  };

  const close = () => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(false);
    }
    onOpenChange?.(false);
  };

  return { isOpen, open, close, uniqueId };
}

export type MorphingPopoverProps = {
  children: React.ReactNode;
  transition?: Transition;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variants?: Variants;
  className?: string;
} & React.ComponentProps<'div'>;

function MorphingPopover({
  children,
  transition = TRANSITION,
  defaultOpen,
  open,
  onOpenChange,
  variants,
  className,
  ...props
}: MorphingPopoverProps) {
  const popoverLogic = usePopoverLogic({ defaultOpen, open, onOpenChange });

  return (
    <MorphingPopoverContext.Provider value={{ ...popoverLogic, variants }}>
      <MotionConfig transition={transition}>
        <div
          className={cn('relative flex items-center justify-center', className)}
          key={popoverLogic.uniqueId}
          {...props}
        >
          {children}
        </div>
      </MotionConfig>
    </MorphingPopoverContext.Provider>
  );
}

export type MorphingPopoverTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
} & React.ComponentProps<typeof motion.button>;

type TriggerClickHandler = (event: ReactMouseEvent<HTMLElement>) => void;

function MorphingPopoverTrigger({
  children,
  className,
  asChild = false,
  onClick,
  ...props
}: MorphingPopoverTriggerProps) {
  const context = useContext(MorphingPopoverContext);
  if (!context) {
    throw new Error(
      'MorphingPopoverTrigger must be used within MorphingPopover'
    );
  }

  const externalOnClick = onClick as TriggerClickHandler | undefined;

  if (asChild && isValidElement(children)) {
    const MotionComponent = motion.create(
      children.type as React.ElementType
    );
    const childProps = children.props as Record<string, unknown>;
    const mergedClassName = cn(
      typeof childProps.className === 'string' ? childProps.className : undefined,
      className
    );
    const childOnClick = childProps.onClick as TriggerClickHandler | undefined;

    return (
      <MotionComponent
        {...props}
        {...childProps}
        onClick={(event: ReactMouseEvent<HTMLElement>) => {
          event.stopPropagation();
          childOnClick?.(event);
          externalOnClick?.(event);
          if (!event.defaultPrevented) {
            context.open();
          }
        }}
        layoutId={`popover-trigger-${context.uniqueId}`}
        className={mergedClassName}
        key={context.uniqueId}
        aria-expanded={context.isOpen}
        aria-controls={`popover-content-${context.uniqueId}`}
      />
    );
  }

  return (
    <motion.div
      key={context.uniqueId}
      layoutId={`popover-trigger-${context.uniqueId}`}
    >
      <motion.button
        {...props}
        type="button"
        layoutId={`popover-label-${context.uniqueId}`}
        key={context.uniqueId}
        className={className}
        aria-expanded={context.isOpen}
        aria-controls={`popover-content-${context.uniqueId}`}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          externalOnClick?.(event as ReactMouseEvent<HTMLElement>);
          if (!event.defaultPrevented) {
            context.open();
          }
        }}
      >
        {children}
      </motion.button>
    </motion.div>
  );
}

export type MorphingPopoverContentProps = {
  children: React.ReactNode;
  className?: string;
} & React.ComponentProps<typeof motion.div>;

function MorphingPopoverContent({
  children,
  className,
  ...props
}: MorphingPopoverContentProps) {
  const context = useContext(MorphingPopoverContext);
  if (!context)
    throw new Error(
      'MorphingPopoverContent must be used within MorphingPopover'
    );

  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, (event) => {
    // Ignore clicks originating from portals/overlays that belong to children (e.g., Radix Select portal)
    const target = event.target as HTMLElement | null;
    if (target && target.closest('[data-keep-popover-open="true"]')) {
      return;
    }
    context.close();
  });

  useEffect(() => {
    if (!context.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') context.close();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [context]);

  return (
    <AnimatePresence>
      {context.isOpen && (
        <>
          <motion.div
            {...props}
            ref={ref}
            layoutId={`popover-trigger-${context.uniqueId}`}
            key={context.uniqueId}
            id={`popover-content-${context.uniqueId}`}
            role='dialog'
            aria-modal='true'
            className={cn(
              'absolute overflow-hidden rounded-xl border border-muted bg-background text-foreground p-2 shadow-md',
              className
            )}
            initial='initial'
            animate='animate'
            exit='exit'
            variants={context.variants}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { MorphingPopover, MorphingPopoverTrigger, MorphingPopoverContent };
