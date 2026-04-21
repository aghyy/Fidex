"use client"

import { useCallback, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useAtom } from "jotai"
import { themeAtom, type ThemeMode } from "@/state/theme"

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
  const [mode, setMode] = useAtom(themeAtom)
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  const toggleMode = useCallback(async (next: ThemeMode) => {
    if (!selectRef.current) return

    const runTransition = async () => {
      const transition = (document as Document & {
        startViewTransition?: (cb: () => void) => { ready: Promise<void> }
      }).startViewTransition?.(() => {
        flushSync(() => {
          setMode(next)
        })
      })

      if (!transition) {
        setMode(next)
        return
      }

      await transition.ready

      const { top, left, width, height } = selectRef.current!.getBoundingClientRect()
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
    }

    await runTransition()
  }, [duration, setMode])

  function handleChange(value: ThemeMode) {
    toggleMode(value)
  }

  return (
    <Select
      value={mode}
      onValueChange={(v) => handleChange(v as ThemeMode)}
      open={isSelectOpen}
      onOpenChange={(open) => {
        setIsSelectOpen(open)
        if (open) {
          document.body.dataset.radixSelectOpen = 'true'
        }
      }}
    >
      <SelectTrigger ref={selectRef} className={className} {...props}>
        <SelectValue placeholder="Select a mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  )
}
