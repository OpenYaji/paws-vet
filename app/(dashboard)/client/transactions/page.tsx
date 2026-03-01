'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Receipt, Download, Eye, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_type: 'service' | 'product';
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  notes?: string;
  line_items?: InvoiceLineItem[];
  payments?: Array<{
    payment_number: string;
    payment_date: string;
    amount_paid: number;
    payment_method: string;
  }>;
}

export default function ClientReceiptsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    loadReceipts();
  }, []);

  async function loadReceipts() {
    try {
      setIsLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get client profile
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientProfile) throw new Error('Client profile not found');

      // Get all invoices for this client
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_line_items(
            id,
            description,
            quantity,
            unit_price,
            line_total,
            item_type
          ),
          payments(
            payment_number,
            payment_date,
            amount_paid,
            payment_method
          )
        `)
        .eq('client_id', clientProfile.id)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      setInvoices(invoicesData || []);
      
      // Calculate total spent
      const total = (invoicesData || []).reduce((sum, inv) => sum + inv.total_amount, 0);
      setTotalSpent(total);
    } catch (error) {
      console.error('Error loading receipts:', error);
      alert('Failed to load receipts');
    } finally {
      setIsLoading(false);
    }
  }

  async function downloadReceipt(invoice: Invoice) {
    // Generate a simple text receipt
    const receiptText = `
RECEIPT
========================================
Invoice #: ${invoice.invoice_number}
Date: ${format(new Date(invoice.issue_date), 'PPP')}

ITEMS:
----------------------------------------
${invoice.line_items?.map(item => 
  `${item.description}\n  Qty: ${item.quantity} x ₱${item.unit_price.toFixed(2)} = ₱${item.line_total.toFixed(2)}`
).join('\n')}

----------------------------------------
Subtotal:        ₱${invoice.subtotal.toFixed(2)}
Discount:       -₱${invoice.discount_amount.toFixed(2)}
Tax:            +₱${invoice.tax_amount.toFixed(2)}
========================================
TOTAL:           ₱${invoice.total_amount.toFixed(2)}
Amount Paid:     ₱${invoice.amount_paid.toFixed(2)}
========================================

Payment Method: ${invoice.payments?.[0]?.payment_method || 'N/A'}
Payment Date: ${invoice.payments?.[0]?.payment_date ? format(new Date(invoice.payments[0].payment_date), 'PPP') : 'N/A'}

Thank you for your business!
    `;

    // Create blob and download
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${invoice.invoice_number}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading receipts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold">My Receipts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">View your transaction history and download receipts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm border-l-4 border-l-primary p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Total Spent</p>
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">₱{totalSpent.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm border-l-4 border-l-primary p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Transactions</p>
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">{invoices.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Receipts available</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm border-l-4 border-l-primary p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Last Transaction</p>
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">
            {invoices.length > 0
              ? format(new Date(invoices[0].issue_date), 'MMM dd')
              : 'N/A'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Most recent</p>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Transaction History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All your receipts and invoices</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-background sticky top-0">
                <TableHead className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Receipt #</TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Date</TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Items</TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Amount</TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-xs font-bold tracking-widest uppercase text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center">
                        <Receipt className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="font-semibold text-foreground">No receipts found</p>
                      <p className="text-xs text-muted-foreground">Your transaction receipts will appear here</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map(invoice => (
                  <TableRow key={invoice.id} className="hover:bg-accent/50 transition-colors duration-150">
                    <TableCell className="font-mono text-sm font-semibold">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(invoice.issue_date), 'PPP')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.line_items?.length || 0} items</TableCell>
                    <TableCell className="font-semibold">₱{invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${
                        invoice.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : invoice.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {invoice.payment_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowReceiptDialog(true);
                          }}
                          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150"
                          title="View receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadReceipt(invoice)}
                          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150"
                          title="Download receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Receipt Details Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-5">
              {/* Header */}
              <div className="text-center border-b border-border pb-4">
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold">RECEIPT</h2>
                <p className="text-sm text-muted-foreground">Invoice #: {selectedInvoice.invoice_number}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(selectedInvoice.issue_date), 'PPP')}
                </p>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-widest text-muted-foreground">Items</h3>
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background">
                        <TableHead className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Description</TableHead>
                        <TableHead className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Type</TableHead>
                        <TableHead className="text-right text-xs font-bold tracking-widest uppercase text-muted-foreground">Qty</TableHead>
                        <TableHead className="text-right text-xs font-bold tracking-widest uppercase text-muted-foreground">Price</TableHead>
                        <TableHead className="text-right text-xs font-bold tracking-widest uppercase text-muted-foreground">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.line_items?.map(item => (
                        <TableRow key={item.id} className="hover:bg-accent/50 transition-colors">
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${item.item_type === 'service' ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {item.item_type}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm">₱{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            ₱{item.line_total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₱{selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-₱{selectedInvoice.discount_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>₱{selectedInvoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">₱{selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600 font-medium">
                  <span>Amount Paid</span>
                  <span>₱{selectedInvoice.amount_paid.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Info */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="bg-accent/30 rounded-xl p-4 border border-border">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">Payment Information</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="font-semibold capitalize">{selectedInvoice.payments[0].payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-semibold">{format(new Date(selectedInvoice.payments[0].payment_date), 'PPP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ref #</span>
                      <span className="font-mono font-semibold">{selectedInvoice.payments[0].payment_number}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setShowReceiptDialog(false)} className="rounded-lg">
                  Close
                </Button>
                <Button size="sm" onClick={() => downloadReceipt(selectedInvoice)} className="bg-primary hover:bg-primary/90 rounded-lg active:scale-95 transition-all">
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
