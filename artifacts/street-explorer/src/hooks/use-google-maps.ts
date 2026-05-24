import { useState, useEffect } from 'react';

let isLoading = false;
let isLoaded = false;
let loadError: Error | null = null;
let loadPromise: Promise<void> | null = null;
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function useGoogleMapsApi() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const update = () => forceUpdate(n => n + 1);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  useEffect(() => {
    if (isLoaded || loadError || isLoading) return;

    isLoading = true;
    loadPromise = new Promise<void>((resolve, reject) => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
	console.log('API KEY:', apiKey);
      if (!apiKey) {
        const err = new Error("Google Maps API key is missing. Add GOOGLE_MAPS_API_KEY to Replit Secrets.");
        loadError = err;
        isLoading = false;
        notifyListeners();
        reject(err);
        return;
      }

      // Google Maps calls this on auth errors
      (window as any).gm_authFailure = () => {
        const err = new Error(
          "Chiave API non valida o API non abilitate. Vai su console.cloud.google.com e abilita: Maps JavaScript API, Street View Static API, Geocoding API."
        );
        loadError = err;
        isLoaded = false;
        isLoading = false;
        notifyListeners();
        reject(err);
      };

      (window as any).initGoogleMaps = () => {
        isLoaded = true;
        isLoading = false;
        loadError = null;
        notifyListeners();
        resolve();
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        const err = new Error('Failed to load Google Maps script. Check your internet connection.');
        loadError = err;
        isLoading = false;
        notifyListeners();
        reject(err);
      };

      document.head.appendChild(script);
    });
  }, []);

  return { 
    isLoaded, 
    error: loadError,
    isLoading: isLoading && !isLoaded && !loadError
  };
}
