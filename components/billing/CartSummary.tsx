'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, DollarSign } from 'lucide-react';

interface CartSummaryProps {
  subtotal: number;
  discount: number;
  setDiscount: (value: number) => void;
  tax: number;
  setTax: (value: number) => void;
  total: number;
  isDisabled: boolean;
  onPayCash: (cashTendered: number) => void;
  onPayCard: () => void;
  onPayOnline: () => void;
}

export function CartSummary({
  subtotal,
  discount,
  setDiscount,
  tax,
  setTax,
  total,
  isDisabled,
  onPayCash,
  onPayCard,
  onPayOnline,
}: CartSummaryProps) {
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [showCashInput, setShowCashInput] = useState(false);

  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (tax / 100);
  const change = cashTendered - total;

  const handleCashPayment = () => {
    if (cashTendered < total) {
      alert('Cash tendered is less than the total amount!');
      return;
    }
    onPayCash(cashTendered);
    setCashTendered(0);
    setShowCashInput(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cart Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground flex-1">Discount (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-20"
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount Amount</span>
            <span className="text-red-500">-₱{discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground flex-1">Tax (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={tax}
              onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
              className="w-20"
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax Amount</span>
            <span>₱{taxAmount.toFixed(2)}</span>
          </div>

          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>₱{total.toFixed(2)}</span>
          </div>
        </div>

        {showCashInput && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div>
              <Label>Cash Tendered</Label>
              <Input
                type="number"
                min={total}
                step="0.01"
                value={cashTendered}
                onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount received"
                autoFocus
              />
            </div>
            {cashTendered >= total && (
              <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400">
                <span>Change</span>
                <span>₱{change.toFixed(2)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCashInput(false);
                  setCashTendered(0);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCashPayment}
                disabled={cashTendered < total}
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {!showCashInput ? (
            <>
              <Button 
                className="w-full" 
                size="lg"
                disabled={isDisabled}
                onClick={() => setShowCashInput(true)}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Pay Cash
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                size="lg"
                disabled={isDisabled}
                onClick={onPayCard}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay by Card
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                size="lg"
                disabled={isDisabled}
                onClick={onPayOnline}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Online Payment
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
