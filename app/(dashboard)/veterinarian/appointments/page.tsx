'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Calendar, Stethoscope, Camera, ClipboardList } from 'lucide-react';
import AppointmentsContent from '@/components/veterinarian/appointments/appointments-content';
import TriageContent from '@/components/veterinarian/appointments/triage-content';
import ConsultationContent from '@/components/veterinarian/appointments/consultation-content';
import NeuterContent from '@/components/veterinarian/appointments/neuter-content';

const tabConfig = [
  { value: 'calendar', label: 'Appointment Calendar', icon: Calendar },
  { value: 'triage', label: 'Triage', icon: ClipboardList },
  { value: 'consultation', label: 'Consultation', icon: Stethoscope },
  { value: 'neuter', label: 'Neuter', icon: Camera },
] as const;

type TabValue = typeof tabConfig[number]['value'];

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabValue | null);
  const [activeTab, setActiveTab] = useState<TabValue>(
    initialTab && tabConfig.some(t => t.value === initialTab) ? initialTab : 'calendar'
  );
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [animating, setAnimating] = useState(false);

  // Sliding indicator state
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const updateIndicator = useCallback(() => {
    const activeButton = tabRefs.current.get(activeTab);
    const container = tabListRef.current;
    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicator({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  const handleTabChange = (value: TabValue) => {
    if (value === activeTab) return;
    const oldIndex = tabConfig.findIndex(t => t.value === activeTab);
    const newIndex = tabConfig.findIndex(t => t.value === value);
    setDirection(newIndex > oldIndex ? 'right' : 'left');
    setAnimating(true);
    setTimeout(() => {
      setActiveTab(value);
      setTimeout(() => setAnimating(false), 300);
    }, 150);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Appointments</h1>
        <p className="text-muted-foreground">View schedules, triage, consultations, and neuter appointments</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabValue)} className="space-y-6">
        {/* Custom TabsList with sliding indicator */}
        <div
          ref={tabListRef}
          role="tablist"
          className="relative inline-flex items-center bg-card border rounded-xl p-1 gap-1"
        >
          {/* Sliding background indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-primary transition-all duration-300 ease-out"
            style={{
              left: `${indicator.left}px`,
              width: `${indicator.width}px`,
            }}
          />

          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                ref={(el) => { if (el) tabRefs.current.set(tab.value, el); }}
                role="tab"
                aria-selected={isActive}
                data-state={isActive ? 'active' : 'inactive'}
                onClick={() => handleTabChange(tab.value)}
                className={`relative z-10 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors duration-300 ${
                  isActive
                    ? 'text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden">
          {tabConfig.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              forceMount
              className="mt-0 outline-none"
              style={{ display: activeTab === tab.value ? 'block' : 'none' }}
            >
              <div
                className="transition-all duration-300 ease-out"
                style={{
                  animation: activeTab === tab.value && animating
                    ? `${direction === 'right' ? 'slideInRight' : 'slideInLeft'} 0.3s ease-out`
                    : undefined,
                }}
              >
                {tab.value === 'calendar' && <AppointmentsContent />}
                {tab.value === 'triage' && <TriageContent />}
                {tab.value === 'consultation' && <ConsultationContent />}
                {tab.value === 'neuter' && <NeuterContent />}
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      <style jsx global>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
