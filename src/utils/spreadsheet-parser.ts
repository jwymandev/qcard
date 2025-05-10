import * as XLSX from 'xlsx';

// Column type definitions
type ColumnType = 'email' | 'firstName' | 'lastName' | 'fullName' | 'phoneNumber' | 'notes';

// Patterns for column detection
const COLUMN_PATTERNS: Record<ColumnType, RegExp[]> = {
  email: [
    /^e-?mail$/i, 
    /^e-?mail\s*addr(ess)?$/i, 
    /^actor\s*e-?mail$/i, 
    /^contact\s*e-?mail$/i,
    /^talent\s*e-?mail$/i,
    /^email\s*address$/i,
    /^contact$/i,
    /^address$/i
  ],
  firstName: [
    /^first\s*name$/i, 
    /^given\s*name$/i, 
    /^f\.?\s*name$/i, 
    /^name\s*\(first\)$/i,
    /^actor\s*first\s*name$/i,
    /^talent\s*first\s*name$/i,
    /^first$/i
  ],
  lastName: [
    /^last\s*name$/i, 
    /^surname$/i, 
    /^family\s*name$/i, 
    /^l\.?\s*name$/i, 
    /^name\s*\(last\)$/i,
    /^actor\s*last\s*name$/i,
    /^talent\s*last\s*name$/i,
    /^last$/i
  ],
  fullName: [
    /^(full\s*)?name$/i, 
    /^actor\s*name$/i, 
    /^talent\s*name$/i, 
    /^complete\s*name$/i,
    /^actor$/i,
    /^talent$/i
  ],
  phoneNumber: [
    /^phone(\s*number)?$/i, 
    /^telephone$/i, 
    /^contact\s*number$/i, 
    /^mobile(\s*number)?$/i, 
    /^cell(\s*phone)?$/i,
    /^actor\s*phone$/i,
    /^talent\s*phone$/i,
    /^tel$/i,
    /^phone\s*#$/i,
    /^cell$/i,
    /^contact\s*phone$/i
  ],
  notes: [
    /^notes?$/i, 
    /^comments?$/i, 
    /^description$/i, 
    /^details$/i, 
    /^additional\s*info(rmation)?$/i,
    /^remarks$/i,
    /^bio$/i,
    /^background$/i,
    /^about$/i
  ]
};

// Regular expressions for data validation
const DATA_VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneNumber: /^[\d()+\-.\s]{7,20}$/,
};

/**
 * Detects column types based on header names
 * @param headers The header row from the spreadsheet
 * @returns A map of original header names to standardized column types
 */
function detectColumnTypes(headers: string[]): Map<string, ColumnType> {
  const columnMap = new Map<string, ColumnType>();
  
  // First pass: check for exact pattern matches in headers
  headers.forEach(header => {
    if (!header) return;
    
    for (const [type, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(header))) {
        columnMap.set(header, type as ColumnType);
        break;
      }
    }
  });
  
  // If we couldn't find an email column, try to infer it from data in a second pass
  if (!Array.from(columnMap.values()).includes('email')) {
    // We'll handle this during data validation
    console.log('No exact email column match found, will attempt to infer from data');
  }
  
  // If we found first and last name but no full name, create a mapping for it
  const hasFirstName = Array.from(columnMap.values()).includes('firstName');
  const hasLastName = Array.from(columnMap.values()).includes('lastName');
  const hasFullName = Array.from(columnMap.values()).includes('fullName');
  
  if ((hasFirstName || hasLastName) && !hasFullName) {
    // We'll handle name composition during data processing
    console.log('Found separate name fields, will compose full name');
  }
  
  return columnMap;
}

/**
 * Detects column type based on its content
 * @param values Array of values from a column
 * @returns The most likely column type based on content
 */
