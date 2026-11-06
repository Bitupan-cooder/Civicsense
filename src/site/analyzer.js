// Language and landmark detection for complaint text (runs in the browser, no network).
// Moved verbatim from the original index.html page script (React migration); only imports/exports were added.
import { CAMPUS_LOCATIONS } from './demoData.js';

/* ══════════ CIVICSENSE AI ANALYSIS ENGINE & WORKSPACE ══════════ */

/* Helper: Assamese numerals to standard */
function normalizeAssameseNumerals(str) {
  if (!str) return '';
  var map = { '০':'0', '১':'1', '২':'2', '৩':'3', '৪':'4', '৫':'5', '৬':'6', '৭':'7', '৮':'8', '৯':'9' };
  return str.replace(/[০-৯]/g, function(m) { return map[m] || m; });
}

/* Helper: Language detection */
function detectLanguage(text) {
  var hasAssamese = /[\u0980-\u09FF]/.test(text);
  var hasLatin = /[a-zA-Z]/.test(text);
  if (hasAssamese && !hasLatin) return 'as';
  if (!hasAssamese && hasLatin) {
    var lower = text.toLowerCase();
    var romMarkers = ['pani', 'nai', 'ase', 'solua', 'jola', 'bhal', 'khowa', 'nohoi', 'kotha', 'kori', 'etiya', 'bohut', 'dibo', 'hobo', 'dui', 'tini', 'char', 'lora', 'suwali', 'r bathroom', 't pani', 'dhori', 'bhangile'];
    for (var i = 0; i < romMarkers.length; i++) {
      if (lower.indexOf(romMarkers[i]) !== -1) return 'mixed';
    }
    return 'en';
  }
  return 'mixed';
}

