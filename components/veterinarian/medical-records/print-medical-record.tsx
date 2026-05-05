'use client';

import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

interface MedicalRecord {
  id: string;
  record_number: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string | null;
  treatment_plan: string | null;
  pets: { id: string; name: string; species: string } | null;
  veterinarian: { first_name: string; last_name: string } | null;
  appointments: { appointment_number: string } | null;
}

interface Props {
  record: MedicalRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Labeled content block used in the record body
function Section({ label, content }: { label: string; content: string | null | undefined }) {
  return (
    <div>
      <div className="font-semibold mb-1 border-b border-black/20 pb-0.5">{label}</div>
      <div className="min-h-[60px] px-1 whitespace-pre-wrap">
        {content || <span className="text-gray-400 italic">Not recorded</span>}
      </div>
    </div>
  );
}

export default function PrintMedicalRecord({ record, open, onOpenChange }: Props) {
  const [vetProfile, setVetProfile] = useState<any>(null);
  const [petDetails, setPetDetails] = useState<any>(null);

  // Fetch vet license info and full pet/owner profile in parallel when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchVetProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('veterinarian_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setVetProfile(data);
    };

    const fetchPetDetails = async () => {
      if (!record.pets?.id) return;
      const { data } = await supabase
        .from('pets')
        .select('*, owners:client_profiles(*)')
        .eq('id', record.pets.id)
        .maybeSingle();
      if (data) setPetDetails(data);
    };

    Promise.all([fetchVetProfile(), fetchPetDetails()]);
  }, [open, record.pets?.id]);

  const ownerName = petDetails?.owners
    ? `${petDetails.owners.first_name} ${petDetails.owners.last_name}`
    : '—';

  // Strip leading/trailing commas and spaces from the assembled address string
  const ownerAddress = petDetails?.owners
    ? `${petDetails.owners.address || ''}, ${petDetails.owners.city || ''}, ${petDetails.owners.province || ''}`.replace(/^[,\s]+|[,\s]+$/g, '')
    : '—';

  // 1. Extract layout outside the dialog so it renders free of modal CSS constraints
  const MedicalRecordPaper = () => (
    <div className="w-full bg-white text-black p-8 border print:border-none rounded-md text-sm">

      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span>License No. <span className="underline">{vetProfile?.license_number || '—'}</span></span>
          <span className="font-bold text-base">Dr. {vetProfile?.first_name} {vetProfile?.last_name}, DVM</span>
          <span>Record No. <span className="underline font-mono">{record.record_number}</span></span>
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-wider">PAWS Veterinary Clinic</h1>
        <p className="text-xs">123 Healing Paws Ave • Quezon City, Metro Manila, 1100</p>
        <p className="text-xs">E-mail: contact@pawsclinic.com • Phone: (02) 8123-4567</p>
        <div className="border-b-2 border-black mt-3" />
        <h2 className="text-lg font-bold uppercase tracking-wide mt-3">Medical Record</h2>
      </div>

      {/* Patient & Visit Info */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 text-sm">
        <div className="flex gap-2 items-end">
          <span className="whitespace-nowrap font-semibold">Patient:</span>
          <span className="border-b border-black flex-1 px-2 pb-0.5">
            {record.pets?.name} ({record.pets?.species})
          </span>
        </div>
        <div className="flex gap-2 items-end">
          <span className="whitespace-nowrap font-semibold">Breed:</span>
          <span className="border-b border-black flex-1 px-2 pb-0.5">{petDetails?.breed || '—'}</span>
        </div>
        <div className="flex gap-2 items-end">
          <span className="whitespace-nowrap font-semibold">Owner:</span>
          <span className="border-b border-black flex-1 px-2 pb-0.5">{ownerName}</span>
        </div>
        <div className="flex gap-2 items-end">
          <span className="whitespace-nowrap font-semibold">Visit Date:</span>
          <span className="border-b border-black flex-1 px-2 pb-0.5">
            {record.visit_date ? format(new Date(record.visit_date), 'MMMM dd, yyyy') : '—'}
          </span>
        </div>
        <div className="col-span-2 flex gap-2 items-end">
          <span className="whitespace-nowrap font-semibold">Address:</span>
          <span className="border-b border-black flex-1 px-2 pb-0.5">{ownerAddress}</span>
        </div>
      </div>

      {/* Clinical Content */}
      <div className="space-y-5 text-sm relative">
        {/* Subtle watermark behind the clinical content */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none text-[16rem] font-serif leading-none select-none">
          V
        </div>
        <Section label="Chief Complaint" content={record.chief_complaint} />
        <Section label="Diagnosis" content={record.diagnosis} />
        <Section label="Treatment Plan" content={record.treatment_plan} />
      </div>

      {/* Signature Footer */}
      <div className="mt-12 flex justify-between items-end text-sm">
        <div className="text-xs text-gray-500">
          {record.appointments?.appointment_number && (
            <span>Appt. #{record.appointments.appointment_number}</span>
          )}
        </div>
        <div className="w-64 text-center">
          <div className="border-b border-black mb-1 h-8" />
          <div>Dr. {vetProfile?.first_name} {vetProfile?.last_name}, DVM</div>
          <div className="text-xs text-gray-500">Attending Veterinarian</div>
        </div>
      </div>

      <div className="border-t-2 border-black pt-1 text-center font-bold italic text-xs mt-6">
        CONFIDENTIAL MEDICAL DOCUMENT • FOR VETERINARY USE ONLY
      </div>
    </div>
  );

  return (
    <>
      {/* 2. Screen preview — completely hidden from the printer */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden print:hidden">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle>Medical Record Preview</DialogTitle>
            <DialogDescription>Review the document layout before printing.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 bg-blue-50/30">
            <MedicalRecordPaper />
          </div>

          <DialogFooter className="shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => window.print()} className="gap-2 bg-green-600 hover:bg-green-700">
              <Printer size={16} /> Print Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Print-only layer — outside dialog limits, only visible to the printer */}
      {open && (
        <div className="hidden print:block print:fixed print:inset-0 print:w-full print:h-full print:bg-white print:z-[999999]">
          <MedicalRecordPaper />
        </div>
      )}
    </>
  );
}
