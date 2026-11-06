// Campus landmarks: names and keywords (language/place detection) and GPS coordinates (map pins).

export var CAMPUS_LOCATIONS = [
  { id: 'du_hostel_1', name_en: 'Padmanath Gohain Baruah Chatra Nivas (Hostel 1)', name_as: 'পদ্মনাথ গোহাঞিবৰুৱা ছাত্ৰ নিৱাস (হোষ্টেল ১)', keys: ['hostel 1', 'pngb', 'padmanath', 'হোষ্টেল ১', '১ নম্বৰ হোষ্টেল', 'hostel 1 r'] },
  { id: 'du_hostel_2', name_en: 'Maniram Dewan Chatra Nivas (Hostel 2)', name_as: 'মণিৰাম দেৱান ছাত্ৰ নিৱাস (হোষ্টেল ২)', keys: ['hostel 2', 'maniram', 'হোষ্টেল ২', '২ নম্বৰ হোষ্টেল', 'hostel 2 r'] },
  { id: 'du_hostel_girls_1', name_en: 'Joymoti Chatri Nivas (Girls Hostel 1)', name_as: 'জয়মতী ছাত্ৰী নিৱাস (হোষ্টেল ১)', keys: ['joymoti', 'girls hostel 1', 'জয়মতী'] },
  { id: 'du_hostel_girls_2', name_en: 'Nalini Bala Devi Chatri Nivas (Girls Hostel 2)', name_as: 'নলিনীবালা দেৱী ছাত্ৰী নিৱাস', keys: ['nalini', 'girls hostel 2', 'নলিনীবালা'] },
  { id: 'du_ccsa', name_en: 'Centre for Computer Science & Applications (CCSA)', name_as: 'চি চি এছ এ (পৰিকলন অধ্যয়ন কেন্দ্ৰ)', keys: ['ccsa', 'computer centre', 'cs dept', 'চিচিএছএ'] },
  { id: 'du_library', name_en: 'Lakshminath Bezbaroa Central Library', name_as: 'লক্ষ্মীনাথ বেজবৰুৱা কেন্দ্ৰীয় গ্ৰন্থাগাৰ', keys: ['library', 'reading room', 'গ্ৰন্থাগাৰ', 'লাইব্ৰেৰী', 'bezbaroa'] },
  { id: 'du_admin', name_en: 'Administrative Building & Registrar Office', name_as: 'প্ৰশাসনিক ভৱন', keys: ['admin', 'registrar', 'প্ৰশাসনিক ভৱন'] },
  { id: 'du_canteen', name_en: 'Central Canteen & Student Activity Centre', name_as: 'কেন্দ্ৰীয় কেণ্টিন আৰু ছাত্ৰ সন্থাকক্ষ', keys: ['canteen', 'sac', 'কেণ্টিন'] },
  { id: 'du_sports_ground', name_en: 'University Sports Ground & Pavilion', name_as: 'বিশ্ববিদ্যালয় খেলপথাৰ', keys: ['ground', 'pavilion', 'sports ground', 'play ground', 'খেলপথাৰ', 'cricket ground'] },
  { id: 'du_science_quad', name_en: 'Science Block & Academic Quad', name_as: 'বিজ্ঞান ভৱন চত্বৰ', keys: ['science block', 'physics lab', 'chemistry', 'বিজ্ঞান ভৱন', 'duiet'] }
];

/* Campus landmarks with GPS coordinates (map pins) */
export var CAMPUS_LOCATION_COORDS = {
  du_hostel_1: { lat: 27.4526, lng: 94.8904, name: 'Padmanath Gohain Baruah Chatra Nivas (Hostel 1)' },
  du_hostel_2: { lat: 27.4520, lng: 94.8910, name: 'Maniram Dewan Chatra Nivas (Hostel 2)' },
  du_hostel_girls_1: { lat: 27.4519, lng: 94.8938, name: 'Joymoti Chatri Nivas (Girls Hostel 1)' },
  du_hostel_girls_2: { lat: 27.4525, lng: 94.8942, name: 'Nalini Bala Devi Chatri Nivas (Girls Hostel 2)' },
  du_library: { lat: 27.4505, lng: 94.8931, name: 'Lakshminath Bezbaroa Central Library' },
  du_ccsa: { lat: 27.4510, lng: 94.8935, name: 'Centre for Computer Science & Applications (CCSA)' },
  du_admin: { lat: 27.4512, lng: 94.8918, name: 'Administrative Building & Registrar Office' },
  du_canteen: { lat: 27.4515, lng: 94.8925, name: 'Central Canteen & Student Activity Centre' },
  du_sports_ground: { lat: 27.4484, lng: 94.8912, name: 'University Sports Ground & Pavilion' },
  du_science_quad: { lat: 27.4514, lng: 94.8912, name: 'Science Block & Academic Quad' }
};
