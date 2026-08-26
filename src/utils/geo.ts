/**
 * Geolocation utility for INSPEÇÃO PRONTO!
 */

import { GPSLocation } from '../types/inspection';

export interface GeoLocationResult {
  success: boolean;
  location?: GPSLocation;
  error?: string;
  errorType?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}

export async function captureCurrentLocation(): Promise<GeoLocationResult> {
  if (!navigator.geolocation) {
    return {
      success: false,
      error: 'Geolocalização não é suportada pelo seu navegador/dispositivo.',
      errorType: 'UNKNOWN',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = new Date();
        const dataCaptura = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        // Attempt reverse geocode
        let endereco = 'Endereço não disponível no modo offline';
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              endereco = data.display_name;
            }
          }
        } catch {
          // If offline or network block, provide fallback coordinate description
          endereco = `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }

        resolve({
          success: true,
          location: {
            latitude,
            longitude,
            precisao: Math.round(accuracy),
            dataCaptura,
            endereco,
          },
        });
      },
      (error) => {
        let message = 'Não foi possível obter a localização.';
        let errorType: GeoLocationResult['errorType'] = 'UNKNOWN';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permissão de localização negada pelo usuário ou navegador.';
            errorType = 'PERMISSION_DENIED';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Sinal GPS indisponível no local (ex: subsolo ou área fechada).';
            errorType = 'POSITION_UNAVAILABLE';
            break;
          case error.TIMEOUT:
            message = 'Tempo limite esgotado ao tentar capturar sinal de GPS.';
            errorType = 'TIMEOUT';
            break;
        }

        resolve({
          success: false,
          error: message,
          errorType,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  });
}

export function getMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function getOsmEmbedUrl(latitude: number, longitude: number): string {
  const delta = 0.003;
  const bbox = `${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}
