"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Theme } from "@/types/theme"

interface AnimatedThemeTogglerProps
  extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const selectRef = useRef<HTMLButtonElement>(null)
  const [theme, setTheme] = useState<Theme>("system")
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  const applyTheme = useCallback((t: Theme) => {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = t === "dark" || (t === "system" && prefersDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? "system"
    setTheme(saved)
    applyTheme(saved)
  }, [applyTheme])

  const toggleTheme = useCallback(async (next: Theme) => {
    if (!selectRef.current) return

    await document.startViewTransition(() => {
      flushSync(() => {
        applyTheme(next)
        localStorage.setItem("theme", next)
        setTheme(next)
      })
    }).ready

    const { top, left, width, height } = selectRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  }, [duration, applyTheme])

  function handleChange(value: Theme) {
    toggleTheme(value)
  }

  // TODO: fix don't close morphing dialog when click/close select
  return (
    <Select
      value={theme}
      onValueChange={(v) => handleChange(v as Theme)}
      open={isSelectOpen}
      onOpenChange={(open) => {
        setIsSelectOpen(open)
        if (open) {
          document.body.dataset.radixSelectOpen = 'true'
        } else {
          delete document.body.dataset.radixSelectOpen
        }
      }}
    >
      <SelectTrigger ref={selectRef} className={className} {...props}>
        <SelectValue placeholder="Select a theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  )
}
