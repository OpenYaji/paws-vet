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

interface CashPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (cashTendered: number) => void;
  isProcessing: boolean;
}

export function CashPaymentModal({
  open,
  onOpenChange,
  total,
  onConfirm,
  isProcessing,
}: CashPaymentModalProps) {
  const [cashTendered, setCashTendered] = useState<string>('');

  const cashValue = parseFloat(cashTendered) || 0;
  const change = cashValue - total;
  const isValid = cashValue >= total;

  useEffect(() => {
    if (open) {
      setCashTendered('');
    }
  }, [open]);

  const quickAmounts = [
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
    Math.ceil(total / 1000) * 1000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Cash Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total Due */}
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Total Due</p>
            <p className="text-3xl font-black text-green-600">₱{total.toFixed(2)}</p>
          </div>

          {/* Cash Tendered Input */}
          <div className="space-y-2">
            <Label htmlFor="cashTendered" className="text-sm font-semibold">
              Cash Tendered
            </Label>
            <Input
              id="cashTendered"
              type="number"
              min={0}
              step="0.01"
              placeholder="Enter amount received..."
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              className="h-12 text-xl text-center font-bold"
              autoFocus
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setCashTendered(amount.toString())}
              >
                ₱{amount.toLocaleString()}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setCashTendered(total.toFixed(2))}
            >
              Exact
            </Button>
          </div>

          {/* Change Display */}
          <div
            className={`rounded-lg p-4 text-center ${
              isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Change</p>
            <p
              className={`text-2xl font-black ${
                isValid ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {cashValue > 0 ? (isValid ? `₱${change.toFixed(2)}` : 'Insufficient') : '—'}
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
            className="bg-green-600 hover:bg-green-700 font-bold"
            disabled={!isValid || isProcessing}
            onClick={() => onConfirm(cashValue)}
          >
            {isProcessing ? 'Processing...' : 'Complete Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
