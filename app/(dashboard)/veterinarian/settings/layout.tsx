"use client"

import SettingsSidebar from "@/components/veterinarian/settings/settings-sidebar"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <SettingsSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
