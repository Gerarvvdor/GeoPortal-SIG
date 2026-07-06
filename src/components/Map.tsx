/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet.heat";
import { MedicalCenter, UserLocation, LayerControls } from "../types";
import {
  calculateDistance,
  findNearestCenter,
  getCenterColor,
  getCenterIconSVG,
  getUserLocationIconSVG,
  formatDistance,
  formatDuration,
} from "../utils/mapUtils";
import { useEmergencyData } from "../hooks/useEmergencyData";
import { usePopulationData } from "../hooks/usePopulationData";
import {
  getRiskZoneColor,
  getIncidentIcon,
  getSeverityColor,
  formatEmergencyRate,
  formatResponseTime,
  calculateZoneMetrics,
  getZoneSpecificPolygon,
} from "../utils/emergencyUtilsDB";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjMzMzIi8+Cjwvc3ZnPgo=",
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjMzMzIi8+Cjwvc3ZnPgo=",
  shadowUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDEiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCA0MSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGVsbGlwc2UgY3g9IjIwLjUiIGN5PSIzNy41IiByeD0iMTguNSIgcnk9IjMuNSIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPC9zdmc+Cg==",
});

interface MapProps {
  medicalCenters: MedicalCenter[];
  userLocation: UserLocation | null;
  layers: LayerControls;
  selectedCenter?: MedicalCenter | null;
}

const covidHeatmapPoints: [number, number, number][] = [
  // San Salvador (zona de mayor concentración)
  [13.6989, -89.1914, 1.0],
  [13.7100, -89.2050, 0.9],
  [13.6850, -89.1800, 0.85],
  [13.7200, -89.1750, 0.8],
  [13.6900, -89.2100, 0.75],
  [13.7050, -89.1650, 0.7],
  [13.6780, -89.2200, 0.65],
  [13.7150, -89.2300, 0.6],
  [13.6600, -89.1900, 0.55],
  [13.7300, -89.1600, 0.5],
  [13.6700, -89.1500, 0.6],
  [13.7400, -89.2100, 0.45],
  [13.6500, -89.2000, 0.4],
  [13.7250, -89.1400, 0.5],
  [13.6950, -89.2400, 0.35],
  // Soyapango / Ilopango
  [13.7100, -89.1500, 0.8],
  [13.7200, -89.1300, 0.7],
  [13.7000, -89.1200, 0.65],
  [13.7150, -89.1100, 0.55],
  // Santa Tecla / Antiguo Cuscatlán
  [13.6770, -89.2900, 0.7],
  [13.6600, -89.2500, 0.65],
  [13.6700, -89.2700, 0.6],
  [13.6500, -89.2600, 0.5],
  // Mejicanos / Ciudad Delgado
  [13.7400, -89.1800, 0.6],
  [13.7350, -89.1900, 0.55],
  [13.7500, -89.1700, 0.5],
  // Santa Ana
  [13.9944, -89.5594, 0.7],
  [14.0050, -89.5500, 0.6],
  [13.9850, -89.5700, 0.55],
  [14.0100, -89.5400, 0.5],
  [13.9800, -89.5800, 0.45],
  [14.0200, -89.5600, 0.4],
  [13.9700, -89.5500, 0.35],
  [14.0000, -89.5300, 0.4],
  // La Libertad
  [13.4881, -89.3187, 0.8],
  [13.4950, -89.3100, 0.7],
  [13.4800, -89.3300, 0.65],
  [13.5000, -89.3000, 0.55],
  [13.4700, -89.3200, 0.5],
  [13.5100, -89.2900, 0.45],
  [13.4600, -89.3400, 0.4],
  // San Miguel
  [13.4833, -88.1833, 0.65],
  [13.4900, -88.1700, 0.55],
  [13.4750, -88.1950, 0.5],
  [13.5000, -88.1600, 0.45],
  [13.4700, -88.2000, 0.4],
  [13.4850, -88.1500, 0.35],
  [13.4600, -88.1800, 0.3],
  // Sonsonate
  [13.7180, -89.7240, 0.55],
  [13.7250, -89.7150, 0.45],
  [13.7100, -89.7350, 0.4],
  [13.7300, -89.7050, 0.35],
  [13.7050, -89.7400, 0.3],
  // Usulután
  [13.3500, -88.4500, 0.45],
  [13.3600, -88.4400, 0.4],
  [13.3400, -88.4600, 0.35],
  [13.3700, -88.4300, 0.3],
  // San Vicente
  [13.6417, -88.7850, 0.4],
  [13.6500, -88.7750, 0.35],
  [13.6350, -88.7950, 0.3],
  // Chalatenango
  [14.0333, -88.9333, 0.35],
  [14.0400, -88.9250, 0.3],
  [14.0250, -88.9400, 0.25],
  // La Paz (Zacatecoluca)
  [13.5000, -88.8667, 0.4],
  [13.5100, -88.8600, 0.35],
  [13.4900, -88.8750, 0.3],
  // Ahuachapán
  [13.9214, -89.8453, 0.35],
  [13.9300, -89.8400, 0.3],
  [13.9100, -89.8500, 0.25],
  // Cojutepeque (Cuscatlán)
  [13.7167, -88.9333, 0.4],
  [13.7250, -88.9250, 0.35],
  [13.7100, -88.9400, 0.3],
  // La Unión
  [13.3333, -87.8440, 0.3],
  [13.3400, -87.8350, 0.25],
  [13.3250, -87.8500, 0.2],
  // Morazán (San Francisco Gotera)
  [13.6958, -88.1044, 0.25],
  [13.7000, -88.0950, 0.2],
  // Apopa
  [13.8072, -89.1794, 0.55],
  [13.8150, -89.1700, 0.45],
  [13.8000, -89.1900, 0.4],
  // Colón / Lourdes
  [13.7167, -89.3667, 0.45],
  [13.7250, -89.3600, 0.4],
  // San Martín
  [13.7167, -89.0500, 0.4],
  [13.7250, -89.0400, 0.35],
  // Tonacatepeque
  [13.7778, -89.1167, 0.35],
  [13.7850, -89.1100, 0.3],
  // Puerto de La Libertad
  [13.4833, -89.3167, 0.5],
  [13.4750, -89.3250, 0.45],
  // Zaragoza
  [13.5833, -89.2833, 0.35],
  // Quezaltepeque
  [13.8314, -89.2722, 0.4],
  [13.8400, -89.2650, 0.35],
  // Metapán
  [14.3333, -89.4500, 0.25],
  // Sensuntepeque (Cabañas)
  [13.8667, -88.6333, 0.25],
  [13.8750, -88.6250, 0.2],
];

