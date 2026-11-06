// UI text in English and Assamese (PRD "Language switch"). Every key must exist in both languages: the `as`
// object is typed against `en`, so a missing translation is a type error.
// Assamese wording: please have a native speaker review it.
import { createElement, useEffect, useSyncExternalStore } from 'react';
import { applyUiLanguage, ASSAMESE_UI_TEXT } from './uiTranslations';

const en = {
  'lang.toggle': 'অসমীয়া',
  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.cancel': 'Cancel',
  'common.notInstalled': 'This feature switches on after the database migration has been run.',
  'common.signInToContinue': 'Log in or sign up to continue.',

  'nav.home': 'Home',
  'nav.report': 'Report an issue',
  'nav.my': 'My complaints',
  'nav.login': 'Log in',
  'nav.signup': 'Sign up',
  'nav.myDesk': 'My desk',
  'nav.queue': 'Complaint queue',
  'nav.review': 'Review queue',
  'nav.duplicates': 'Possible duplicates',
  'nav.stats': 'Statistics',
  'nav.routing': 'Routing',
  'nav.system': 'System',
  'nav.map': 'Campus map',

  'login.title': 'Log in',
  'login.signupTitle': 'Sign up',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.name': 'Full name',
  'login.readingLanguage': 'Reading language',
  'login.idCard': 'Student ID card (image or PDF, max 5 MB)',
  'login.submit': 'Log in',
  'login.signupSubmit': 'Create account',
  'login.officials': 'University officials and union posts log in at the official console.',

  'my.title': 'My complaints',
  'my.empty': 'You have not filed any complaints yet.',
  'my.open': 'Open',

  'complaint.title': 'Complaint',
  'complaint.notFound': 'No complaint found with this reference.',
  'complaint.original': 'What you wrote',
  'complaint.summary': 'Summary',
  'complaint.history': 'Status history',
  'complaint.duplicateOf': 'Merged into',
  'complaint.isFixed': 'Is it fixed?',
  'complaint.confirm': "Yes, it's fixed",
  'complaint.reopen': 'No, reopen it',
  'complaint.reopenNote': 'What is still wrong?',

  'review.title': 'Review queue',
  'review.empty': 'Nothing waiting for review.',
  'review.routeAs': 'Route as',
  'review.route': 'Route complaint',

  'dup.title': 'Possible duplicates',
  'dup.empty': 'No possible duplicates.',
  'dup.similarity': 'Similarity',
  'dup.merge': 'Merge into original',
  'dup.dismiss': 'Not a duplicate',

  'nav.signals': 'Group signals',
  'nav.menu': 'Menu',
  'nav.closeMenu': 'Close menu',
  'nav.collapse': 'Collapse sidebar',
  'nav.expand': 'Expand sidebar',
  'nav.logout': 'Log out',
  'signals.title': 'Group signals',
  'signals.intro': 'Issues students raised by tagging the CivicSense bot in Telegram or Discord groups, before anyone filed a complaint. Only the tagged message is kept.',
  'signals.empty': 'No issues raised in groups in the last 30 days.',
  'signals.students': 'students',
  'signals.note': 'Note for the group (optional)',
  'signals.acknowledge': 'Acknowledge in group',
  'signals.convert': 'Make official complaint',
  'signals.dismiss': 'Dismiss',
  'signals.sensitive': 'Sensitive: nothing is posted in the group',
  'signals.student': 'student',
  'signals.status.pending': 'Waiting for more students',
  'signals.status.open': 'Open',
  'signals.status.acknowledged': 'Acknowledged',
  'signals.status.converted': 'Made a complaint',
  'signals.status.dismissed': 'Dismissed',
  'signals.tagged': 'Tagged message',
  'signals.routedTo': 'Routed to',
  'signals.openComplaint': 'Open complaint',

  'stats.title': 'Statistics',
  'stats.total': 'Total complaints',
  'stats.avgResolution': 'Average resolution time (hours)',
  'stats.byStatus': 'By status',
  'stats.byCategory': 'By category',
  'stats.byLocation': 'By place',
  'stats.byPriority': 'By priority',

  'routing.title': 'Routing',
  'routing.posts': 'Posts',
  'routing.rules': 'Rules',
  'routing.post': 'Post',
  'routing.person': 'Current holder',
  'routing.email': 'Login email',
  'routing.active': 'Active',
  'routing.category': 'Category',
  'routing.primary': 'Must resolve',
  'routing.copies': 'Copied',
  'routing.escalateTo': 'Escalate to',
  'routing.hours': 'Response hours',

  'map.title': 'Campus map',
  'map.noPlace': 'Without a campus place',
  'map.filterStatus': 'Status',
  'map.filterPriority': 'Priority',
  'map.filterCategory': 'Category',
  'map.all': 'All',
};

export type TextKey = keyof typeof en;

