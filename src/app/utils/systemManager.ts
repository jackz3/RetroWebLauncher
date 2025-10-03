import metadata from '../../metadata.json';
import cores from '../../cores.json';

export interface SystemInfo {
  id: string;
  systemName: string;
}

// Get all systems from metadata
export const getAllSystems = (): SystemInfo[] => {
  return Object.entries(metadata).map(([id, systemData]) => ({
    id,
    systemName: systemData.systemName
  }));
};

// Get selected systems from localStorage (object format: { [systemId]: coreName })
export const getSelectedSystems = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const systems = localStorage.getItem('systems');
    if (!systems) return {};
    const parsed = JSON.parse(systems);
    // Migration: if old array format, convert to object with default core
    if (Array.isArray(parsed)) {
      const migrated: Record<string, string> = {};
      parsed.forEach((systemId: string) => {
        const coreArr = (cores as Record<string, string[]>)[systemId];
        if (coreArr && coreArr.length > 0) {
          migrated[systemId] = coreArr[0];
        }
      });
      localStorage.setItem('systems', JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  } catch (error) {
    console.error('Error reading systems from localStorage:', error);
    return {};
  }
};

// Save selected systems to localStorage (object format)
export const saveSelectedSystems = (systems: Record<string, string>): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('systems', JSON.stringify(systems));
  } catch (error) {
    console.error('Error saving systems to localStorage:', error);
  }
};

// Toggle system selection (object format)
export const toggleSystemSelection = (systemId: string): Record<string, string> => {
  const selected = getSelectedSystems();
  if (selected[systemId]) {
    // Remove system if already selected
    delete selected[systemId];
  } else {
    // Add system with default core
    const coreArr = (cores as Record<string, string[]>)[systemId];
    if (coreArr && coreArr.length > 0) {
      selected[systemId] = coreArr[0];
    }
  }
  saveSelectedSystems(selected);
  return { ...selected };
};
