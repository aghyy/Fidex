"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext, useEffect, useRef } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div> & { links?: Links[] }) => {
  const { links, ...restProps } = props;
  return (
    <>
      <DesktopSidebar {...restProps} />
      <MobileDock links={links} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  const dialogJustClosedRef = useRef(false);
  const sidebarStateBeforeDialogRef = useRef(false);

  useEffect(() => {
    const handleDialogOpened = () => {
      // Remember sidebar state when dialog opens
      sidebarStateBeforeDialogRef.current = open;
    };

    const handleDialogClosed = () => {
      // Restore sidebar to its previous state
      setOpen(sidebarStateBeforeDialogRef.current);
      // Prevent sidebar from opening immediately after dialog closes
      dialogJustClosedRef.current = true;
      setTimeout(() => {
        dialogJustClosedRef.current = false;
      }, 300);
    };

    // Capture any clicks while dialog is open to prevent sidebar from opening
    const handleDocumentClick = () => {
      if (document.body.dataset.morphingDialogOpen === "true") {
        dialogJustClosedRef.current = true;
        setTimeout(() => {
          dialogJustClosedRef.current = false;
        }, 300);
      }
    };

    window.addEventListener('morphing-dialog:opened', handleDialogOpened);
    window.addEventListener('morphing-dialog:closed', handleDialogClosed);
    document.addEventListener('click', handleDocumentClick, true); // Capture phase
    return () => {
      window.removeEventListener('morphing-dialog:opened', handleDialogOpened);
      window.removeEventListener('morphing-dialog:closed', handleDialogClosed);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [setOpen, open]);

  return (
    <>
      <motion.div
        className={cn(
          "min-h-screen h-full px-4 py-4 hidden md:flex md:flex-col bg-background text-card-foreground w-[300px] shrink-0 relative",
          !open && "cursor-pointer",
          className
        )}
        animate={{
          width: animate ? (open ? "250px" : "65px") : "250px",
        }}
        whileHover={{
          width: animate ? (open ? "250px" : "75px") : "250px",
        }}
        transition={{
          duration: 0.2,
          ease: "easeInOut",
        }}
        onClick={(e) => {
          if (!open && !dialogJustClosedRef.current) {
            // Don't open sidebar if a morphing dialog is currently open
            if (document.body.dataset.morphingDialogOpen === "true") {
              return;
            }

            // Check if the click target is an interactive element
            const target = e.target as HTMLElement;
            const isInteractive = target.closest('a, button, [role="button"]');

            if (!isInteractive) {
              setOpen(true);
            }
          }
          e.stopPropagation();
        }}
        {...props}
      >
        <>
          {/* Visual indicator lines when sidebar is collapsed */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 transition-opacity duration-200 cursor-pointer"
            style={{ opacity: !open ? 0.4 : 0 }}
          >
            <div className="w-[2px] h-8 bg-muted-foreground rounded-full" />
            <div className="w-[2px] h-8 bg-muted-foreground rounded-full" />
            <div className="w-[2px] h-8 bg-muted-foreground rounded-full" />
          </div>
          {children}
        </>
      </motion.div>
    </>
  );
};

export const MobileDock = ({
  className,
  children,
  links,
}: {
  className?: string;
  children?: React.ReactNode;
  links?: Links[];
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragVelocity, setDragVelocity] = useState(0); // px/s
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const lastMoveRef = useRef<{ x: number; t: number } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Force re-render when pathname changes to ensure DOM is updated
  useEffect(() => {
    if (isClient) {
      // Small delay to ensure DOM is updated after navigation
      const timer = setTimeout(() => {
        // Force a re-render by updating a dummy state
        setDragOffset(prev => prev);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pathname, isClient]);

  const currentIndex = isClient ? (links?.findIndex(link => link.href === pathname) ?? 0) : 0;

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Don't prevent default for touch events as it might interfere with scrolling
    if ('clientX' in e) {
      e.preventDefault();
    }

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragOffset(0);
    lastMoveRef.current = { x: clientX, t: performance.now() };
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !links) return;

    // Only prevent default for mouse events, not touch events (to avoid passive listener warning)
    if ('clientX' in e) {
      e.preventDefault();
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const containerRect = containerRef.current.getBoundingClientRect();
    const dragDistance = clientX - dragStartX;

    // Velocity tracking (px/s)
    const now = performance.now();
    const last = lastMoveRef.current;
    if (last) {
      const dt = Math.max(1, now - last.t);
      const dx = clientX - last.x;
      const v = Math.abs(dx) / dt * 1000; // px/s
      setDragVelocity(v);
    }
    lastMoveRef.current = { x: clientX, t: now };

    // Calculate the offset as a percentage of container width
    const offsetPercentage = (dragDistance / containerRect.width) * 100;
    setDragOffset(offsetPercentage);
  };

  const handleDragEnd = () => {
    if (!isDragging || !links) return;

    setIsDragging(false);
    setDragVelocity(0); // ensure we snap back to base size after release

    // Calculate which tab the drag ended closest to using CSS-based positioning
    const tabWidth = 100 / links.length;
    const currentPosition = (currentIndex * tabWidth) + dragOffset;
    const targetIndex = Math.round(currentPosition / tabWidth);

    // Clamp to valid range
    const clampedIndex = Math.max(0, Math.min(links.length - 1, targetIndex));

    // Only navigate if we're moving to a different tab
    if (clampedIndex !== currentIndex) {
      router.push(links[clampedIndex].href);
    }

    setDragOffset(0);
  };

  // Calculate the current position of the indicator using CSS-based positioning
  const getIndicatorPosition = () => {
    if (!links || links.length === 0) return { x: 0, widthPx: 0, edgeProximity: 0 };

    const container = containerRef.current;
    if (!container) return { x: 0, widthPx: 0, edgeProximity: 0 };

    const PADDING_X = 8; // matches p-2
    const rect = container.getBoundingClientRect();
    const innerWidth = Math.max(0, rect.width - PADDING_X * 2);

    // Read current link DOM rect to match visual width exactly
    const linkNodes = container.querySelectorAll('a');
    const clampedIndex = Math.max(0, Math.min((links?.length ?? 1) - 1, currentIndex));
    const currentNode = linkNodes[clampedIndex] as HTMLElement | undefined;

    let baseXpx = 0;
    let widthPx = innerWidth / (links?.length || 1);

    if (currentNode) {
      const nodeRect = currentNode.getBoundingClientRect();
      // left relative to inner content (exclude container padding)
      baseXpx = (nodeRect.left - rect.left) - PADDING_X;
      widthPx = nodeRect.width;
    } else {
      // fallback to equal width split
      widthPx = innerWidth / (links?.length || 1);
      baseXpx = clampedIndex * widthPx;
    }

    const dragOffsetPx = isDragging ? (dragOffset / 100) * innerWidth : 0;

    // Prevent the indicator from leaving the dock by more than 20% of its width
    const minX = -0.2 * widthPx; // allow up to 20% outside on the left
    const maxX = innerWidth - 0.8 * widthPx; // allow up to 20% outside on the right

    const unclampedX = baseXpx + dragOffsetPx;
    const clampedX = Math.max(minX, Math.min(maxX, unclampedX));

    // Edge proximity (0..1): 1 when touching boundary, 0 when >= 20% width away
    const distLeft = clampedX - minX;
    const distRight = maxX - clampedX;
    const nearest = Math.min(distLeft, distRight);
    const edgeDenom = 0.2 * widthPx;
    const edgeProximity = Math.max(0, Math.min(1, 1 - nearest / Math.max(1, edgeDenom)));

    return {
      x: clampedX,
      widthPx,
      edgeProximity,
    };
  };

  // Don't render until client-side to prevent hydration issues
  if (!isClient) {
    return null;
  }

  const indicatorPosition = getIndicatorPosition();
  const baseHeight = 56; // px (slightly slimmer by default)
  const velNorm = Math.min(1, dragVelocity / 1200); // make velocity effect more noticeable

  // Edge effect: subtle at edges (no extreme roundness)
  // - width shrinks at edges down to 85% (min 0.85x)
  // - height grows at edges up to 110% (max 1.10x)
  const edgeWidthFactor = 1 - 0.15 * indicatorPosition.edgeProximity;
  const edgeHeightFactor = 1 + 0.10 * indicatorPosition.edgeProximity;

  // Velocity effect: fast drags become wider and flatter
  // - width grows up to 1.25x at high velocity
  // - height reduces down to 0.85x at high velocity
  const velWidthFactor = 1 + 0.25 * velNorm;
  const velHeightFactor = 1 - 0.15 * velNorm;

  // Combine while dragging; when not dragging, snap to base
  const targetWidth = isDragging
    ? Math.max(0.7 * indicatorPosition.widthPx, indicatorPosition.widthPx * edgeWidthFactor * velWidthFactor)
    : indicatorPosition.widthPx;
  const targetHeight = isDragging
    ? Math.max(40, baseHeight * edgeHeightFactor * velHeightFactor)
    : baseHeight;

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 md:hidden z-50 bg-background/95 backdrop-blur-lg rounded-full m-4 shadow-lg touch-pan-y overscroll-none select-none",
        isDragging && "bg-primary/5",
        className
      )}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      style={{ userSelect: 'none' }}
    >
      <div className="relative flex items-center justify-between p-2 safe-area-pb w-full">
        {/* Active indicator background */}
        {links && links.length > 0 && (
          <motion.div
            key={`indicator-${currentIndex}`}
            ref={indicatorRef}
            className={cn(
              "absolute bg-primary/20 rounded-full cursor-grab z-10 pointer-events-none",
              isDragging && "cursor-grabbing bg-primary/30"
            )}
            initial={false}
            animate={{
              x: indicatorPosition.x,
              y: -targetHeight / 2,
              width: targetWidth,
              height: targetHeight,
              borderRadius: targetHeight / 2,
            }}
            transition={isDragging ? { duration: 0 } : {
              type: "spring",
              stiffness: 320,
              damping: 28,
              mass: 0.9,
            }}
            style={{
              top: '50%',
              left: '8px',
            }}
          />
        )}

        {links?.map((link) => (
          <SidebarLink
            key={link.href}
            link={link}
            dockMode={true}
            className="flex-1 min-w-0 max-w-[100px] relative z-10"
          />
        ))}
      </div>
      {children}
    </motion.div>
  );
};

export const SidebarLink = ({
  link,
  className,
  dockMode = false,
  ...props
}: {
  link: Links;
  className?: string;
  dockMode?: boolean;
}) => {
  const { open, animate } = useSidebar();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isActive = isClient && pathname === link.href;

  if (dockMode) {
    return (
      <Link
        href={link.href}
        className={cn(
          "flex flex-col items-center justify-center gap-1 group/sidebar py-2 px-4 transition-all duration-200 rounded-full active:scale-95 min-h-[60px]",
          isActive ? "text-primary" : "text-muted-foreground group-hover/sidebar:text-foreground",
          className
        )}
        title={link.label}
        {...props}
      >
        <span className="text-xl">
          {link.icon}
        </span>
        <span className="text-xs transition-colors font-medium">
          {link.label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2 px-[6px] rounded-md",
        className
      )}
      title={link.label}
      {...props}
    >
      <span>
        {link.icon}
      </span>

      <span
        style={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </span>
    </Link>
  );
};
