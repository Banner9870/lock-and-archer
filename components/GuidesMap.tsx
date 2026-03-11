"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CHICAGO_CENTER: [number, number] = [41.8781, -87.6298];
const DEFAULT_ZOOM = 11;

// Fix default marker icons in Next/React (leaflet uses file paths that break with bundlers)
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type GuideItemWithGeo = {
  uri: string;
  guideUri: string;
  type: string;
  title: string;
  description: string;
  sourceLabel: string;
  latitude: number;
  longitude: number;
  neighborhoodId: string | null;
};

function MapBounds({ items }: { items: GuideItemWithGeo[] }) {
  const map = useMap();
  useEffect(() => {
    if (items.length === 0) return;
    if (items.length === 1) {
      map.setView([items[0].latitude, items[0].longitude], DEFAULT_ZOOM);
      return;
    }
    const bounds = L.latLngBounds(
      items.map((i) => [i.latitude, i.longitude] as [number, number])
    );
    map.fitBounds(bounds.pad(0.15));
  }, [map, items]);
  return null;
}

export function GuidesMap({ items, height = 500 }: { items: GuideItemWithGeo[]; height?: number }) {
  return (
    <MapContainer
      center={CHICAGO_CENTER}
      zoom={DEFAULT_ZOOM}
      className="w-full"
      style={{ height: `${height}px` }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBounds items={items} />
      {items.map((item) => (
        <Marker
          key={item.uri}
          position={[item.latitude, item.longitude]}
          icon={icon}
        >
          <Popup>
            <div className="min-w-[180px]" style={{ color: "var(--text-headline)" }}>
              <p className="font-medium" style={{ color: "var(--text-headline)" }}>{item.title}</p>
              <p className="text-xs uppercase mt-0.5" style={{ color: "var(--text-secondary)" }}>{item.type}</p>
              {item.sourceLabel && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{item.sourceLabel}</p>
              )}
              {item.neighborhoodId && (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.neighborhoodId}</p>
              )}
              {item.description && (
                <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{item.description}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
