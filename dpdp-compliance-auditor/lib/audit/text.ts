export const PERSONAL_DATA_TERMS: Array<{ category: string; pattern: RegExp }> = [
  { category: "name", pattern: /\b(full name|first name|last name|name)\b/i },
  { category: "email", pattern: /\b(e-?mail|email address)\b/i },
  { category: "phone", pattern: /\b(phone|mobile|telephone|whatsapp|contact number)\b/i },
  { category: "address", pattern: /\b(address|postal|pin ?code|zip ?code|city|state)\b/i },
  { category: "date-of-birth", pattern: /\b(date of birth|dob|birth date|age)\b/i },
  { category: "government-id", pattern: /\b(aadhaar|aadhar|pan|passport|voter|driving licence|driving license|government id)\b/i },
  { category: "financial", pattern: /\b(bank|account number|ifsc|payment|card|credit|debit|upi|billing)\b/i },
  { category: "location", pattern: /\b(location|gps|geolocation|ip address)\b/i },
  { category: "device", pattern: /\b(device|browser|cookie|ip address|user agent)\b/i },
  { category: "health", pattern: /\b(health|medical|diagnosis|prescription|disability)\b/i },
  { category: "biometric", pattern: /\b(biometric|fingerprint|face|iris|voice print)\b/i },
  { category: "employment", pattern: /\b(employer|employment|resume|cv|salary|designation)\b/i },
  { category: "education", pattern: /\b(education|qualification|degree|university|school|college)\b/i },
  { category: "children", pattern: /\b(child|children|minor|parental consent|guardian)\b/i },
];

export const PURPOSE_TERMS: Array<{ category: string; pattern: RegExp }> = [
  { category: "service-delivery", pattern: /\b(provide|deliver|operate|fulfil|perform|process).{0,40}\b(service|order|request|account|transaction)\b/i },
  { category: "customer-support", pattern: /\b(customer|user|technical|service).{0,30}\b(support|assistance|respond|enquir)/i },
  { category: "marketing", pattern: /\b(marketing|promotional|advertis|newsletter|offers|campaign)\b/i },
  { category: "analytics", pattern: /\b(analytics|measure|statistics|insights|usage|performance)\b/i },
  { category: "personalisation", pattern: /\b(personaliz|personaliz|recommend|preference)\b/i },
  { category: "security", pattern: /\b(security|fraud|abuse|prevent|protect|authenticat)\b/i },
  { category: "legal", pattern: /\b(legal|regulatory|compliance|law enforcement|obligation)\b/i },
  { category: "communication", pattern: /\b(communicat|notify|notification|updates|service message)\b/i },
];

export const RIGHTS_TERMS: Array<{ category: string; pattern: RegExp }> = [
  { category: "access", pattern: /\b(right to access|access (your|my)? ?(personal )?data|request a copy|summary of)\b/i },
  { category: "correction", pattern: /\b(correct|rectif|update).{0,30}\b(personal )?data\b/i },
  { category: "erasure", pattern: /\b(erasure|erase|delete|deletion|right to be forgotten)\b/i },
  { category: "withdrawal", pattern: /\b(withdraw|withdrawal).{0,30}\bconsent\b/i },
  { category: "nomination", pattern: /\b(nominate|nomination)\b/i },
  { category: "grievance", pattern: /\b(grievance|complaint|redressal)\b/i },
];

export const RETENTION_TERMS: RegExp[] = [
  /\bretain(?:ed|ing)?\b/i,
  /\bretention\b/i,
  /\bdelete(?:d|tion)?\b/i,
  /\berase(?:d|ure)?\b/i,
  /\b(?:no longer|as long as)\b.{0,40}\bnecessary\b/i,
  /\b(?:account|data) deletion\b/i,
];

export const CHILD_TERMS: RegExp[] = [
  /\bchild(?:ren)?\b/i,
  /\bminor(?:s)?\b/i,
  /\bunder (?:the age of )?(?:13|16|18)\b/i,
  /\bparent(?:al)?\b/i,
  /\bguardian\b/i,
  /\bteen(?:ager)?\b/i,
  /\bkid(?:s)?\b/i,
];

export const THIRD_PARTY_TERMS: RegExp[] = [
  /\bthird[- ]part(?:y|ies)\b/i,
  /\bprocessors?\b/i,
  /\bservice providers?\b/i,
  /\bshare\b.{0,60}\b(?:partner|vendor|affiliate|advertiser|analytics)\b/i,
  /\btransfer\b.{0,40}\b(?:outside|abroad|international|cross[- ]border)\b/i,
];

export const CONTACT_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+91[\s-]?)?[6-9]\d{9}\b/,
  /\b(?:contact|grievance|dpo|data protection officer)\b/i,
];

export function matchedCategories(
  text: string,
  terms: Array<{ category: string; pattern: RegExp }>,
): string[] {
  return terms
    .filter((term) => term.pattern.test(text))
    .map((term) => term.category);
}

export function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

export function extractEmails(text: string): string[] {
  return [...new Set(text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? [])];
}

export function extractDates(text: string): string[] {
  return [
    ...new Set(
      text.match(
        /\b(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/gi,
      ) ?? [],
    ),
  ];
}

export function looksLikePrivacyNotice(text: string): boolean {
  const signals = [
    /privacy/i,
    /personal data/i,
    /personal information/i,
    /data protection/i,
    /consent/i,
    /grievance/i,
  ];
  return signals.filter((pattern) => pattern.test(text)).length >= 2;
}
