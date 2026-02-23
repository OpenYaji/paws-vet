'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Eye,
  ScrollText,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  User,
  Calendar,
  CreditCard,
  PawPrint,
  Package,
  Monitor,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// --- Types ---

type LogSeverity = 'info' | 'warning' | 'error' | 'success';
type LogCategory = 'user' | 'appointment' | 'billing' | 'pet' | 'inventory' | 'system';

interface LogEntry {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  category: LogCategory;
  action: string;
  description: string;
  user: string;
  ip_address: string;
  details?: string;
}

// --- Constants ---

const severityConfig: Record<LogSeverity, { color: string; icon: typeof Info }> = {
  info: { color: 'bg-blue-100 text-blue-800', icon: Info },
  warning: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  error: { color: 'bg-red-100 text-red-800', icon: XCircle },
  success: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
};

const categoryConfig: Record<LogCategory, { label: string; icon: typeof User }> = {
  user: { label: 'User', icon: User },
  appointment: { label: 'Appointment', icon: Calendar },
  billing: { label: 'Billing', icon: CreditCard },
  pet: { label: 'Pet Records', icon: PawPrint },
  inventory: { label: 'Inventory', icon: Package },
  system: { label: 'System', icon: Monitor },
};

const ROWS_PER_PAGE = 10;

// --- Mock Data ---