function detectColumnTypeFromData(values: any[]): ColumnType | null {
  // Filter out empty values
  const nonEmptyValues = values.filter(val => val !== null && val !== undefined && val !== '');
  if (nonEmptyValues.length === 0) return null;
  
  // Count how many values match each pattern
  let emailCount = 0;
  let phoneCount = 0;
  let nameCount = 0;
  let notesCount = 0;
  
  for (const val of nonEmptyValues) {
    const strVal = String(val).trim();
    
    // Check for email pattern
    if (DATA_VALIDATION.email.test(strVal)) {
      emailCount++;
    }
    
    // Check for phone pattern
    if (DATA_VALIDATION.phoneNumber.test(strVal)) {
      phoneCount++;
    }
    
    // Check for name-like patterns (capitalized words)
    if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/.test(strVal)) {
      nameCount++;
    }
    
    // Check for notes-like patterns (longer text)
    if (strVal.length > 20 && strVal.split(' ').length > 3) {
      notesCount++;
    }
  }
  
  // Calculate percentages
  const total = nonEmptyValues.length;
  const emailPercent = emailCount / total;
  const phonePercent = phoneCount / total;
  const namePercent = nameCount / total;
  const notesPercent = notesCount / total;
  
  // Determine most likely type
  if (emailPercent > 0.7) return 'email';
  if (phonePercent > 0.7) return 'phoneNumber';
  if (namePercent > 0.7) {
    // Determine if it's likely first or last name
    // This is a simple heuristic - could be improved
    const firstWords = nonEmptyValues.map(val => String(val).split(' ')[0]);
    const uniqueFirstWords = new Set(firstWords).size;
    
    if (uniqueFirstWords / total > 0.5) {
      return 'fullName'; // Likely full names with good variety
    } else {
      // Could be first or last names, but we'll default to fullName
      return 'fullName';
    }
  }
  if (notesPercent > 0.5) return 'notes';
  
  return null; // Unknown column type
}

/**
 * Validates and parses an email address
 * @param value The potential email value to validate
 * @returns A validated email or null if invalid
 */
function validateEmail(value: any): string | null {
  if (!value) return null;
  
  const strVal = String(value).trim();
  if (DATA_VALIDATION.email.test(strVal)) {
    return strVal.toLowerCase();
  }
  
  // Try to extract from values that might contain an email
  const emailMatch = strVal.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  if (emailMatch) {
    return emailMatch[0].toLowerCase();
  }
  
  return null;
}

/**
 * Normalizes a phone number
 * @param value The potential phone value to normalize
 * @returns A normalized phone number or original value if can't be normalized
 */
function normalizePhoneNumber(value: any): string | null {
  if (!value) return null;
  
  const strVal = String(value).trim();
  // Strip all non-digit characters for comparison
  const digitsOnly = strVal.replace(/\D/g, '');
  
  // If there are too few digits, this might not be a phone number
  if (digitsOnly.length < 7) return null;
  
  // Return original format but trimmed
  return strVal;
}

