import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DIBRUGARH_UNIVERSITY_CENTER, CampusCoordinates } from '@/config';
import {
  ComplaintRecord,
  getActiveMapComplaints,
  loadPortalComplaints,
} from '@/lib/portalStore';
import {
  Crosshair,
  RotateCcw,
  Box,
} from 'lucide-react';

interface CampusMapProps {
  draftCoords?: CampusCoordinates | null;
  draftLocationLabel?: string;
  draftPhotoUrl?: string;
  gpsAccuracyMeters?: number | null;
  onPickCoordinates?: (coords: CampusCoordinates) => void;
  onRequestGps?: () => void;
  isLocatingGps?: boolean;
  selectedComplaintId?: string;
  onSelectComplaintId?: (complaintId: string) => void;
}

function escapeHtml(raw: string): string {
  return (raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Tactile 3D Sculpted Red Pushpin Marker with Specular Sphere Head,
 * Metallic Needle Stem, Ground Cast Shadow, and Extruded 3D Tag.
 */
function createRedPinIcon(complaint: ComplaintRecord, isSelected: boolean): L.DivIcon {
  const scale = isSelected ? 'scale(1.14)' : 'scale(1)';
  const tagBg = isSelected ? '#0036FF' : '#FFFFFF';
  const tagText = isSelected ? '#B5F800' : '#134E2C';

  const html = `
    <div style="position:relative;width:56px;height:68px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;transform:${scale};transition:transform 0.18s ease;">
      <div class="pin-3d-bob" style="position:relative;display:flex;flex-direction:column;align-items:center;z-index:3;">
        <!-- 3D Extruded ID Tag -->
        <div style="margin-bottom:3px;background:${tagBg};color:${tagText};border:1.5px solid #134E2C;box-shadow:0 2.5px 0 #134E2C;font-size:9px;font-weight:800;padding:1px 5px;white-space:nowrap;letter-spacing:0.03em;">
          ${escapeHtml(complaint.id)}
        </div>
        <!-- 3D Spherical Glossy Red Pin Head -->
        <div style="position:relative;width:30px;height:30px;border-radius:9999px;background:radial-gradient(circle at 32% 28%, #FF7878 0%, #EF4444 45%, #B91C1C 84%, #7F1D1D 100%);border:2px solid #134E2C;box-shadow:inset -3px -4px 6px rgba(0,0,0,0.35), 0 4px 8px rgba(185,28,28,0.45);display:flex;align-items:center;justify-content:center;">
          <!-- Specular Highlight -->
          <div style="position:absolute;top:5px;left:6px;width:8px;height:5px;border-radius:9999px;background:rgba(255,255,255,0.75);transform:rotate(-25deg);"></div>
          <!-- Inner Center Core -->
          <div style="width:8px;height:8px;border-radius:9999px;background:#FFFFFF;border:1.5px solid #991B1B;"></div>
        </div>
        <!-- 3D Metallic Pin Stem -->
        <div style="width:4px;height:13px;background:linear-gradient(90deg, #334155 0%, #F8FAFC 48%, #0F172A 100%);border-left:1px solid #134E2C;border-right:1px solid #134E2C;"></div>
      </div>
      <!-- 3D Ground Cast Shadow Ellipse -->
      <div style="position:absolute;bottom:2px;width:24px;height:8px;border-radius:9999px;background:radial-gradient(ellipse at center, rgba(19,78,44,0.55) 0%, rgba(19,78,44,0.18) 65%, transparent 100%);z-index:1;"></div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-red-pin-marker',
    html,
    iconSize: [56, 68],
    iconAnchor: [28, 64],
    popupAnchor: [0, -58],
  });
}

/**
 * 3D Blue + Lime GPS Target Pin for User's Selected Location
 */
function createDraftGpsPinIcon(): L.DivIcon {
  const html = `
    <div style="position:relative;width:52px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;z-index:3;">
        <div style="margin-bottom:3px;background:#B5F800;color:#0036FF;border:1.5px solid #134E2C;box-shadow:0 2px 0 #134E2C;font-size:9px;font-weight:800;padding:1px 5px;white-space:nowrap;">
          GPS
        </div>
        <div style="position:relative;width:26px;height:26px;border-radius:9999px;background:radial-gradient(circle at 32% 28%, #60A5FA 0%, #0036FF 55%, #1E3A8A 100%);border:2px solid #134E2C;box-shadow:0 4px 8px rgba(0,54,255,0.35);display:flex;align-items:center;justify-content:center;">
          <div style="width:8px;height:8px;border-radius:9999px;background:#B5F800;"></div>
        </div>
        <div style="width:4px;height:11px;background:linear-gradient(90deg, #334155 0%, #F8FAFC 48%, #0F172A 100%);"></div>
      </div>
      <div style="position:absolute;bottom:2px;width:20px;height:7px;border-radius:9999px;background:rgba(0,54,255,0.35);z-index:1;"></div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-draft-gps-marker',
    html,
    iconSize: [52, 62],
    iconAnchor: [26, 58],
    popupAnchor: [0, -52],
  });
}