/* ══════════ CIVICSENSE AI ANALYSIS ENGINE (10-STEP SPEC) ══════════ */
export function analyzeComplaint(text, photoName, locationOverride, langPref) {
  if (!text || text.trim().length < 4) {
    return {
      language: 'en',
      category: 'other',
      secondary_category: null,
      priority: 4,
      priority_reason: 'Input is empty, unreadable or not a valid campus complaint.',
      location_id: null,
      location_text: null,
      summary_en: 'Empty or invalid input.',
      summary_as: 'অকাৰ্যকৰী বা অসম্পূৰ্ণ আবেদন।',
      assamese_quality: 'high',
      image_findings: null,
      sensitive: false,
      sensitive_reason: null,
      embedding_text: 'Invalid empty complaint',
      confidence: 0.2,
      needs_review: true
    };
  }

  var raw = text.trim();
  var normalized = normalizeAssameseNumerals(raw);
  var lower = normalized.toLowerCase();
  var lang = detectLanguage(raw);

  // Step 3: Image findings
  var imageFindings = null;
  var imageHazard = false;
  if (photoName) {
    var pl = photoName.toLowerCase();
    if (pl.indexOf('wire') !== -1 || pl.indexOf('spark') !== -1 || pl.indexOf('fire') !== -1 || pl.indexOf('shock') !== -1) {
      imageFindings = 'Photo visibly shows exposed electrical wiring and spark hazard.';
      imageHazard = true;
    } else if (pl.indexOf('leak') !== -1 || pl.indexOf('water') !== -1 || pl.indexOf('flood') !== -1) {
      imageFindings = 'Photo visibly shows heavy water leakage pooling across the floor.';
      imageHazard = true;
    } else if (pl.indexOf('trash') !== -1 || pl.indexOf('waste') !== -1 || pl.indexOf('garbage') !== -1) {
      imageFindings = 'Photo visibly shows overflowing waste bin onto public walkway.';
    } else {
      imageFindings = 'Photo shows reported issue on site.';
    }
  }

  // Step 4: Location match
  var locMatch = null;
  for (var i = 0; i < CAMPUS_LOCATIONS.length; i++) {
    var l = CAMPUS_LOCATIONS[i];
    for (var k = 0; k < l.keys.length; k++) {
      if (lower.indexOf(l.keys[k]) !== -1) {
        locMatch = l;
        break;
      }
    }
    if (locMatch) break;
  }
  if (!locMatch && locationOverride && locationOverride !== 'OTHER') {
    for (var j = 0; j < CAMPUS_LOCATIONS.length; j++) {
      if (CAMPUS_LOCATIONS[j].id === locationOverride || CAMPUS_LOCATIONS[j].name_en === locationOverride) {
        locMatch = CAMPUS_LOCATIONS[j];
        break;
      }
    }
  }
  var locationId = locMatch ? locMatch.id : null;
  var locationText = locMatch ? locMatch.name_en : (locationOverride && locationOverride !== 'OTHER' ? locationOverride : null);

  // Step 5: Classify Category (1 of 20)
  var CAT_KEYWORDS = {
    electricity: ['light', 'dark', 'street light', 'power', 'socket', 'wire', 'spark', 'breaker', 'fan', 'switch', 'electricity', 'বিদ্যুৎ', 'বিজুলী', 'লাইট', 'ফেন', 'তাঁৰ', 'কাৰেণ্ট', 'ব্ৰেকাৰ', 'jola nai', 'solua nai', 'line dhar'],
    water: ['water', 'tap', 'leak', 'pipe', 'pipeline', 'drainage', 'toilet', 'flush', 'plumbing', 'drinking water', 'cooler', 'পানী', 'টেপ', 'পাইপ', 'নল', 'পানি', 'pani nai', 'pani', 'leakage'],
    sanitation: ['dustbin', 'garbage', 'trash', 'waste', 'recycling', 'litter', 'smell', 'plastic', 'dump', 'cleanliness', 'জাবৰ', 'ডাস্টবিন', 'আৱৰ্জনা', 'অমেধ্য', 'লেতেৰা', 'gandha'],
    hostel: ['hostel', 'room', 'mess', 'food', 'geyser', 'bed', 'warden', 'curfew', 'dining', 'laundry', 'হোষ্টেল', 'মেছ', 'খাদ্য', 'ৰুম', 'কোঠা', 'হোষ্টেলৰ'],
    library: ['library', 'reading room', 'book', 'journal', 'librarian', 'গ্ৰন্থাগাৰ', 'লাইব্ৰেৰী', 'কিতাপ'],
    classroom: ['classroom', 'bench', 'projector', 'board', 'desk', 'podium', 'শ্ৰেণীকক্ষ', 'বেঞ্চ', 'প্ৰজেক্টৰ', 'ফলক'],
    road_transport: ['road', 'path', 'pothole', 'bus', 'parking', 'transport', 'vehicle', 'পথ', 'ৰাস্তা', 'বাছ', 'পাৰ্কিং', 'যানবাহন'],
    safety: ['safety', 'security', 'theft', 'threat', 'guard', 'stray dog', 'cctv', 'assault', 'harassment', 'ragging', 'নিৰাপত্তা', 'চুৰি', 'ভয়', 'ৰেগিং', 'হৈৰাণ'],
    internet: ['wifi', 'wi-fi', 'internet', 'lan', 'network', 'router', 'ethernet', 'connection', 'ৱাইফাই', 'ইণ্টাৰনেট', 'নেটৱৰ্ক'],
    sports: ['sports', 'ground', 'gym', 'football', 'badminton', 'tournament', 'equipment', 'খেলপথাৰ', 'ব্যায়ামাগাৰ', 'খেল'],
    cricket: ['cricket', 'pitch', 'cricket net', 'cricket nets', 'practice net', 'practice nets', 'wicket', 'bat', 'ball', 'ক্ৰিকেট'],
    music: ['music', 'instrument', 'song', 'acoustic', 'amplifier', 'guitar', 'সংগীত', 'বাদ্যযন্ত্ৰ', 'গান'],
    debating: ['debate', 'debating', 'symposium', 'speaker', 'motion', 'তৰ্ক', 'বক্তৃতা'],
    fine_arts_literary: ['art', 'painting', 'drawing', 'drama', 'cultural', 'সাহিত্য', 'কলা', 'চিত্রকলা'],
    magazine: ['magazine', 'editorial', 'article', 'editor', 'publication', 'আলোচনী'],
    girls_common_room: ['girls common room', 'gcr', 'girls rest room', 'ছাত্ৰী জিৰণি কোঠা'],
    boys_common_room: ['boys common room', 'bcr', 'boys rest room', 'ছাত্ৰ জিৰণি কোঠা'],
    social_service: ['social service', 'cleanliness drive', 'blood donation', 'nss', 'সমাজসেৱা'],
    general: ['general', 'scholarship', 'identity card', 'certificate', 'দৰখাস্ত']
  };

  var bestCat = 'general';
  var maxMatches = 0;
  var secCat = null;

  for (var cat in CAT_KEYWORDS) {
    var words = CAT_KEYWORDS[cat];
    var count = 0;
    for (var w = 0; w < words.length; w++) {
      if (lower.indexOf(words[w]) !== -1) count++;
    }
    if (count > maxMatches) {
      secCat = bestCat !== 'general' ? bestCat : null;
      maxMatches = count;
      bestCat = cat;
    }
  }
  if (maxMatches === 0) bestCat = 'other';

  // Step 7: Check Sensitivity
  var sensitive = false;
  var sensitiveReason = null;
  var sensKeywords = ['harassment', 'ragging', 'assault', 'abuse', 'discriminate', 'self-harm', 'suicide', 'threatened by', 'ৰেগিং', 'হৈৰাণ', 'আক্ৰমণ'];
  for (var s = 0; s < sensKeywords.length; s++) {
    if (lower.indexOf(sensKeywords[s]) !== -1) {
      sensitive = true;
      sensitiveReason = 'Complaint involves allegations of ' + sensKeywords[s] + ' or personal safety violation.';
      break;
    }
  }

  // Step 6: Set Priority (1 to 4)
  var priority = 3;
  var priorityReason = 'Standard campus service issue with available workaround.';

  if (sensitive || imageHazard || lower.indexOf('spark') !== -1 || lower.indexOf('live wire') !== -1 || lower.indexOf('fire') !== -1 || lower.indexOf('collapse') !== -1 || lower.indexOf('assault') !== -1 || lower.indexOf('জরুৰী') !== -1 || lower.indexOf('বিপদজনক') !== -1) {
    priority = 1;
    priorityReason = 'Immediate risk to life, health or physical safety requiring emergency response.';
  } else if (lower.indexOf('no water') !== -1 || lower.indexOf('pani nai') !== -1 || lower.indexOf('blackout') !== -1 || lower.indexOf('completely unusable') !== -1 || lower.indexOf('since monday') !== -1 || lower.indexOf('for days') !== -1 || lower.indexOf('দিন ধৰি') !== -1 || lower.indexOf('অচল') !== -1) {
    priority = 2;
    priorityReason = 'Facility unusable or large group of campus residents affected without immediate alternative.';
  } else if (lower.indexOf('minor') !== -1 || lower.indexOf('cosmetic') !== -1 || lower.indexOf('suggestion') !== -1 || lower.indexOf('sound proofing') !== -1) {
    priority = 4;
    priorityReason = 'Minor maintenance request or cosmetic enhancement.';
  }

  // Step 8: Write Summaries (using Assamese letters ৰ and ৱ)
  var summaryEn = '';
  var summaryAs = '';
  var locNameEn = locationText || 'campus premises';
  var locNameAs = locMatch ? locMatch.name_as : 'বিশ্ববিদ্যালয় চৌহদ';

  if (bestCat === 'water') {
    summaryEn = 'Water supply disruption and plumbing defect reported at ' + locNameEn + '.';
    summaryAs = locNameAs + 'ত পানী যোগান বন্ধ হোৱা আৰু টেপ বা পাইপৰ বিসংগতিৰ বিষয়ে আবেদন জনোৱা হৈছে।';
  } else if (bestCat === 'electricity') {
    summaryEn = 'Power outage and pathway fixture failure reported at ' + locNameEn + '.';
    summaryAs = locNameAs + 'ত বিদ্যুৎ বিভ্ৰাট আৰু লাইট বিকল হোৱাৰ সমস্যা দেখা গৈছে।';
  } else if (bestCat === 'internet') {
    summaryEn = 'Network connectivity outage and Wi-Fi access disruption reported at ' + locNameEn + '.';
    summaryAs = locNameAs + 'ত ৱাইফাই আৰু ইণ্টাৰনেট সংযোগ ব্যাহত হোৱাৰ অভিযোগ দাখিল কৰা হৈছে।';
  } else if (bestCat === 'safety') {
    summaryEn = sensitive ? 'Confidential safety concern involving a named individual reported at ' + locNameEn + '.' : 'Campus safety and security concern identified at ' + locNameEn + '.';
    summaryAs = locNameAs + 'ত ছাত্ৰ-ছাত্ৰীৰ নিৰাপত্তা আৰু আলোক ব্যৱস্থাৰ বিসংগতিৰ অভিযোগ কৰা হৈছে।';
  } else if (bestCat === 'sanitation') {
    summaryEn = 'Sanitation overflow and waste bin clearing required at ' + locNameEn + '.';
    summaryAs = locNameAs + 'ত জাবৰ-আৱৰ্জনা জমা হোৱা আৰু অনাময় ব্যৱস্থাৰ সমস্যা দৃষ্টিগোচৰ কৰা হৈছে।';
  } else if (bestCat === 'hostel') {
    summaryEn = 'Hostel residential and amenity issue reported at ' + locNameEn + '.';
    summaryAs = locNameAs + 'ৰ আৱাসিক সুবিধা আৰু কোঠাৰ সমস্যা সমাধানৰ বাবে আৱেদন জনোৱা হৈছে।';
  } else {
    summaryEn = 'Campus issue regarding ' + bestCat + ' reported at ' + locNameEn + '.';
    summaryAs = locNameAs + 'ত ' + bestCat + ' সম্পৰ্কীয় সমস্যা সমাধানৰ বাবে দৃষ্টিগোচৰ কৰা হৈছে।';
  }

  // Step 9: Embedding text for duplicate matching
  var embeddingText = (bestCat + ' issue at ' + locNameEn).replace(/\s+/g, ' ').trim();

  // Step 10: Score Confidence (0.0 to 1.0)
  var confidence = maxMatches > 0 ? 0.95 : 0.72;
  if (bestCat === 'other') confidence = 0.45;
  var needsReview = confidence < 0.6 || bestCat === 'other';

  return {
    language: lang,
    category: bestCat,
    secondary_category: secCat,
    priority: priority,
    priority_reason: priorityReason,
    location_id: locationId,
    location_text: locationText,
    summary_en: summaryEn,
    summary_as: summaryAs,
    assamese_quality: 'high',
    image_findings: imageFindings,
    sensitive: sensitive,
    sensitive_reason: sensitiveReason,
    embedding_text: embeddingText,
    confidence: confidence,
    needs_review: needsReview
  };
}
