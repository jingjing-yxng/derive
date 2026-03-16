"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Itinerary, Activity } from "@/types/trip";
import { stripMarkdown } from "@/lib/strip-markdown";
import { Loader2 } from "lucide-react";

// --- GCJ-02 / WGS-84 coordinate conversion for China ---

const PI = Math.PI;
const A = 6378245.0;
const EE = 0.00669342162296594323;

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

function wgs84ToGcj02(lat: number, lng: number): { lat: number; lng: number } {
  if (outOfChina(lat, lng)) return { lat, lng };
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  return { lat: lat + dLat, lng: lng + dLng };
}

// --- Brand-aligned day colors ---

const DAY_COLORS = [
  "#7B82C7", // lavender
  "#D07A84", // rose
  "#5DB888", // mint
  "#CFA12E", // amber
  "#5C9AC5", // sky
  "#A8A4D8", // lavender-light
  "#E0949D", // rose-light
  "#7EC4A0", // mint-light
  "#E4B840", // amber-light
  "#7BAED4", // sky-light
];

// Tile layers
const AMAP_TILE_URL = "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}";
const AMAP_SUBDOMAINS = ["1", "2", "3", "4"];
const CARTO_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

// --- Spatial clustering ---

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * PI / 180;
  const dLng = (lng2 - lng1) * PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * PI / 180) * Math.cos(lat2 * PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface ClusterMarker {
  lat: number;
  lng: number;
  activities: Array<{ activity: Activity; actIndex: number }>;
  dayIndex: number;
  dayTitle: string;
}

/** Group nearby activities within the same day into region-level clusters (~20km) */
function clusterDayActivities(
  items: Array<{ lat: number; lng: number; activity: Activity; actIndex: number }>,
  dayIndex: number,
  dayTitle: string,
  thresholdKm: number = 20,
): ClusterMarker[] {
  if (items.length === 0) return [];
  const used = new Set<number>();
  const clusters: ClusterMarker[] = [];

  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const members = [items[i]];

    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      if (members.some(m => haversineKm(m.lat, m.lng, items[j].lat, items[j].lng) < thresholdKm)) {
        used.add(j);
        members.push(items[j]);
      }
    }

    const lat = members.reduce((s, m) => s + m.lat, 0) / members.length;
    const lng = members.reduce((s, m) => s + m.lng, 0) / members.length;

    clusters.push({
      lat, lng,
      activities: members.map(m => ({ activity: m.activity, actIndex: m.actIndex })),
      dayIndex,
      dayTitle,
    });
  }

  return clusters;
}

// --- Marker icons ---

function createClusterIcon(dayIndex: number, count: number) {
  const color = DAY_COLORS[dayIndex % DAY_COLORS.length];

  if (count <= 1) {
    return L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 6px rgba(46,47,64,0.2)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -11],
      className: "",
    });
  }

  const size = count >= 5 ? 38 : 30;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(46,47,64,0.2);display:flex;align-items:center;justify-content:center;color:white;font-size:${count >= 5 ? 14 : 12}px;font-weight:700;font-family:'Nunito Sans',system-ui,sans-serif;letter-spacing:-0.3px">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
    className: "",
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 10);
    } else {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
    }
  }, [map, points]);
  return null;
}

function isMainlandChina(points: [number, number][]): boolean {
  if (points.length === 0) return false;
  const chinaCount = points.filter(([lat, lng]) => !outOfChina(lat, lng)).length;
  return chinaCount / points.length > 0.5;
}

interface ItineraryMapViewProps {
  itinerary: Itinerary;
  onActivityClick?: (dayIndex: number, actIndex: number, activity: Activity) => void;
  shareMode?: boolean;
}

