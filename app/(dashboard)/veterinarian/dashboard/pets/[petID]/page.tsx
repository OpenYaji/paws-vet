import React from 'react';

export default function PetPage({ params }: { params: { petID: string } }) {
  // Notice we use params.petID because the folder is named [petID]
  return <div>Viewing Pet ID: {params.petID}</div>;
}