export const Map: React.FC<MapProps> = ({
  medicalCenters,
  userLocation,
  layers,
  selectedCenter,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const coverageCirclesRef = useRef<L.Circle[]>([]);
  const riskZonePolygonsRef = useRef<L.Polygon[]>([]);
  const populationZoneCirclesRef = useRef<L.Circle[]>([]);
  const covidHeatmapLayerRef = useRef<any>(null);
  const incidentMarkersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routingControlRef = useRef<any>(null);

  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);

  const {
    emergencyZones,
    emergencyIncidents,
    loading: emergencyLoading,
  } = useEmergencyData();

  const { populationZones, loading: populationLoading } = usePopulationData();

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([13.7942, -88.8965], 8);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  const createRouteToCenter = (center: MedicalCenter) => {
    if (!mapInstanceRef.current || !userLocation) return;

    const LRouting = (L as any).Routing;

    if (!LRouting) {
      console.error("leaflet-routing-machine no está cargado");
      return;
    }

    if (routingControlRef.current) {
      mapInstanceRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    const control = LRouting.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(center.lat, center.lng),
      ],
      router: LRouting.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
      lineOptions: {
        styles: [{ color: "#3B82F6", weight: 5, opacity: 0.85 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      routeWhileDragging: false,
      show: false,
      createMarker: () => null,
    });

    control.on("routesfound", (e: any) => {
      const route = e.routes && e.routes[0];

      if (route && route.summary) {
        setRouteInfo({
          distance: route.summary.totalDistance / 1000,
          duration: route.summary.totalTime / 60,
        });
      }
    });

    control.on("routingerror", () => {
      const d = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        center.lat,
        center.lng
      );

      setRouteInfo({
        distance: d,
        duration: (d / 40) * 60,
      });
    });

    control.addTo(mapInstanceRef.current);
    routingControlRef.current = control;
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    medicalCenters.forEach((center) => {
      const color = getCenterColor(center.type);
      const iconSVG = getCenterIconSVG(center.type);
      const isSelected = selectedCenter?.id === center.id;

      const customIcon = L.divIcon({
        html: `
          <div style="
            background-color: ${color}; 
            width: ${isSelected ? "48px" : "40px"}; 
            height: ${isSelected ? "48px" : "40px"}; 
            border-radius: 50%; 
            border: ${isSelected ? "4px" : "3px"} solid white; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
            transform: ${isSelected ? "scale(1.1)" : "scale(1)"};
          " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='${
            isSelected ? "scale(1.1)" : "scale(1)"
          }'">
            ${iconSVG}
          </div>
        `,
        className: "",
        iconSize: [isSelected ? 48 : 40, isSelected ? 48 : 40],
        iconAnchor: [isSelected ? 24 : 20, isSelected ? 24 : 20],
      });

      const marker = L.marker([center.lat, center.lng], { icon: customIcon });

      const distance = userLocation
        ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            center.lat,
            center.lng
          )
        : 0;

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`;

      const popupContent = `
        <div class="p-2 text-sm" style="min-width: min(280px, calc(100vw - 80px));">
          <div class="flex items-center justify-between mb-1">
            <h3 class="font-bold text-base text-gray-900">${center.name}</h3>
            <span class="px-2 py-0.5 text-xs font-medium rounded-full" style="background-color: ${color}20; color: ${color}">
              ${
                center.type === "hospital"
                  ? "Hospital"
                  : center.type === "clinic"
                  ? "Clínica"
                  : "Centro de Salud"
              }
            </span>
          </div>

          <div class="space-y-1 mb-2">
            <p class="flex items-center text-gray-600">
              <span class="mr-2">📍</span> ${center.address}
            </p>

            <p class="flex items-center text-gray-600">
              <span class="mr-2">📞</span> ${center.phone}
            </p>

            <p class="flex items-center text-gray-600">
              <span class="mr-2">⏰</span> ${center.schedule}
            </p>

            ${
              userLocation
                ? `
              <p class="flex items-center font-medium text-blue-600">
                <span class="mr-2">📏</span> ${formatDistance(distance)}
              </p>
            `
                : ""
            }
          </div>

          <div class="mb-2">
            <p class="font-medium mb-1 text-gray-900">Servicios:</p>

            <div class="flex flex-wrap gap-1">
              ${center.services
                .map(
                  (service) => `
                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      ${service}
                    </span>
                  `
                )
                .join("")}
            </div>
          </div>                                                   

          <!-- Botón de cómo llegar Google Maps -->
          <a
            href="${googleMapsUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-200 no-underline"
          >
            <span class="text-white">Cómo llegar</span>
          </a>

          ${
            userLocation
              ? `
            <button 
              onclick="window.createRoute('${center.id}')" 
              class="mt-2 w-full bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center"
            >
              <span class="mr-2">🗺️</span> Crear ruta en el mapa
            </button>
          `
              : ""
          }
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: "custom-popup",
      });

      marker.on("click", () => {
        if (userLocation) {
          createRouteToCenter(center);
        }
      });

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    (window as any).createRoute = (centerId: string) => {
      const center = medicalCenters.find((c) => c.id === centerId);

      if (center && userLocation) {
        createRouteToCenter(center);
      }
    };
  }, [medicalCenters, userLocation, selectedCenter]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    coverageCirclesRef.current.forEach((circle) => circle.remove());
    coverageCirclesRef.current = [];

    if (layers.coverage) {
      medicalCenters.forEach((center) => {
        const color = getCenterColor(center.type);

        const circle = L.circle([center.lat, center.lng], {
          radius: 1000,
          fillColor: color,
          fillOpacity: 0.15,
          color: color,
          weight: 2,
          opacity: 0.5,
        });

        circle.addTo(mapInstanceRef.current!);
        coverageCirclesRef.current.push(circle);
      });
    }
  }, [layers.coverage, medicalCenters]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing heatmap layer
    if (covidHeatmapLayerRef.current) {
      mapInstanceRef.current.removeLayer(covidHeatmapLayerRef.current);
      covidHeatmapLayerRef.current = null;
    }

    if (layers.covidHeatmap) {
      const heat = (L as any).heatLayer(covidHeatmapPoints, {
        radius: 30,
        blur: 25,
        maxZoom: 12,
        max: 1.0,
        minOpacity: 0.35,
        gradient: {
          0.0: '#0000FF',
          0.2: '#00BFFF',
          0.4: '#00FF00',
          0.6: '#FFFF00',
          0.8: '#FFA500',
          1.0: '#FF0000',
        },
      });

      heat.addTo(mapInstanceRef.current);
      covidHeatmapLayerRef.current = heat;
    }
  }, [layers.covidHeatmap]);

  useEffect(() => {
    if (!mapInstanceRef.current || emergencyLoading) return;

    riskZonePolygonsRef.current.forEach((polygon) => polygon.remove());
    riskZonePolygonsRef.current = [];

    if (layers.riskZones && emergencyZones.length > 0) {
      console.log(
        "🔄 Rendering emergency zone polygons from database:",
        emergencyZones.length
      );

      emergencyZones.forEach((zone) => {
        const color = getRiskZoneColor(zone.risk_level);
        const metrics = calculateZoneMetrics(zone, emergencyIncidents);
        const polygonCoords = getZoneSpecificPolygon(zone);

        const polygon = L.polygon(polygonCoords, {
          fillColor: color,
          fillOpacity: 0.25,
          color: color,
          weight: 3,
          opacity: 0.8,
          dashArray: zone.risk_level === "critical" ? "10, 5" : undefined,
        });

        const popupContent = `
          <div class="p-4 min-w-[320px]">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-lg text-gray-900">${zone.name}</h3>
              <span class="px-3 py-1 text-xs font-bold rounded-full text-white" style="background-color: ${color}">
                ${zone.risk_level.toUpperCase()}
              </span>
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="bg-red-50 p-3 rounded-lg">
                <p class="text-xs text-red-600 font-medium">Tasa de Emergencias</p>
                <p class="text-lg font-bold text-red-800">${formatEmergencyRate(
                  zone.emergency_rate
                )}</p>
              </div>

              <div class="bg-blue-50 p-3 rounded-lg">
                <p class="text-xs text-blue-600 font-medium">Tiempo Respuesta</p>
                <p class="text-lg font-bold text-blue-800">${formatResponseTime(
                  zone.average_response_time
                )}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="bg-orange-50 p-3 rounded-lg">
                <p class="text-xs text-orange-600 font-medium">Incidentes Activos</p>
                <p class="text-lg font-bold text-orange-800">${
                  metrics.activeIncidents
                }</p>
              </div>

              <div class="bg-green-50 p-3 rounded-lg">
                <p class="text-xs text-green-600 font-medium">Resueltos</p>
                <p class="text-lg font-bold text-green-800">${
                  metrics.resolvedIncidents
                }</p>
              </div>
            </div>

            <div class="space-y-2 text-sm text-gray-600 mb-3">
              <p><span class="font-medium">👥 Población:</span> ${zone.population.toLocaleString()} habitantes</p>
              <p><span class="font-medium">📍 Municipio:</span> ${
                zone.municipality
              }, ${zone.department}</p>
              <p><span class="font-medium">🗺️ Tipo:</span> Polígono irregular</p>
              <p><span class="font-medium">🏥 Hospitales cercanos:</span> ${
                zone.nearest_hospitals.length
              }</p>
            </div>

            <div class="mt-3 pt-3 border-t border-gray-200">
              <p class="text-xs text-gray-500">
                🕒 Última actualización: ${new Date(
                  zone.updated_at
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
        `;

        polygon.bindPopup(popupContent, {
          maxWidth: 380,
          className: "emergency-zone-popup",
        });

        polygon.addTo(mapInstanceRef.current!);
        riskZonePolygonsRef.current.push(polygon);
      });
    }
  }, [layers.riskZones, emergencyZones, emergencyIncidents, emergencyLoading]);

  useEffect(() => {
    if (!mapInstanceRef.current || populationLoading) return;

    populationZoneCirclesRef.current.forEach((circle) => circle.remove());
    populationZoneCirclesRef.current = [];

    if (layers.populationDensity && populationZones.length > 0) {
      console.log(
        "🔄 Rendering population zones from database:",
        populationZones.length
      );

      populationZones.forEach((zone) => {
        const getDensityColor = (level: string) => {
          switch (level) {
            case "very_high":
              return "#7C2D12";
            case "high":
              return "#EF4444";
            case "medium":
              return "#F59E0B";
            case "low":
              return "#10B981";
            case "very_low":
              return "#3B82F6";
            default:
              return "#6B7280";
          }
        };

        const color = getDensityColor(zone.density_level);

        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radius,
          fillColor: color,
          fillOpacity: 0.2,
          color: color,
          weight: 2,
          opacity: 0.7,
          dashArray: zone.density_level === "very_high" ? "8, 4" : undefined,
        });

        const popupContent = `
          <div class="p-2 min-w-[280px] text-sm">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-bold text-base text-gray-900">${zone.name}</h3>
              <span class="px-2 py-0.5 text-xs font-bold rounded-full text-white" style="background-color: ${color}">
                ${zone.density_level.replace("_", " ").toUpperCase()}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-2">
              <div class="bg-purple-50 p-2 rounded-lg">
                <p class="text-xs text-purple-600 font-medium">Población</p>
                <p class="font-bold text-purple-800">${zone.population.toLocaleString()}</p>
              </div>

              <div class="bg-indigo-50 p-2 rounded-lg">
                <p class="text-xs text-indigo-600 font-medium">Densidad</p>
                <p class="font-bold text-indigo-800">${zone.population_density.toFixed(
                  1
                )} hab/km²</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-2">
              <div class="bg-green-50 p-2 rounded-lg">
                <p class="text-xs text-green-600 font-medium">Urbano</p>
                <p class="font-bold text-green-800">${
                  zone.urban_percentage
                }%</p>
              </div>

              <div class="bg-yellow-50 p-2 rounded-lg">
                <p class="text-xs text-yellow-600 font-medium">Rural</p>
                <p class="font-bold text-yellow-800">${
                  zone.rural_percentage
                }%</p>
              </div>
            </div>

            <div class="mb-2">
              <p class="text-xs font-medium mb-1">Ubicación: ${
                zone.municipality
              }, ${zone.department}</p>
              <p class="text-xs font-medium mb-1">Área: ${
                zone.area_km2
              } km²</p>
              <p class="text-xs font-medium mb-1">Crecimiento: ${
                zone.growth_rate
              }%</p>
              <p class="text-xs font-medium mb-1">Infraestructura: ${
                zone.infrastructure_level === "advanced"
                  ? "Avanzada"
                  : zone.infrastructure_level === "intermediate"
                  ? "Intermedia"
                  : "Básica"
              }</p>
            </div>

            <div class="mb-2">
              <p class="text-xs font-medium mb-1">Distribución por Edad:</p>

              <div class="flex gap-1 text-xs">
                <div class="bg-blue-50 p-1 rounded text-center flex-1">
                  <p class="font-medium text-blue-800">${zone.age_groups.children.toLocaleString()}</p>
                  <p class="text-blue-600">0-14</p>
                </div>

                <div class="bg-green-50 p-1 rounded text-center flex-1">
                  <p class="font-medium text-green-800">${zone.age_groups.adults.toLocaleString()}</p>
                  <p class="text-green-600">15-64</p>
                </div>

                <div class="bg-orange-50 p-1 rounded text-center flex-1">
                  <p class="font-medium text-orange-800">${zone.age_groups.elderly.toLocaleString()}</p>
                  <p class="text-orange-600">65+</p>
                </div>
              </div>
            </div>

            <div class="mb-2">
              <p class="text-xs font-medium mb-1">Actividades Económicas:</p>

              <div class="flex flex-wrap gap-1 text-xs">
                ${zone.economic_activity
                  .map(
                    (act) =>
                      `<span class="bg-purple-100 text-purple-800 px-1 py-0.5 rounded-full">${act}</span>`
                  )
                  .join("")}
              </div>
            </div>

            <div class="border-t border-gray-200 pt-2 text-gray-500 text-xxs">
              Última actualización: ${new Date(
                zone.updated_at
              ).toLocaleDateString()}
            </div>
          </div>
        `;

        circle.bindPopup(popupContent, {
          maxWidth: 400,
          className: "population-zone-popup",
        });

        circle.addTo(mapInstanceRef.current!);
        populationZoneCirclesRef.current.push(circle);
      });
    }
  }, [layers.populationDensity, populationZones, populationLoading]);

  useEffect(() => {
    if (!mapInstanceRef.current || emergencyLoading) return;

    incidentMarkersRef.current.forEach((marker) => marker.remove());
    incidentMarkersRef.current = [];

    if (layers.riskZones && emergencyIncidents.length > 0) {
      console.log(
        "🔄 Rendering emergency incidents from database:",
        emergencyIncidents.length
      );

      emergencyIncidents.forEach((incident) => {
        const color = getSeverityColor(incident.severity);
        const icon = getIncidentIcon(incident.incident_type);

        const incidentIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${color}; 
              width: 32px; 
              height: 32px; 
              border-radius: 50%; 
              border: 3px solid white; 
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              cursor: pointer;
              animation: ${!incident.resolved ? "pulse 2s infinite" : "none"};
            ">
              ${icon}
            </div>
          `,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([incident.lat, incident.lng], {
          icon: incidentIcon,
        });

        const popupContent = `
          <div class="p-3 min-w-[280px]">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-bold text-gray-900">Incidente ${
                incident.incident_type
              }</h4>
              <span class="px-2 py-1 text-xs font-bold rounded-full text-white" style="background-color: ${color}">
                ${incident.severity.toUpperCase()}
              </span>
            </div>
            
            <div class="space-y-2 text-sm text-gray-600 mb-3">
              <p><span class="font-medium">🕒 Reportado:</span> ${new Date(
                incident.reported_at
              ).toLocaleString()}</p>

              <p><span class="font-medium">📍 Ubicación:</span> ${incident.lat.toFixed(
                4
              )}, ${incident.lng.toFixed(4)}</p>

              ${
                incident.response_time
                  ? `
                <p><span class="font-medium">⏱️ Tiempo respuesta:</span> ${incident.response_time} min</p>
              `
                  : ""
              }

              ${
                incident.description
                  ? `
                <p><span class="font-medium">📝 Descripción:</span> ${incident.description}</p>
              `
                  : ""
              }

              <p><span class="font-medium">📊 Estado:</span> 
                <span class="${
                  incident.resolved ? "text-green-600" : "text-red-600"
                } font-medium">
                  ${incident.resolved ? "✅ Resuelto" : "🚨 En curso"}
                </span>
              </p>

              ${
                incident.resolved_at
                  ? `
                <p><span class="font-medium">✅ Resuelto:</span> ${new Date(
                  incident.resolved_at
                ).toLocaleString()}</p>
              `
                  : ""
              }
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 320,
          className: "incident-popup",
        });

        marker.addTo(mapInstanceRef.current!);
        incidentMarkersRef.current.push(marker);
      });
    }
  }, [layers.riskZones, emergencyIncidents, emergencyLoading]);

  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userIcon = L.divIcon({
      html: `
        <div style="position: relative;">
          <div style="
            background-color: #3B82F6; 
            width: 20px; 
            height: 20px; 
            border-radius: 50%; 
            border: 4px solid white; 
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            position: relative;
            z-index: 2;
          ">
            ${getUserLocationIconSVG()}
          </div>

          <div style="
            position: absolute; 
            top: -6px; 
            left: -6px; 
            width: 32px; 
            height: 32px; 
            border: 3px solid #3B82F6; 
            border-radius: 50%; 
            animation: pulse 2s infinite;
            opacity: 0.6;
          "></div>
        </div>
      `,
      className: "",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
    });

    userMarker.bindPopup(`
      <div class="p-3 text-center">
        <div class="flex items-center justify-center mb-2">
          <div class="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
          <span class="font-medium text-gray-900">Tu ubicación actual</span>
        </div>

        <p class="text-sm text-gray-600">
          Lat: ${userLocation.lat.toFixed(6)}<br>
          Lng: ${userLocation.lng.toFixed(6)}
        </p>

        <p class="text-xs text-gray-500 mt-2">
          Precisión: ±${Math.round(userLocation.accuracy)}m
        </p>
      </div>
    `);

    userMarker.addTo(mapInstanceRef.current);
    userMarkerRef.current = userMarker;

    if (!selectedCenter) {
      const nearest = findNearestCenter(userLocation, medicalCenters);

      if (nearest) {
        createRouteToCenter(nearest);
      }
    }
  }, [userLocation, medicalCenters, selectedCenter]);

  useEffect(() => {
    if (selectedCenter && userLocation) {
      createRouteToCenter(selectedCenter);
    }
  }, [selectedCenter, userLocation]);

  useEffect(() => {
    if (selectedCenter && mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [selectedCenter.lat, selectedCenter.lng],
        12
      );
    }
  }, [selectedCenter]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mapRef} className="h-full w-full" />

      {routeInfo && selectedCenter && userLocation && (
        <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 max-w-[calc(100%-32px)] sm:max-w-sm z-[1000] pointer-events-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Ruta Activa</h3>

            <button
              onClick={() => {
                setRouteInfo(null);

                if (routingControlRef.current && mapInstanceRef.current) {
                  mapInstanceRef.current.removeControl(
                    routingControlRef.current
                  );
                  routingControlRef.current = null;
                }
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 font-medium">
                  Destino:
                </span>
              </div>

              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedCenter.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-600">
                  {formatDistance(routeInfo.distance)}
                </div>

                <div className="text-xs text-blue-600 font-medium">
                  Distancia
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-600">
                  {formatDuration(routeInfo.duration)}
                </div>

                <div className="text-xs text-green-600 font-medium">
                  Tiempo est.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
              <span>Ruta estimada por carretera</span>
            </div>
          </div>
        </div>
      )}

      {emergencyLoading && layers.riskZones && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-[1000]">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-700">
              Cargando polígonos de emergencia...
            </span>
          </div>
        </div>
      )}

      {populationLoading && layers.populationDensity && (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-[1000]">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-700">
              Cargando densidad poblacional...
            </span>
          </div>
        </div>
      )}

      {layers.covidHeatmap && (
        <div className="absolute bottom-16 sm:bottom-4 right-4 bg-white rounded-xl shadow-lg border border-red-100 p-3 sm:p-4 z-[1000] max-w-[calc(100%-32px)] sm:max-w-xs">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <p className="text-sm font-semibold text-gray-900">Mapa de calor COVID-19</p>
          </div>
          <div className="mb-2">
            <div
              style={{
                height: '14px',
                borderRadius: '7px',
                background: 'linear-gradient(to right, #0000FF, #00BFFF, #00FF00, #FFFF00, #FFA500, #FF0000)',
                border: '1px solid #e5e7eb',
              }}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Bajo</span>
              <span>Medio</span>
              <span>Alto</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Densidad de casos reportados</p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }

          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        
        .custom-popup .leaflet-popup-tip {
          background: white;
        }

        .custom-popup .leaflet-popup-content a {
          text-decoration: none;
        }

        .emergency-zone-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(239, 68, 68, 0.2);
          border: 2px solid #FEE2E2;
        }

        .population-zone-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(147, 51, 234, 0.2);
          border: 2px solid #F3E8FF;
        }

        .incident-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          border: 2px solid #FEF3C7;
        }

        .covid-heatmap-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(220, 38, 38, 0.2);
          border: 2px solid #FEE2E2;
        }

        .leaflet-control-container {
          pointer-events: none;
        }
        
        .leaflet-control {
          pointer-events: auto;
        }

        .leaflet-container {
          background: #f8fafc;
        }

        .leaflet-routing-container {
          display: none !important;
        }
      `}</style>
    </div>
  );
};