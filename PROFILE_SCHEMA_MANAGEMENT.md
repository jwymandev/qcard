# Profile Schema Management

This document describes the implementation of the dynamic profile schema management system for QCard.

## Overview

The Profile Schema Management system allows admins to customize the fields that appear in both Talent and Studio profiles. Admins can:

1. Add new fields of various types (text, textarea, dropdown, etc.)
2. Edit existing fields (rename, change descriptions, etc.)
3. Reorder fields
4. Hide/show fields
5. Make fields required/optional
6. Create dropdown options for selection fields

## Database Structure

The system uses the following database tables:

- **ProfileField**: Defines a field in either Talent or Studio profiles
- **FieldOption**: Defines options for dropdown fields
- **ProfileFieldValue**: Stores values for Talent profile fields
- **StudioFieldValue**: Stores values for Studio profile fields

This structure allows for complete flexibility in the fields that can be added to profiles without requiring database schema changes.

## Implementation

### Admin Interface

The admin interface for managing profile schemas is available at:

- `/admin/schema` - Main page for managing fields
- `/admin/schema/new` - Add a new field
- `/admin/schema/[id]` - Edit an existing field

### API Endpoints

The following API endpoints are available:

#### Schema Management (Admin Only)

- `GET /api/admin/schema` - List all fields
- `POST /api/admin/schema/field` - Create a new field
- `GET /api/admin/schema/field/{id}` - Get a specific field
- `PUT /api/admin/schema/field/{id}` - Update a field
- `PATCH /api/admin/schema/field/{id}` - Partially update a field
- `DELETE /api/admin/schema/field/{id}` - Delete a field
- `POST /api/admin/schema/reorder` - Reorder fields

#### Schema Access (User Facing)

- `GET /api/schema/talent` - Get Talent profile fields
- `GET /api/schema/studio` - Get Studio profile fields

#### Field Values

- `GET /api/talent/profile/schema-values` - Get values for the current talent
- `POST /api/talent/profile/schema-values` - Update values for the current talent
- `GET /api/studio/profile/schema-values` - Get values for the current studio
- `POST /api/studio/profile/schema-values` - Update values for the current studio

### Components

- `DynamicProfileForm` - A reusable component that renders a form based on the dynamic schema

## Field Types

The system supports the following field types:

- `TEXT` - Single line text
- `TEXTAREA` - Multi-line text
- `NUMBER` - Numeric input
- `DROPDOWN` - Selection from predefined options
- `BOOLEAN` - True/False toggle
- `DATE` - Date picker
- `EMAIL` - Email address field
- `URL` - URL field
- `PHONE` - Phone number field

## Migration

To migrate existing profile data to the new schema system, run:

```bash
npm run db:migrate-schema
```

This script will:

1. Create system field definitions for all standard profile fields
2. Migrate existing data from the profile and studio tables to the new value storage tables

## Usage in Profile Forms

To use the dynamic form in a profile page:

```jsx
import { useState, useEffect } from 'react';
import DynamicProfileForm from '@/components/DynamicProfileForm';

// In your component
const [fields, setFields] = useState({});
const [values, setValues] = useState({});
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// Fetch fields and values
useEffect(() => {
  async function fetchData() {
    try {
      // Fetch fields
      const fieldsResponse = await fetch('/api/schema/talent');
      const fieldsData = await fieldsResponse.json();
      
      // Fetch values
      const valuesResponse = await fetch('/api/talent/profile/schema-values');
      const valuesData = await valuesResponse.json();
      
      setFields(fieldsData);
      setValues(valuesData);
    } catch (error) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }
  
  fetchData();
}, []);

// Handle form submission
const handleSubmit = async (formValues) => {
  try {
    await fetch('/api/talent/profile/schema-values', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formValues),
    });
  } catch (error) {
    // Handle error
  }
};

// Render the form
return (
  <DynamicProfileForm
    fields={fields}
    initialValues={values}
    onSubmit={handleSubmit}
    isLoading={loading}
    error={error}
    submitLabel="Save Profile"
  />
);
```

## Special Considerations

1. **System Fields**: Some fields are marked as "system fields" and have certain restrictions on how they can be modified.

2. **Field Naming**: Field names must be valid JavaScript identifiers (letters, numbers, underscores) and must be unique.

3. **Validation**: The system supports basic validation rules (required fields, etc.) and can be extended to support more complex validation.

4. **Migration**: When adding new required fields, consider that existing profiles may not have values for these fields.