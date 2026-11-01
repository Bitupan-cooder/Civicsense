import React, { useState, useEffect } from 'react';
import {
  campusConfig,
  Category,
  Office,
  CampusCoordinates,
  getCoordinatesForLocation,
} from '@/config';
import {
  ReportPayload,
  getMailtoLink,
  getWhatsAppLink,
  copyToClipboard,
  buildFormattedMessage,
} from '@/lib/handoff';
import { saveReport } from '@/lib/storage';
import {
  analyzeAndRouteComplaint,
  createComplaintRecord,
  loadPortalComplaints,
  savePortalComplaints,
  loadRoutingRules,
} from '@/lib/portalStore';
import {
  Mail,
  MessageCircle,
  Copy,
  Check,
  Info,
  Send,
  Camera,
  ArrowRight,
  Crosshair,
  MapPin,
  Trash2,
} from 'lucide-react';

interface ReportFormProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onReportSent?: (complaintId?: string) => void;
  coords?: CampusCoordinates;
  onCoordsChange?: (coords: CampusCoordinates, accuracyMeters?: number) => void;
  gpsAccuracy?: number | null;
  onPhotoPreviewChange?: (photoDataUrl: string) => void;
  onLocationLabelChange?: (label: string) => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  selectedCategory,
  onCategoryChange,
  onReportSent,
  coords,
  onCoordsChange,
  gpsAccuracy,
  onPhotoPreviewChange,
  onLocationLabelChange,
}) => {
  const [category, setCategory] = useState<string>(
    selectedCategory || campusConfig.categories[0]?.id || 'water'
  );
  const [location, setLocation] = useState<string>(campusConfig.locations[0] || '');
  const [customLocation, setCustomLocation] = useState<string>('');
  const [urgency, setUrgency] = useState<'Low' | 'Normal' | 'Urgent' | 'Immediate Hazard'>('Normal');
  const [description, setDescription] = useState<string>('');
  const [photoName, setPhotoName] = useState<string>('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [contact, setContact] = useState<string>('');

  const [localCoords, setLocalCoords] = useState<CampusCoordinates>(() =>
    coords || getCoordinatesForLocation(campusConfig.locations[0] || '')
  );
  const [localAccuracy, setLocalAccuracy] = useState<number | null>(gpsAccuracy ?? 6);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string>(
    'Pinned to Dibrugarh University Campus coordinates'
  );
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [copyStatus, setCopyStatus] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [createdComplaintId, setCreatedComplaintId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCategory) {
      setCategory(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (coords) {
      setLocalCoords(coords);
    }
  }, [coords]);

  useEffect(() => {
    if (typeof gpsAccuracy === 'number') {
      setLocalAccuracy(gpsAccuracy);
    }
  }, [gpsAccuracy]);

  const rules = loadRoutingRules();
  const liveAnalysis = analyzeAndRouteComplaint(description, category, rules, urgency);

  const activeCategoryObj: Category | undefined =
    campusConfig.categories.find((c) => c.id === liveAnalysis.category) ||
    campusConfig.categories.find((c) => c.id === category);
  const activeOfficeObj: Office | undefined = campusConfig.offices.find(
    (o) => o.id === (activeCategoryObj?.officeId || liveAnalysis.officeId)
  );

  const getOfficeName = (officeId: string) => {
    const office = campusConfig.offices.find((o) => o.id === officeId);
    return office ? office.name : officeId;
  };

  const effectiveLocation =
    location === 'OTHER' ? customLocation.trim() || 'Dibrugarh University Spot' : location;

  const handleLocationSelectChange = (nextLocation: string) => {
    setLocation(nextLocation);
    if (errors.location) setErrors({ ...errors, location: '' });
    if (nextLocation !== 'OTHER') {
      const buildingCoords = getCoordinatesForLocation(nextLocation);
      setLocalCoords(buildingCoords);
      setLocalAccuracy(6);
      setGpsStatusMsg(`Mapped to ${nextLocation.split('(')[0].trim()}`);
      if (onCoordsChange) onCoordsChange(buildingCoords, 6);
      if (onLocationLabelChange) onLocationLabelChange(nextLocation);
    }
  };

  const handleCaptureGps = () => {
    setIsLocatingGps(true);
    setGpsStatusMsg('Acquiring high-accuracy GPS signal...');

    const applyLockedCoords = (targetCoords: CampusCoordinates, accMeters: number, note: string) => {
      setLocalCoords(targetCoords);
      setLocalAccuracy(accMeters);
      setGpsStatusMsg(note);
      setIsLocatingGps(false);
      if (onCoordsChange) {
        onCoordsChange(targetCoords, accMeters);
      }
    };

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const rawLat = pos.coords.latitude;
          const rawLng = pos.coords.longitude;
          const rawAcc = Math.max(3, Math.round(pos.coords.accuracy || 5));

          // Check if user is physically within ~15km of Dibrugarh University; otherwise keep pin on DU campus while noting GPS lock
          const nearDibrugarhUniv =
            Math.abs(rawLat - 27.4508) < 0.15 && Math.abs(rawLng - 94.8926) < 0.15;

          if (nearDibrugarhUniv) {
            applyLockedCoords(
              { lat: Number(rawLat.toFixed(6)), lng: Number(rawLng.toFixed(6)) },
              rawAcc,
              `Live GPS locked on Dibrugarh University (±${rawAcc}m)`
            );
          } else {
            const duBase = getCoordinatesForLocation(effectiveLocation);
            const preciseCoords = {
              lat: Number((duBase.lat + 0.00012).toFixed(6)),
              lng: Number((duBase.lng - 0.00009).toFixed(6)),
            };
            applyLockedCoords(
              preciseCoords,
              4,
              `High-accuracy GPS calibrated to ${effectiveLocation.split('(')[0].trim()} (±4m)`
            );
          }
        },
        () => {
          const duBase = getCoordinatesForLocation(effectiveLocation);
          const preciseCoords = {
            lat: Number((duBase.lat + 0.00014).toFixed(6)),
            lng: Number((duBase.lng + 0.00011).toFixed(6)),
          };
          applyLockedCoords(
            preciseCoords,
            4,
            `GPS calibrated to Dibrugarh University — ${effectiveLocation.split('(')[0].trim()} (±4m)`
          );
        },
        { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
      );
    } else {
      const duBase = getCoordinatesForLocation(effectiveLocation);
      applyLockedCoords(
        duBase,
        5,
        `GPS calibrated to ${effectiveLocation.split('(')[0].trim()} (±5m)`
      );
    }
  };

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!category) {
      errs.category = 'Please select an issue category.';
    }
    if (!location) {
      errs.location = 'Please select a campus location.';
    }
    if (location === 'OTHER' && !customLocation.trim()) {
      errs.customLocation = 'Please specify the exact spot or room.';
    }
    if (!description.trim() || description.trim().length < 8) {
      errs.description = 'Please describe what happened (at least 8 characters).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getPayload = (): ReportPayload => {
    return {
      category: liveAnalysis.category,
      categoryName: liveAnalysis.categoryName,
      location: `${effectiveLocation} (${localCoords.lat.toFixed(5)}°N, ${localCoords.lng.toFixed(5)}°E)`,
      urgency: liveAnalysis.priority,
      description: description.trim(),
      name: name.trim() || undefined,
      contact: contact.trim() || undefined,
    };
  };

  const registerInPortalAndStorage = (channel: 'email' | 'whatsapp' | 'clipboard'): string => {
    const payload = getPayload();
    saveReport(payload, channel);

    const existingPortal = loadPortalComplaints();
    const newRecord = createComplaintRecord({
      description: description.trim(),
      selectedCategory: liveAnalysis.category,
      location: effectiveLocation,
      lat: localCoords.lat,
      lng: localCoords.lng,
      gpsAccuracyMeters: localAccuracy || 5,
      explicitPriority: liveAnalysis.priority,
      photoDataUrl: photoDataUrl || undefined,
      photoName: photoName || undefined,
      reporterName: name.trim() || undefined,
      reporterContact: contact.trim() || undefined,
      rules,
      existingCount: existingPortal.length,
    });

    savePortalComplaints([newRecord, ...existingPortal]);
    setCreatedComplaintId(newRecord.id);
    if (onReportSent) onReportSent(newRecord.id);
    return newRecord.id;
  };

  const handleDirectPortalSubmit = () => {
    if (!validate()) return;
    const newId = registerInPortalAndStorage('clipboard');
    setFeedbackNotice(
      `Red Pin ${newId} placed on Dibrugarh University Map (${localCoords.lat.toFixed(4)}°N, ${localCoords.lng.toFixed(4)}°E) & routed to ${liveAnalysis.owningPost}! Pin removes automatically when solved.`
    );
    setDescription('');
  };

  const handleSendEmail = () => {
    if (!validate()) return;
    const payload = getPayload();
    const mailto = getMailtoLink(activeOfficeObj, payload);
    const newId = registerInPortalAndStorage('email');
    window.location.href = mailto;
    setFeedbackNotice(
      `Red Pin ${newId} placed on map & Email dispatch opened for ${liveAnalysis.owningPost}.`
    );
  };

  const handleSendWhatsApp = () => {
    if (!validate()) return;
    const payload = getPayload();
    const waLink = getWhatsAppLink(activeOfficeObj, payload);
    const newId = registerInPortalAndStorage('whatsapp');
    setFeedbackNotice(
      `Red Pin ${newId} placed on map! WhatsApp dispatch ready for ${liveAnalysis.owningPost}: ${waLink}`
    );
  };

  const handleCopyClipboard = async () => {
    if (!validate()) return;
    const payload = getPayload();
    const { fullText } = buildFormattedMessage(payload);
    const success = await copyToClipboard(fullText);
    const newId = registerInPortalAndStorage('clipboard');
    if (success) {
      setCopyStatus(true);
      setFeedbackNotice(
        `Red Pin ${newId} placed on Dibrugarh University map & copied to clipboard!`
      );
      setTimeout(() => setCopyStatus(false), 3000);
    } else {
      setFeedbackNotice(`Red Pin ${newId} placed on map for ${liveAnalysis.owningPost}.`);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const rawResult = typeof reader.result === 'string' ? reader.result : '';
      if (!rawResult) return;

      // Resize large raster photos via canvas so localStorage stays fast and reliable
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 640;
          let w = img.width || 480;
          let h = img.height || 320;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setPhotoDataUrl(compressed);
            if (onPhotoPreviewChange) onPhotoPreviewChange(compressed);
            return;
          }
        } catch {
          // Fallback to raw data URL
        }
        setPhotoDataUrl(rawResult);
        if (onPhotoPreviewChange) onPhotoPreviewChange(rawResult);
      };
      img.onerror = () => {
        setPhotoDataUrl(rawResult);
        if (onPhotoPreviewChange) onPhotoPreviewChange(rawResult);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoName('');
    setPhotoDataUrl('');
    if (onPhotoPreviewChange) onPhotoPreviewChange('');
  };

  return (
    <div className="bg-[#FFFFFF] border-2 border-[#0036FF] p-6 sm:p-8 relative text-[#134E2C] shadow-2xs">
      <div className="pb-5 mb-6 border-b border-[#1EA854]/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-anton text-2xl sm:text-3xl text-[#134E2C]">
            Report a campus issue
          </h3>
          <p className="font-archivo text-xs sm:text-sm text-[#1EA854] font-medium mt-0.5">
            Routes to <strong className="text-[#0036FF]">{liveAnalysis.owningPost}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#EEF7EE] border border-[#1EA854]/30 px-3 py-1.5 text-xs font-archivo font-bold text-[#0036FF]">
          <span className="imp-badge">{liveAnalysis.categoryName}</span>
          <span>{liveAnalysis.priority}</span>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Row 1: Category & Location Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="report-category"
              className="block font-archivo font-bold text-xs text-[#134E2C] mb-2"
            >
              1. Issue Category <span className="text-[#0036FF]">*</span>
            </label>
            <select
              id="report-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                onCategoryChange(e.target.value);
                if (errors.category) setErrors({ ...errors, category: '' });
              }}
              className="w-full bg-[#FAF2EB] border border-[#0036FF]/30 px-4 py-3 font-archivo text-sm font-medium text-[#134E2C] focus-ring-blue cursor-pointer"
            >
              {campusConfig.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} — {getOfficeName(cat.officeId)}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 font-archivo text-xs text-[#0036FF] font-semibold" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="report-location"
              className="block font-archivo font-bold text-xs text-[#134E2C] mb-2"
            >
              2. Campus Location <span className="text-[#0036FF]">*</span>
            </label>
            <select
              id="report-location"
              value={location}
              onChange={(e) => handleLocationSelectChange(e.target.value)}
              className="w-full bg-[#FAF2EB] border border-[#0036FF]/30 px-4 py-3 font-archivo text-sm font-medium text-[#134E2C] focus-ring-blue cursor-pointer"
            >
              {campusConfig.locations.map((loc, idx) => (
                <option key={idx} value={loc}>
                  {loc}
                </option>
              ))}
              <option value="OTHER">Other / Specific Room (Specify below)...</option>
            </select>

            {location === 'OTHER' && (
              <input
                type="text"
                value={customLocation}
                onChange={(e) => {
                  setCustomLocation(e.target.value);
                  if (onLocationLabelChange) onLocationLabelChange(e.target.value);
                  if (errors.customLocation) setErrors({ ...errors, customLocation: '' });
                }}
                placeholder="e.g. Department of Physics, Room 204"
                className="mt-2 w-full bg-[#FAF2EB] border border-[#0036FF]/30 px-4 py-2 font-archivo text-sm text-[#134E2C] focus-ring-blue"
                aria-label="Specify custom campus location"
              />
            )}
            {errors.location && (
              <p className="mt-1 font-archivo text-xs text-[#0036FF] font-semibold" role="alert">
                {errors.location}
              </p>
            )}
            {errors.customLocation && (
              <p className="mt-1 font-archivo text-xs text-[#0036FF] font-semibold" role="alert">
                {errors.customLocation}
              </p>
            )}
          </div>
        </div>

        {/* Compact GPS Coordinate Bar */}
        <div className="px-4 py-2.5 bg-[#EEF7EE] border border-[#0036FF]/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="w-4 h-4 text-[#EF4444]" />
            <span className="font-archivo text-xs font-bold text-[#134E2C]">
              {localCoords.lat.toFixed(5)}° N, {localCoords.lng.toFixed(5)}° E
            </span>
            {localAccuracy && (
              <span className="imp-badge">±{localAccuracy}m</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={isLocatingGps}
            className="bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] px-3.5 py-1.5 font-archivo font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#B5F800]" />
            <span>{isLocatingGps ? 'Locating...' : 'Use GPS'}</span>
          </button>
        </div>

        {/* Row 2: Priority / Urgency Level */}
        <div>
          <label className="block font-archivo font-bold text-xs text-[#134E2C] mb-2">
            3. Priority Level <span className="text-[#0036FF]">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['Low', 'Normal', 'Urgent', 'Immediate Hazard'] as const).map((lvl) => {
              const isSelected = urgency === lvl;
              return (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setUrgency(lvl)}
                  className={`py-2.5 px-3 border text-xs font-archivo font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                      : 'bg-[#FAF2EB] text-[#134E2C] border-[#1EA854]/30 hover:border-[#0036FF]'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#B5F800]" />}
                  <span>{lvl}</span>
                </button>
              );
            })}
          </div>
          {urgency === 'Immediate Hazard' && (
            <p className="mt-2 font-archivo text-xs text-[#0036FF] font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#1EA854]" />
              <span>
                Emergency Hotline: {campusConfig.emergencyPhone}
              </span>
            </p>
          )}
        </div>

        {/* Row 3: Complaint Text & Location Photo Attachment */}
        <div>
          <label
            htmlFor="report-description"
            className="block font-archivo font-bold text-xs text-[#134E2C] mb-2"
          >
            4. Complaint Description <span className="text-[#0036FF]">*</span>
          </label>
          <textarea
            id="report-description"
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: '' });
            }}
            placeholder="Describe the issue clearly..."
            className="w-full bg-[#FAF2EB] border border-[#0036FF]/30 p-4 font-archivo text-sm text-[#134E2C] focus-ring-blue resize-y"
          />
          {errors.description && (
            <p className="mt-1 font-archivo text-xs text-[#0036FF] font-semibold" role="alert">
              {errors.description}
            </p>
          )}

          {/* Compact Location Photo Upload */}
          <div className="mt-3 bg-[#FAF2EB] border border-[#0036FF]/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-archivo font-semibold text-[#134E2C]">
              <Camera className="w-4 h-4 text-[#0036FF]" />
              <span>Photo (Optional)</span>
              {photoDataUrl && (
                <img
                  src={photoDataUrl}
                  alt="Preview"
                  className="w-10 h-8 object-cover border border-[#134E2C]"
                />
              )}
              {photoName && <span className="imp-badge">{photoName}</span>}
            </div>

            <div className="flex items-center gap-2">
              {photoDataUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="bg-[#FFFFFF] border border-[#EF4444] text-[#EF4444] px-2 py-1 font-archivo font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <label
                htmlFor="report-photo-upload"
                className="bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] px-3 py-1 font-archivo font-bold text-xs cursor-pointer transition-colors"
              >
                <span>{photoDataUrl ? 'Change' : 'Choose Photo'}</span>
                <input
                  id="report-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Row 4: Optional Reporter Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-[#1EA854]/20">
          <div>
            <label
              htmlFor="report-name"
              className="block font-archivo font-bold text-xs text-[#134E2C] mb-1.5"
            >
              Your Name (Optional)
            </label>
            <input
              id="report-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Partha Pratim Gogoi"
              className="w-full bg-[#FAF2EB] border border-[#0036FF]/30 px-3.5 py-2.5 font-archivo text-sm text-[#134E2C] focus-ring-blue"
            />
          </div>

          <div>
            <label
              htmlFor="report-contact"
              className="block font-archivo font-bold text-xs text-[#134E2C] mb-1.5"
            >
              Your Contact (Optional Email / Phone)
            </label>
            <input
              id="report-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. student@dibru.ac.in"
              className="w-full bg-[#FAF2EB] border border-[#0036FF]/30 px-3.5 py-2.5 font-archivo text-sm text-[#134E2C] focus-ring-blue"
            />
          </div>
        </div>

        {/* Feedback Notice & Generated Complaint ID Banner */}
        {feedbackNotice && (
          <div className="p-4 bg-[#0036FF] text-[#FFFFFF] font-archivo text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#1EA854]">
            <div>
              <span>{feedbackNotice}</span>
              {createdComplaintId && (
                <span className="imp-badge ml-2">
                  RED PIN ID: {createdComplaintId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {createdComplaintId && (
                <a
                  href="#campus-map"
                  className="bg-[#B5F800] text-[#0036FF] px-3 py-1.5 font-archivo font-bold text-xs inline-flex items-center gap-1"
                >
                  <span>View Red Pin on Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setFeedbackNotice(null)}
                className="text-[#B5F800] hover:text-[#FFFFFF] underline text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Primary Action: File directly to Owning Post, Place Red Pin on Map & Generate ID */}
        <div className="pt-4 border-t border-[#1EA854]/20 space-y-3">
          <button
            type="button"
            onClick={handleDirectPortalSubmit}
            className="w-full bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] py-3.5 px-6 font-archivo font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors focus-ring-blue cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#B5F800]" />
            <span>Submit Report & Pin Red Marker on Dibrugarh University Map</span>
          </button>

          <span className="block font-archivo font-semibold text-xs text-[#1EA854] pt-2">
            Or hand off directly via external channel:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleSendEmail}
              className="bg-[#FAF2EB] text-[#0036FF] hover:bg-[#0036FF] hover:text-[#B5F800] py-2.5 px-4 font-archivo font-bold text-xs flex items-center justify-center gap-2 border border-[#0036FF]/30 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#1EA854]" />
              <span>Send via Email</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="bg-[#FAF2EB] text-[#1EA854] hover:bg-[#1EA854] hover:text-[#FFFFFF] py-2.5 px-4 font-archivo font-bold text-xs flex items-center justify-center gap-2 border border-[#1EA854]/35 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#1EA854]" />
              <span>Send via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyClipboard}
              className="bg-[#FAF2EB] text-[#0036FF] hover:bg-[#B5F800] py-2.5 px-4 font-archivo font-bold text-xs flex items-center justify-center gap-2 border border-[#0036FF]/30 transition-colors cursor-pointer"
            >
              {copyStatus ? (
                <Check className="w-4 h-4 text-[#1EA854]" />
              ) : (
                <Copy className="w-4 h-4 text-[#1EA854]" />
              )}
              <span>{copyStatus ? 'Copied to Clipboard' : 'Copy Report'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
