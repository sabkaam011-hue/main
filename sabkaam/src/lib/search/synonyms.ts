/**
 * Synonym groups. Every term in a group expands to every other term in the group.
 * Include English, Hinglish (romanised Hindi) and Devanagari variants.
 * Keep terms lowercase; multi-word entries are matched as phrases.
 */
export const SYNONYM_GROUPS: string[][] = [
  ["loan", "loans", "rin", "karz", "karza", "ऋण", "लोन", "कर्ज", "कर्ज़"],
  ["pan", "pancard", "pen", "पैन"],
  ["aadhaar", "aadhar", "adhar", "adhaar", "uid", "uidai", "आधार"],
  ["voter", "epic", "matdata", "election", "वोटर", "मतदाता"],
  ["scholarship", "scholarships", "chhatravritti", "chatravriti", "vazifa", "wazifa", "छात्रवृत्ति", "स्कॉलरशिप", "वजीफा"],
  ["job", "jobs", "naukri", "naukari", "vacancy", "bharti", "recruitment", "rozgar", "नौकरी", "भर्ती", "रोजगार", "रोज़गार"],
  ["exam", "exams", "pariksha", "test", "परीक्षा"],
  ["scheme", "schemes", "yojana", "yojna", "योजना"],
  ["farmer", "farmers", "kisan", "kisaan", "किसान", "krishi", "कृषि", "agriculture", "agri"],
  ["house", "housing", "home", "ghar", "makan", "awas", "aawas", "घर", "मकान", "आवास"],
  ["health", "swasthya", "hospital", "स्वास्थ्य", "इलाज", "ilaj", "treatment"],
  ["insurance", "bima", "beema", "बीमा"],
  ["certificate", "praman", "pramanpatra", "प्रमाणपत्र", "प्रमाण"],
  ["business", "vyapar", "vyaapar", "dhandha", "व्यवसाय", "व्यापार", "धंधा", "udyog", "उद्योग"],
  ["msme", "udyam", "उद्यम", "एमएसएमई"],
  ["cibil", "sibil", "civil", "सिबिल", "credit score", "क्रेडिट स्कोर"],
  ["status", "track", "स्टेटस", "स्थिति"],
  ["correction", "update", "change", "sudhar", "सुधार", "बदलाव"],
  ["documents", "document", "dastavez", "kagaz", "kagzat", "दस्तावेज़", "दस्तावेज", "कागज़"],
  ["passport", "पासपोर्ट"],
  ["pension", "पेंशन"],
  ["result", "results", "रिज़ल्ट", "रिजल्ट", "परिणाम"],
  ["admit", "hall ticket", "एडमिट", "प्रवेश पत्र"],
  ["licence", "license", "लाइसेंस"],
  ["gas", "lpg", "cylinder", "गैस", "सिलेंडर"],
  ["student", "chhatra", "छात्र"],
  ["women", "woman", "mahila", "महिला"],
  ["help", "sahayata", "madad", "assistance", "सहायता", "मदद"],
  ["apply", "aavedan", "avedan", "आवेदन"],
  ["bank", "बैंक"],
  ["card", "कार्ड"],
];

const map = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    const set = map.get(term) ?? new Set<string>();
    for (const other of group) if (other !== term) set.add(other);
    map.set(term, set);
  }
}

export function synonymsOf(term: string): string[] {
  return Array.from(map.get(term) ?? []);
}

/** Words ignored when scoring (English, Hinglish and Hindi connectors). */
export const STOPWORDS = new Set([
  "for", "the", "a", "an", "of", "to", "how", "what", "is", "in", "on", "my", "me", "i", "and", "with", "online", "kaise", "kare", "karen", "kya", "hai", "ke", "ki", "ka", "ko", "liye", "mein", "me", "se",
  "के", "की", "का", "को", "में", "लिए", "कैसे", "करें", "है", "से", "क्या", "और",
]);
