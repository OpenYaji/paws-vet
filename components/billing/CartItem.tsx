'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';

interface Service {
  id: string;
  service_name: string;
  base_price: number;
}

interface Product {
  id: string;
  product_name: string;
  price: number;
  stock_quantity: number;
}

interface CartItemData {
  type: 'service' | 'product';
  item: Service | Product;
  quantity: number;
  price: number;
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const maxQuantity = item.type === 'product' ? (item.item as Product).stock_quantity : undefined;

  return (
    <TableRow>
      <TableCell>
        <Badge variant={item.type === 'service' ? 'default' : 'secondary'}>
          {item.type}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">
        {item.type === 'service' 
          ? (item.item as Service).service_name 
          : (item.item as Product).product_name}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="1"
          max={maxQuantity}
          value={item.quantity}
          onChange={(e) => onUpdateQuantity(parseInt(e.target.value) || 1)}
          className="w-16"
        />
      </TableCell>
      <TableCell>₱{item.price.toFixed(2)}</TableCell>
      <TableCell>₱{(item.price * item.quantity).toFixed(2)}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
