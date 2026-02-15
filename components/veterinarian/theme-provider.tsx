"use client"

import { createContext, useContext, useState, useEffect } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  isDark: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light"
  const stored = localStorage.getItem("theme")
  if (stored === "light" || stored === "dark" || stored === "system") return stored
  return "light"
}

function applyTheme(theme: Theme): boolean {
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
    return true
  } else if (theme === "light") {
    root.classList.remove("dark")
    return false
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    if (prefersDark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    return prefersDark
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    setThemeState(stored)
    setIsDark(applyTheme(stored))
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)
    setIsDark(applyTheme(newTheme))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}
