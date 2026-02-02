'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clients Management</h1>
        <p className="text-muted-foreground">View and manage all clinic clients</p>
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">Client management coming soon. You'll be able to:</p>
          <ul className="text-sm text-muted-foreground space-y-2 mb-4">
            <li>✓ View all registered clients</li>
            <li>✓ Manage contact information</li>
            <li>✓ Track client history and preferences</li>
            <li>✓ Send communications and reminders</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
