"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext, useEffect, useRef } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <>
      <motion.div
        className={cn(
          "fixed bottom-0 left-0 right-0 md:hidden z-50 bg-background/95 backdrop-blur-lg rounded-full m-4 shadow-lg",
          className
        )}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
        }}
      >
        <div className="flex items-center justify-between p-2 safe-area-pb">
          {links?.map((link) => (
            <SidebarLink
              key={link.href}
              link={link}
              dockMode={true}
              className="flex-1 min-w-0 max-w-[100px]"
            />
          ))}
        </div>
        {children}
      </motion.div>
    </>
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
  const isActive = pathname === link.href;
  
  if (dockMode) {
    return (
      <Link
        href={link.href}
        className={cn(
          "flex flex-col items-center justify-center gap-1 group/sidebar py-2 px-4 transition-all duration-200 rounded-full active:scale-95 min-h-[60px]",
          isActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/50",
          className
        )}
        title={link.label}
        {...props}
      >
        <span className="text-xl">
          {link.icon}
        </span>
        <span className={cn(
          "text-xs transition-colors font-medium",
          isActive
            ? "text-primary"
            : "text-muted-foreground group-hover/sidebar:text-foreground"
        )}>
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
