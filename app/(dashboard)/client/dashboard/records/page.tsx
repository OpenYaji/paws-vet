'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function RecordsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Medical Records</h1>
        <p className="text-muted-foreground">Access and manage medical records</p>
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">Medical records system coming soon. Features:</p>
          <ul className="text-sm text-muted-foreground space-y-2 mb-4">
            <li>✓ Centralized medical record management</li>
            <li>✓ Treatment histories and procedures</li>
            <li>✓ Diagnostic imaging and lab results</li>
            <li>✓ Prescription tracking</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
