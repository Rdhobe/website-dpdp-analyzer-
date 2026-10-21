export const TEST_STATUSES = [
  "PASS",
  "FAIL",
  "WARNING",
  "NEEDS_REVIEW",
  "NOT_ASSESSED",
  "NOT_APPLICABLE",
] as const;

export type TestStatus = (typeof TEST_STATUSES)[number];

export const CATEGORIES = {
  A: "Website discovery and coverage",
  B: "Privacy notices and transparency",
  C: "Consent and cookie behaviour",
  D: "Forms and personal-data collection",
  E: "Data Principal rights and grievance mechanisms",
  F: "Children's personal data",
  G: "Security and technical signals",
  H: "Third-party processing and transfer indicators",
  I: "Retention and deletion indicators",
  J: "Organizational compliance evidence",
} as const;

export type CategoryCode = keyof typeof CATEGORIES;

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type Confidence = "high" | "medium" | "low";

export const CLAIM_TYPES = [
  "verified_legal_requirement",
  "regulatory_readiness",
  "potential_privacy_gap",
  "technical_recommendation",
] as const;

export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  verified_legal_requirement: "Verified legal requirement",
  regulatory_readiness: "Regulatory readiness (provision not yet in force)",
  potential_privacy_gap: "Potential privacy gap",
  technical_recommendation: "Technical recommendation",
};

export type LegalEffectiveStatus =
  | "in_force"
  | "partially_in_force"
  | "not_yet_effective"
  | "unknown";

export const COMMENCEMENT_GROUPS = [
  "immediate",
  "one_year",
  "eighteen_months",
  "unknown",
] as const;

export type CommencementGroup = (typeof COMMENCEMENT_GROUPS)[number];

export interface LegalReference {
  id: string;
  documentTitle: string;
  provision: string;
  sourceUrl: string;
  version: string;
  publishedDate: string | null;
  effectiveFrom: string | null;
  effectiveStatus: LegalEffectiveStatus;
  commencementGroup: CommencementGroup;
  applicability: string;
  evidenceRequired: string[];
  summary: string;
  verifiedOn: string;
  notes: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  sourceUrl: string;
  publishedDate: string;
  effectiveStatus: LegalEffectiveStatus;
  effectiveFrom: string | null;
  summary: string;
  verifiedOn: string;
  notes: string;
}

export interface SeverityPolicy {
  defaultSeverity: Severity;
  escalation: string;
  notes: string;
}

export interface TestDefinition {
  id: string;
  name: string;
  category: CategoryCode;
  description: string;
  preconditions: string[];
  evidenceRequired: string[];
  executionMethod: string;
  legalReferenceIds: string[];
  applicability: string;
  claimType: ClaimType;
  severityPolicy: SeverityPolicy;
  remediationTemplate: string;
  verificationProcedure: string;
  limitations: string;
  version: string;
  automated: boolean;
}

export interface HeadingEvidence {
  level: number;
  text: string;
}

export interface LinkEvidence {
  href: string;
  text: string;
  internal: boolean;
  kind:
    | "privacy"
    | "cookie"
    | "terms"
    | "grievance"
    | "rights"
    | "contact"
    | "signup"
    | "form"
    | "sitemap"
    | "other";
}

export interface FormFieldEvidence {
  tag: string;
  type: string;
  name: string | null;
  label: string | null;
  autocomplete: string | null;
  required: boolean;
  disabled: boolean;
  checked: boolean;
  sensitiveCategory: string | null;
  redacted: true;
}

export interface FormEvidence {
  pageUrl: string;
  action: string;
  absoluteAction: string;
  method: string;
  externalDestination: boolean;
  fields: FormFieldEvidence[];
  hasPrivacyLinkNearby: boolean;
  consentCheckboxLabels: string[];
}

export interface ResourceEvidence {
  url: string;
  host: string;
  kind: "script" | "image" | "iframe" | "stylesheet" | "link" | "media" | "other";
  thirdParty: boolean;
  insecure: boolean;
}

export interface CookieEvidence {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  session: boolean;
  thirdParty: boolean;
}

export interface NetworkRequestEvidence {
  url: string;
  host: string;
  method: string;
  resourceType: string;
  thirdParty: boolean;
  knownTracker: boolean;
  trackerCategory: string | null;
  trackerMatch: string | null;
  timestamp: string;
}

