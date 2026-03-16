"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Image as ImageIcon, Building2, Bell, Shield } from "lucide-react";
import { Asul } from "next/font/google";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ClinicProfilePage() {
  const { data: settings, isLoading } = useSWR('/api/veterinarian/admin', fetcher);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [linkData, setLinkData ] = useState(false);

  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/veterinarian/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert("Clinic profile saved!");
        mutate('/api/veterinarian/admin');
      } else {
        alert("Failed to save settings.");
      }
    } catch (error) {
      console.error(error);
      alert("Error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnnounce = async (activate: boolean) => {
    setIsAnnouncing(true);
    try {
      // Save the announcement to the clinic_settings database
      const res = await fetch('/api/veterinarian/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_text: activate ? formData.announcement_text : "",
          is_announcement_active: activate,
        }),
      });

      if (!res.ok) throw new Error("Failed to save to database");

      // If we are activating it, send the notification to clients
      if (activate) {
        const notify = await fetch('/api/veterinarian/noticeboard/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Note: make sure you use announcement_text, not announcement
          body: JSON.stringify({ message: formData.announcement_text }), 
        });

        if (!notify.ok) throw new Error("Failed to send notification");
      }

      alert(activate ? "Announcement published and clients notified!" : "Announcement removed.");
      
      // Update local state
      if (!activate) {
        setFormData((prev: any) => ({ ...prev, announcement_text: "", is_announcement_active: false }));
      } else {
        setFormData((prev: any) => ({ ...prev, is_announcement_active: true }));
      }
      mutate('/api/veterinarian/admin');
    } catch (error) {
      console.error(error);
      alert("Error updating announcement.");
    } finally {
      setIsAnnouncing(false); 
    }
  };

  const handleLinks = async () => {
    
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading clinic profile...</div>;

  return (
    <div className="space-y-6">
      {/* Header matches your existing layout */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clinic Profile</h2>
          <p className="text-sm text-muted-foreground">Manage public-facing details, announcements, and branding.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="branding"><ImageIcon className="h-4 w-4 mr-2 hidden sm:block"/> Branding</TabsTrigger>
          <TabsTrigger value="details"><Building2 className="h-4 w-4 mr-2 hidden sm:block"/> Details</TabsTrigger>
          <TabsTrigger value="notices"><Bell className="h-4 w-4 mr-2 hidden sm:block"/> Notices</TabsTrigger>
          <TabsTrigger value="policies"><Shield className="h-4 w-4 mr-2 hidden sm:block"/> Policies</TabsTrigger>
        </TabsList>

        {/* Logo and Identity */}
        <TabsContent value="branding" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Identity</CardTitle>
              <CardDescription>Update the clinic name and logo shown to clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Clinic Name</Label>
                <Input name="clinic_name" value={formData.clinic_name || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input name="logo_url" value={formData.logo_url || ''} onChange={handleChange} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Info and Social Links */}
        <TabsContent value="details" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How clients can reach the clinic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Public Email</Label>
                  <Input name="email" value={formData.email || ''} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Public Phone</Label>
                  <Input name="phone" value={formData.phone || ''} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Physical Address</Label>
                <Textarea name="address" value={formData.address || ''} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
                  <Input name="facebook_url" value={formData.facebook_url || ''} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input name="instagram_url" value={formData.instagram_url || ''} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notices and Announcements */}
        <TabsContent value="notices" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Public Announcements
                {formData.is_announcement_active && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                    Currently Active
                  </span>
                )}
              </CardTitle>
              <CardDescription>Display notices on the client portal (e.g., holidays, promos).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Announcement Text</Label>
                <Textarea 
                  name="announcement_text" 
                  value={formData.announcement_text || ''} 
                  onChange={handleChange} 
                  placeholder="e.g. We will be closed this Friday..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  disabled={isAnnouncing || !formData.is_announcement_active}
                  onClick={() => handleAnnounce(false)}
                >
                  Remove Notice
                </Button>
                <Button 
                  disabled={isAnnouncing || !formData.announcement_text}
                  onClick={() => handleAnnounce(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isAnnouncing ? "Publishing..." : "Announce"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>Update your clinic policies for booking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Terms and Conditions</Label>
                <Textarea 
                  name="terms_conditions" 
                  value={formData.terms_conditions || ''} 
                  onChange={handleChange} 
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}