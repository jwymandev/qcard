'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button, Card } from '@/components/ui';

interface SimpleQRCodeProps {
  text: string;
  size?: number;
}

export default function SimpleQRCode({ text, size = 300 }: SimpleQRCodeProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateQRCode() {
      if (!text) {
        setError('No text provided for QR code generation');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Generating QR code for text:", text);
        
        // Generate QR code directly in the browser
        const dataUrl = await QRCode.toDataURL(text, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        
        console.log("QR code generated successfully");
        setQrCodeDataUrl(dataUrl);
        setError(null);
      } catch (err) {
        console.error("Error generating QR code:", err);
        setError('Failed to generate QR code: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }

    generateQRCode();
  }, [text, size]);

  return (
    <Card className="p-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">Simple QR Code Test</h3>
        
        {loading && <p>Loading QR code...</p>}
        
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-md text-red-600 mb-4">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        {qrCodeDataUrl && (
          <div className="flex flex-col items-center">
            <div className="border p-4 inline-block bg-white">
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                width={size}
                height={size}
              />
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Encoded text: {text}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}