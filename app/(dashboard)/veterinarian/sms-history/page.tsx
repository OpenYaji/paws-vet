'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  History, Search, ChevronLeft, ChevronRight, Loader2,
  MessageSquare, User, RefreshCw,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Recipient {
  first_name: string;
  last_name: string;
  phone: string | null;
}

interface SmsLog {
  id: string;
  recipient_id: string | null;
  subject: string | null;
  content: string | null;
  related_entity_type: string | null;
  delivery_status: string | null;
  is_read: boolean;
  created_at: string;
  recipient: Recipient | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  sent:      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function StatusBadge({ status }: { status: string | null }) {
  const label = status ?? 'unknown';
  const cls   = STATUS_STYLES[label] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}

function TriggerBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  const labels: Record<string, string> = {
    clinic_settings:    'Broadcast',
    vaccination_record: 'Vaccination',
    prescription:       'Prescription',
    appointment:        'Appointment',
    quarantine:         'Quarantine',
    neuter:             'Neuter/Kapon',
    noticeboard:        'Noticeboard',
  };
  return (
    <Badge variant="outline" className="text-xs capitalize">
      {labels[type] ?? type.replace(/_/g, ' ')}
    </Badge>
  );
}

const ITEMS_PER_PAGE = 20;

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SmsHistoryPage() {
  const [logs, setLogs]           = useState<SmsLog[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter]       = useState('all');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const params = new URLSearchParams({
        limit:  String(ITEMS_PER_PAGE),
        offset: String(offset),
      });
      if (statusFilter !== 'all')    params.set('status', statusFilter);
      if (debouncedSearch.trim())    params.set('search', debouncedSearch.trim());

      const res  = await fetch(`/api/veterinarian/sms?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs  ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('[SmsHistoryPage]', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <History className="h-7 w-7 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold">SMS History</h1>
            <p className="text-sm text-muted-foreground">All outbound SMS messages sent from the clinic</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search by recipient, message content…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Log</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading…' : `${total.toLocaleString()} message${total !== 1 ? 's' : ''} total`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading records…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <MessageSquare className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">No SMS records found</p>
              {(debouncedSearch || statusFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[180px]">Recipient</TableHead>
                    <TableHead className="w-[100px]">Phone</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[130px]">Trigger</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[160px]">Date &amp; Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">

                      {/* Recipient */}
                      <TableCell>
                        {log.recipient ? (
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="font-medium text-sm">
                              {log.recipient.first_name} {log.recipient.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unknown client</span>
                        )}
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.recipient?.phone ?? '—'}
                      </TableCell>

                      {/* Message */}
                      <TableCell className="max-w-[320px]">
                        <p className="text-sm line-clamp-2 text-foreground/90">
                          {log.content ?? '—'}
                        </p>
                        {log.subject && log.subject !== 'SMS Broadcast' && (
                          <p className="text-xs text-muted-foreground mt-0.5">{log.subject}</p>
                        )}
                      </TableCell>

                      {/* Trigger */}
                      <TableCell>
                        <TriggerBadge type={log.related_entity_type} />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={log.delivery_status} />
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy')}
                        <br />
                        <span className="text-[11px]">{format(new Date(log.created_at), 'h:mm a')}</span>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && total > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
