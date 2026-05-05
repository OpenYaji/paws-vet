'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import {
  Bell, Calendar, PawPrint, RefreshCw,
  CheckCheck, Info, AlertTriangle, Plus,
} from 'lucide-react';
import { CmsPageHeader } from '@/components/client/cms-page-header';
import { CmsEmptyState } from '@/components/client/cms-empty-state';
import { CmsCard } from '@/components/client/cms-card';
import { CmsBreadcrumb } from '@/components/client/cms-breadcrumb';

interface AdminNotif {
  id: string;
  notification_type: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'Asia/Manila',
  });
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'appointment_booked' || type === 'new_appointment')
    return <Calendar size={18} className="text-primary flex-shrink-0" />;
  if (type === 'pet_added' || type === 'new_pet')
    return <Plus size={18} className="text-emerald-500 flex-shrink-0" />;
  if (type === 'pet_updated')
    return <PawPrint size={18} className="text-amber-500 flex-shrink-0" />;
  if (type === 'appointment_cancelled')
    return <AlertTriangle size={18} className="text-destructive flex-shrink-0" />;
  return <Info size={18} className="text-muted-foreground flex-shrink-0" />;
}

function borderColor(type: string): string {
  if (type === 'appointment_booked' || type === 'new_appointment')
    return 'border-l-primary';
  if (type === 'pet_added' || type === 'new_pet')
    return 'border-l-emerald-500';
  if (type === 'pet_updated')
    return 'border-l-amber-400';
  if (type === 'appointment_cancelled')
    return 'border-l-destructive';
  return 'border-l-border';
}

function linkForNotif(notif: AdminNotif): string | null {
  if (notif.related_entity_type === 'appointment' && notif.related_entity_id)
    return `/client-admin/appointments/${notif.related_entity_id}`;
  if (notif.related_entity_type === 'pet' && notif.related_entity_id)
    return `/client-admin/pets/${notif.related_entity_id}`;
  return null;
}

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = useState<AdminNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/client-admin/notifications');
      const data = res.ok ? await res.json() : [];
      const rows = data as AdminNotif[];
      setNotifs(rows);
      setUnreadCount(rows.filter((n: AdminNotif) => !n.is_read).length);
    } catch {
      setNotifs([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (notif: AdminNotif) => {
    if (notif.is_read) return;
    await supabase
      .from('notification_logs')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notif.id);
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    await fetch('/api/client-admin/notifications/mark-read', { method: 'POST' });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <CmsBreadcrumb items={[{ label: 'CMS', href: '/client-admin?tab=clients' }, { label: 'Notifications' }]} />
          <CmsPageHeader
            title="Notifications"
            description="Client activity for bookings and pet updates"
            count={unreadCount > 0 ? unreadCount : undefined}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-accent
              text-muted-foreground transition-all duration-150
              disabled:opacity-55"
          >
            <RefreshCw size={15}
              className={loading ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-3
                py-1.5 rounded-lg text-sm font-semibold bg-primary
                text-primary-foreground hover:opacity-90
                active:scale-95 transition-all duration-150
                disabled:opacity-55"
            >
              <CheckCheck size={14} />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center
          py-20 gap-3 text-muted-foreground">
          <div className="w-7 h-7 rounded-full border-4
            border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Loading notifications…</span>
        </div>
      ) : notifs.length === 0 ? (
        <CmsEmptyState
          icon={Bell}
          title="No notifications yet"
          description="Client bookings and pet updates will appear here"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {notifs.map(notif => {
            const href = linkForNotif(notif);
            const Wrapper = href ? 'a' : 'button';
            return (
              <CmsCard key={notif.id} className="overflow-hidden">
                <Wrapper
                key={notif.id}
                href={href ?? undefined}
                onClick={() => markRead(notif)}
                className={[
                  'w-full text-left bg-card rounded-xl',
                  'border border-border border-l-4',
                  borderColor(notif.notification_type),
                  'shadow-sm hover:shadow-md hover:-translate-y-0.5',
                  'hover:border-primary/30',
                  'transition-all duration-150',
                  'px-4 py-4 flex items-start gap-3',
                  !notif.is_read
                    ? 'bg-primary/[0.03] dark:bg-primary/[0.06]'
                    : '',
                ].join(' ')}
                >
                <div className="mt-0.5">
                  <NotifIcon type={notif.notification_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start
                    justify-between gap-2">
                    <p className={`text-sm leading-snug ${
                      notif.is_read
                        ? 'font-medium text-foreground'
                        : 'font-semibold text-foreground'
                    }`}>
                      {notif.subject}
                    </p>
                    <div className="flex items-center
                      gap-1.5 flex-shrink-0">
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full
                          bg-primary flex-shrink-0" />
                      )}
                      <span className="text-xs text-muted-foreground
                        whitespace-nowrap">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground
                    mt-1 leading-relaxed line-clamp-2">
                    {notif.content}
                  </p>
                  {href && (
                    <span className="text-xs text-primary
                      font-semibold mt-1.5 inline-block
                      hover:underline">
                      View details →
                    </span>
                  )}
                </div>
                </Wrapper>
              </CmsCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