const as: Record<TextKey, string> = {
  'lang.toggle': 'English',
  'common.loading': 'ল\'ড হৈ আছে…',
  'common.retry': 'পুনৰ চেষ্টা কৰক',
  'common.save': 'সংৰক্ষণ কৰক',
  'common.saving': 'সংৰক্ষণ হৈ আছে…',
  'common.cancel': 'বাতিল',
  'common.notInstalled': 'ডাটাবেছ মাইগ্ৰেচন চলোৱাৰ পিছত এই সুবিধা উপলব্ধ হ\'ব।',
  'common.signInToContinue': 'আগবাঢ়িবলৈ লগ ইন বা ছাইন আপ কৰক।',

  'nav.home': 'মুখ্য পৃষ্ঠা',
  'nav.report': 'সমস্যা জনাওক',
  'nav.my': 'মোৰ অভিযোগসমূহ',
  'nav.login': 'লগ ইন',
  'nav.signup': 'ছাইন আপ',
  'nav.myDesk': 'মোৰ ডেস্ক',
  'nav.queue': 'অভিযোগৰ তালিকা',
  'nav.review': 'পুনৰীক্ষণৰ তালিকা',
  'nav.duplicates': 'সম্ভাব্য একে অভিযোগ',
  'nav.stats': 'পৰিসংখ্যা',
  'nav.routing': 'ৰাউটিং',
  'nav.system': 'ছিষ্টেম',
  'nav.map': 'কেম্পাছৰ মানচিত্ৰ',

  'login.title': 'লগ ইন',
  'login.signupTitle': 'ছাইন আপ',
  'login.email': 'ইমেইল',
  'login.password': 'পাছৱৰ্ড',
  'login.name': 'সম্পূৰ্ণ নাম',
  'login.readingLanguage': 'পঢ়াৰ ভাষা',
  'login.idCard': 'ছাত্ৰ পৰিচয়পত্ৰ (ছবি বা PDF, সৰ্বাধিক ৫ MB)',
  'login.submit': 'লগ ইন কৰক',
  'login.signupSubmit': 'একাউণ্ট সৃষ্টি কৰক',
  'login.officials': 'বিশ্ববিদ্যালয়ৰ বিষয়া আৰু ছাত্ৰ একতা সভাৰ পদাধিকাৰীসকলে অফিচিয়েল কনছ\'লত লগ ইন কৰে।',

  'my.title': 'মোৰ অভিযোগসমূহ',
  'my.empty': 'আপুনি এতিয়ালৈকে কোনো অভিযোগ দাখিল কৰা নাই।',
  'my.open': 'খোলক',

  'complaint.title': 'অভিযোগ',
  'complaint.notFound': 'এই নম্বৰৰ কোনো অভিযোগ পোৱা নগ\'ল।',
  'complaint.original': 'আপুনি যি লিখিছিল',
  'complaint.summary': 'সাৰাংশ',
  'complaint.history': 'স্থিতিৰ ইতিহাস',
  'complaint.duplicateOf': 'একত্ৰিত কৰা হৈছে',
  'complaint.isFixed': 'সমাধান হ\'লনে?',
  'complaint.confirm': 'হয়, সমাধান হৈছে',
  'complaint.reopen': 'নহয়, পুনৰ খোলক',
  'complaint.reopenNote': 'এতিয়াও কি সমস্যা আছে?',

  'review.title': 'পুনৰীক্ষণৰ তালিকা',
  'review.empty': 'পুনৰীক্ষণৰ বাবে একো বাকী নাই।',
  'review.routeAs': 'এই হিচাপে পঠিয়াওক',
  'review.route': 'অভিযোগ পঠিয়াওক',

  'dup.title': 'সম্ভাব্য একে অভিযোগ',
  'dup.empty': 'কোনো সম্ভাব্য একে অভিযোগ নাই।',
  'dup.similarity': 'মিল',
  'dup.merge': 'মূলটোৰ সৈতে একত্ৰিত কৰক',
  'dup.dismiss': 'একে অভিযোগ নহয়',

  'nav.signals': 'গোটৰ সংকেত',
  'nav.menu': 'মেনু',
  'nav.closeMenu': 'মেনু বন্ধ কৰক',
  'nav.collapse': 'চাইডবাৰ সৰু কৰক',
  'nav.expand': 'চাইডবাৰ ডাঙৰ কৰক',
  'nav.logout': 'লগ আউট',
  'signals.title': 'গোটৰ সংকেত',
  'signals.intro': 'অভিযোগ দাখিল কৰাৰ আগতেই ছাত্ৰ-ছাত্ৰীয়ে টেলিগ্ৰাম বা ডিস্কৰ্ড গোটত CivicSense বটক টেগ কৰি উত্থাপন কৰা সমস্যা। কেৱল টেগ কৰা বাৰ্তাটোহে ৰখা হয়।',
  'signals.empty': 'যোৱা ৩০ দিনত গোটত কোনো সমস্যা উত্থাপন কৰা হোৱা নাই।',
  'signals.students': 'জন ছাত্ৰ-ছাত্ৰী',
  'signals.note': 'গোটৰ বাবে টোকা (বৈকল্পিক)',
  'signals.acknowledge': 'গোটত স্বীকাৰ কৰক',
  'signals.convert': 'আনুষ্ঠানিক অভিযোগ কৰক',
  'signals.dismiss': 'বাতিল কৰক',
  'signals.sensitive': 'সংবেদনশীল: গোটত একো প্ৰকাশ কৰা নহয়',
  'signals.student': 'জন ছাত্ৰ-ছাত্ৰী',
  'signals.status.pending': 'অধিক ছাত্ৰ-ছাত্ৰীৰ অপেক্ষাত',
  'signals.status.open': 'খোলা',
  'signals.status.acknowledged': 'স্বীকাৰ কৰা হৈছে',
  'signals.status.converted': 'অভিযোগ কৰা হৈছে',
  'signals.status.dismissed': 'বাতিল কৰা হৈছে',
  'signals.tagged': 'টেগ কৰা বাৰ্তা',
  'signals.routedTo': 'পঠোৱা হৈছে',
  'signals.openComplaint': 'অভিযোগ খোলক',

  'stats.title': 'পৰিসংখ্যা',
  'stats.total': 'মুঠ অভিযোগ',
  'stats.avgResolution': 'সমাধানৰ গড় সময় (ঘণ্টা)',
  'stats.byStatus': 'স্থিতি অনুসৰি',
  'stats.byCategory': 'শ্ৰেণী অনুসৰি',
  'stats.byLocation': 'স্থান অনুসৰি',
  'stats.byPriority': 'অগ্ৰাধিকাৰ অনুসৰি',

  'routing.title': 'ৰাউটিং',
  'routing.posts': 'পদসমূহ',
  'routing.rules': 'নিয়মসমূহ',
  'routing.post': 'পদ',
  'routing.person': 'বৰ্তমানৰ পদাধিকাৰী',
  'routing.email': 'লগ ইন ইমেইল',
  'routing.active': 'সক্ৰিয়',
  'routing.category': 'শ্ৰেণী',
  'routing.primary': 'সমাধান কৰিব লাগিব',
  'routing.copies': 'প্ৰতিলিপি',
  'routing.escalateTo': 'ওপৰলৈ পঠিয়াওক',
  'routing.hours': 'উত্তৰৰ সময় (ঘণ্টা)',

  'map.title': 'কেম্পাছৰ মানচিত্ৰ',
  'map.noPlace': 'কেম্পাছৰ স্থান নথকা',
  'map.filterStatus': 'স্থিতি',
  'map.filterPriority': 'অগ্ৰাধিকাৰ',
  'map.filterCategory': 'শ্ৰেণী',
  'map.all': 'সকলো',
};

