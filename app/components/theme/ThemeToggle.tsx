import { useSidebar } from "../ui/sidebar";
import { useTheme } from "./ThemeProvider";
import {
  IconSun,
  IconMoon,
  IconDeviceDesktop,
} from "@tabler/icons-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { open } = useSidebar();

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const icon = theme === "light" ? (
    <IconSun className="h-4 w-4" />
  ) : theme === "dark" ? (
    <IconMoon className="h-4 w-4" />
  ) : (
    <IconDeviceDesktop className="h-4 w-4" />
  );

  return (
    <button
      onClick={cycleTheme}
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme} (click to change)`}
      className={`rounded-md border ${open ? "px-3 py-2 text-sm flex items-center gap-2" : "h-8 w-8 flex items-center justify-center"}`}
    >
      {icon}
      {open && <span>Theme</span>}
    </button>
  );
}