export default function ItineraryMapView({ itinerary, onActivityClick, shareMode }: ItineraryMapViewProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const needsGeocode = itinerary.days.some((d) =>
    d.activities.some((a) => !a.lat && !a.lng && (a.location || a.title))
  );
  const [geocoding, setGeocoding] = useState(needsGeocode);
  const [geocodedItinerary, setGeocodedItinerary] = useState(itinerary);
  const geocodedRef = useRef(false);

  // Geocode activities that are missing coordinates
  useEffect(() => {
    if (geocodedRef.current) return;

    const skipCategories = new Set(["transport", "free-time"]);
    const activitiesToGeocode: { dayIdx: number; actIdx: number; location: string }[] = [];

    for (let di = 0; di < itinerary.days.length; di++) {
      for (let ai = 0; ai < itinerary.days[di].activities.length; ai++) {
        const act = itinerary.days[di].activities[ai];
        if (act.lat && act.lng) continue;
        if (skipCategories.has(act.category)) continue;
        const searchText = act.location || act.title;
        if (searchText) {
          activitiesToGeocode.push({ dayIdx: di, actIdx: ai, location: searchText });
        }
      }
    }

    if (activitiesToGeocode.length === 0) {
      setGeocoding(false);
      setGeocodedItinerary(itinerary);
      return;
    }

    geocodedRef.current = true;
    setGeocoding(true);

    const region = itinerary.title;

    fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: activitiesToGeocode.map((a) => a.location),
        region,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.results) return;
        const updated = {
          ...itinerary,
          days: itinerary.days.map((day) => ({
            ...day,
            activities: [...day.activities],
          })),
        };
        for (let i = 0; i < activitiesToGeocode.length; i++) {
          const { dayIdx, actIdx } = activitiesToGeocode[i];
          const coord = data.results[i];
          if (coord) {
            updated.days[dayIdx].activities[actIdx] = {
              ...updated.days[dayIdx].activities[actIdx],
              lat: coord.lat,
              lng: coord.lng,
            };
          }
        }
        setGeocodedItinerary(updated);
      })
      .catch(() => setGeocodedItinerary(itinerary))
      .finally(() => setGeocoding(false));
  }, [itinerary]);

  useEffect(() => {
    const hasCoords = itinerary.days.some((d) => d.activities.some((a) => a.lat && a.lng));
    if (hasCoords) setGeocodedItinerary(itinerary);
  }, [itinerary]);

  const rawPoints = useMemo(() => {
    const pts: [number, number][] = [];
    for (const day of geocodedItinerary.days) {
      for (const act of day.activities) {
        if (act.lat && act.lng) pts.push([act.lat, act.lng]);
      }
    }
    return pts;
  }, [geocodedItinerary]);

  const useAmap = useMemo(() => isMainlandChina(rawPoints), [rawPoints]);

  const { clusters, polylines, allPoints } = useMemo(() => {
    const allClusters: ClusterMarker[] = [];
    const polylines: Array<{ points: [number, number][]; color: string }> = [];
    const allPoints: [number, number][] = [];

    const days = selectedDay !== null
      ? [{ day: geocodedItinerary.days[selectedDay], index: selectedDay }]
      : geocodedItinerary.days.map((day, index) => ({ day, index }));

    for (const { day, index } of days) {
      if (!day) continue;
      const skipCategories = new Set(["transport", "free-time"]);

      const dayItems: Array<{ lat: number; lng: number; activity: Activity; actIndex: number }> = [];
      for (let ai = 0; ai < day.activities.length; ai++) {
        const act = day.activities[ai];
        if (!act.lat || !act.lng) continue;
        if (skipCategories.has(act.category)) continue;
        const display = useAmap ? wgs84ToGcj02(act.lat, act.lng) : { lat: act.lat, lng: act.lng };
        dayItems.push({ lat: display.lat, lng: display.lng, activity: act, actIndex: ai });
      }

      const dayClusters = clusterDayActivities(dayItems, index, day.title);
      allClusters.push(...dayClusters);

      const clusterPoints = dayClusters.map(c => [c.lat, c.lng] as [number, number]);
      allPoints.push(...clusterPoints);

      if (clusterPoints.length > 1) {
        polylines.push({
          points: clusterPoints,
          color: DAY_COLORS[index % DAY_COLORS.length],
        });
      }
    }

    return { clusters: allClusters, polylines, allPoints };
  }, [geocodedItinerary, selectedDay, useAmap]);

  if (geocoding) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-n-500">
        <Loader2 className="h-6 w-6 animate-spin text-lavender-400" />
        <p className="text-sm">Loading map coordinates...</p>
      </div>
    );
  }

  if (allPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-n-500">
        <p className="text-sm">No location data available for map view.</p>
        <p className="text-xs text-n-400">Generate a new itinerary to see it on the map.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Day filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedDay(null)}
          className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
            selectedDay === null
              ? "bg-lavender-400 text-white shadow-sm"
              : "bg-n-50 text-n-500 hover:bg-n-100"
          }`}
        >
          All days
        </button>
        {geocodedItinerary.days.map((day, i) => (
          <button
            key={i}
            onClick={() => setSelectedDay(selectedDay === i ? null : i)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
              selectedDay === i ? "text-white shadow-sm" : "bg-n-50 text-n-500 hover:bg-n-100"
            }`}
            style={selectedDay === i ? { backgroundColor: DAY_COLORS[i % DAY_COLORS.length] } : undefined}
          >
            Day {day.day}
          </button>
        ))}
      </div>

      {/* Map — CSS filter tints tiles to match brand palette */}
      <div
        className="overflow-hidden rounded-[20px] border border-n-200 shadow-sm"
        style={{ height: shareMode ? "min(600px, 60vh)" : "calc(100vh - 320px)", minHeight: 350 }}
      >
        <MapContainer
          center={allPoints[0] || [0, 0]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          className="derive-map"
        >
          {useAmap ? (
            <TileLayer
              attribution='&copy; <a href="https://amap.com">高德地图</a>'
              url={AMAP_TILE_URL}
              subdomains={AMAP_SUBDOMAINS}
              className="derive-tiles"
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url={CARTO_TILE_URL}
              className="derive-tiles"
            />
          )}
          <FitBounds points={allPoints} />

          {polylines.map((pl, i) => (
            <Polyline
              key={`route-${i}`}
              positions={pl.points}
              pathOptions={{
                color: pl.color,
                weight: 2,
                opacity: 0.35,
                dashArray: "6, 10",
                lineCap: "round",
              }}
            />
          ))}

          {clusters.map((c, i) => {
            const color = DAY_COLORS[c.dayIndex % DAY_COLORS.length];
            const count = c.activities.length;
            return (
              <Marker
                key={`cluster-${c.dayIndex}-${i}`}
                position={[c.lat, c.lng]}
                icon={createClusterIcon(c.dayIndex, count)}
                eventHandlers={{
                  click: () => {
                    if (count === 1) {
                      onActivityClick?.(c.dayIndex, c.activities[0].actIndex, c.activities[0].activity);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="min-w-[200px] max-w-[280px]">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color }}
                    >
                      Day {c.dayIndex + 1} &middot; {c.dayTitle}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {c.activities.map(({ activity }) => (
                        <div key={activity.id} className="flex items-start gap-2">
                          {activity.time && (
                            <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">
                              {activity.time}
                            </span>
                          )}
                          <span className="text-[12px] font-medium text-gray-800 leading-snug">
                            {stripMarkdown(activity.title)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {count > 1 && (
                      <div className="mt-2 text-[10px] text-gray-400">
                        {count} activities in this area
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-n-400">
        {useAmap && <span>高德地图</span>}
        {geocodedItinerary.days.map((day, i) => {
          const dayClusters = clusters.filter(c => c.dayIndex === i);
          if (dayClusters.length === 0) return null;
          const totalActivities = dayClusters.reduce((s, c) => s + c.activities.length, 0);
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }}
              />
              <span>
                Day {day.day}{dayClusters.length === 1 ? "" : ` \u00b7 ${dayClusters.length} stops`}
                {totalActivities > dayClusters.length && ` (${totalActivities} activities)`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
