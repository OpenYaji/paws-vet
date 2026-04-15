"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Send, CheckCircle2, AlertCircle, Search,
  ChevronLeft, ChevronRight, Loader2, RefreshCw, User, History,
} from "lucide-react";
import { format } from "date-fns";
import { Fetcher } from "@/lib/fetcher";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SmsLog {
  id: string;
  recipient_id: string | null;
  subject: string | null;
  content: string | null;
  related_entity_type: string | null;
  delivery_status: string | null;
  created_at: string;
  recipient: { first_name: string; last_name: string; phone: string | null } | null;
}

interface SmsHistoryResponse {
  logs: SmsLog[];
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  sent:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function StatusBadge({ status }: { status: string | null }) {
  const label = status ?? "unknown";
  const cls   = STATUS_STYLES[label] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}

const TRIGGER_LABELS: Record<string, string> = {
  clinic_settings:    "Broadcast",
  vaccination_record: "Vaccination",
  prescription:       "Prescription",
  appointment:        "Appointment",
  quarantine:         "Quarantine",
  neuter:             "Neuter/Kapon",
  noticeboard:        "Noticeboard",
};

function TriggerBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <Badge variant="outline" className="text-xs capitalize">
      {TRIGGER_LABELS[type] ?? type.replace(/_/g, " ")}
    </Badge>
  );
}

