'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pets Management</h1>
          <p className="text-muted-foreground">Manage all pets in the clinic</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/pets/new">Add Pet</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">Pet management coming soon. You'll be able to:</p>
          <ul className="text-sm text-muted-foreground space-y-2 mb-4">
            <li>✓ Register and manage pet profiles</li>
            <li>✓ Track medical history and vaccinations</li>
            <li>✓ Upload pet photos and documents</li>
            <li>✓ Monitor health alerts and reminders</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
