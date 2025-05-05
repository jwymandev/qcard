/**
 * Helper functions for region-related operations
 */

export type RegionWithStats = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    locations: number;
    castingCalls: number;
    profiles: number;
    studios: number;
  };
};

export type LocationWithRegion = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  regionId: string | null;
  region?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
};

/**
 * Fetch all regions with optional stats
 */
export async function fetchRegions(includeStats = false): Promise<RegionWithStats[]> {
  const url = includeStats ? '/api/regions?includeStats=true' : '/api/regions';
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch regions');
  }
  
  return response.json();
}

/**
 * Fetch a specific region by ID
 */
export async function fetchRegionById(id: string, includeStats = false): Promise<RegionWithStats> {
  const url = includeStats 
    ? `/api/regions/${id}?includeStats=true` 
    : `/api/regions/${id}`;
    
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch region with ID ${id}`);
  }
  
  return response.json();
}

/**
 * Create a new region (super-admin only)
 */
export async function createRegion(data: { name: string; description?: string }): Promise<RegionWithStats> {
  const response = await fetch('/api/regions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create region');
  }
  
  return response.json();
}

/**
 * Update an existing region (super-admin only)
 */
export async function updateRegion(
  id: string, 
  data: { name: string; description?: string }
): Promise<RegionWithStats> {
  const response = await fetch(`/api/regions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to update region with ID ${id}`);
  }
  
  return response.json();
}

/**
 * Delete a region (super-admin only)
 * Returns false if the region has dependencies and cannot be deleted
 */
export async function deleteRegion(id: string): Promise<{ success: boolean; dependencies?: any }> {
  const response = await fetch(`/api/regions/${id}`, {
    method: 'DELETE',
  });
  
  if (response.status === 400) {
    // Region has dependencies and cannot be deleted
    const errorData = await response.json();
    return {
      success: false,
      dependencies: errorData.dependencies,
    };
  }
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to delete region with ID ${id}`);
  }
  
  return { success: true };
}

/**
 * Fetch all locations with optional region information
 */
export async function fetchLocations(includeRegions = false, regionId?: string): Promise<LocationWithRegion[]> {
  let url = '/api/locations';
  const params = new URLSearchParams();
  
  if (includeRegions) {
    params.append('includeRegions', 'true');
  }
  
  if (regionId) {
    params.append('regionId', regionId);
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch locations');
  }
  
  return response.json();
}

/**
 * Assign a location to a region (super-admin only)
 */
export async function assignLocationToRegion(locationId: string, regionId: string | null): Promise<LocationWithRegion> {
  const response = await fetch(`/api/locations/${locationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ regionId }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to assign location to region`);
  }
  
  return response.json();
}

/**
 * Create a new location with optional region assignment
 */
export async function createLocation(data: { name: string; regionId?: string }): Promise<LocationWithRegion> {
  const response = await fetch('/api/locations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create location');
  }
  
  return response.json();
}