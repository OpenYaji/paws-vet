'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Pet {
  id: string;
  name: string;
  owner_id: string;
}

interface CustomerSelectionProps {
  isWalkIn: boolean;
  setIsWalkIn: (value: boolean) => void;
  walkInName: string;
  setWalkInName: (value: string) => void;
  selectedClient: string;
  setSelectedClient: (value: string) => void;
  selectedPet: string;
  setSelectedPet: (value: string) => void;
  clients: Client[];
  pets: Pet[];
}

export function CustomerSelection({
  isWalkIn,
  setIsWalkIn,
  walkInName,
  setWalkInName,
  selectedClient,
  setSelectedClient,
  selectedPet,
  setSelectedPet,
  clients,
  pets,
}: CustomerSelectionProps) {
  const clientPets = pets.filter(pet => pet.owner_id === selectedClient);

  return (
    <div className="space-y-4">
      {/* Client Type Selection */}
      <div className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
        <Label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="customerType"
            checked={!isWalkIn}
            onChange={() => {
              setIsWalkIn(false);
              setWalkInName('');
            }}
            className="w-4 h-4"
          />
          <span>Registered Client</span>
        </Label>
        <Label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="customerType"
            checked={isWalkIn}
            onChange={() => {
              setIsWalkIn(true);
              setSelectedClient('');
              setSelectedPet('');
            }}
            className="w-4 h-4"
          />
          <span>Walk-in / Guest</span>
        </Label>
      </div>

      {/* Client Selection or Walk-in Name */}
      {isWalkIn ? (
        <div>
          <Label>Customer Name</Label>
          <Input
            value={walkInName}
            onChange={(e) => setWalkInName(e.target.value)}
            placeholder="Enter customer name"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pet (Optional)</Label>
            <Select value={selectedPet} onValueChange={setSelectedPet} disabled={!selectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Select pet" />
              </SelectTrigger>
              <SelectContent>
                {clientPets.map(pet => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
