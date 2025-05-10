import React, { useState, useRef } from 'react';
import { parseSpreadsheet, convertToCSV } from '@/utils/spreadsheet-parser';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, AlertTitle, AlertDescription } from '@/components/ui';

type UploadResult = {
  success: number;
  errors: { row: number; email: string; error: string }[];
  duplicates: number;
};

interface ExternalTalentUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
}

export default function ExternalTalentUpload({ onUploadComplete }: ExternalTalentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const fileName = selectedFile.name.toLowerCase();
      
      // Check if file is a supported spreadsheet format
      if (!(
        selectedFile.type === 'text/csv' || 
        fileName.endsWith('.csv') || 
        fileName.endsWith('.xlsx') || 
        fileName.endsWith('.xls') || 
        fileName.endsWith('.numbers') ||
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'application/vnd.ms-excel'
      )) {
        setError('Please upload a CSV, Excel, or Numbers spreadsheet file');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError('Processing spreadsheet...');

    try {
      // Show processing status
      
      let csvData;
      
      try {
        // Use our enhanced spreadsheet parser for all file types
        // It can handle CSV, Excel, and Numbers formats
        const parsedData = await parseSpreadsheet(file);
        
        // Check if there's data
        if (parsedData.length === 0) {
          throw new Error('No valid data rows found in the spreadsheet');
        }
        
        // Show how many records were found
        setError(`Found ${parsedData.length} valid records. Uploading...`);
        
        // Convert parsed data to CSV format for the API
        csvData = convertToCSV(parsedData);
      } catch (parseError) {
        console.error('Error parsing spreadsheet:', parseError);
        throw new Error(parseError instanceof Error ? 
          parseError.message : 
          'Failed to parse spreadsheet. Please check the file format.');
      }
      
      // Send the CSV data to the API
      const response = await fetch('/api/studio/external-actors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvData: csvData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload CSV');
      }

      const result = await response.json();
      setUploadResult(result);
      setFile(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call the callback if provided - do this with a small delay to ensure state is updated
      if (onUploadComplete) {
        console.log('Upload complete, calling callback with result:', result);
        // Add a slight delay to ensure React state updates have completed
        setTimeout(() => {
          onUploadComplete(result);
        }, 100);
      }
    } catch (err) {
      console.error('Error uploading CSV:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Trigger another callback when resetting to upload another file
    if (uploadResult && uploadResult.success > 0 && onUploadComplete) {
      onUploadComplete(uploadResult);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload External Talent</CardTitle>
        <CardDescription>
          Upload a spreadsheet file containing external talent information.
          <br />
          The file should have columns: email (required), firstName, lastName, phoneNumber, notes
          <br />
          Supported formats: CSV, Excel (.xlsx, .xls), Numbers
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant={error.startsWith('Processing') || error.startsWith('Found') ? 'default' : 'destructive'} 
                 className={`mb-4 ${error.startsWith('Processing') || error.startsWith('Found') ? 'bg-blue-50 border-blue-200' : ''}`}>
            <AlertTitle>{error.startsWith('Processing') || error.startsWith('Found') ? 'Status' : 'Error'}</AlertTitle>
            <AlertDescription>
              {error}
              {isUploading && (error.startsWith('Processing') || error.startsWith('Found')) && (
                <div className="flex items-center mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-blue-600">
                    {error.startsWith('Processing') ? 'Analyzing file...' : 'Uploading to server...'}
                  </span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {uploadResult ? (
          <div className="space-y-4">
            <Alert variant="default" className="bg-green-50 border-green-200">
              <AlertTitle>Upload Complete</AlertTitle>
              <AlertDescription>
                Successfully imported {uploadResult.success} actors.
                {uploadResult.duplicates > 0 && ` Skipped ${uploadResult.duplicates} duplicates.`}
              </AlertDescription>
            </Alert>

            {uploadResult.errors.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Errors ({uploadResult.errors.length})</h3>
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadResult.errors.map((error, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{error.row}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{error.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">{error.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button onClick={resetUpload}>Upload Another File</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const droppedFile = e.dataTransfer.files[0];
                  const fileName = droppedFile.name.toLowerCase();
                  
                  // Check if file is a supported spreadsheet format
                  if (
                    droppedFile.type === 'text/csv' || 
                    fileName.endsWith('.csv') || 
                    fileName.endsWith('.xlsx') || 
                    fileName.endsWith('.xls') || 
                    fileName.endsWith('.numbers') ||
                    droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    droppedFile.type === 'application/vnd.ms-excel'
                  ) {
                    setFile(droppedFile);
                    setError(null);
                  } else {
                    setError('Please upload a CSV, Excel, or Numbers spreadsheet file');
                  }
                }
              }}
            >
              <input
                type="file"
                id="csv-upload"
                accept=".csv,.xlsx,.xls,.numbers,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Click to select a spreadsheet file or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">CSV, Excel (.xlsx, .xls), Numbers</p>
              </label>
            </div>

            {file && (
              <div className="flex items-center justify-between bg-gray-50 rounded-md p-3">
                <div className="flex items-center">
                  <svg
                    className="w-6 h-6 text-gray-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
                <button
                  onClick={resetUpload}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={resetUpload}
                disabled={!file || isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Spreadsheet'}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Spreadsheet Format Example</h3>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
            email,firstName,lastName,phoneNumber,notes<br />
            actor1@example.com,John,Doe,123-456-7890,Lead role in previous production<br />
            actor2@example.com,Jane,Smith,987-654-3210,Has agent representation
          </pre>
          <p className="text-xs text-gray-500 mt-2">
            <strong>Note:</strong> Your spreadsheet should have similar column headers. When talent registers with a matching email or phone number, 
            they will automatically be linked to these external talent records.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}