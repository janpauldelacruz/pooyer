'use client';

import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={3000}
      toastOptions={{
        classNames: {
          toast: 'border border-border bg-card text-card-foreground',
          description: 'text-muted-foreground',
        },
      }}
    />
  );
}