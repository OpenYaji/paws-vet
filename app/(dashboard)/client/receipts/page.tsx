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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Receipts</h1>
        <p className="text-muted-foreground">View your transaction history and download receipts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">Receipts available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Transaction</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.length > 0 
                ? format(new Date(invoices[0].issue_date), 'MMM dd')
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Most recent</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All your receipts and invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No receipts found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(invoice => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{format(new Date(invoice.issue_date), 'PPP')}</TableCell>
                      <TableCell>{invoice.line_items?.length || 0} items</TableCell>
                      <TableCell className="font-medium">₱{invoice.total_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {invoice.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowReceiptDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReceipt(invoice)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Details Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">RECEIPT</h2>
                <p className="text-muted-foreground">Invoice #: {selectedInvoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">
                  Date: {format(new Date(selectedInvoice.issue_date), 'PPP')}
                </p>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.line_items?.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Badge variant={item.item_type === 'service' ? 'default' : 'secondary'}>
                              {item.item_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₱{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ₱{item.line_total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₱{selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-red-500">-₱{selectedInvoice.discount_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>₱{selectedInvoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>₱{selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Amount Paid</span>
                  <span>₱{selectedInvoice.amount_paid.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Info */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Payment Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Method:</span>{' '}
                      {selectedInvoice.payments[0].payment_method}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Payment Date:</span>{' '}
                      {format(new Date(selectedInvoice.payments[0].payment_date), 'PPP')}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Payment #:</span>{' '}
                      {selectedInvoice.payments[0].payment_number}
                    </p>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => downloadReceipt(selectedInvoice)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
