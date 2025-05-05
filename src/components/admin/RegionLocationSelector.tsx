import { useState, useEffect } from 'react';
import { useIsSuperAdmin } from '@/lib/client-admin-helpers';

interface Region {
  id: string;
  name: string;
  description?: string;
}

interface Location {
  id: string;
  name: string;
  regionId?: string | null;
  region?: Region | null;
}

interface RegionLocationSelectorProps {
  locationId: string;
  currentRegionId?: string | null;
  onUpdate: (locationId: string, regionId: string | null) => Promise<void>;
  className?: string;
}

export default function RegionLocationSelector({
  locationId,
  currentRegionId,
  onUpdate,
  className = '',
}: RegionLocationSelectorProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(currentRegionId || null);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  const isSuperAdmin = useIsSuperAdmin();
  
  // Fetch available regions on component mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await fetch('/api/regions');
        
        if (!response.ok) {
          throw new Error('Failed to fetch regions');
        }
        
        const data = await response.json();
        setRegions(data);
        setLoading(false);
      } catch (err) {
        setError('Error loading regions. Please try again.');
        setLoading(false);
        console.error('Error fetching regions:', err);
      }
    };
    
    fetchRegions();
  }, []);
  
  // Handle region selection change
  const handleRegionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegionId = e.target.value === 'none' ? null : e.target.value;
    setSelectedRegionId(newRegionId);
    
    if (isSuperAdmin) {
      try {
        setUpdating(true);
        await onUpdate(locationId, newRegionId);
        setUpdateSuccess(true);
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setUpdateSuccess(false);
        }, 3000);
      } catch (err) {
        setError('Failed to update region assignment');
        console.error('Error updating location region:', err);
      } finally {
        setUpdating(false);
      }
    }
  };
  
  if (!isSuperAdmin) {
    return (
      <div className={`text-sm ${className}`}>
        <span className="text-gray-700">
          Region: {regions.find(r => r.id === currentRegionId)?.name || 'None assigned'}
        </span>
      </div>
    );
  }
  
  return (
    <div className={`${className}`}>
      <label htmlFor="region-selector" className="block text-sm font-medium text-gray-700 mb-1">
        Region
      </label>
      
      {loading ? (
        <div className="text-sm text-gray-500">Loading regions...</div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <>
          <select
            id="region-selector"
            value={selectedRegionId || 'none'}
            onChange={handleRegionChange}
            disabled={updating}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          >
            <option value="none">-- No Region --</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          
          {updating && (
            <div className="mt-1 text-xs text-blue-500">Updating region assignment...</div>
          )}
          
          {updateSuccess && (
            <div className="mt-1 text-xs text-green-500">Region updated successfully!</div>
          )}
        </>
      )}
    </div>
  );
}