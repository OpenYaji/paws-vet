'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Filter, Printer, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  transaction_reference: string;
  notes?: string;
  invoice?: {
    invoice_number: string;
    client?: { first_name: string; last_name: string };
    walk_in_customer_name?: string;
  };
}

export default function PaymentsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices(
            invoice_number,
            walk_in_customer_name,
            client:client_profiles(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    // Search filter (payment number, invoice number, customer name)
    const searchMatch = searchQuery === '' || 
      payment.payment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.invoice?.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.invoice?.walk_in_customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.invoice?.client && 
        `${payment.invoice.client.first_name} ${payment.invoice.client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Payment method filter
    const methodMatch = paymentMethodFilter === 'all' || 
      payment.payment_method.toLowerCase() === paymentMethodFilter.toLowerCase();
    
    // Date range filter
    const paymentDate = new Date(payment.payment_date);
    const dateFromMatch = dateFromFilter === '' || paymentDate >= new Date(dateFromFilter);
    const dateToMatch = dateToFilter === '' || paymentDate <= new Date(dateToFilter);
    
    return searchMatch && methodMatch && dateFromMatch && dateToMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Print function
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment History - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { margin-bottom: 20px; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment History Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Records: ${filteredPayments.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments.map(payment => `
                <tr>
                  <td>${payment.payment_number}</td>
                  <td>${payment.invoice?.invoice_number || '-'}</td>
                  <td>${payment.invoice?.walk_in_customer_name || 
                    (payment.invoice?.client 
                      ? `${payment.invoice.client.first_name} ${payment.invoice.client.last_name}`
                      : '-')}</td>
                  <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                  <td>₱${payment.amount_paid.toFixed(2)}</td>
                  <td>${payment.payment_method.toUpperCase()}</td>
                  <td>${payment.transaction_reference}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>PAWS Veterinary Clinic - Payment History Report</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setPaymentMethodFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/admin/billing')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={filteredPayments.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filter Payments</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <Label className="text-xs">Search</Label>
                <Input
                  placeholder="Payment #, Invoice #, Customer..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9"
                />
              </div>

              {/* Payment Method Filter */}
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select 
                  value={paymentMethodFilter} 
                  onValueChange={(value) => {
                    setPaymentMethodFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div>
                <Label className="text-xs">Date From</Label>
                <Input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => {
                    setDateFromFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9"
                />
              </div>

              {/* Date To */}
              <div>
                <Label className="text-xs">Date To</Label>
                <Input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => {
                    setDateToFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {payments.length === 0 ? 'No payment records found' : 'No payments match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_number}</TableCell>
                      <TableCell>{payment.invoice?.invoice_number || '-'}</TableCell>
                      <TableCell>
                        {payment.invoice?.walk_in_customer_name || 
                         (payment.invoice?.client 
                           ? `${payment.invoice.client.first_name} ${payment.invoice.client.last_name}`
                           : '-')}
                      </TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>₱{payment.amount_paid.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.payment_method.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {payment.transaction_reference}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}