export type Language = 'en' | 'as';
const DICTIONARIES: Record<Language, Record<TextKey, string>> = { en, as };
const UI_TRANSLATIONS: Record<string, string> = {
  ...Object.fromEntries(Object.keys(en).map((key) => [
    en[key as TextKey].replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(),
    as[key as TextKey],
  ])),
  ...ASSAMESE_UI_TEXT,
};
const STORAGE_KEY = 'civicsense-lang';

function readStored(): Language {
  try { return localStorage.getItem(STORAGE_KEY) === 'as' ? 'as' : 'en'; } catch { return 'en'; }
}

let current: Language = readStored();
const listeners = new Set<() => void>();
let persist: ((lang: Language) => void) | null = null;

/** Each app registers how to save the choice to the signed-in user's profile (PRD). */
export function setLanguagePersister(fn: ((lang: Language) => void) | null): void { persist = fn; }

export function setLanguage(lang: Language, { save = true } = {}): void {
  if (lang === current) return;
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
  document.documentElement.lang = lang;
  applyUiLanguage(lang, UI_TRANSLATIONS);
  listeners.forEach((n) => n());
  if (save) persist?.(lang);
}

export function t(key: TextKey, lang: Language = current): string {
  return DICTIONARIES[lang][key];
}

/** Current language plus a `t` bound to it; components re-render when it changes. */
export function useLanguage() {
  const lang = useSyncExternalStore(
    (n) => { listeners.add(n); return () => { listeners.delete(n); }; },
    () => current,
  );
  return { lang, setLanguage, t: (key: TextKey) => t(key, lang) };
}

/** Unstyled toggle (styling: frontend). Shows the other language's name. */
export function LanguageToggle() {
  const { lang, t: tr } = useLanguage();
  useEffect(() => { applyUiLanguage(lang, UI_TRANSLATIONS); }, [lang]);
  const target = lang === 'en' ? 'as' : 'en';
  const label = lang === 'en' ? 'Switch language to Assamese' : 'ভাষা ইংৰাজীলৈ সলনি কৰক';
  return createElement('button', {
    type: 'button',
    className: 'language-toggle',
    lang: target,
    title: label, // accessible name = the visible language name (Lighthouse: label must contain the visible text)
    onClick: () => setLanguage(target),
  }, tr('lang.toggle'));
}
