'use client';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PrintPrescriptionDialogProps {
  rx: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PrintPrescriptionDialog({ rx, open, onOpenChange }: PrintPrescriptionDialogProps) {
  const [vetProfile, setVetProfile] = useState<any>(null);
  const [extendedRx, setExtendedRx] = useState<any>(null);
  
  useEffect(() => {
    if (rx) setExtendedRx(rx);
  }, [rx]);

  const ownerAddress = extendedRx?.pets?.owners 
    ? `${extendedRx.pets.owners.address || ''}, ${extendedRx.pets.owners.city || ''}, ${extendedRx.pets.owners.province || ''}`.replace(/^[,\s]+|[,\s]+$/g, '') 
    : '';

  useEffect(() => {
    const fetchVetInfo = async () => {
      if (!open) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('veterinarian_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setVetProfile(data);
      }
    };
    fetchVetInfo();
  }, [open]);

  useEffect(() => {
    const fetchPetAndOwnerInfo = async () => {
        if (!open || !rx?.pet_id) return;
        
        const { data: petData, error } = await supabase
          .from('pets')
          .select('*, owners:client_profiles(*)') 
          .eq('id', rx.pet_id)
          .maybeSingle();

        if (petData && !error) {
            setExtendedRx((prev: any) => ({ ...prev, pets: petData }));
        }
    };
    fetchPetAndOwnerInfo();
  }, [open, rx]);

  if (!extendedRx) return null;

  const handlePrint = () => {
    window.print();
  };

  const ownerName = extendedRx.pets?.owners ? `${extendedRx.pets.owners.first_name} ${extendedRx.pets.owners.last_name}` : '';
  const patientName = extendedRx.pets?.name || '';
  const dateIssued = new Date(extendedRx.created_at).toLocaleDateString('en-US');

  // 1. We extract the layout so it isn't chained to the modal's CSS constraints
  const PrescriptionPaper = () => (
    <div className="w-full bg-white text-black p-8 border print:border-none rounded-md text-base">
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>License No. <span className="underline">{vetProfile?.license_number || '1234567'}</span></span>
          <span className="font-bold text-lg">Dr. {vetProfile?.first_name} {vetProfile?.last_name}, DVM</span>
          <span>DEA No. <span className="underline">{vetProfile?.dea_number || 'AB1234567'}</span></span>
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-wider">PAWS Veterinary Clinic</h1>
        <p className="text-sm">123 Healing Paws Ave • Quezon City, Metro Manila, 1100</p>
        <p className="text-sm">E-mail: contact@pawsclinic.com</p>
        <p className="text-sm">Phone: (02) 8123-4567 • Fax: (02) 8123-4568</p>
        <div className="border-b-2 border-black mt-4"></div>
      </div>

      {/* Patient Details */}
      <div className="space-y-4 mb-6 text-sm">
        <div className="flex gap-2 items-end">
          <span className="whitespace-nowrap">Client Name/ID:</span>
          <span className="border-b border-black flex-1 px-2 pb-0.5">{ownerName}</span>
        </div>
        <div className="flex gap-2 items-end">
          <span className="whitespace-nowrap">Address:</span>
          <span className="border-b border-black flex-1 px-2 pb-0.5">{ownerAddress}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex gap-2 items-end flex-1">
            <span className="whitespace-nowrap">Patient/Pet Name/ID:</span>
            <span className="border-b border-black flex-1 px-2 pb-0.5">{patientName} ({extendedRx.pets?.species})</span>
          </div>
          <div className="flex gap-2 items-end w-32">
            <span className="whitespace-nowrap">Age:</span>
            <span className="border-b border-black flex-1 px-2 pb-0.5">{extendedRx.pets?.age || ''}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 items-end">
          <span className="whitespace-nowrap">Date:</span>
          <span className="border-b border-black w-48 px-2 pb-0.5">{dateIssued}</span>
        </div>
      </div>

      {/* Rx Body */}
      <div className="relative min-h-[250px] mb-8">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none text-[20rem] font-serif leading-none select-none">
          V
        </div>
        
        <div className="flex gap-4">
          <div className="text-5xl font-serif font-bold">Rx</div>
          <div className="flex-1 pt-4 space-y-6">
            
            <div className="border-b border-black/30 pb-1 text-lg font-medium">
              {extendedRx.medication_name} {extendedRx.dosage && `- ${extendedRx.dosage}`}
            </div>
            
            <div className="flex gap-2">
              <span className="font-semibold">Sig:</span>
              <div className="border-b border-black/30 flex-1 pb-1">
                {extendedRx.frequency} {extendedRx.duration && `for ${extendedRx.duration}`}
              </div>
            </div>

            {extendedRx.notes && (
              <div className="flex gap-2">
                <span className="font-semibold">Notes:</span>
                <div className="border-b border-black/30 flex-1 pb-1">
                  {extendedRx.notes}
                </div>
              </div>
            )}
            
            {!extendedRx.notes && <div className="border-b border-black/30 pb-6 w-full"></div>}
            <div className="border-b border-black/30 pb-6 w-full"></div>
            
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-6">
        <div className="flex gap-2 items-center text-sm">
          <div className="w-4 h-4 border border-black"></div>
          <span>Label</span>
        </div>
        
        <div className="flex justify-between items-end">
          <div className="text-sm">
            Refill - <span className="font-bold border border-black px-1">NR</span> - 1 - 2 - 3 - 4 - PRN
          </div>
          
          <div className="w-64">
            <div className="border-b border-black mb-1 h-8"></div>
            <div className="text-sm text-left">Dr. {vetProfile?.first_name} {vetProfile?.last_name}</div>
          </div>
        </div>

        <div className="border-t-2 border-black pt-1 text-center font-bold italic text-sm">
          KEEP OUT OF CHILDREN'S REACH • FOR VETERINARY USE ONLY
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* 2. The Screen Preview (COMPLETELY HIDDEN from the printer via `print:hidden`) */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden print:hidden">
          
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle>Prescription Preview</DialogTitle>
            <DialogDescription>Review the prescription layout before printing.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 bg-blue-50/30">
            <PrescriptionPaper />
          </div>

          <DialogFooter className="shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handlePrint} className="gap-2 bg-green-600 hover:bg-green-700">
              <Printer size={16} /> Print Prescription
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* 3. The Print-Only Layer (Outside the Dialog limits, ONLY visible to printer) */}
      {open && (
        <div className="hidden print:block print:fixed print:inset-0 print:w-full print:h-full print:bg-white print:z-[999999]">
          <PrescriptionPaper />
        </div>
      )}
    </>
  );
}