const mockLogs: LogEntry[] = [
  {
    id: 'LOG-001',
    timestamp: '2026-02-18T14:32:00Z',
    severity: 'info',
    category: 'user',
    action: 'User Login',
    description: 'Admin user logged in successfully',
    user: 'Dr. Maria Santos',
    ip_address: '192.168.1.45',
    details: 'Browser: Chrome 120.0 | OS: Windows 11 | Session started at 14:32 UTC. Two-factor authentication verified.',
  },
  {
    id: 'LOG-002',
    timestamp: '2026-02-18T14:15:00Z',
    severity: 'success',
    category: 'appointment',
    action: 'Appointment Created',
    description: 'New appointment #APT-2026-0452 scheduled for Feb 20',
    user: 'Receptionist Ana Cruz',
    ip_address: '192.168.1.32',
    details: 'Pet: Buddy (Golden Retriever) | Owner: Juan Dela Cruz | Type: Vaccination | Vet: Dr. Maria Santos | Time: 10:00 AM - 10:30 AM',
  },
  {
    id: 'LOG-003',
    timestamp: '2026-02-18T13:50:00Z',
    severity: 'warning',
    category: 'inventory',
    action: 'Low Stock Alert',
    description: 'Rabies Vaccine stock below minimum threshold (3 remaining)',
    user: 'System',
    ip_address: '—',
    details: 'Item: Rabies Vaccine (5ml) | Current Stock: 3 | Minimum Threshold: 10 | Supplier: VetMed Supplies Inc. | Last restocked: 2026-02-01',
  },
  {
    id: 'LOG-004',
    timestamp: '2026-02-18T13:22:00Z',
    severity: 'error',
    category: 'system',
    action: 'Payment Gateway Timeout',
    description: 'GCash payment gateway connection timed out after 30s',
    user: 'System',
    ip_address: '—',
    details: 'Error Code: GATEWAY_TIMEOUT | Endpoint: /api/payments/gcash | Response Time: 30,000ms | Transaction ID: TXN-9283 | Retry count: 3/3. Fallback to manual payment recording suggested.',
  },
  {
    id: 'LOG-005',
    timestamp: '2026-02-18T12:45:00Z',
    severity: 'success',
    category: 'billing',
    action: 'Payment Received',
    description: 'Invoice #INV-2026-0321 paid via cash — PHP 1,500.00',
    user: 'Cashier Lina Reyes',
    ip_address: '192.168.1.28',
    details: 'Invoice: INV-2026-0321 | Amount: PHP 1,500.00 | Method: Cash | Client: Pedro Garcia | Services: Dental Cleaning, Nail Trim | Change given: PHP 500.00',
  },
  {
    id: 'LOG-006',
    timestamp: '2026-02-18T11:30:00Z',
    severity: 'info',
    category: 'pet',
    action: 'Medical Record Updated',
    description: 'Vaccination record added for pet "Mochi" (Shih Tzu)',
    user: 'Dr. Carlos Reyes',
    ip_address: '192.168.1.50',
    details: 'Pet: Mochi | Species: Dog | Breed: Shih Tzu | Vaccine: Anti-rabies | Batch: RAB-2026-445 | Next due: 2027-02-18 | Weight at visit: 5.2kg',
  },
  {
    id: 'LOG-007',
    timestamp: '2026-02-18T10:55:00Z',
    severity: 'warning',
    category: 'appointment',
    action: 'No-Show Recorded',
    description: 'Client did not show up for appointment #APT-2026-0448',
    user: 'Receptionist Ana Cruz',
    ip_address: '192.168.1.32',
    details: 'Pet: Luna (Persian Cat) | Owner: Maria Lopez | Scheduled: 10:00 AM | Type: Checkup | Vet: Dr. Carlos Reyes | This is the 2nd no-show for this client.',
  },
  {
    id: 'LOG-008',
    timestamp: '2026-02-18T10:10:00Z',
    severity: 'info',
    category: 'user',
    action: 'Password Changed',
    description: 'User updated their password',
    user: 'Dr. Carlos Reyes',
    ip_address: '192.168.1.50',
    details: 'Password changed via settings page. Previous password last set: 2025-12-10. Complies with password policy (min 12 chars, special chars).',
  },
  {
    id: 'LOG-009',
    timestamp: '2026-02-18T09:40:00Z',
    severity: 'success',
    category: 'pet',
    action: 'New Pet Registered',
    description: 'New pet "Brownie" registered under client Roberto Tan',
    user: 'Receptionist Ana Cruz',
    ip_address: '192.168.1.32',
    details: 'Pet: Brownie | Species: Dog | Breed: Aspin | Age: 2 years | Weight: 12kg | Color: Brown | Microchip: N/A | Owner: Roberto Tan (CLI-0087)',
  },
  {
    id: 'LOG-010',
    timestamp: '2026-02-18T09:15:00Z',
    severity: 'error',
    category: 'system',
    action: 'Backup Failed',
    description: 'Scheduled daily database backup failed — disk space insufficient',
    user: 'System',
    ip_address: '—',
    details: 'Backup target: /backups/daily/2026-02-18.sql | Required: 2.3GB | Available: 1.1GB | Backup type: Full | Last successful backup: 2026-02-17 03:00 UTC. Action required: clear old backups or expand storage.',
  },
  {
    id: 'LOG-011',
    timestamp: '2026-02-18T08:30:00Z',
    severity: 'info',
    category: 'appointment',
    action: 'Appointment Rescheduled',
    description: 'Appointment #APT-2026-0445 moved from Feb 18 to Feb 22',
    user: 'Receptionist Ana Cruz',
    ip_address: '192.168.1.32',
    details: 'Original: Feb 18, 2:00 PM | New: Feb 22, 11:00 AM | Pet: Coco (Pomeranian) | Reason: Client requested reschedule due to schedule conflict.',
  },
  {
    id: 'LOG-012',
    timestamp: '2026-02-17T17:00:00Z',
    severity: 'info',
    category: 'user',
    action: 'User Logout',
    description: 'Admin user session ended',
    user: 'Dr. Maria Santos',
    ip_address: '192.168.1.45',
    details: 'Session duration: 8h 15m | Pages visited: 47 | Actions performed: 23',
  },
  {
    id: 'LOG-013',
    timestamp: '2026-02-17T16:30:00Z',
    severity: 'success',
    category: 'billing',
    action: 'Invoice Generated',
    description: 'Invoice #INV-2026-0320 created for PHP 3,200.00',
    user: 'Cashier Lina Reyes',
    ip_address: '192.168.1.28',
    details: 'Client: Anna Lim | Services: Surgery (Spay) - PHP 2,500, Medication - PHP 700 | Pet: Kitkat (Domestic Shorthair) | Due: Feb 24, 2026',
  },
  {
    id: 'LOG-014',
    timestamp: '2026-02-17T15:45:00Z',
    severity: 'warning',
    category: 'system',
    action: 'High CPU Usage',
    description: 'Server CPU usage exceeded 90% for 5 minutes',
    user: 'System',
    ip_address: '—',
    details: 'Peak CPU: 94% | Duration: 5m 12s | Top process: report-generator (PID 4521) | Memory usage: 78% | Resolved: auto-scaled after threshold.',
  },
  {
    id: 'LOG-015',
    timestamp: '2026-02-17T14:20:00Z',
    severity: 'success',
    category: 'appointment',
    action: 'Appointment Completed',
    description: 'Appointment #APT-2026-0440 marked as completed',
    user: 'Dr. Maria Santos',
    ip_address: '192.168.1.45',
    details: 'Pet: Max (Labrador) | Type: Surgery (Neutering) | Duration: 1h 30m | Notes: Procedure went smoothly, recovery expected in 7-10 days. Follow-up scheduled for Feb 27.',
  },
  {
    id: 'LOG-016',
    timestamp: '2026-02-17T13:00:00Z',
    severity: 'info',
    category: 'inventory',
    action: 'Stock Restocked',
    description: 'Added 50 units of Deworming Tablets to inventory',
    user: 'Inventory Mgr. Jess Villanueva',
    ip_address: '192.168.1.33',
    details: 'Item: Deworming Tablets (Praziquantel 50mg) | Added: 50 units | New total: 62 units | Supplier: PetPharma Corp | Batch: DW-2026-112 | Expiry: 2027-06-30',
  },
  {
    id: 'LOG-017',
    timestamp: '2026-02-17T11:10:00Z',
    severity: 'error',
    category: 'billing',
    action: 'Duplicate Invoice Prevented',
    description: 'Attempted duplicate invoice creation blocked for appointment #APT-2026-0438',
    user: 'Cashier Lina Reyes',
    ip_address: '192.168.1.28',
    details: 'Existing invoice: INV-2026-0318 | Status: Paid | Amount: PHP 800.00 | System prevented duplicate billing for the same appointment.',
  },
  {
    id: 'LOG-018',
    timestamp: '2026-02-17T10:00:00Z',
    severity: 'info',
    category: 'user',
    action: 'Role Updated',
    description: 'User role changed from Receptionist to Senior Receptionist',
    user: 'Admin: Dr. Maria Santos',
    ip_address: '192.168.1.45',
    details: 'Affected user: Ana Cruz | Previous role: Receptionist | New role: Senior Receptionist | Permissions added: appointment-cancel, report-view',
  },
  {
    id: 'LOG-019',
    timestamp: '2026-02-17T09:30:00Z',
    severity: 'warning',
    category: 'pet',
    action: 'Vaccination Overdue',
    description: 'Pet "Shadow" has overdue vaccination — Anti-rabies (due Jan 15)',
    user: 'System',
    ip_address: '—',
    details: 'Pet: Shadow (German Shepherd) | Owner: Mark Tan | Vaccine: Anti-rabies | Due: 2026-01-15 | Days overdue: 34 | Last notification sent: 2026-02-10',
  },
  {
    id: 'LOG-020',
    timestamp: '2026-02-17T08:45:00Z',
    severity: 'success',
    category: 'system',
    action: 'Daily Backup Completed',
    description: 'Scheduled database backup completed successfully',
    user: 'System',
    ip_address: '—',
    details: 'Backup file: /backups/daily/2026-02-17.sql | Size: 2.1GB | Duration: 4m 32s | Tables: 24 | Records: 145,892 | Next backup: 2026-02-18 03:00 UTC',
  },
];

