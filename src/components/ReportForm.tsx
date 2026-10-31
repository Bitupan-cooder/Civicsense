import React, { useState, useEffect } from 'react';
import { campusConfig, Category, Office, isConfigured } from '@/config';
import { ReportPayload, getMailtoLink, getWhatsAppLink, copyToClipboard, buildFormattedMessage } from '@/lib/handoff';
import { saveReport } from '@/lib/storage';
import { Mail, MessageCircle, Copy, Check, Info } from 'lucide-react';

interface ReportFormProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onReportSent?: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  selectedCategory,
  onCategoryChange,
  onReportSent,
}) => {
  const [category, setCategory] = useState<string>(selectedCategory || campusConfig.categories[0]?.id || '');
  const [location, setLocation] = useState<string>(campusConfig.locations[0] || '');
  const [customLocation, setCustomLocation] = useState<string>('');
  const [urgency, setUrgency] = useState<'Low' | 'Normal' | 'Urgent' | 'Immediate Hazard'>('Normal');
  const [description, setDescription] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [contact, setContact] = useState<string>('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [copyStatus, setCopyStatus] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Sync category when parent prop changes
  useEffect(() => {
    if (selectedCategory) {
      setCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const activeCategoryObj: Category | undefined = campusConfig.categories.find((c) => c.id === category);
  const activeOfficeObj: Office | undefined = campusConfig.offices.find(
    (o) => o.id === activeCategoryObj?.officeId
  );

  const getOfficeName = (officeId: string) => {
    const office = campusConfig.offices.find((o) => o.id === officeId);
    return office ? office.name : officeId;
  };

  const effectiveLocation = location === 'OTHER' ? (customLocation.trim() || 'Unspecified Custom Location') : location;

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
      category,
      categoryName: activeCategoryObj?.name || category,
      location: effectiveLocation,
      urgency,
      description: description.trim(),
      name: name.trim() || undefined,
      contact: contact.trim() || undefined,
    };
  };

  const recordAndNotify = (channel: 'email' | 'whatsapp' | 'clipboard') => {
    const payload = getPayload();
    saveReport(payload, channel);
    if (onReportSent) onReportSent();
  };

  const handleSendEmail = () => {
    if (!validate()) return;
    const payload = getPayload();
    const mailto = getMailtoLink(activeOfficeObj, payload);
    recordAndNotify('email');
    window.location.href = mailto;
    setFeedbackNotice('Email dispatch opened. Review and click Send in your email client.');
  };

  const handleSendWhatsApp = () => {
    if (!validate()) return;
    const payload = getPayload();
    const waLink = getWhatsAppLink(activeOfficeObj, payload);
    recordAndNotify('whatsapp');
    window.open(waLink, '_blank', 'noopener,noreferrer');
    setFeedbackNotice('WhatsApp dispatch opened in a new tab.');
  };

  const handleCopyClipboard = async () => {
    if (!validate()) return;
    const payload = getPayload();
    const { fullText } = buildFormattedMessage(payload);
    const success = await copyToClipboard(fullText);
    if (success) {
      recordAndNotify('clipboard');
      setCopyStatus(true);
      setFeedbackNotice('Report copied to clipboard! Paste it into any campus chat or ticketing desk.');
      setTimeout(() => setCopyStatus(false), 3000);
    } else {
      setFeedbackNotice('Unable to copy automatically. Please copy the text manually.');
    }
  };

  const configured = isConfigured();

  return (
    <div className="bg-[#FFFFFF] border-2 border-[#0036FF] p-6 sm:p-10 md:p-12 relative text-[#1EA854]">
      {/* Editorial Header Block */}
      <div className="pb-8 mb-8 border-b border-[#1EA854]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-archivo font-black text-xs uppercase tracking-widest text-[#0036FF]">
            OFFICIAL REDRESSAL DISPATCH FORM
          </span>
          <h3 className="font-anton text-2xl sm:text-3xl uppercase tracking-normal mt-1">
            REPORT TO CAMPUS AUTHORITIES
          </h3>
          <p className="font-serif italic text-xs sm:text-sm text-[#1EA854] mt-1">
            Auto-routing to: <strong className="text-[#0036FF]">{activeOfficeObj?.name || 'Assigned Campus Office'}</strong> ({activeOfficeObj?.email || 'helpdesk@campus.edu'})
          </p>
        </div>

        {!configured && (
          <div className="flex items-center gap-2 bg-[#B5F800] text-[#0036FF] px-3 py-1.5 text-xs font-mono font-bold uppercase border border-[#0036FF]">
            <Info className="w-4 h-4" />
            <span>CAMPUS TEMPLATE MODE</span>
          </div>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Row 1: Category & Location Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="report-category"
              className="block font-archivo font-black text-xs tracking-wider uppercase text-[#1EA854] mb-2"
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
              className="w-full bg-[#FAF2EB] border border-[#1EA854]/40 px-4 py-3 font-archivo text-sm font-bold text-[#1EA854] focus-ring-green cursor-pointer"
            >
              {campusConfig.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} — {getOfficeName(cat.officeId)}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 font-archivo text-xs text-[#0036FF] font-bold" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          {/* Location Picker */}
          <div>
            <label
              htmlFor="report-location"
              className="block font-archivo font-black text-xs tracking-wider uppercase text-[#1EA854] mb-2"
            >
              2. Campus Location <span className="text-[#0036FF]">*</span>
            </label>
            <select
              id="report-location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (errors.location) setErrors({ ...errors, location: '' });
              }}
              className="w-full bg-[#FAF2EB] border border-[#1EA854]/40 px-4 py-3 font-archivo text-sm font-bold text-[#1EA854] focus-ring-green cursor-pointer"
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
                  if (errors.customLocation) setErrors({ ...errors, customLocation: '' });
                }}
                placeholder="e.g. Science Block, Lab 304, North Staircase"
                className="mt-2 w-full bg-[#FAF2EB] border border-[#1EA854]/40 px-4 py-2 font-serif text-sm text-[#1EA854] focus-ring-green"
                aria-label="Specify custom campus location"
              />
            )}
            {errors.location && (
              <p className="mt-1 font-archivo text-xs text-[#0036FF] font-bold" role="alert">
                {errors.location}
              </p>
            )}
            {errors.customLocation && (
              <p className="mt-1 font-archivo text-xs text-[#0036FF] font-bold" role="alert">
                {errors.customLocation}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Urgency Level */}
        <div>
          <label className="block font-archivo font-black text-xs tracking-wider uppercase text-[#1EA854] mb-2">
            3. Urgency Level <span className="text-[#0036FF]">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['Low', 'Normal', 'Urgent', 'Immediate Hazard'] as const).map((lvl) => {
              const isSelected = urgency === lvl;
              const isHazard = lvl === 'Immediate Hazard';
              return (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setUrgency(lvl)}
                  className={`py-2.5 px-3 border text-xs font-archivo font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? isHazard
                        ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF] shadow-xs'
                        : 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                      : 'bg-transparent text-[#1EA854] border-[#1EA854]/30 hover:border-[#1EA854]'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#B5F800]" />}
                  {lvl}
                </button>
              );
            })}
          </div>
          {urgency === 'Immediate Hazard' && (
            <p className="mt-2 font-serif italic text-xs text-[#0036FF] font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              For active fire, gas leaks, or bodily injury emergencies, call Security directly at {campusConfig.emergencyPhone}.
            </p>
          )}
        </div>

        {/* Row 3: Description */}
        <div>
          <label
            htmlFor="report-description"
            className="block font-archivo font-black text-xs tracking-wider uppercase text-[#1EA854] mb-2"
          >
            4. What happened / Needs fixing? <span className="text-[#0036FF]">*</span>
          </label>
          <textarea
            id="report-description"
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: '' });
            }}
            placeholder="Describe the issue clearly. E.g. Water fountain leaking heavily on 2nd floor corridor, creating a slippery hazard..."
            className="w-full bg-[#FAF2EB] border border-[#1EA854]/40 p-4 font-serif text-sm text-[#1EA854] focus-ring-green resize-y"
          />
          {errors.description && (
            <p className="mt-1 font-archivo text-xs text-[#0036FF] font-bold" role="alert">
              {errors.description}
            </p>
          )}
          <p className="mt-1 font-serif italic text-[12px] text-[#1EA854]">
            Note: You can attach photos or videos directly inside your email app or WhatsApp message after dispatch.
          </p>
        </div>

        {/* Row 4: Optional Reporter Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-[#1EA854]/15">
          <div>
            <label
              htmlFor="report-name"
              className="block font-archivo font-extrabold text-[11px] tracking-wider uppercase text-[#1EA854] mb-1"
            >
              Your Name (Optional)
            </label>
            <input
              id="report-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full bg-[#FAF2EB] border border-[#1EA854]/40 px-3 py-2 font-serif text-sm text-[#1EA854] focus-ring-green"
            />
          </div>

          <div>
            <label
              htmlFor="report-contact"
              className="block font-archivo font-extrabold text-[11px] tracking-wider uppercase text-[#1EA854] mb-1"
            >
              Your Contact (Optional Email / Phone)
            </label>
            <input
              id="report-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. alex@campus.edu or +1 555 0122"
              className="w-full bg-[#FAF2EB] border border-[#1EA854]/40 px-3 py-2 font-serif text-sm text-[#1EA854] focus-ring-green"
            />
          </div>
        </div>

        {/* Feedback notice toast / banner: Kiwi Green #9ABC05 */}
        {feedbackNotice && (
          <div className="p-3 bg-[#9ABC05] text-[#FFFFFF] font-archivo text-xs font-bold flex items-center justify-between border border-[#9ABC05]">
            <span>{feedbackNotice}</span>
            <button
              type="button"
              onClick={() => setFeedbackNotice(null)}
              className="text-[#FFFFFF] underline uppercase text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hand-off Action Buttons */}
        <div className="pt-4 border-t border-[#1EA854]/20">
          <span className="block font-archivo font-black text-xs uppercase tracking-wider text-[#1EA854] mb-3">
            DISPATCH VIA YOUR PREFERRED CHANNEL:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Email Button: Electric Blue #0036FF with Bright Lime #B5F800 text */}
            <button
              type="button"
              onClick={handleSendEmail}
              className="bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] py-3.5 px-4 font-archivo font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#0036FF] transition-colors focus-ring-blue shadow-xs"
            >
              <Mail className="w-4 h-4" />
              SEND VIA EMAIL
            </button>

            {/* WhatsApp Button: Kiwi Green #9ABC05 with Crisp White text */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="bg-[#9ABC05] text-[#FFFFFF] hover:bg-[#1EA854] hover:text-[#FFFFFF] py-3.5 px-4 font-archivo font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#9ABC05] transition-colors focus-ring-green shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              SEND VIA WHATSAPP
            </button>

            {/* Clipboard Button: Skin Tone with Civic Green text */}
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="bg-[#FAF2EB] text-[#1EA854] hover:bg-[#1EA854] hover:text-[#FFFFFF] py-3.5 px-4 font-archivo font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#1EA854]/40 transition-colors focus-ring-green"
            >
              {copyStatus ? <Check className="w-4 h-4 text-[#9ABC05]" /> : <Copy className="w-4 h-4" />}
              {copyStatus ? 'COPIED TO CLIPBOARD' : 'COPY REPORT'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
