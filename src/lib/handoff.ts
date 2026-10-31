import { Category, Office } from '@/config';

export interface ReportPayload {
  category: string;
  categoryName: string;
  location: string;
  urgency: 'Low' | 'Normal' | 'Urgent' | 'Immediate Hazard';
  description: string;
  name?: string;
  contact?: string;
}

export function buildFormattedMessage(payload: ReportPayload): { subject: string; body: string; fullText: string } {
  const subject = `CivicSense report: ${payload.categoryName}, ${payload.location}`;
  
  const lines: string[] = [
    `Category: ${payload.categoryName}`,
    `Location: ${payload.location}`,
    `Urgency: ${payload.urgency}`,
    `What happened: ${payload.description}`
  ];

  if (payload.name && payload.name.trim().length > 0) {
    lines.push(`Reported by: ${payload.name.trim()}`);
  }

  if (payload.contact && payload.contact.trim().length > 0) {
    lines.push(`Contact: ${payload.contact.trim()}`);
  }

  const body = lines.join('\n');
  const fullText = `Subject: ${subject}\n\n${body}`;

  return { subject, body, fullText };
}

export function getMailtoLink(office: Office | undefined, payload: ReportPayload): string {
  const { subject, body } = buildFormattedMessage(payload);
  const email = office?.email || '';
  const note = `\n\n[Note: Please attach any photos or videos directly to this email before sending.]`;
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body + note);
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
}

export function getWhatsAppLink(office: Office | undefined, payload: ReportPayload): string {
  const { fullText } = buildFormattedMessage(payload);
  const phone = office?.whatsapp?.replace(/[^0-9]/g, '') || '';
  const note = `\n\n(Attach photos directly in this chat)`;
  const encodedText = encodeURIComponent(fullText + note);
  return phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-https or older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
