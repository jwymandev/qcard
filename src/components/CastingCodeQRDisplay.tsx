import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CastingCodeQRDisplayProps {
  castingCode: string;
  size?: number;
}

export default function CastingCodeQRDisplay({
  castingCode,
  size = 300,
}: CastingCodeQRDisplayProps) {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [applicationUrl, setApplicationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!castingCode) return;

    const fetchQRCode = async () => {
      try {
        setLoading(true);
        setError(null);

        // Make API call to get QR code
        const response = await fetch(
          `/api/studio/casting-codes/qrcode?code=${castingCode}&size=${size}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate QR code');
        }

        const data = await response.json();
        setQrCodeData(data.qrCode);
        setApplicationUrl(data.applicationUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching QR code:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
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
          <div className="border p-4 inline-block">
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
                variant="secondary" 
                size="sm" 
                onClick={handleCopyLink}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
          
          <div className="pt-2 text-xs text-muted-foreground">
            <p>Code: <span className="font-bold tracking-wider">{castingCode}</span></p>
          </div>
        </div>
      )}
    </Card>
  );
}