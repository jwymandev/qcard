'use client';

import React, { useState, useEffect } from 'react';
import { Button, Spinner, Card, Alert, AlertDescription } from '@/components/ui';
import QRCode from 'qrcode';

interface ProjectQRDisplayProps {
  projectId: string;
  size?: number;
}

export default function ProjectQRDisplay({
  projectId,
  size = 300,
}: ProjectQRDisplayProps) {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [projectUrl, setProjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [castingCode, setCastingCode] = useState<string | null>(null);

  // Generate the project URL directly
  const generateProjectUrl = (code: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin || 'https://qcard.app';
    return `${baseUrl}/apply/${code}`;
  };

  useEffect(() => {
    if (!projectId) {
      console.error("No project ID provided to ProjectQRDisplay");
      setError("No project ID provided");
      setLoading(false);
      return;
    }

    const getOrCreateCastingCode = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, check if a casting code for this project already exists
        const response = await fetch(`/api/studio/casting-codes?projectId=${projectId}&isActive=true`);
        const existingCodes = await response.json();

        let code: string;

        // If a code exists, use the first one
        if (existingCodes && existingCodes.length > 0) {
          console.log("Found existing casting code for project:", existingCodes[0].code);
          code = existingCodes[0].code;
        } else {
          // If no code exists, create a new one with the project name
          console.log("Creating new casting code for project ID:", projectId);
          
          const createResponse = await fetch('/api/studio/casting-codes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `Project Quick Apply`,
              description: `Direct application link for this project`,
              projectId: projectId,
            }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Failed to create casting code');
          }

          const newCode = await createResponse.json();
          console.log("Created new casting code:", newCode);
          code = newCode.code;
        }

        setCastingCode(code);
        const url = generateProjectUrl(code);
        setProjectUrl(url);

        // Generate QR code
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: size,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });

          console.log("QR code generation successful");
          setQrCodeData(dataUrl);
        } catch (qrErr) {
          // Fall back to sync method
          console.warn("Async QR code generation failed, trying sync method:", qrErr);
          const canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, url, {
            width: size,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          }, (canvasErr) => {
            if (canvasErr) {
              throw canvasErr;
            }
            const dataUrl = canvas.toDataURL('image/png');
            setQrCodeData(dataUrl);
            console.log("QR code generation successful via canvas");
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error generating QR code:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    getOrCreateCastingCode();
  }, [projectId, size]);

  const handleCopyLink = () => {
    if (projectUrl) {
      navigator.clipboard.writeText(projectUrl);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Spinner size="md" />
        <span className="ml-2 text-sm text-muted-foreground">Generating application QR code...</span>
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
    <Card className="p-4 flex flex-col items-center">
      <div className="text-center space-y-3">
        <h3 className="font-medium text-base">Quick Application Link</h3>
        
        {qrCodeData ? (
          <div className="border p-2 inline-block bg-white">
            <img
              src={qrCodeData}
              alt={`QR Code for project application`}
              width={size}
              height={size}
            />
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-muted-foreground text-sm">
              QR code unavailable
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Share this link to allow direct applications:</p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={projectUrl || ''}
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

        {castingCode && (
          <div className="pt-2 text-xs text-muted-foreground">
            <p>Code: <span className="font-bold tracking-wider">{castingCode}</span></p>
          </div>
        )}
      </div>
    </Card>
  );
}