export interface PageSignals {
  personalDataCategories: string[];
  purposes: string[];
  rightsCategories: string[];
  retentionSignalCount: number;
  thirdPartySignalCount: number;
  childTerms: string[];
  hasEmail: boolean;
  hasPhone: boolean;
  hasContactLanguage: boolean;
  contradictionFlags: string[];
  noticeWordCount: number;
  averageSentenceLength: number;
  dateStrings: string[];
  hasPrivacyNoticeLanguage: boolean;
  publicPersonalDataPatterns: string[];
}

export interface PageEvidence {
  id: string;
  requestedUrl: string;
  finalUrl: string;
  status: number | null;
  ok: boolean;
  contentType: string | null;
  headers: Record<string, string>;
  title: string | null;
  language: string | null;
  headings: HeadingEvidence[];
  textExcerpt: string;
  signals: PageSignals;
  links: LinkEvidence[];
  forms: FormEvidence[];
  scripts: ResourceEvidence[];
  iframes: ResourceEvidence[];
  resources: ResourceEvidence[];
  thirdPartyHosts: string[];
  setCookieNames: string[];
  cookies: CookieEvidence[];
  redirectChain: string[];
  error: string | null;
  fetchedAt: string;
  rendered: boolean;
}

export interface ScreenshotRef {
  name: string;
  kind: "full-page" | "element" | "consent-state";
  label: string;
  pageUrl: string;
  selector: string | null;
  capturedAt: string;
}

export interface VisualEvidence {
  available: boolean;
  limitations: string[];
  screenshots: ScreenshotRef[];
}

