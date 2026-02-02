'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MedicalRecord {
  id: string;
  pet_id: string;
  pet?: any;
  record_date: string;
  record_type: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  created_at: string;
}

export default function MedicalRecordsListPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');

  useEffect(() => {
    async function loadRecords() {
      try {
        const { data } = await supabase
          .from('medical_records')
          .select('*')
          .order('record_date', { ascending: false });

        setRecords(data || []);
        setFilteredRecords(data || []);
      } catch (error) {
        console.error('Error loading records:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadRecords();
  }, []);

  useEffect(() => {
    let filtered = records;

    if (recordTypeFilter !== 'all') {
      filtered = filtered.filter((record) => record.record_type === recordTypeFilter);
    }

    setFilteredRecords(filtered);
  }, [recordTypeFilter, records]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Medical Records</h1>
          <p className="text-muted-foreground">View all pet medical records</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/records/new">New Record</Link>
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Record Type</label>
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="checkup">Checkup</SelectItem>
                  <SelectItem value="vaccination">Vaccination</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              {recordTypeFilter !== 'all'
                ? 'No records found for this type.'
                : 'No medical records yet. Create your first record.'}
            </p>
            <Button asChild>
              <Link href="/dashboard/records/new">Create Record</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{record.diagnosis}</h3>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
                        {record.record_type.charAt(0).toUpperCase() + record.record_type.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      📅 {new Date(record.record_date).toLocaleDateString()}
                    </p>
                    {record.treatment && (
                      <p className="text-sm text-muted-foreground">💊 Treatment: {record.treatment.substring(0, 80)}</p>
                    )}
                    {record.notes && (
                      <p className="text-sm text-muted-foreground">📝 {record.notes.substring(0, 100)}</p>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/records/${record.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
