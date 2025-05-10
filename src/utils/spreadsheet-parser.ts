import * as XLSX from 'xlsx';

/**
 * Parses various spreadsheet formats (Excel, CSV, Numbers) into a standardized format
 * @param file The file to parse
 * @returns A Promise that resolves to an array of objects representing the rows
 */
export async function parseSpreadsheet(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        // Parse the spreadsheet using xlsx library
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON (header: true means use first row as headers)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        });
        
        if (jsonData.length < 2) {
          reject(new Error('Spreadsheet must have a header row and at least one data row'));
          return;
        }
        
        // Extract headers (first row)
        const headers = jsonData[0] as string[];
        
        if (!headers.some(header => header?.toLowerCase() === 'email')) {
          reject(new Error('Spreadsheet must contain an "email" column'));
          return;
        }
        
        // Convert data to objects with header keys
        const rows = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          const obj: Record<string, any> = {};
          
          // Map each column to its header
          for (let j = 0; j < headers.length; j++) {
            if (headers[j]) { // Only add if header exists
              obj[headers[j]] = row[j] !== undefined ? row[j] : '';
            }
          }
          
          rows.push(obj);
        }
        
        resolve(rows);
      } catch (error) {
        console.error('Error parsing spreadsheet:', error);
        reject(new Error('Failed to parse spreadsheet file. Please check the file format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    // Read file as array buffer (works for both text and binary files)
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Converts parsed spreadsheet data to CSV format
 * @param jsonData Array of objects representing rows
 * @returns CSV string
 */
export function convertToCSV(jsonData: Record<string, any>[]): string {
  if (jsonData.length === 0) {
    return '';
  }
  
  // Get headers from the first object
  const headers = Object.keys(jsonData[0]);
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Add data rows
  jsonData.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] ?? '';
      
      // Handle values with commas, newlines, or quotes by wrapping in quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
        // Escape quotes by doubling them
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    
    csv += values.join(',') + '\n';
  });
  
  return csv;
}