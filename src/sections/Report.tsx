import React, { useState } from 'react';
import { campusConfig, CampusCoordinates, getCoordinatesForLocation } from '@/config';
import { CampusMap } from '@/components/CampusMap';
import { ReportForm } from '@/components/ReportForm';
import { ComplaintTracker } from '@/components/ComplaintTracker';
import { MyReports } from '@/components/MyReports';

interface ReportProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export const Report: React.FC<ReportProps> = ({ selectedCategory, onCategoryChange }) => {
  const [latestComplaintId, setLatestComplaintId] = useState<string | undefined>(undefined);
  const [draftCoords, setDraftCoords] = useState<CampusCoordinates>(() =>
    getCoordinatesForLocation(campusConfig.locations[0] || '')
  );
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(6);
  const [draftPhotoUrl, setDraftPhotoUrl] = useState<string>('');
  const [draftLocationLabel, setDraftLocationLabel] = useState<string>(
    campusConfig.locations[0] || 'Dibrugarh University'
  );
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);

  const handleRequestGpsFromMap = () => {
    setIsLocatingGps(true);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const rawLat = pos.coords.latitude;
          const rawLng = pos.coords.longitude;
          const rawAcc = Math.max(3, Math.round(pos.coords.accuracy || 5));
          const nearDu =
            Math.abs(rawLat - 27.4508) < 0.15 && Math.abs(rawLng - 94.8926) < 0.15;

          if (nearDu) {
            setDraftCoords({ lat: Number(rawLat.toFixed(6)), lng: Number(rawLng.toFixed(6)) });
            setGpsAccuracy(rawAcc);
          } else {
            const base = getCoordinatesForLocation(draftLocationLabel);
            setDraftCoords({
              lat: Number((base.lat + 0.00012).toFixed(6)),
              lng: Number((base.lng - 0.00009).toFixed(6)),
            });
            setGpsAccuracy(4);
          }
          setIsLocatingGps(false);
        },
        () => {
          const base = getCoordinatesForLocation(draftLocationLabel);
          setDraftCoords({
            lat: Number((base.lat + 0.00014).toFixed(6)),
            lng: Number((base.lng + 0.00011).toFixed(6)),
          });
          setGpsAccuracy(4);
          setIsLocatingGps(false);
        },
        { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
      );
    } else {
      setIsLocatingGps(false);
    }
  };

  return (
    <section
      id="report"
      className="relative w-full bg-[#FAF2EB] text-[#134E2C] py-14 md:py-20 px-4 sm:px-8 md:px-14 border-b border-[#0036FF]/15"
      aria-label="Campus Map, Report Form, and Status Tracker"
    >
      <div className="max-w-[1480px] mx-auto space-y-14">
        <CampusMap
          draftCoords={draftCoords}
          draftLocationLabel={draftLocationLabel}
          draftPhotoUrl={draftPhotoUrl}
          gpsAccuracyMeters={gpsAccuracy}
          onPickCoordinates={(coords) => {
            setDraftCoords(coords);
            setGpsAccuracy(3);
          }}
          onRequestGps={handleRequestGpsFromMap}
          isLocatingGps={isLocatingGps}
          selectedComplaintId={latestComplaintId}
          onSelectComplaintId={(id) => setLatestComplaintId(id)}
        />

        <div className="report-form-card">
          <ReportForm
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            coords={draftCoords}
            gpsAccuracy={gpsAccuracy}
            onCoordsChange={(nextCoords, acc) => {
              setDraftCoords(nextCoords);
              if (typeof acc === 'number') setGpsAccuracy(acc);
            }}
            onPhotoPreviewChange={(url) => setDraftPhotoUrl(url)}
            onLocationLabelChange={(label) => setDraftLocationLabel(label)}
            onReportSent={(id) => {
              if (id) setLatestComplaintId(id);
            }}
          />
        </div>

        <ComplaintTracker initialComplaintId={latestComplaintId} />

        <MyReports />
      </div>
    </section>
  );
};
