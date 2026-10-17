"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Mosque } from "@/lib/overpass";

export type MapProps = {
  center: { lat: number; lng: number };
  user: { lat: number; lng: number } | null;
  mosques: Mosque[];
  selectedId: string | null;
  labels: Record<string, string>; // mosque id → "Dhuhr 1:15 PM"
  onSelect: (id: string) => void;
};

function pinSvg(selected: boolean) {
  const fill = selected ? "#C9A44C" : "#0B3D33";
  const ink = selected ? "#0B3D33" : "#F4F1EA";
  const r = selected ? 18 : 15;
  return `<svg width="48" height="56" viewBox="-24 -28 48 56" aria-hidden="true">
<path d="M-8 ${r - 5} 0 ${r + 6} 8 ${r - 5}z" fill="${fill}"/>
<circle r="${r}" fill="${fill}" stroke="#FFFFFF" stroke-width="3"/>
<path d="M-6 4h12M-5 4v-4M5 4v-4M-5 0c0-4 5-6 5-6s5 2 5 6" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>
</svg>`;
}

const pinIcon = (selected: boolean) =>
  L.divIcon({ className: "ug-pin", html: pinSvg(selected), iconSize: [48, 56], iconAnchor: [24, 52], tooltipAnchor: [20, -20] });

const userIcon = L.divIcon({
  className: "ug-pin",
  html: `<div style="position:relative;width:40px;height:40px">
<div class="ug-pulse" style="position:absolute;inset:0;border-radius:50%;background:#2E6BE6"></div>
<div style="position:absolute;left:12px;top:12px;width:16px;height:16px;border-radius:50%;background:#2E6BE6;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>
</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export default function MasjidMap({ center, user, mosques, selectedId, labels, onSelect }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const userMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    m.attributionControl.setPosition("topright");
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the search location changes.
  useEffect(() => {
    map.current?.setView([center.lat, center.lng], 13, { animate: true });
  }, [center.lat, center.lng]);

  // User dot.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    userMarker.current?.remove();
    userMarker.current = user ? L.marker([user.lat, user.lng], { icon: userIcon, interactive: false, zIndexOffset: -10 }).addTo(m) : null;
  }, [user]);

  // Mosque pins.
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const mq of mosques) {
      const selected = mq.id === selectedId;
      const marker = L.marker([mq.lat, mq.lng], { icon: pinIcon(selected), zIndexOffset: selected ? 1000 : 0, title: mq.name });
      marker.on("click", () => onSelect(mq.id));
      if (selected && labels[mq.id]) {
        marker.bindTooltip(labels[mq.id], { permanent: true, direction: "right", className: "ug-tip", offset: [0, 0] }).openTooltip();
      }
      marker.addTo(g);
    }
    if (selectedId) {
      const sel = mosques.find((x) => x.id === selectedId);
      if (sel) m.panTo([sel.lat, sel.lng - 0.0], { animate: true });
    }
  }, [mosques, selectedId, labels, onSelect]);

  return <div ref={el} className="absolute inset-0" aria-label="Map of nearby masjids" role="region" />;
}