const ITEMS_PER_PAGE = 20;

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SmsClientPage() {

  // ── Send SMS state ──────────────────────────────────────────────────────────
  const [targetType, setTargetType]   = useState<"all" | "specific">("all");
  const [targetClientId, setTargetClientId] = useState("");
  const [message, setMessage]         = useState("");
  const [isSending, setIsSending]     = useState(false);
  const [statusMsg, setStatusMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [clientSearchTerm, setClientSearchTerm]   = useState("");
  const [clientResults, setClientResults]         = useState<any[]>([]);
  const [isSearching, setIsSearching]             = useState(false);
  const [selectedClient, setSelectedClient]       = useState<any | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  useEffect(() => {
    if (!clientSearchTerm.trim()) { setClientResults([]); setIsSearchDropdownOpen(false); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res  = await fetch(`/api/veterinarian/clients?q=${encodeURIComponent(clientSearchTerm)}`);
        const data = await res.json();
        setClientResults(Array.isArray(data) ? data : []);
        setIsSearchDropdownOpen(true);
      } catch { setClientResults([]); }
      finally  { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearchTerm]);

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setClientSearchTerm(`${client.first_name} ${client.last_name} (${client.phone || "No phone"})`);
    setTargetClientId(client.id);
    setIsSearchDropdownOpen(false);
  };

  const clearSelection = () => { setSelectedClient(null); setTargetClientId(""); setClientSearchTerm(""); };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetType === "specific" && !targetClientId) {
      setStatusMsg({ type: "error", text: "Please select a specific client." }); return;
    }
    if (!message.trim()) {
      setStatusMsg({ type: "error", text: "Message cannot be empty." }); return;
    }
    setIsSending(true); setStatusMsg(null);
    try {
      const res  = await fetch("/api/veterinarian/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: targetType === "all" ? "all" : targetClientId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Server error: ${res.status}`);
      setStatusMsg({ type: "success", text: data.message || "SMS sent successfully!" });
      setMessage("");
    } catch (error: any) {
      setStatusMsg({ type: "error", text: error.message || "Network error occurred." });
    } finally { setIsSending(false); }
  };

  // ── SMS History state ───────────────────────────────────────────────────────
  const [page, setPage]               = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(historySearch), 350);
    return () => clearTimeout(t);
  }, [historySearch]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  // Build dynamic SWR key from current filters + pagination
  const swrKey = useMemo(() => {
    const params = new URLSearchParams({
      limit:  String(ITEMS_PER_PAGE),
      offset: String((page - 1) * ITEMS_PER_PAGE),
    });
    if (statusFilter !== "all")      params.set("status", statusFilter);
    if (debouncedSearch.trim())      params.set("search", debouncedSearch.trim());
    return `/api/veterinarian/sms?${params.toString()}`;
  }, [page, debouncedSearch, statusFilter]);

  const { data, isLoading: isLoadingLogs, error: logsError, mutate } = useSWR<SmsHistoryResponse>(
    swrKey,
    Fetcher,
    {
      revalidateOnFocus: false,  // don't refetch when window regains focus
      dedupingInterval:  30_000, // cache responses for 30 s
      keepPreviousData:  true,   // keep old rows visible while next page loads
    },
  );

  const logs  = data?.logs  ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-green-600" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList>
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-1.5" /> Send SMS
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1.5" /> SMS History
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: SEND SMS ───────────────────────────────────────────────── */}
        <TabsContent value="send" className="mt-4">
          <Card className="bg-muted/40 border-dashed border-2 border-border">
            <CardHeader>
              <CardTitle>Send Notification</CardTitle>
              <CardDescription>
                Broadcast an SMS message to all clients or send it to a specific client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendSms} className="space-y-6">

                {/* Target */}
                <div className="space-y-3">
                  <Label>Target Recipient</Label>
                  <Select
                    value={targetType}
                    onValueChange={(val) => {
                      setTargetType(val as "all" | "specific");
                      setStatusMsg(null);
                      if (val === "all") clearSelection();
                    }}
                  >
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Broadcast to All Clients</SelectItem>
                      <SelectItem value="specific">Send to Specific Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Specific client search */}
                {targetType === "specific" && (
                  <div className="space-y-3">
                    <Label>Select Client</Label>
                    <div className="relative w-full md:w-1/2">
                      <Input
                        type="text"
                        placeholder="Search client by name or phone..."
                        value={clientSearchTerm}
                        onChange={(e) => {
                          setClientSearchTerm(e.target.value);
                          if (selectedClient) { setSelectedClient(null); setTargetClientId(""); }
                        }}
                        onFocus={() => { if (clientResults.length > 0) setIsSearchDropdownOpen(true); }}
                      />
                      {isSearchDropdownOpen && (
                        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                          {isSearching ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
                          ) : clientResults.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">No clients found.</div>
                          ) : (
                            clientResults.map((client) => (
                              <div
                                key={client.id}
                                onClick={() => handleSelectClient(client)}
                                className="p-3 text-sm cursor-pointer hover:bg-muted border-b last:border-0"
                              >
                                <div className="font-medium text-foreground">{client.first_name} {client.last_name}</div>
                                <div className="text-xs text-muted-foreground">{client.phone || "No phone"}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="space-y-3">
                  <Label>SMS Message</Label>
                  <Textarea
                    placeholder="Write your SMS message here..."
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full min-h-[120px] resize-y"
                  />
                  <div className="text-right text-xs text-muted-foreground">{message.length} characters</div>
                </div>

                {/* Status feedback */}
                {statusMsg && (
                  <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                    statusMsg.type === "success"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }`}>
                    {statusMsg.type === "success"
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <AlertCircle className="h-4 w-4" />}
                    {statusMsg.text}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSending || (targetType === "specific" && !targetClientId) || !message.trim()}
                  className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                >
                  {isSending ? "Sending..." : <><Send className="mr-2 h-4 w-4" />Send SMS</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: SMS HISTORY ────────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4 space-y-4">

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search recipient or message…"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isLoadingLogs}
              className="shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingLogs ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Log</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {isLoadingLogs ? "Loading…" : `${total.toLocaleString()} message${total !== 1 ? "s" : ""}`}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingLogs ? (
                <div className="flex justify-center items-center py-16 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading records…</span>
                </div>
              ) : logsError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-destructive">
                  <AlertCircle className="h-8 w-8 opacity-60" />
                  <p className="text-sm font-medium">Failed to load SMS history</p>
                  <p className="text-xs text-muted-foreground">{logsError.message}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => mutate()}>Try again</Button>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <MessageSquare className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium">No SMS records found</p>
                  {(debouncedSearch || statusFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => { setHistorySearch(""); setStatusFilter("all"); }}>
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
                        <TableHead className="w-[110px]">Phone</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead className="w-[120px]">Trigger</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[150px]">Date &amp; Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">

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

                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {log.recipient?.phone ?? "—"}
                          </TableCell>

                          <TableCell className="max-w-[280px]">
                            <p className="text-sm line-clamp-2 text-foreground/90">{log.content ?? "—"}</p>
                            {log.subject && log.subject !== "SMS Broadcast" && (
                              <p className="text-xs text-muted-foreground mt-0.5">{log.subject}</p>
                            )}
                          </TableCell>

                          <TableCell><TriggerBadge type={log.related_entity_type} /></TableCell>

                          <TableCell><StatusBadge status={log.delivery_status} /></TableCell>

                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "MMM d, yyyy")}
                            <br />
                            <span className="text-[11px]">{format(new Date(log.created_at), "h:mm a")}</span>
                          </TableCell>

                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {!isLoadingLogs && total > ITEMS_PER_PAGE && (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
