'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface NeighborhoodMapProps {
  neighborhoodName: string;
  address: string;
  city?: string;
  state?: string;
}

interface MapboxContext {
  id: string;
  text: string;
}

interface MapboxFeature {
  center: [number, number];
  context?: MapboxContext[];
}

export default function NeighborhoodMap({ neighborhoodName, address, city, state }: NeighborhoodMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('User location:', latitude, longitude);
        },
        (error) => {
          console.error('Error getting user location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40], // Default center, will be updated with geocoding
      zoom: 12
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add location control
    const locationControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.current.addControl(locationControl);

    // Geocode the address to get coordinates
    const geocodeAddress = async () => {
      try {
        // Construct the full address for geocoding
        const fullAddress = [address, city, state]
          .filter(Boolean)
          .join(', ');

        console.log('Geocoding address:', fullAddress);

        // Use structured query parameters for more precise results
        const queryParams = new URLSearchParams({
          access_token: mapboxgl.accessToken || '',
          country: 'US',
          types: 'address',
          limit: '1',
          language: 'en',
          ...(city && { place: city }),
          ...(state && { region: state }),
          bbox: '-112.5,40.0,-111.5,41.0' // Bounding box for Utah County area
        });

        // Use the full address in the query
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?${queryParams}`
        );
        const data = await response.json();

        console.log('Geocoding response:', data);

        if (data.features && data.features.length > 0) {
          // Find the most relevant result
          const relevantFeature = data.features.find((feature: MapboxFeature) => {
            const featureCity = feature.context?.find((ctx: MapboxContext) => ctx.id.includes('place'))?.text;
            const featureState = feature.context?.find((ctx: MapboxContext) => ctx.id.includes('region'))?.text;
            return featureCity?.toLowerCase() === city?.toLowerCase() && 
                   featureState?.toLowerCase() === state?.toLowerCase();
          }) || data.features[0];

          const [lng, lat] = relevantFeature.center;
          
          // Update map center and add marker
          if (map.current) {
            map.current.flyTo({
              center: [lng, lat],
              zoom: 15,
              duration: 2000
            });

            // Add neighborhood marker
            new mapboxgl.Marker()
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<h3 class="font-bold">${neighborhoodName}</h3><p>${fullAddress}</p>`))
              .addTo(map.current);

            // Add neighborhood boundaries
            map.current.on('load', () => {
              // Remove existing sources and layers if they exist
              if (map.current?.getSource('neighborhood')) {
                map.current.removeLayer('neighborhood-fill');
                map.current.removeSource('neighborhood');
              }

              // Add new source and layer for neighborhood circle
              map.current?.addSource('neighborhood', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                  },
                  properties: {}
                }
              });

              map.current?.addLayer({
                id: 'neighborhood-fill',
                type: 'circle',
                source: 'neighborhood',
                paint: {
                  'circle-radius': 1000,
                  'circle-color': '#0080ff',
                  'circle-opacity': 0.1,
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#0080ff',
                  'circle-stroke-opacity': 0.5
                }
              });

              // Add administrative boundaries layer
              if (map.current && !map.current.getSource('admin-boundaries')) {
                map.current.addSource('admin-boundaries', {
                  type: 'vector',
                  url: 'mapbox://mapbox.mapbox-streets-v8'
                });

                // Add neighborhood boundaries layer
                map.current.addLayer({
                  id: 'neighborhood-boundaries',
                  type: 'fill',
                  source: 'admin-boundaries',
                  'source-layer': 'admin',
                  paint: {
                    'fill-color': '#0080ff',
                    'fill-opacity': 0.1,
                    'fill-outline-color': '#0080ff'
                  },
                  filter: ['==', ['get', 'admin_level'], 8] // Neighborhood level
                });

                // Add neighborhood boundary lines
                map.current.addLayer({
                  id: 'neighborhood-boundaries-line',
                  type: 'line',
                  source: 'admin-boundaries',
                  'source-layer': 'admin',
                  paint: {
                    'line-color': '#0080ff',
                    'line-width': 2,
                    'line-opacity': 0.8
                  },
                  filter: ['==', ['get', 'admin_level'], 8] // Neighborhood level
                });

                // Add city boundaries
                map.current.addLayer({
                  id: 'city-boundaries',
                  type: 'fill',
                  source: 'admin-boundaries',
                  'source-layer': 'admin',
                  paint: {
                    'fill-color': '#00ff00',
                    'fill-opacity': 0.05,
                    'fill-outline-color': '#00ff00'
                  },
                  filter: ['==', ['get', 'admin_level'], 6] // City level
                });

                // Add city boundary lines
                map.current.addLayer({
                  id: 'city-boundaries-line',
                  type: 'line',
                  source: 'admin-boundaries',
                  'source-layer': 'admin',
                  paint: {
                    'line-color': '#00ff00',
                    'line-width': 2,
                    'line-opacity': 0.5
                  },
                  filter: ['==', ['get', 'admin_level'], 6] // City level
                });
              }

              // Get user's location
              getUserLocation();
            });
          }
        } else {
          console.error('No features found in geocoding response');
          setError('Could not find the specified location');
        }
      } catch (err) {
        console.error('Error geocoding address:', err);
        setError('Failed to load map data');
      }
    };

    geocodeAddress();

    // Cleanup
    return () => {
      if (map.current) {
        if (map.current.getLayer('neighborhood-fill')) {
          map.current.removeLayer('neighborhood-fill');
        }
        if (map.current.getSource('neighborhood')) {
          map.current.removeSource('neighborhood');
        }
        if (map.current.getLayer('neighborhood-boundaries')) {
          map.current.removeLayer('neighborhood-boundaries');
        }
        if (map.current.getLayer('neighborhood-boundaries-line')) {
          map.current.removeLayer('neighborhood-boundaries-line');
        }
        if (map.current.getLayer('city-boundaries')) {
          map.current.removeLayer('city-boundaries');
        }
        if (map.current.getLayer('city-boundaries-line')) {
          map.current.removeLayer('city-boundaries-line');
        }
        if (map.current.getSource('admin-boundaries')) {
          map.current.removeSource('admin-boundaries');
        }
        map.current.remove();
      }
    };
  }, [address, city, state, neighborhoodName]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
} 