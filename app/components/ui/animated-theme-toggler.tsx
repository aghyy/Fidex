"use client"

import { useCallback, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useAtom } from "jotai"
import { themePaletteAtom, type ThemePalette } from "@/state/theme"

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
  const [palette, setPalette] = useAtom(themePaletteAtom)
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  const toggleTheme = useCallback(async (next: ThemePalette) => {
    if (!selectRef.current) return

    await document.startViewTransition(() => {
      flushSync(() => {
        setPalette(next)
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
  }, [duration, setPalette])

  function handleChange(value: ThemePalette) {
    toggleTheme(value)
  }

  return (
    <Select
      value={palette}
      onValueChange={(v) => handleChange(v as ThemePalette)}
      open={isSelectOpen}
      onOpenChange={(open) => {
        setIsSelectOpen(open)
        if (open) {
          document.body.dataset.radixSelectOpen = 'true'
        }
      }}
    >
      <SelectTrigger ref={selectRef} className={className} {...props}>
        <SelectValue placeholder="Select a theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="fidex">Fidex</SelectItem>
        <SelectItem value="forest">Forest</SelectItem>
        <SelectItem value="sunset">Sunset</SelectItem>
        <SelectItem value="mono">Mono</SelectItem>
      </SelectContent>
    </Select>
  )
}