export interface BrowserSnapshot {
  url: string;
  title: string | null;
  textExcerpt: string;
  cookies: CookieEvidence[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  requests: NetworkRequestEvidence[];
  bannerVisible: boolean;
  acceptVisible: boolean;
  rejectVisible: boolean;
  withdrawalVisible: boolean;
  errors: string[];
  screenshot: ScreenshotRef | null;
  capturedAt: string;
}

export interface BrowserEvidence {
  available: boolean;
  limitations: string[];
  initial: BrowserSnapshot | null;
  afterReject: BrowserSnapshot | null;
  afterAccept: BrowserSnapshot | null;
  afterReload: BrowserSnapshot | null;
  afterWithdraw: BrowserSnapshot | null;
  interactionLog: string[];
}

export interface ResourceDiscoveryEvidence {
  url: string;
  status: number | null;
  contentType: string | null;
  bodyExcerpt: string;
  discoveredUrls: string[];
  error: string | null;
}

export interface CrawlStats {
  pagesAttempted: number;
  pagesSucceeded: number;
  pagesFailed: number;
  duplicatesSkipped: number;
  outOfScopeSkipped: number;
  blockedTargets: number;
  maxDepthReached: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface EvidenceItem {
  id: string;
  kind: string;
  pageUrl: string | null;
  summary: string;
  data: unknown;
}

export interface TestResult {
  id: string;
  testId: string;
  title: string;
  category: CategoryCode;
  categoryName: string;
  status: TestStatus;
  severity: Severity;
  confidence: Confidence;
  claimType: ClaimType;
  affectedUrls: string[];
  evidence: EvidenceItem[];
  screenshots: ScreenshotRef[];
  legalReferences: LegalReference[];
  reasoning: string;
  remediation: string;
  verificationSteps: string;
  humanReviewRequired: boolean;
  timestamp: string;
  testVersion: string;
  knownLimitations: string;
}

export interface FindingGroup {
  id: string;
  title: string;
  primaryTestId: string;
  testIds: string[];
  status: TestStatus;
  severity: Severity;
  confidence: Confidence;
  claimType: ClaimType;
  affectedUrls: string[];
  evidence: EvidenceItem[];
  screenshots: ScreenshotRef[];
  legalReferences: LegalReference[];
  reasoning: string;
  remediation: string;
  verificationSteps: string;
  humanReviewRequired: boolean;
  knownLimitations: string;
}

export interface CategorySummary {
  category: CategoryCode;
  name: string;
  pass: number;
  fail: number;
  warning: number;
  needsReview: number;
  notAssessed: number;
  notApplicable: number;
  total: number;
}

export interface SeveritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface AuditCoverage {
  pageCrawl: {
    attempted: number;
    succeeded: number;
    failed: number;
    ratio: number;
  };
  siteDiscovery: {
    discoveredPages: number;
    declaredUrls: number;
    inventoryAvailable: boolean;
    ratio: number;
  };
  testExecution: {
    executed: number;
    applicable: number;
    notApplicable: number;
    total: number;
    ratio: number;
  };
  evidenceSufficiency: {
    sufficient: number;
    total: number;
    ratio: number;
  };
}

export interface AuditSummary {
  total: number;
  pass: number;
  fail: number;
  warning: number;
  needsReview: number;
  notAssessed: number;
  notApplicable: number;
  automated: number;
  humanReviewRequired: number;
  categoryCounts: CategorySummary[];
  severityCounts: SeveritySummary;
  coveragePercent: number;
  coverage: AuditCoverage;
  pageCoverage: {
    pagesAttempted: number;
    pagesSucceeded: number;
    pagesFailed: number;
    duplicatesSkipped: number;
    outOfScopeSkipped: number;
  };
}

export type AuditStatus =
  | "queued"
  | "running"
  | "requires_credentials"
  | "completed"
  | "failed"
  | "partial";

export interface AuditAuthState {
  loginWallDetected: boolean;
  loginSurfaceDetected: boolean;
  loginUrl: string | null;
  authenticated: boolean;
  failureReason: string | null;
  diagnostics?: string[];
}

export type ProgressLevel = "info" | "success" | "warning" | "error";

export interface AuditProgressEvent {
  message: string;
  level?: ProgressLevel;
  url?: string;
  attempted?: number;
  succeeded?: number;
  failed?: number;
  pending?: number;
}

export interface AuditProgressEntry {
  at: string;
  level: ProgressLevel;
  message: string;
  url?: string;
  attempted?: number;
  succeeded?: number;
  failed?: number;
  pending?: number;
}

export type OutcomeLevel =
  | "failed"
  | "credentials_required"
  | "not_ready"
  | "needs_attention"
  | "inconclusive"
  | "no_failures";

export type OutcomeTone = "danger" | "warning" | "caution" | "neutral" | "success";

export interface AuditOutcome {
  level: OutcomeLevel;
  tone: OutcomeTone;
  headline: string;
  detail: string;
  failCount: number;
  warningCount: number;
  needsReviewCount: number;
  notAssessedCount: number;
  criticalOrHighCount: number;
  partial: boolean;
}

export interface CrawlConfig {
  timeBudgetMs: number;
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  sameOriginOnly: boolean;
  browserEnabled: boolean;
  screenshots: boolean;
  crawlDelayMs: number;
}

export interface AuditConfig extends CrawlConfig {
  authorized: true;
  notes: string | null;
}

export interface AuditRun {
  id: string;
  status: AuditStatus;
  targetUrl: string;
  finalOrigin: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  config: AuditConfig;
  engineVersion: string;
  registryVersion: string;
  legalFrameworkVersion: string;
  pages: PageEvidence[];
  tests: TestResult[];
  findings: TestResult[];
  findingGroups?: FindingGroup[];
  auth: AuditAuthState | null;
  summary: AuditSummary | null;
  crawlStats: CrawlStats | null;
  robots: ResourceDiscoveryEvidence | null;
  sitemap: ResourceDiscoveryEvidence | null;
  browser: BrowserEvidence | null;
  visual: VisualEvidence | null;
  limitations: string[];
  errors: string[];
  progress?: AuditProgressEntry[];
}

export interface AuditListItem {
  id: string;
  status: AuditStatus;
  targetUrl: string;
  createdAt: string;
  completedAt: string | null;
  summary: AuditSummary | null;
  errorCount: number;
}

export interface AuditContext {
  targetUrl: string;
  pages: PageEvidence[];
  startPage: PageEvidence | null;
  robots: ResourceDiscoveryEvidence | null;
  sitemap: ResourceDiscoveryEvidence | null;
  browser: BrowserEvidence | null;
  crawlStats: CrawlStats;
  config: AuditConfig;
  limitations: string[];
  errors: string[];
  organizationalEvidence: Record<string, boolean>;
  now: string;
}

export interface RuleOutcome {
  status: TestStatus;
  severity?: Severity;
  confidence?: Confidence;
  affectedUrls?: string[];
  evidence?: EvidenceItem[];
  reasoning: string;
  remediation?: string;
  verificationSteps?: string;
  humanReviewRequired?: boolean;
  limitations?: string;
}

export type TestEvaluator = (context: AuditContext) => RuleOutcome;
