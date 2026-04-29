"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, SlidersHorizontal, Palette, Building2 } from "lucide-react"

interface SettingsMenuItem {
  name: string
  icon: React.ReactNode
  path: string
}

const settingsMenuItems: SettingsMenuItem[] = [
  {
    name: "General Settings",
    icon: <SlidersHorizontal size={18} />,
    path: "/veterinarian/settings/general-settings",
  },
  {
    name: "Clinic Profile",
    icon: <Building2 size={18} />,
    path: "/veterinarian/settings/clinic-profile",
  },
  {
    name: "Access & Security",
    icon: <Shield size={18} />,
    path: "/veterinarian/settings/access-security",
  },
  {
    name: "Themes",
    icon: <Palette size={18} />,
    path: "/veterinarian/settings/themes",
  },
]

export default function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <nav className="w-full md:w-56 flex-shrink-0">
      <h2 className="text-lg font-bold mb-4">Settings</h2>
      <ul className="space-y-1">
        {settingsMenuItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <li key={item.name}>
              <Link
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
