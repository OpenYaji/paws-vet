'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your clinic settings and preferences</p>
      </div>

      {/* Clinic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Clinic Information</CardTitle>
          <CardDescription>Update your clinic details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Clinic Name</label>
              <Input placeholder="Enter clinic name" className="mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input placeholder="Enter phone number" className="mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input placeholder="Enter email" className="mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input placeholder="Enter address" className="mt-2" />
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" placeholder="Enter current password" className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" placeholder="Enter new password" className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <Input type="password" placeholder="Confirm new password" className="mt-2" />
          </div>
          <Button>Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
