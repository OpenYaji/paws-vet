'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GcashPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (referenceNumber: string) => void;
  isProcessing: boolean;
}

export function GcashPaymentModal({
  open,
  onOpenChange,
  total,
  onConfirm,
  isProcessing,
}: GcashPaymentModalProps) {
  const [referenceNumber, setReferenceNumber] = useState('');

  const isValid = referenceNumber.trim().length > 0;

  useEffect(() => {
    if (open) {
      setReferenceNumber('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-lg">GCash Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total Due */}
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Amount to Collect via GCash</p>
            <p className="text-3xl font-black text-blue-600">₱{total.toFixed(2)}</p>
          </div>

          {/* Reference Number Input */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber" className="text-sm font-semibold">
              GCash Reference Number
            </Label>
            <Input
              id="referenceNumber"
              type="text"
              placeholder="Enter GCash reference number..."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="h-12 text-center font-mono text-lg tracking-wider"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground">
              Enter the reference number from the customer&apos;s GCash transaction confirmation.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 font-bold"
            disabled={!isValid || isProcessing}
            onClick={() => onConfirm(referenceNumber.trim())}
          >
            {isProcessing ? 'Processing...' : 'Complete Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
