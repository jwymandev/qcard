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
import SimpleCastingCodeQRDisplay from './SimpleCastingCodeQRDisplay';

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

  // Log the casting code for debugging purposes
  console.log("Displaying QR modal for casting code:", castingCode);

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
          {castingCode && castingCode.code ? (
            <>
              <SimpleCastingCodeQRDisplay castingCode={castingCode.code} />

              <div className="mt-4 text-center">
                <h3 className="font-semibold">{castingCode.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Casting Code: <span className="font-mono">{castingCode.code}</span>
                </p>
              </div>

              {/* Fallback manual instructions */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-sm mb-2">How to Use This Code</h4>
                <p className="text-sm text-gray-600 mb-2">
                  If the QR code doesn&apos;t appear above, you can still use this code by:
                </p>
                <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                  <li>Sharing the application link</li>
                  <li>Providing the code directly: <span className="font-mono font-bold">{castingCode.code}</span></li>
                  <li>Directing talent to: {window.location.origin}/apply/{castingCode.code}</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800">
                Could not display QR code. Missing casting code information.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {castingCode && castingCode.code && (
            <Button
              variant="outline"
              onClick={handlePrint}
              className="sm:w-auto w-full"
            >
              Print QR Code
            </Button>
          )}
          <Button onClick={onClose} className="sm:w-auto w-full">
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}