'use client';

import React, { useState, useEffect } from 'react';
import { Button, Spinner, Card, Alert, AlertDescription } from '@/components/ui';
import QRCode from 'qrcode';

interface SimpleCastingCodeQRDisplayProps {
  castingCode: string;
  size?: number;
}

export default function SimpleCastingCodeQRDisplay({
  castingCode,
  size = 300,
}: SimpleCastingCodeQRDisplayProps) {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [applicationUrl, setApplicationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate the application URL directly
  const generateApplicationUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin || 'https://qcard.app';
    return `${baseUrl}/apply/${castingCode}`;
  };

  useEffect(() => {
    if (!castingCode) return;

    const generateQRCode = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Generating QR code directly for code:", castingCode);
        const appUrl = generateApplicationUrl();
        console.log("Application URL:", appUrl);
        
        const dataUrl = await QRCode.toDataURL(appUrl, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        
        console.log("QR code generation successful");
        setQrCodeData(dataUrl);
        setApplicationUrl(appUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error generating QR code:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    generateQRCode();
  }, [castingCode, size]);

  const handleCopyLink = () => {
    if (applicationUrl) {
      navigator.clipboard.writeText(applicationUrl);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-6 flex flex-col items-center">
      {qrCodeData && (
        <div className="text-center space-y-4">
          <div className="border p-4 inline-block bg-white">
            <img 
              src={qrCodeData} 
              alt={`QR Code for casting code ${castingCode}`}
              width={size}
              height={size}
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Scan this QR code or share the link below:</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={applicationUrl || ''}
                readOnly
                className="flex-1 p-2 text-sm border rounded bg-muted"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
          
          <div className="pt-2 text-xs text-muted-foreground">
            <p>Code: <span className="font-bold tracking-wider">{castingCode}</span></p>
            <p className="mt-1 text-xs text-blue-600">
              <small>* Direct browser QR generation</small>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}