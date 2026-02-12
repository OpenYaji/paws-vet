"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "@/components/veterinarian/theme-provider"

type Theme = "light" | "dark" | "system"

const themeOptions: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "light",
    label: "Light",
    icon: <Sun size={24} />,
    description: "A clean, bright appearance.",
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon size={24} />,
    description: "Easier on the eyes in low light.",
  },
  {
    value: "system",
    label: "System",
    icon: <Monitor size={24} />,
    description: "Follows your device settings.",
  },
]

export default function Themes() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold">Themes</h3>
        <p className="text-sm text-muted-foreground">
          Customize the appearance of your dashboard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Select a theme for your dashboard interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  theme === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <div
                  className={`p-3 rounded-full ${
                    theme === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {option.icon}
                </div>
                <div className="text-center">
                  <Label className="font-semibold">{option.label}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
