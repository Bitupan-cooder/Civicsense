import { resolveLocationId } from '../src/locations.ts';

/** Validate the public creation contract before any database writes. */
export function validateSubmission(body: any, userId: string) {
  const title = typeof body?.title === 'string' ? body.title.trim().normalize('NFC') : '';
  const description = typeof body?.description === 'string' ? body.description.trim().normalize('NFC') : '';
  // The reporter no longer chooses a category. Keep the legacy non-null column populated
  // until AI analysis writes the authoritative ai_category and creates the routes.
  const submittedCategory = typeof body?.category === 'string' ? body.category.trim() : '';
  const category = submittedCategory || 'Other';
  const evidence = body?.evidencePublicIds ?? [];
  if (title.length < 5 || title.length > 200) throw new Error('Title must contain 5 to 200 characters.');
  if (description.length < 8 || description.length > 10000) throw new Error('Description must contain 8 to 10,000 characters.');
  if (category.length > 100) throw new Error('Category must be at most 100 characters.');
  if (!Array.isArray(evidence) || evidence.length > 5 || evidence.some((id) => typeof id !== 'string' || !id.startsWith(`civicsense/complaint_evidence/${userId}/`) || id.length > 300 || id.includes('..'))) {
    throw new Error('Attach up to five evidence files uploaded by your account.');
  }
  if (body.location != null && (typeof body.location !== 'string' || body.location.length > 200)) throw new Error('Location must be at most 200 characters.');
  return { title, description, category, evidence: [...new Set(evidence)] as string[], hideName: body.hideName === true, location: resolveLocationId(body.location) || body.location?.trim() || null };
}
