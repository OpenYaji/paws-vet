'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Shield, Calendar, Activity } from 'lucide-react';

export default function AdminDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdminDetails();
  }, [params.id]);

  async function loadAdminDetails() {
    try {
      const response = await fetch(`/api/user/admin/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch admin details');
      const adminData = await response.json();
      setData(adminData);
    } catch (error) {
      console.error('Error loading admin details:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return <div>Admin not found</div>;
  }

  const { user, profile, recentActivity } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-muted-foreground">Administrator Profile</p>
        </div>
        <Badge variant="destructive">
          Access Level {profile?.access_level}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Admin Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{profile?.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="font-medium">{profile?.employee_id}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Hire Date</p>
                <p className="font-medium">
                  {new Date(profile?.hire_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            {profile?.department && (
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{profile.department}</p>
              </div>
            )}
            {profile?.position && (
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="font-medium">{profile.position}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity size={20} />
              <CardTitle>Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!recentActivity || recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Badge variant="outline">{log.action_type}</Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.table_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
