'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Track medications and supplies</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/inventory/new">Add Item</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">Inventory management coming soon. Manage:</p>
          <ul className="text-sm text-muted-foreground space-y-2 mb-4">
            <li>✓ Medications and pharmaceutical supplies</li>
            <li>✓ Medical equipment and instruments</li>
            <li>✓ Stock levels and reordering</li>
            <li>✓ Inventory alerts and expiration tracking</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
