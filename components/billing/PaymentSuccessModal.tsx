'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';

interface SuccessData {
  invoiceNumber: string;
  paymentNumber: string;
  total: number;
  paymentMethod: string;
}

interface PaymentSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SuccessData | null;
  onPrint?: () => void;
}

export function PaymentSuccessModal({
  open,
  onOpenChange,
  data,
  onPrint,
}: PaymentSuccessModalProps) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900">
            <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <DialogTitle className="text-center">Payment Successful!</DialogTitle>
          <DialogDescription className="text-center">
            Your transaction has been processed successfully
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invoice Number</span>
              <span className="font-medium">{data.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Number</span>
              <span className="font-medium">{data.paymentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <Badge>{data.paymentMethod}</Badge>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ₱{data.total.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onPrint}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
            <Button
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
