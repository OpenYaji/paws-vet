'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Invoices</h1>
          <p className="text-muted-foreground">Manage clinic billing and payments</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/billing/invoice/new">New Invoice</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">Billing management coming soon. Features:</p>
          <ul className="text-sm text-muted-foreground space-y-2 mb-4">
            <li>✓ Invoice generation and management</li>
            <li>✓ Payment tracking and processing</li>
            <li>✓ Financial reporting and analytics</li>
            <li>✓ Client billing history</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
