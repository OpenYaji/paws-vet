'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle2, Clock } from 'lucide-react';

interface SuccessData {
  invoiceNumber: string;
  paymentNumber: string;
  total: number;
  paymentMethod: string;
  items: any[]; 
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
  const [countdown, setCountdown] = useState(10);

  // Auto-close logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (open) {
      setCountdown(10); 
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            onOpenChange(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [open, onOpenChange]);

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-h-[95vh] overflow-y-auto bg-slate-100 border-none shadow-2xl p-4">
        <DialogHeader className="pb-2">
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-1" />
            <DialogTitle className="text-lg font-bold text-slate-800">Payment Successful</DialogTitle>
          </div>
        </DialogHeader>

        {/* Thermal Receipt Preview Area */}
        <div className="bg-white p-6 shadow-sm border rounded-sm font-mono text-slate-800 relative mx-auto w-full max-w-[340px] text-[11px]">
          {/* Decorative Top Edge */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_4px,_white_4px)] bg-[length:12px_12px] bg-repeat-x -translate-y-1/2" />
          
          <div className="text-center space-y-1 mb-4">
            <h3 className="font-bold text-sm uppercase">VET CLINIC POS</h3>
            <p className="text-[9px]">123 Pet Lane, City Center</p>
            <p className="text-[9px]">VAT REG TIN: 000-123-456-000</p>
          </div>

          <div className="space-y-1 mb-3 text-[10px]">
            <div className="flex justify-between">
              <span>DATE:</span>
              <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="flex justify-between">
              <span>INV #:</span>
              <span>{data.invoiceNumber}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 my-2" />

          {/* ITEMS LIST */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between font-bold border-b border-dashed border-slate-200 pb-1">
              <span className="w-8">QTY</span>
              <span className="flex-1 px-2">ITEM</span>
              <span>AMT</span>
            </div>
            {/* FIX: Defensive mapping with fallback to empty array */}
            {(data.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[10px]">
                <span className="w-8">{item.quantity}</span>
                <span className="flex-1 px-2 uppercase truncate">
                  {item.type === 'service' ? item.item.service_name : item.item.product_name}
                </span>
                <span>{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-slate-300 my-2" />

          {/* TOTALS */}
          <div className="space-y-1">
            <div className="flex justify-between font-bold text-sm pt-1">
              <span>TOTAL (PHP)</span>
              <span>₱{data.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between opacity-80 text-[10px]">
              <span>METHOD:</span>
              <span className="uppercase">{data.paymentMethod}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 my-4" />

          <div className="text-center space-y-2">
            <p className="text-[9px] italic">Thank you for your visit!</p>
            <div className="flex justify-center py-1 opacity-60">
                <div className="h-6 w-full bg-[repeating-linear-gradient(90deg,#000,#000_1px,#fff_1px,#fff_3px)]" />
            </div>
            <p className="text-[8px] font-bold uppercase tracking-widest">{data.paymentNumber}</p>
          </div>

          {/* Decorative Bottom Edge */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_4px,_white_4px)] bg-[length:12px_12px] bg-repeat-x translate-y-1/2" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="default"
            className="w-full bg-blue-600 hover:bg-blue-700 h-9 text-xs"
            onClick={onPrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Official Receipt
          </Button>
          
          <Button
            variant="ghost"
            className="w-full text-slate-500 text-[10px] h-8"
            onClick={() => onOpenChange(false)}
          >
            <Clock className="w-3 h-3 mr-2 animate-pulse" />
            Auto-closing in {countdown}s
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}