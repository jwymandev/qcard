import React, { useState, useEffect } from 'react';
import { Button, Spinner, Card, Alert, AlertDescription } from '@/components/ui';
import QRCode from 'qrcode';

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
  const [usedDirectGeneration, setUsedDirectGeneration] = useState<boolean>(false);

  // Generate the application URL directly
  const generateApplicationUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin || 'https://qcard.app';
    return `${baseUrl}/apply/${castingCode}`;
  };

  // Direct QR code generation function (fallback)
  const generateQRCodeDirectly = async () => {
    if (!castingCode) return false;

    try {
      console.log("Generating QR code directly for code:", castingCode);
      const appUrl = generateApplicationUrl();
      console.log("Application URL for direct generation:", appUrl);

      const dataUrl = await QRCode.toDataURL(appUrl, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      console.log("Direct QR code generation successful");
      setQrCodeData(dataUrl);
      setApplicationUrl(appUrl);
      setUsedDirectGeneration(true);
      return true;
    } catch (err) {
      console.error("Error in direct QR code generation:", err);
      return false;
    }
  };

  useEffect(() => {
    if (!castingCode) return;

    const fetchQRCode = async () => {
      try {
        setLoading(true);
        setError(null);

        // Start with direct generation for immediate display
        const directSuccess = await generateQRCodeDirectly();
        if (directSuccess) {
          console.log("Successfully generated QR code directly as first option");
          return;
        }

        console.log("Direct generation didn't work, falling back to API");
        console.log("Fetching QR code for casting code:", castingCode);

        // Make API call to get QR code
        const response = await fetch(
          `/api/studio/casting-codes/qrcode?code=${castingCode}&size=${size}`
        );

        console.log("QR code API response status:", response.status);

        // Get the response body
        const responseText = await response.text();

        // Try to parse as JSON
        let data;
        try {
          data = JSON.parse(responseText);
          console.log("QR code API response data:", data);
        } catch (e) {
          console.error("Failed to parse QR code response as JSON:", responseText);
          throw new Error("Failed to parse QR code response");
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate QR code');
        }

        if (!data.qrCode) {
          console.error("No QR code data in response:", data);
          throw new Error("No QR code generated");
        }

        setQrCodeData(data.qrCode);
        setApplicationUrl(data.applicationUrl);
        console.log("QR code and application URL set successfully");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error fetching QR code:', err);
        setError(errorMessage);
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
      <div className="text-center space-y-4">
        {qrCodeData ? (
          <div className="border p-4 inline-block bg-white">
            <img
              src={qrCodeData}
              alt={`QR Code for casting code ${castingCode}`}
              width={size}
              height={size}
            />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="w-full mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              QR code generation in progress...
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Share the application link below:</p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={applicationUrl || generateApplicationUrl()}
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
          {usedDirectGeneration && (
            <p className="mt-1 text-xs text-blue-600">
              <small>* Direct browser QR generation</small>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}