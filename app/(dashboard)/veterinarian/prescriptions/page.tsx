'use client';

import { useState } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR, { mutate } from 'swr';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Pill, FileText } from 'lucide-react';
import IssuePrescription from '@/components/veterinarian/prescriptions/issue-prescriptions';
import Link from 'next/link';

// Fetcher for SWR
// Fetching Prescriptions
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function PrescriptionsPage() {
  const { data: prescriptions = [], isLoading } = useSWR('prescriptions-list', fetcher);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter Logic
  const filteredList = prescriptions.filter((rx: any) => 
    rx.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rx.pets?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rx.pets?.owners?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prescriptions</h1>
          <p className="text-muted-foreground">Manage and issue medical prescriptions</p>
        </div>
        <IssuePrescription onPrescriptionIssued={() => mutate('prescriptions-list')} />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by medication, pet name, or owner..."
          className="pl-10 bg-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading prescriptions...</div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg border border-dashed">
          <Pill className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
          <h3 className="text-lg font-medium text-foreground">No prescriptions found</h3>
          <p className="text-muted-foreground">Issue a new prescription to see it here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredList.map((rx: any) => (
            <Card key={rx.id} className="hover:border-primary/50 transition-all">
              <CardContent className="p-5 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                
                {/* Left: Info */}
                <div className="flex gap-4 items-start">
                  <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{rx.medication_name} <span className="text-sm font-normal text-muted-foreground">({rx.dosage})</span></h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">Patient: {rx.pets?.name}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{rx.pets?.species}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>Owner: {rx.pets?.owners?.full_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Sig:</span> {rx.frequency} for {rx.duration}
                    </p>
                  </div>
                </div>

                {/* Right: Status & Date */}
                <div className="text-right flex flex-col items-end gap-2">
                   <Badge variant={rx.status === 'Active' ? 'default' : 'secondary'} className={rx.status === 'Active' ? 'bg-primary' : ''}>
                     {rx.status}
                   </Badge>
                   <span className="text-xs text-muted-foreground">
                     Issued: {new Date(rx.created_at).toLocaleDateString()}
                   </span>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}