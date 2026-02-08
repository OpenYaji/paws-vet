'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText } from 'lucide-react';

interface Service {
  id: string;
  service_name: string;
  base_price: number;
  service_category: string;
  description?: string;
  image_url?: string;
}

interface ServiceSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  onSelectService: (service: Service) => void;
}

export function ServiceSelectionModal({
  open,
  onOpenChange,
  services,
  onSelectService,
}: ServiceSelectionModalProps) {
  const [search, setSearch] = useState('');

  const filteredServices = services.filter(service =>
    service.service_name.toLowerCase().includes(search.toLowerCase()) ||
    service.service_category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Service</DialogTitle>
          <DialogDescription>
            Choose a service to add to the cart
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(service => (
              <Card
                key={service.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  onSelectService(service);
                  setSearch('');
                }}
              >
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.service_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold mb-1">{service.service_name}</h3>
                  <Badge variant="secondary" className="mb-2">
                    {service.service_category}
                  </Badge>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary">
                    ₱{service.base_price.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredServices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No services found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