// --- Component ---

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // --- Filtered & sorted data ---

  const filteredLogs = useMemo(() => {
    let logs = [...mockLogs];

    if (severityFilter !== 'all') {
      logs = logs.filter((log) => log.severity === severityFilter);
    }
    if (categoryFilter !== 'all') {
      logs = logs.filter((log) => log.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      logs = logs.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          log.user.toLowerCase().includes(q) ||
          log.id.toLowerCase().includes(q)
      );
    }

    logs.sort((a, b) => {
      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return sortOrder === 'newest' ? diff : -diff;
    });

    return logs;
  }, [severityFilter, categoryFilter, searchQuery, sortOrder]);

  // --- Stats ---

  const stats = useMemo(() => {
    return {
      total: mockLogs.length,
      info: mockLogs.filter((l) => l.severity === 'info').length,
      warning: mockLogs.filter((l) => l.severity === 'warning').length,
      error: mockLogs.filter((l) => l.severity === 'error').length,
      success: mockLogs.filter((l) => l.severity === 'success').length,
    };
  }, []);

  // --- Pagination ---

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ROWS_PER_PAGE));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredLogs.slice(start, start + ROWS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [severityFilter, categoryFilter, searchQuery]);

  // --- Helpers ---

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleViewDetails = (log: LogEntry) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Timestamp', 'Severity', 'Category', 'Action', 'Description', 'User', 'IP Address'].join(','),
      ...filteredLogs.map((log) =>
        [
          log.id,
          log.timestamp,
          log.severity,
          log.category,
          `"${log.action}"`,
          `"${log.description}"`,
          `"${log.user}"`,
          log.ip_address,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
            <p className="text-sm text-muted-foreground">
              Track all system activity, user actions, and events
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => { setSeverityFilter('all'); }}
          className={`bg-card border border-border rounded-xl p-4 text-left transition-all hover:shadow-md ${severityFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
        >
          <p className="text-sm text-muted-foreground">Total Logs</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </button>
        <button
          onClick={() => { setSeverityFilter(severityFilter === 'info' ? 'all' : 'info'); }}
          className={`bg-card border border-border rounded-xl p-4 text-left transition-all hover:shadow-md ${severityFilter === 'info' ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-muted-foreground">Info</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
        </button>
        <button
          onClick={() => { setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning'); }}
          className={`bg-card border border-border rounded-xl p-4 text-left transition-all hover:shadow-md ${severityFilter === 'warning' ? 'ring-2 ring-yellow-500' : ''}`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <p className="text-sm text-muted-foreground">Warnings</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
        </button>
        <button
          onClick={() => { setSeverityFilter(severityFilter === 'error' ? 'all' : 'error'); }}
          className={`bg-card border border-border rounded-xl p-4 text-left transition-all hover:shadow-md ${severityFilter === 'error' ? 'ring-2 ring-red-500' : ''}`}
        >
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-muted-foreground">Errors</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.error}</p>
        </button>
        <button
          onClick={() => { setSeverityFilter(severityFilter === 'success' ? 'all' : 'success'); }}
          className={`bg-card border border-border rounded-xl p-4 text-left transition-all hover:shadow-md ${severityFilter === 'success' ? 'ring-2 ring-green-500' : ''}`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <p className="text-sm text-muted-foreground">Success</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.success}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Log ID, action, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="all">All Categories</option>
              <option value="user">User</option>
              <option value="appointment">Appointment</option>
              <option value="billing">Billing</option>
              <option value="pet">Pet Records</option>
              <option value="inventory">Inventory</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSeverityFilter('all');
              setCategoryFilter('all');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          >
            {sortOrder === 'newest' ? (
              <ChevronDown className="w-4 h-4 mr-1" />
            ) : (
              <ChevronUp className="w-4 h-4 mr-1" />
            )}
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-25">Log ID</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-15">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No logs match your filters</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => {
                const SeverityIcon = severityConfig[log.severity].icon;
                const CategoryIcon = categoryConfig[log.category].icon;
                return (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{formatTimestamp(log.timestamp)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(log.timestamp)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={severityConfig[log.severity].color}>
                        <SeverityIcon className="w-3 h-3 mr-1" />
                        {log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{categoryConfig[log.category].label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {log.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.user}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredLogs.length > ROWS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
              {Math.min(currentPage * ROWS_PER_PAGE, filteredLogs.length)} of{' '}
              {filteredLogs.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>{selectedLog?.id}</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-5">
              {/* Severity & Category badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge className={severityConfig[selectedLog.severity].color}>
                  {selectedLog.severity}
                </Badge>
                <Badge variant="outline">
                  {categoryConfig[selectedLog.category].label}
                </Badge>
              </div>

              {/* Action */}
              <div>
                <h4 className="font-semibold mb-1">Action</h4>
                <p className="text-foreground">{selectedLog.action}</p>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-1">Description</h4>
                <p className="text-muted-foreground">{selectedLog.description}</p>
              </div>

              {/* Metadata */}
              <div>
                <h4 className="font-semibold mb-2">Metadata</h4>
                <div className="bg-secondary/20 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Timestamp</span>
                    <span className="text-sm font-medium">
                      {formatTimestamp(selectedLog.timestamp)} at {formatTime(selectedLog.timestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">User</span>
                    <span className="text-sm font-medium">{selectedLog.user}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">IP Address</span>
                    <span className="text-sm font-mono">{selectedLog.ip_address}</span>
                  </div>
                </div>
              </div>

              {/* Extended Details */}
              {selectedLog.details && (
                <div>
                  <h4 className="font-semibold mb-2">Details</h4>
                  <div className="bg-secondary/20 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedLog.details}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