/**
 * Parses various spreadsheet formats (Excel, CSV, Numbers) into a standardized format
 * with intelligent column detection
 * @param file The file to parse
 * @returns A Promise that resolves to an array of objects with standardized fields
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
        
        // Convert to JSON (header: 1 means use first row as headers)
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
        const rawHeaders = jsonData[0] as string[];
        const headers = rawHeaders.map(h => h?.trim() || '');
        
        // Detect column types from headers
        const columnMap = detectColumnTypes(headers);
        console.log('Column mappings from headers:', Object.fromEntries(columnMap));
        
        // If we couldn't determine an email column from headers, analyze the data
        if (!Array.from(columnMap.values()).includes('email')) {
          // For each column, check its data to see if it looks like an email column
          for (let j = 0; j < headers.length; j++) {
            if (!headers[j] || columnMap.has(headers[j])) continue;
            
            // Get all values for this column
            const columnValues = [];
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              if (j < row.length) {
                columnValues.push(row[j]);
              }
            }
            
            // Detect column type from data patterns
            const inferredType = detectColumnTypeFromData(columnValues);
            if (inferredType) {
              columnMap.set(headers[j], inferredType);
              
              // If we found our email column, we can stop here
              if (inferredType === 'email') {
                console.log(`Inferred email column from data: ${headers[j]}`);
                break;
              }
            }
          }
        }
        
        // Final check for required email column
        let emailColumnFound = false;
        columnMap.forEach((type, header) => {
          if (type === 'email') emailColumnFound = true;
        });
        
        if (!emailColumnFound) {
          // One last attempt - look for any column with valid email values
          let bestEmailColumn = '';
          let bestEmailCount = 0;
          
          for (let j = 0; j < headers.length; j++) {
            if (!headers[j]) continue;
            
            let emailCount = 0;
            for (let i = 1; i < jsonData.length && i < 10; i++) { // Check first 10 rows
              const row = jsonData[i] as any[];
              if (j < row.length && validateEmail(row[j])) {
                emailCount++;
              }
            }
            
            if (emailCount > bestEmailCount) {
              bestEmailCount = emailCount;
              bestEmailColumn = headers[j];
            }
          }
          
          if (bestEmailColumn && bestEmailCount > 0) {
            console.log(`Found probable email column based on content: ${bestEmailColumn}`);
            columnMap.set(bestEmailColumn, 'email');
            emailColumnFound = true;
          }
        }
        
        if (!emailColumnFound) {
          reject(new Error('Could not identify an email column in your spreadsheet. Please ensure it has a column containing email addresses.'));
          return;
        }
        
        // Convert data to standardized objects
        const standardizedRows = [];
        
        rowLoop: for (let i = 1; i < jsonData.length; i++) {
          const rawRow = jsonData[i] as any[];
          const standardizedRow: Record<string, any> = {
            // Initialize with default empty values
            email: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            notes: ''
          };
          
          // Map data according to identified columns
          let foundValidEmail = false;
          
          for (let j = 0; j < headers.length; j++) {
            if (!headers[j]) continue;
            
            const value = j < rawRow.length ? rawRow[j] : '';
            const columnType = columnMap.get(headers[j]);
            
            if (columnType === 'email') {
              const validatedEmail = validateEmail(value);
              if (validatedEmail) {
                standardizedRow.email = validatedEmail;
                foundValidEmail = true;
              }
            } else if (columnType === 'firstName') {
              standardizedRow.firstName = String(value || '').trim();
            } else if (columnType === 'lastName') {
              standardizedRow.lastName = String(value || '').trim();
            } else if (columnType === 'fullName') {
              // Try to split full name into first and last
              const fullName = String(value || '').trim();
              const parts = fullName.split(/\s+/);
              
              if (parts.length > 1) {
                // First name is everything except the last part
                standardizedRow.firstName = parts.slice(0, -1).join(' ');
                // Last name is just the last part
                standardizedRow.lastName = parts[parts.length - 1];
              } else if (parts.length === 1) {
                // Only one name provided, assume it's the first name
                standardizedRow.firstName = parts[0];
              }
            } else if (columnType === 'phoneNumber') {
              const phone = normalizePhoneNumber(value);
              if (phone) {
                standardizedRow.phoneNumber = phone;
              }
            } else if (columnType === 'notes') {
              standardizedRow.notes = String(value || '').trim();
            } else if (value && !columnType) {
              // For unidentified columns with data, check if they might contain an email
              if (!foundValidEmail) {
                const validatedEmail = validateEmail(value);
                if (validatedEmail) {
                  standardizedRow.email = validatedEmail;
                  foundValidEmail = true;
                  console.log(`Found email in unmarked column: ${validatedEmail}`);
                }
              }
            }
          }
          
          // Validate that we have a required email
          if (!standardizedRow.email) {
            // Skip rows without an email
            console.log(`Skipping row ${i} due to missing email`);
            continue rowLoop;
          }
          
          // Add row to final result
          standardizedRows.push(standardizedRow);
        }
        
        // Final validation of the data set
        if (standardizedRows.length === 0) {
          reject(new Error('No valid data rows found with email addresses'));
          return;
        }
        
        resolve(standardizedRows);
        
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
  
  // Use standard headers for our format
  const standardHeaders = ['email', 'firstName', 'lastName', 'phoneNumber', 'notes'];
  
  // Create CSV header row
  let csv = standardHeaders.join(',') + '\n';
  
  // Add data rows
  jsonData.forEach(row => {
    const values = standardHeaders.map(header => {
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