function buildPopupHtml(complaint: ComplaintRecord): string {
  const completedStages = complaint.routeSteps.filter((s) => s.completed).length;

  const photoSection = complaint.photoDataUrl
    ? `<div style="width:100%;height:118px;overflow:hidden;border-bottom:2px solid #134E2C;background:#DFEFE0;">
         <img src="${complaint.photoDataUrl}" alt="${escapeHtml(complaint.location)}" style="width:100%;height:100%;object-fit:cover;display:block;" />
       </div>`
    : '';

  return `
    <div style="font-family:var(--font-archivo),sans-serif;color:#134E2C;">
      <div style="background:#0036FF;color:#FFFFFF;padding:6px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #134E2C;">
        <span style="background:#EF4444;color:#FFFFFF;font-size:10px;font-weight:800;padding:1px 6px;border:1px solid #FFFFFF;">${escapeHtml(complaint.id)}</span>
        <span style="color:#B5F800;font-size:10px;font-weight:800;">${completedStages}/4</span>
      </div>
      ${photoSection}
      <div style="padding:8px 10px;">
        <div style="font-size:12px;font-weight:800;color:#134E2C;line-height:1.25;">
          ${escapeHtml(complaint.summary)}
        </div>
        <div style="font-size:10px;font-weight:700;color:#1EA854;margin-top:3px;">
          ${escapeHtml(complaint.location.split('(')[0].trim())}
        </div>
      </div>
    </div>
  `;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  draftCoords,
  draftLocationLabel,
  draftPhotoUrl,
  onPickCoordinates,
  onRequestGps,
  isLocatingGps,
  selectedComplaintId,
  onSelectComplaintId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const draftMarkerRef = useRef<L.Marker | null>(null);

  const [complaints, setComplaints] = useState<ComplaintRecord[]>(() => loadPortalComplaints());
  const [is3dTilted, setIs3dTilted] = useState<boolean>(true);
  const [focusedId, setFocusedId] = useState<string>(() => {
    const initialActive = getActiveMapComplaints(loadPortalComplaints());
    return selectedComplaintId || initialActive[0]?.id || 'CMP-2601';
  });

  useEffect(() => {
    const refresh = () => setComplaints(loadPortalComplaints());
    window.addEventListener('civicsense_portal_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('civicsense_portal_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (selectedComplaintId) {
      setFocusedId(selectedComplaintId);
    }
  }, [selectedComplaintId]);

  const activePinComplaints = getActiveMapComplaints(complaints);
  const selectedPinComplaint =
    activePinComplaints.find((c) => c.id === focusedId) || activePinComplaints[0] || null;

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [DIBRUGARH_UNIVERSITY_CENTER.lat, DIBRUGARH_UNIVERSITY_CENTER.lng],
      zoom: 16,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onPickCoordinates) {
        onPickCoordinates({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        });
      }
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    activePinComplaints.forEach((complaint) => {
      const isSelected = complaint.id === (selectedPinComplaint?.id || focusedId);
      const marker = L.marker([complaint.lat, complaint.lng], {
        icon: createRedPinIcon(complaint, isSelected),
      });

      marker.bindPopup(buildPopupHtml(complaint), {
        maxWidth: 252,
        minWidth: 240,
      });

      marker.on('click', () => {
        setFocusedId(complaint.id);
        if (onSelectComplaintId) {
          onSelectComplaintId(complaint.id);
        }
      });

      marker.addTo(layer);

      if (isSelected && selectedComplaintId === complaint.id) {
        marker.openPopup();
      }
    });
  }, [activePinComplaints, focusedId, selectedComplaintId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (draftMarkerRef.current) {
      draftMarkerRef.current.remove();
      draftMarkerRef.current = null;
    }

    if (draftCoords) {
      const marker = L.marker([draftCoords.lat, draftCoords.lng], {
        icon: createDraftGpsPinIcon(),
      });

      const photoPreviewHtml = draftPhotoUrl
        ? `<img src="${draftPhotoUrl}" alt="Pin preview" style="width:100%;height:88px;object-fit:cover;margin-top:6px;border:1.5px solid #134E2C;" />`
        : '';

      marker.bindPopup(
        `<div style="padding:8px 10px;font-family:var(--font-archivo),sans-serif;color:#134E2C;">
          <div style="font-size:11px;font-weight:800;">${escapeHtml((draftLocationLabel || 'Dibrugarh University').split('(')[0].trim())}</div>
          <div style="font-size:10px;color:#0036FF;font-weight:700;margin-top:2px;">${draftCoords.lat.toFixed(5)}°N, ${draftCoords.lng.toFixed(5)}°E</div>
          ${photoPreviewHtml}
        </div>`
      );
      marker.addTo(map);
      draftMarkerRef.current = marker;
    }
  }, [draftCoords, draftLocationLabel, draftPhotoUrl]);

  const handleFocusPinOnMap = (complaint: ComplaintRecord) => {
    setFocusedId(complaint.id);
    if (onSelectComplaintId) {
      onSelectComplaintId(complaint.id);
    }
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([complaint.lat, complaint.lng], 17, { animate: true });
    }
  };

  const handleResetCampusCenter = () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([DIBRUGARH_UNIVERSITY_CENTER.lat, DIBRUGARH_UNIVERSITY_CENTER.lng], 16, {
        animate: true,
      });
    }
  };

  return (
    <div id="campus-map" className="map-3d-stage scroll-mt-24">
      <div className="map-3d-board">
        {/* Minimal 3D Control Header — Zero Extra Text */}
        <div className="px-4 py-3 bg-[#EEF7EE] border-b-2 border-[#134E2C] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="font-anton text-xl sm:text-2xl text-[#134E2C]">
              Dibrugarh University
            </h3>
            <span className="btn-3d-press bg-[#EF4444] text-[#FFFFFF] px-2.5 py-0.5 text-xs font-archivo font-bold inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" />
              <span>{activePinComplaints.length}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIs3dTilted((prev) => !prev)}
              className={`btn-3d-press px-3 py-1.5 font-archivo font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                is3dTilted
                  ? 'bg-[#B5F800] text-[#0036FF]'
                  : 'bg-[#FFFFFF] text-[#134E2C]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{is3dTilted ? '3D' : '2D'}</span>
            </button>

            {onRequestGps && (
              <button
                type="button"
                onClick={onRequestGps}
                disabled={isLocatingGps}
                className="btn-3d-press bg-[#0036FF] text-[#B5F800] px-3 py-1.5 font-archivo font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{isLocatingGps ? '...' : 'GPS'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetCampusCenter}
              className="btn-3d-press bg-[#FFFFFF] text-[#134E2C] px-2.5 py-1.5 font-archivo font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
              aria-label="Reset map center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3D Map Viewport */}
        <div className="relative bg-[#DFEFE0] p-2 sm:p-3 overflow-hidden">
          <div
            className={
              is3dTilted ? 'map-3d-viewport-tilted' : 'map-3d-viewport-flat'
            }
          >
            <div
              ref={mapContainerRef}
              className="w-full h-[420px] sm:h-[500px] border-2 border-[#134E2C]"
              aria-label="Dibrugarh University 3D OpenStreetMap"
            />
          </div>
        </div>

        {/* 3D Tactile Pin Switcher Bar */}
        <div className="px-4 py-3 bg-[#FAF2EB] border-t-2 border-[#134E2C] flex flex-wrap items-center gap-2">
          {activePinComplaints.map((c) => {
            const isSelected = selectedPinComplaint?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleFocusPinOnMap(c)}
                className={`btn-3d-press px-2.5 py-1 text-xs font-archivo font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0036FF] text-[#B5F800]'
                    : 'bg-[#FFFFFF] text-[#134E2C]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] border border-[#134E2C]" />
                <span>{c.id}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
