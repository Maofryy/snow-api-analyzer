import { CustomRequest } from '../types';

const STORAGE_KEY = 'snow-api-analyzer-custom-requests';

export function saveCustomRequestsToStorage(requests: CustomRequest[]): void {
  try {
    const serializedRequests = JSON.stringify(requests);
    localStorage.setItem(STORAGE_KEY, serializedRequests);
  } catch (error) {
    console.error('Failed to save custom requests to localStorage:', error);
  }
}

export function loadCustomRequestsFromStorage(): CustomRequest[] {
  try {
    const serializedRequests = localStorage.getItem(STORAGE_KEY);
    if (!serializedRequests) {
      return [];
    }
    
    const requests = JSON.parse(serializedRequests) as CustomRequest[];
    
    // Validate and transform dates
    return requests.map(request => ({
      ...request,
      createdAt: new Date(request.createdAt),
      updatedAt: new Date(request.updatedAt)
    }));
  } catch (error) {
    console.error('Failed to load custom requests from localStorage:', error);
    return [];
  }
}

export function clearCustomRequestsFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear custom requests from localStorage:', error);
  }
}

export function exportCustomRequestsToFile(requests: CustomRequest[]): void {
  try {
    const dataStr = JSON.stringify(requests, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `custom-requests-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  } catch (error) {
    console.error('Failed to export custom requests:', error);
  }
}

export function importCustomRequestsFromFile(file: File): Promise<CustomRequest[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const importedRequests = JSON.parse(e.target?.result as string) as CustomRequest[];
        
        // Validate and transform the imported requests
        const validatedRequests = importedRequests.map(request => ({
          ...request,
          id: crypto.randomUUID(), // Generate new IDs to avoid conflicts
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        resolve(validatedRequests);
      } catch (error) {
        reject(new Error('Invalid JSON file format'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}