import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
  Button
} from '@/components/ui';
import CastingCodeQRDisplay from './CastingCodeQRDisplay';

interface CastingCodeQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  castingCode: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export default function CastingCodeQRModal({
  isOpen,
  onClose,
  castingCode,
}: CastingCodeQRModalProps) {
  const handlePrint = () => {
    window.print();
  };

  if (!castingCode) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Casting Code QR Code</AlertDialogTitle>
          <AlertDialogDescription>
            Share this QR code or link with external talent to allow them to apply.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <CastingCodeQRDisplay castingCode={castingCode.code} />
          
          <div className="mt-4 text-center">
            <h3 className="font-semibold">{castingCode.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Casting Code: <span className="font-mono">{castingCode.code}</span>
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="sm:w-auto w-full"
          >
            Print QR Code
          </Button>
          <Button onClick={onClose} className="sm:w-auto w-full">
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}