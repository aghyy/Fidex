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
  const [clickAnimatingTo, setClickAnimatingTo] = useState<number | null>(null);
  const [travelDurationMs, setTravelDurationMs] = useState<number>(0);
  const travelHrefRef = useRef<string | null>(null);
  const [travelTarget, setTravelTarget] = useState<{ x: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dockReady, setDockReady] = useState(false);
  const travelTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const lastMoveRef = useRef<{ x: number; t: number } | null>(null);

  useEffect(() => {
    setIsClient(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    // If container is not animating in (e.g., already visible), ensure indicator can render
    setDockReady(true);
  }, []);

  // Reset transient travel/drag state whenever the route changes
  useEffect(() => {
    setClickAnimatingTo(null);
    setTravelTarget(null);
    setIsDragging(false);
    setDragVelocity(0);
    if (travelTimeoutRef.current) {
      window.clearTimeout(travelTimeoutRef.current);
      travelTimeoutRef.current = null;
    }
  }, [pathname]);

  // Force re-render when pathname changes to ensure DOM is updated
  // useEffect(() => {
  //   if (isClient) {
  //     // Small delay to ensure DOM is updated after navigation
  //     const timer = setTimeout(() => {
  //       // Force a re-render by updating a dummy state
  //       setDragOffset(prev => prev);
  //     }, 50);
  //     return () => clearTimeout(timer);
  //   }
  // }, [pathname, isClient]);

  const currentIndex = isClient ? (links?.findIndex(link => link.href === pathname) ?? 0) : 0;

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    // If we're running a click animation, ignore manual drag until finished
    if (clickAnimatingTo !== null) return;
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
    if (clickAnimatingTo !== null) return; // ignore during click travel
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

  const handleLinkClick = (e: React.MouseEvent, idx: number, href: string) => {
    if (!links) return;
    if (idx === currentIndex) return; // already active
    e.preventDefault();
    e.stopPropagation();
    // begin animated travel
    setIsDragging(false);
    setDragVelocity(0);

    // Compute travel target from DOM once to avoid reflow thrash during animation
    const container = containerRef.current;
    if (container) {
      const PADDING_X = 8;
      const rect = container.getBoundingClientRect();
      const linkNodes = container.querySelectorAll('a');
      const node = linkNodes[idx] as HTMLElement | undefined;
      if (node) {
        const nodeRect = node.getBoundingClientRect();
        const x = (nodeRect.left - rect.left) - PADDING_X; // relative to padded inner
        setTravelTarget({ x, width: nodeRect.width });
      }
    }

    setClickAnimatingTo(idx);
    travelHrefRef.current = href;
    const distance = Math.abs(idx - currentIndex);
    const duration = 240 + Math.min(420, distance * 140);
    setTravelDurationMs(duration);

    // Fallback navigate if onAnimationComplete doesn't fire for any reason
    if (travelTimeoutRef.current) {
      window.clearTimeout(travelTimeoutRef.current);
    }
    travelTimeoutRef.current = window.setTimeout(() => {
      if (travelHrefRef.current) {
        const h = travelHrefRef.current;
        travelHrefRef.current = null;
        setClickAnimatingTo(null);
        setTravelTarget(null);
        router.push(h);
      }
      travelTimeoutRef.current = null;
    }, duration + 80);
  };

  const getIndicatorPosition = React.useCallback(() => {
    if (!links || links.length === 0) return { x: 0, widthPx: 0, edgeProximity: 0 };

    const container = containerRef.current;
    if (!container) return { x: 0, widthPx: 0, edgeProximity: 0 };

    const PADDING_X = 8; // matches p-2
    const rect = container.getBoundingClientRect();
    const innerWidth = Math.max(0, rect.width - PADDING_X * 2);

    // When click travel is active and we have cached target, use it directly
    if (clickAnimatingTo !== null && travelTarget) {
      const { x, width } = travelTarget;
      const minX = -0.2 * width;
      const maxX = innerWidth - 0.8 * width;
      const clampedX = Math.max(minX, Math.min(maxX, x));
      const distLeft = clampedX - minX;
      const distRight = maxX - clampedX;
      const nearest = Math.min(distLeft, distRight);
      const edgeDenom = 0.2 * width;
      const edgeProximity = Math.max(0, Math.min(1, 1 - nearest / Math.max(1, edgeDenom)));
      return { x: clampedX, widthPx: width, edgeProximity };
    }

    const linkNodes = container.querySelectorAll('a');
    const baseIndex = currentIndex;
    const clampedIndex = Math.max(0, Math.min((links?.length ?? 1) - 1, baseIndex));
    const currentNode = linkNodes[clampedIndex] as HTMLElement | undefined;

    let baseXpx = 0;
    let widthPx = innerWidth / (links?.length || 1);

    if (currentNode) {
      const nodeRect = currentNode.getBoundingClientRect();
      baseXpx = (nodeRect.left - rect.left) - PADDING_X;
      widthPx = nodeRect.width;
    } else {
      widthPx = innerWidth / (links?.length || 1);
      baseXpx = clampedIndex * widthPx;
    }

    const dragOffsetPx = isDragging ? (dragOffset / 100) * innerWidth : 0;

    const minX = -0.2 * widthPx;
    const maxX = innerWidth - 0.8 * widthPx;

    const unclampedX = baseXpx + dragOffsetPx;
    const clampedX = Math.max(minX, Math.min(maxX, unclampedX));

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
  }, [links, clickAnimatingTo, travelTarget, currentIndex, isDragging, dragOffset]);

  const indicatorPosition = React.useMemo(() => getIndicatorPosition(), [getIndicatorPosition]);
  const baseHeight = 56; // px
  const isTravel = clickAnimatingTo !== null && travelTarget !== null;
  const effectiveVel = isTravel ? 0 : dragVelocity;
  const velNorm = Math.min(1, effectiveVel / 1200);

  // Edge effect (subtle) — disabled during click travel to avoid jitter
  const edgeFactor = isTravel ? 0 : indicatorPosition.edgeProximity;
  const edgeWidthFactor = 1 - 0.15 * edgeFactor;
  const edgeHeightFactor = 1 + 0.10 * edgeFactor;

  // Velocity effect — disabled during click travel
  const velWidthFactor = 1 + 0.25 * velNorm;
  const velHeightFactor = 1 - 0.15 * velNorm;

  // Base (static) size used for transforms
  const baseWidth = isTravel
    ? (travelTarget ? travelTarget.width : indicatorPosition.widthPx)
    : indicatorPosition.widthPx;

  // Transform scales (no layout change)
  const scaleX = isTravel
    ? 1
    : (isDragging ? Math.max(0.7, edgeWidthFactor * velWidthFactor) : 1);
  const scaleY = isTravel
    ? 1
    : (isDragging ? Math.max(0.7, edgeHeightFactor * velHeightFactor) : 1);

  const animatedTransition = clickAnimatingTo !== null
    ? { type: "tween" as const, duration: Math.max(0.2, travelDurationMs / 1000 + 0.06), ease: "easeInOut" as const }
    : (isDragging
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 200, damping: 26, mass: 1 });

  const transitionForRender = mounted ? animatedTransition : { duration: 0 };

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 md:hidden z-50 bg-background/95 backdrop-blur-lg rounded-full m-4 shadow-lg touch-pan-y overscroll-none select-none transform-gpu will-change-transform",
        isDragging && "bg-primary/5",
        className
      )}
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      onAnimationComplete={() => {
        if (travelTimeoutRef.current) {
          window.clearTimeout(travelTimeoutRef.current);
          travelTimeoutRef.current = null;
        }
        if (clickAnimatingTo !== null && travelHrefRef.current) {
          const href = travelHrefRef.current;
          travelHrefRef.current = null;
          setClickAnimatingTo(null);
          setTravelTarget(null);
          router.push(href);
        }
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
        {dockReady && links && links.length > 0 && (
          <motion.div
            key={`indicator-${currentIndex}`}
            ref={indicatorRef}
            className={cn(
              "absolute bg-primary/20 rounded-full cursor-grab z-10 pointer-events-none transform-gpu will-change-transform",
              isDragging && "cursor-grabbing bg-primary/30"
            )}
            initial={false}
            animate={{
              x: indicatorPosition.x,
              y: -baseHeight / 2,
              scaleX,
              scaleY,
              borderRadius: baseHeight / 2,
            }}
            transition={transitionForRender}
            layout={false}
            style={{
              top: '50%',
              left: '8px',
              width: `${baseWidth}px`,
              height: `${baseHeight}px`,
              transformOrigin: 'left center',
            }}
          />
        )}

        {links?.map((link, index) => (
          <SidebarLink
            key={link.href}
            link={link}
            dockMode={true}
            onClick={(e) => handleLinkClick(e, index, link.href)}
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
  onClick,
  ...props
}: {
  link: Links;
  className?: string;
  dockMode?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
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
        onClick={onClick}
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
