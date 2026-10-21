import { resolveLegalReferences } from "./legal";
import {
  CATEGORIES,
  type CategoryCode,
  type ClaimType,
  type Severity,
  type TestDefinition,
} from "./types";

export const REGISTRY_VERSION = "2026.10.19.3";
export const TEST_VERSION = "1.0.0";

function defaultClaimType(
  category: CategoryCode,
  legalReferenceIds: string[],
): ClaimType {
  const references = resolveLegalReferences(legalReferenceIds);
  if (references.some((reference) => reference.effectiveStatus === "in_force")) {
    return "verified_legal_requirement";
  }
  if (references.length > 0) return "regulatory_readiness";
  if (category === "G") return "technical_recommendation";
  if (category === "J") return "regulatory_readiness";
  return "potential_privacy_gap";
}

const CATEGORY_EVIDENCE: Record<CategoryCode, string[]> = {
  A: ["Crawl log", "HTTP status and final URL", "Discovered links/pages", "Crawl boundary statistics"],
  B: ["Privacy notice text and URL", "Extracted notice excerpts", "Affected collection pages"],
  C: ["Consent-control labels", "Browser state and network observations", "Cookie attributes"],
  D: ["Form metadata", "Field labels, types and required state", "Privacy notice excerpts"],
  E: ["Rights/grievance text", "Contact or request mechanism", "Affected links"],
  F: ["Age/child indicators", "Parental-consent workflow evidence", "Tracking context"],
  G: ["Response headers", "Resource URLs", "Form actions", "Browser security errors"],
  H: ["Notice excerpts", "Third-party host inventory", "Processor/transfer indicators"],
  I: ["Retention language", "Deletion/erasure mechanism", "Account or data controls"],
  J: ["Internal policy or evidence supplied by the organization", "Reviewer identity and date"],
};

const CATEGORY_PRECONDITIONS: Record<CategoryCode, string[]> = {
  A: ["The audit target is authorized", "The crawler completed or recorded a bounded failure"],
  B: ["A policy or notice page was discovered or its absence was recorded"],
  C: ["A browser evidence collector may be required for behavioural conclusions"],
  D: ["At least one form was discovered or the absence was recorded"],
  E: ["Notice, contact, or rights pages were available for inspection"],
  F: ["The site's audience and processing context have been reviewed"],
  G: ["HTTP and browser evidence was collected where available"],
  H: ["Third-party hosts and notice text were collected"],
  I: ["Notice text or organizational evidence covering retention was available"],
  J: ["The organization supplied internal evidence for review"],
};

const CATEGORY_APPLICABILITY: Record<CategoryCode, string> = {
  A: "Any authorized public website audit.",
  B: "Data Fiduciaries subject to the DPDP framework; exemptions and applicability require review.",
  C: "Consent-based tracking or optional cookies; strictly necessary processing may be excluded.",
  D: "Forms that collect or may collect personal data.",
  E: "Data Fiduciaries subject to the Act; website signals do not prove fulfilment.",
  F: "Processing of children's personal data or child-directed services; general-audience sites are not automatically covered.",
  G: "Technical readiness signals; no specific header is treated as a universal legal requirement.",
  H: "Third-party processing, processors and cross-border transfer indicators.",
  I: "Personal data retention and erasure obligations, subject to legal retention exceptions.",
  J: "Organizational evidence review; public websites cannot prove internal compliance.",
};

function defineTest(
  id: string,
  name: string,
  category: CategoryCode,
  description: string,
  severity: Severity,
  options: {
    legalReferenceIds?: string[];
    automated?: boolean;
    evidenceRequired?: string[];
    preconditions?: string[];
    applicability?: string;
    executionMethod?: string;
    remediation?: string;
    verification?: string;
    limitations?: string;
    claimType?: ClaimType;
  } = {},
): TestDefinition {
  const legalReferenceIds = options.legalReferenceIds ?? [];
  return {
    id,
    name,
    category,
    description,
    preconditions: options.preconditions ?? CATEGORY_PRECONDITIONS[category],
    evidenceRequired: options.evidenceRequired ?? CATEGORY_EVIDENCE[category],
    executionMethod:
      options.executionMethod ??
      (category === "J"
        ? "Evidence review; not inferable from a public website"
        : "Deterministic crawl, HTML, header, or browser evidence analysis"),
    legalReferenceIds,
    applicability: options.applicability ?? CATEGORY_APPLICABILITY[category],
    claimType:
      options.claimType ?? defaultClaimType(category, legalReferenceIds),
    severityPolicy: {
      defaultSeverity: severity,
      escalation:
        severity === "high" || severity === "critical"
          ? "Escalate when the condition affects a live personal-data collection path or is observed consistently across the site."
          : "Escalate only with corroborating evidence or a verified legal requirement.",
      notes:
        "Technical severity is not a legal conclusion. Legal severity and confidence are reported separately, and legal references may be not yet effective.",
    },
    remediationTemplate:
      options.remediation ??
      `Address what this check measured (${description}) and re-run the audit.`,
    verificationProcedure:
      options.verification ??
      `Re-run this check and confirm the evidence now shows the expected condition for "${name}".`,
    limitations:
      options.limitations ??
      "Deterministic signal only. Absence of a signal is not proof of absence, and applicability may require human or legal review.",
    version: TEST_VERSION,
    automated: options.automated ?? category !== "J",
  };
}

const CRAWL_TESTS: TestDefinition[] = [
  defineTest("CRAWL-001", "Homepage accessibility and redirects", "A", "Check that the authorized homepage resolves successfully and record redirects.", "high", {
    limitations: "A successful response does not prove the page is the correct public homepage or that all regions/audiences are covered.",
    remediation:
      "Serve the homepage over HTTPS with a valid, trusted certificate and return 200. If the site uses a self-signed or expired certificate, fix it — the auditor will not bypass TLS verification. Redirect plain http:// and non-canonical hosts to the one canonical HTTPS URL.",
    verification:
      "Re-request the homepage and confirm a 2xx response over a valid HTTPS certificate with a stable final URL and the expected redirect chain.",
  }),
  defineTest("CRAWL-002", "Privacy notice discovery", "A", "Discover a privacy notice link or policy page and verify whether it is reachable.", "high", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "Add a clearly labelled 'Privacy Policy' link (footer or header, on every page) that points to a reachable privacy notice page.",
    verification:
      "Re-crawl and confirm the crawler discovers a privacy link and the target URL returns 200.",
  }),
  defineTest("CRAWL-003", "Cookie notice discovery", "A", "Discover cookie-related links, notices, or consent controls.", "medium", {
    remediation:
      "Publish a cookie policy or cookie information section (or a consent banner that links to one) so cookie use is discoverable.",
    verification:
      "Re-crawl and confirm cookie-related links, notices, or consent controls are discovered.",
  }),
  defineTest("CRAWL-004", "Grievance and contact page discovery", "A", "Discover grievance, contact, or support pages and record accessibility.", "high", {
    legalReferenceIds: ["ACT-S13"],
    remediation:
      "Publish a contact or grievance page that provides a route to raise complaints, and link it from the site footer or the notice.",
    verification:
      "Re-crawl and confirm a grievance/contact page is discovered and returns 200.",
  }),
  defineTest("CRAWL-005", "Rights page discovery", "A", "Discover pages describing access, correction, erasure, withdrawal, or nomination rights.", "high", {
    legalReferenceIds: ["ACT-S11", "ACT-S12"],
    remediation:
      "Publish a page describing data-principal rights (access, correction, erasure, withdrawal, nomination) and link it from the privacy notice.",
    verification:
      "Re-crawl and confirm a rights page is discovered and reachable.",
  }),
  defineTest("CRAWL-006", "Signup, contact and enquiry form discovery", "A", "Discover forms used for signup, contact, enquiry, or other collection.", "medium", {
    remediation:
      "Ensure signup, contact, and enquiry forms are reachable from server HTML rather than only appearing after client-side navigation.",
    verification:
      "Re-crawl and confirm the expected forms are discovered.",
  }),
  defineTest("CRAWL-007", "JavaScript-rendered content discovery", "A", "Compare static HTML with a rendered browser DOM where browser evidence is enabled.", "medium", {
    limitations: "Without browser execution this test is NOT_ASSESSED; static HTML cannot prove that client-rendered content is absent.",
    remediation:
      "Enable browser evidence for the audit so client-rendered content is compared, and server-render critical notice/consent content so it is discoverable without JavaScript.",
    verification:
      "Re-run with browser evidence enabled and confirm rendered vs static content is compared.",
  }),
  defineTest("CRAWL-008", "Failed-page detection", "A", "Record HTTP errors, timeouts, blocked requests, and pages that could not be crawled.", "medium", {
    remediation:
      "Fix pages that return errors or time out, and ensure a valid TLS certificate so pages can be crawled without disabling certificate checks.",
    verification:
      "Re-crawl and confirm the failed-page count drops to zero and no TLS/certificate errors remain.",
  }),
  defineTest("CRAWL-009", "Sitemap and robots.txt discovery", "A", "Check for accessible robots.txt and sitemap declarations.", "low", {
    remediation:
      "Publish /robots.txt and /sitemap.xml and reference the sitemap from robots.txt.",
    verification:
      "Request /robots.txt and /sitemap.xml and confirm both return 200.",
  }),
  defineTest("CRAWL-010", "URL deduplication and crawl-boundary enforcement", "A", "Verify same-origin scope, normalized deduplication, page/depth bounds, and out-of-scope skipping.", "medium", {
    remediation:
      "Normalize internal links (lowercase host, strip tracking parameters, avoid duplicate paths) and keep navigation within the authorized origin.",
    verification:
      "Re-crawl and confirm duplicate and out-of-scope URLs are skipped as expected.",
  }),
];

const NOTICE_TESTS: TestDefinition[] = [
  defineTest("NOTICE-001", "Privacy notice availability and discoverability", "B", "Check that a reachable notice is linked from the inspected site and contains substantive privacy information.", "high", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "Publish a substantive, reachable privacy notice and link it from the homepage and footer.",
    verification:
      "Confirm the notice URL returns 200 and contains privacy information the crawler can read.",
  }),
  defineTest("NOTICE-002", "Notice readability and clarity", "B", "Estimate notice length and sentence complexity as a readability signal.", "low", {
    limitations: "Word counts and sentence length are rough signals, not a legal clarity determination or accessibility audit.",
    remediation:
      "Rewrite the notice in plain language: shorter sentences, clear headings, and a summary of key points up front.",
    verification:
      "Re-run and confirm the readability signals (length and sentence complexity) improve.",
  }),
  defineTest("NOTICE-003", "Personal-data category extraction", "B", "Extract categories of personal data referenced in the notice.", "medium", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "List the categories of personal data collected in the notice (for example: name, email, phone, payment, usage data).",
    verification:
      "Confirm the notice names the data categories and the crawler extracts them.",
  }),
  defineTest("NOTICE-004", "Processing-purpose extraction", "B", "Extract stated processing purposes from the notice.", "medium", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "State the purpose of processing for each category of personal data collected.",
    verification:
      "Confirm the purposes appear in the notice and the test extracts them.",
  }),
  defineTest("NOTICE-005", "Applicable statutory notice requirements", "B", "Compare notice content with verified Section 5 notice elements, while marking the provision as not yet in force.", "medium", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "Cover the Section 5 notice elements: data categories, purposes, the manner of exercising rights, the complaint route, and the link to the Data Fiduciary's site or contact.",
    verification:
      "Compare the notice against the Section 5 element checklist and re-run.",
  }),
  defineTest("NOTICE-006", "Privacy and grievance contact extraction", "B", "Extract privacy/grievance contacts or contact routes from the notice.", "high", {
    legalReferenceIds: ["ACT-S5", "ACT-S13"],
    remediation:
      "Include a privacy and grievance contact (email address or a named contact route) directly in the notice.",
    verification:
      "Confirm a contact is present in the notice and is extracted.",
  }),
  defineTest("NOTICE-007", "Notice version and date extraction", "B", "Look for a version identifier, effective date, or last-updated date.", "low", {
    remediation:
      "Add a version number or a 'last updated' date to the privacy notice and update it on each change.",
    verification:
      "Confirm a version or date string is present in the notice.",
  }),
  defineTest("NOTICE-008", "Comparison of collection forms with notice disclosures", "B", "Compare observed form field categories with categories disclosed in the notice.", "high", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "Disclose in the notice every category of personal data collected by the site's forms, or stop collecting data that is not disclosed.",
    verification:
      "Compare form field categories with the disclosed categories and re-run.",
  }),
  defineTest("NOTICE-009", "Contradictory privacy statements", "B", "Search for obvious contradictions, such as 'never share' alongside statements about sharing with third parties.", "medium", {
    limitations: "Keyword-based contradiction detection has false positives and false negatives; human review is required before treating a result as a breach.",
    remediation:
      "Reconcile contradictory statements about sharing, selling, or retaining data so the notice is internally consistent.",
    verification:
      "Review each flagged contradiction manually and re-run after editing the notice.",
  }),
  defineTest("NOTICE-010", "Notice accessibility and language checks", "B", "Check declared language, heading structure, HTML notice availability, and basic link accessibility.", "low", {
    limitations: "This is not a WCAG audit and does not verify screen-reader behaviour or translation quality.",
    remediation:
      "Set the page language (html lang), use a proper heading hierarchy, and provide the notice as HTML text rather than only an image or download.",
    verification:
      "Confirm html lang, headings, and an HTML notice are present, then re-run.",
  }),
];

const CONSENT_TESTS: TestDefinition[] = [
  defineTest("CONSENT-001", "Consent interface detection", "C", "Detect a cookie/consent interface and determine whether it is applicable to observed tracking.", "medium", {
    legalReferenceIds: ["ACT-S6"],
    remediation:
      "Present a clear cookie/consent interface whenever non-essential tracking is present.",
    verification:
      "Re-run with browser evidence and confirm a consent interface is detected.",
  }),
  defineTest("CONSENT-002", "Accept and reject control discovery", "C", "Check for distinct accept and reject choices.", "high", {
    legalReferenceIds: ["ACT-S6"],
    remediation:
      "Provide distinct, equally accessible 'accept' and 'reject' controls (not just 'accept' or 'settings').",
    verification:
      "Re-run and confirm both accept and reject controls are found in the interface.",
  }),
  defineTest("CONSENT-003", "Relative prominence of consent choices", "C", "Assess whether reject is visually or structurally less prominent than accept.", "medium", {
    limitations: "Requires browser/rendered-style evidence or manual visual review.",
    remediation:
      "Give the reject choice the same size, colour weight, and position as accept so consent is not nudged.",
    verification:
      "Visually confirm equal prominence and re-run the rendered-style check.",
  }),
  defineTest("CONSENT-004", "Preselected consent controls", "C", "Detect pre-checked optional consent controls.", "high", {
    legalReferenceIds: ["ACT-S6"],
    remediation:
      "Remove pre-checked optional consent boxes; require an affirmative action to opt in.",
    verification:
      "Re-run and confirm no optional consent control is preselected.",
  }),
  defineTest("CONSENT-005", "Initial cookies, local storage and network requests", "C", "Observe tracking before any consent action in a clean browser profile.", "high", {
    legalReferenceIds: ["ACT-S6"],
    limitations: "Requires browser evidence; static HTTP evidence cannot establish pre-consent JavaScript behaviour.",
    remediation:
      "Block non-essential cookies, storage, and tracker requests until the user has given consent.",
    verification:
      "Re-run the clean-profile check and confirm no non-essential trackers fire before consent.",
  }),
  defineTest("CONSENT-006", "Behaviour after rejecting optional tracking", "C", "Compare tracking after a reject action with the initial state.", "high", {
    legalReferenceIds: ["ACT-S6"],
    limitations: "Requires browser evidence and testable controls; no production form is submitted.",
    remediation:
      "Stop loading optional trackers when the user rejects consent.",
    verification:
      "Re-run and compare pre/post-reject requests; optional trackers should stop.",
  }),
  defineTest("CONSENT-007", "Behaviour after accepting optional tracking", "C", "Compare tracking after an accept action with the initial state.", "medium", {
    legalReferenceIds: ["ACT-S6"],
    limitations: "Requires browser evidence and may not generalize to all consent choices.",
    remediation:
      "Load only the tracker categories the user actually consented to after accept.",
    verification:
      "Re-run and confirm consented categories load while others do not.",
  }),
  defineTest("CONSENT-008", "Consent persistence after reload", "C", "Check whether the recorded choice persists after a reload.", "medium", {
    legalReferenceIds: ["ACT-S6"],
    limitations: "Requires browser evidence.",
    remediation:
      "Persist the consent choice across reloads and sessions so users are not re-asked or reset.",
    verification:
      "Choose an option, reload, and confirm the choice persists.",
  }),
  defineTest("CONSENT-009", "Consent withdrawal control discovery", "C", "Discover a withdraw/manage/change-consent control.", "high", {
    legalReferenceIds: ["ACT-S6"],
    remediation:
      "Provide an easily reachable 'manage' or 'withdraw consent' control, as accessible as giving consent.",
    verification:
      "Re-run and confirm a withdrawal or manage-consent control is discovered.",
  }),
  defineTest("CONSENT-010", "Observed behaviour after withdrawal", "C", "Compare tracking after withdrawal with the accepted state.", "high", {
    legalReferenceIds: ["ACT-S6"],
    limitations: "Requires browser evidence and a non-destructive withdrawal path.",
    remediation:
      "Stop optional tracking promptly after consent is withdrawn.",
    verification:
      "Re-run the withdrawal flow and confirm optional tracking stops.",
  }),
  defineTest("CONSENT-011", "Cookie security attributes", "C", "Inspect observed cookies for Secure, HttpOnly, SameSite and session indicators.", "low", {
    limitations: "Not every cookie needs every attribute; missing attributes are a review signal, not an automatic violation.",
    remediation:
      "Set Secure, HttpOnly (where appropriate), and a suitable SameSite attribute on cookies.",
    verification:
      "Re-inspect the cookies after applying the attributes.",
  }),
  defineTest("CONSENT-012", "Third-party tracker classification", "C", "Classify observed third-party hosts against a maintained tracker-domain list.", "medium", {
    legalReferenceIds: ["ACT-S6"],
    remediation:
      "Review the third-party hosts flagged as trackers and gate each behind consent.",
    verification:
      "Re-run and confirm the tracker list reflects the consent state.",
  }),
  defineTest("CONSENT-013", "Consistency across pages", "C", "Compare consent-control presence across crawled pages.", "medium", {
    remediation:
      "Show the consent interface consistently on every page that sets optional cookies.",
    verification:
      "Re-crawl several pages and compare consent-control presence.",
  }),
  defineTest("CONSENT-014", "Clean browser profile and reproducible consent tests", "C", "Verify that browser evidence was collected from a fresh context with explicit interaction steps.", "low", {
    limitations: "Requires browser evidence; a static crawl cannot establish a clean browser profile.",
    remediation:
      "Enable browser evidence so consent behaviour is tested from a fresh context.",
    verification:
      "Confirm browser evidence was collected with a clean profile and logged interaction steps.",
  }),
];

const FORM_TESTS: TestDefinition[] = [
  defineTest("FORM-001", "Form discovery", "D", "Inventory forms and their pages.", "low", {
    remediation:
      "Ensure data-collection forms are present in server HTML where possible so they can be discovered.",
    verification:
      "Re-crawl and confirm the site's forms are inventoried.",
  }),
  defineTest("FORM-002", "Personal-data field classification", "D", "Classify fields into likely personal-data categories using names, types, labels, and autocomplete.", "medium", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "Use clear field names, labels, and autocomplete attributes so personal-data fields are identifiable.",
    verification:
      "Re-run and confirm the fields are classified into data categories.",
  }),
  defineTest("FORM-003", "Purpose and notice consistency", "D", "Compare collection fields with stated purposes and notice disclosures.", "high", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "Align every collected field with a purpose stated in the notice.",
    verification:
      "Compare the fields with the notice purposes and re-run.",
  }),
  defineTest("FORM-004", "Potentially unexplained collection", "D", "Flag high-sensitivity fields not referenced in the available notice.", "high", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "Disclose high-sensitivity fields in the notice or stop collecting data that is not explained.",
    verification:
      "Review each flagged field and re-run after updating the notice or the form.",
  }),
  defineTest("FORM-005", "Required and optional field analysis", "D", "Report required versus optional fields and identify potentially unnecessary requirements.", "low", {
    remediation:
      "Mark optional fields as optional and avoid requiring data that is not necessary for the stated purpose.",
    verification:
      "Re-run and confirm the required/optional flags reflect the intended design.",
  }),
  defineTest("FORM-006", "Necessary and optional consent separation", "D", "Detect bundled consent for optional marketing/analytics and required service terms.", "high", {
    legalReferenceIds: ["ACT-S6"],
    remediation:
      "Separate optional marketing/analytics consent from required service terms; do not bundle them.",
    verification:
      "Re-run and confirm optional consent is not bundled with required terms.",
  }),
  defineTest("FORM-007", "Privacy notice accessibility at collection points", "D", "Check whether a privacy notice is reachable from the page or near the form.", "medium", {
    legalReferenceIds: ["ACT-S5"],
    remediation:
      "Link the privacy notice from every page that collects personal data, near the form.",
    verification:
      "Re-run and confirm a notice link is reachable from collection points.",
  }),
  defineTest("FORM-008", "Third-party form destination inspection", "D", "Identify forms posting to an external or insecure destination.", "high", {
    remediation:
      "Submit forms to a secure (HTTPS) destination you control or a documented processor; avoid unexpected external or insecure actions.",
    verification:
      "Re-run and confirm form actions are HTTPS and expected.",
  }),
  defineTest("FORM-009", "Personal-data redaction in captured evidence", "D", "Verify that captured form evidence contains metadata only and redacts values.", "medium", {
    automated: true,
    executionMethod: "Engine self-check of captured evidence structure",
    remediation:
      "No user action required unless this self-check fails; keep form values out of captured evidence and exports.",
    verification:
      "Re-run and confirm captured form evidence contains metadata only (no field values).",
  }),
  defineTest("FORM-010", "Prevention of unintended form submission", "D", "Verify that the audit engine never submits or mutates a production form.", "high", {
    automated: true,
    executionMethod: "Engine self-check of crawler/browser interaction policy",
    remediation:
      "No user action required unless this self-check fails; the engine must never submit production forms.",
    verification:
      "Re-run and confirm the engine did not submit or mutate any form.",
  }),
];

const RIGHTS_TESTS: TestDefinition[] = [
  defineTest("RIGHTS-001", "Rights information discovery", "E", "Discover accessible information about access, correction, erasure, withdrawal, nomination, and grievance rights.", "medium", {
    legalReferenceIds: ["ACT-S11", "ACT-S12", "ACT-S13"],
    remediation:
      "Publish accessible information on access, correction, erasure, withdrawal, nomination, and grievance rights.",
    verification:
      "Re-crawl and confirm rights information is discovered on the site.",
  }),
  defineTest("RIGHTS-002", "Access, correction and erasure mechanism discovery", "E", "Discover a mechanism for access, correction, or erasure requests.", "high", {
    legalReferenceIds: ["ACT-S11", "ACT-S12"],
    remediation:
      "Provide a mechanism (form, email, or account control) to submit access, correction, and erasure requests.",
    verification:
      "Re-run and confirm the request mechanism is discovered.",
  }),
  defineTest("RIGHTS-003", "Grievance mechanism discovery", "E", "Discover a grievance contact, form, or escalation route.", "high", {
    legalReferenceIds: ["ACT-S13"],
    remediation:
      "Provide a grievance contact or form with a published escalation route.",
    verification:
      "Re-run and confirm the grievance mechanism is discovered.",
  }),
  defineTest("RIGHTS-004", "Relevant contact discoverability", "E", "Check that a privacy/grievance contact is discoverable from the site.", "medium", {
    legalReferenceIds: ["ACT-S5", "ACT-S13"],
    remediation:
      "Make the privacy and grievance contact discoverable from the site (footer, contact page, or notice).",
    verification:
      "Re-crawl and confirm the contact is reachable.",
  }),
  defineTest("RIGHTS-005", "Safe testing of rights-request workflows", "E", "Assess whether the workflow can be tested without submitting real personal data.", "medium", {
    automated: false,
    executionMethod: "Manual or synthetic-test review; not executed by the automated crawler",
    limitations: "The engine does not submit real rights requests. Status is NOT_ASSESSED unless a safe synthetic workflow is explicitly configured.",
    legalReferenceIds: ["ACT-S11", "ACT-S12", "ACT-S13"],
    remediation:
      "Configure a safe synthetic rights-request workflow (test account or staging environment) so fulfilment can be assessed without real personal data.",
    verification:
      "Confirm the synthetic workflow exists and runs without submitting real personal data.",
  }),
];

const CHILD_TESTS: TestDefinition[] = [
  defineTest("CHILD-001", "Age-related notice detection", "F", "Detect age gates, child/teen references, or parental-consent language.", "medium", {
    legalReferenceIds: ["ACT-S9"],
    remediation:
      "If children may use the service, publish age/child notices or an age gate with parental-consent language.",
    verification:
      "Re-run and confirm age/child indicators are detected.",
  }),
  defineTest("CHILD-002", "Applicable parental-consent workflow indicators", "F", "Detect a verifiable parental-consent workflow where child-directed processing is indicated.", "high", {
    legalReferenceIds: ["ACT-S9"],
    limitations: "Public signals cannot prove that a workflow is verifiable or effective.",
    remediation:
      "Implement a verifiable parental-consent workflow before processing children's data in a child-directed context.",
    verification:
      "Re-run and confirm the workflow indicators are present; an organization reviewer confirms verifiability.",
  }),
  defineTest("CHILD-003", "Child-directed processing indicators", "F", "Detect child-directed content, audience statements, or child-focused services.", "medium", {
    legalReferenceIds: ["ACT-S9"],
    remediation:
      "State the intended audience and whether the service is child-directed, so the applicable obligations are clear.",
    verification:
      "Re-run and confirm child-directed indicators are detected where they exist.",
  }),
  defineTest("CHILD-004", "Child-related tracking indicators", "F", "Look for tracking or advertising signals in a child-directed context.", "high", {
    legalReferenceIds: ["ACT-S9"],
    limitations: "Requires browser evidence and contextual review; a general-audience site is not automatically child-directed.",
    remediation:
      "Disable tracking and behavioural advertising in any child-directed context.",
    verification:
      "Re-run with browser evidence and confirm no tracking in the child-directed context.",
  }),
];

const SECURITY_TESTS: TestDefinition[] = [
  defineTest("SEC-001", "HTTPS and insecure resource detection", "G", "Check HTTPS use and mixed-content resource references.", "high", {
    legalReferenceIds: ["ACT-S8"],
    limitations: "HTTPS is a security signal; the Act does not prescribe a specific TLS configuration.",
    remediation:
      "Serve all pages and subresources over HTTPS with a valid certificate, and remove mixed-content references.",
    verification:
      "Re-run and confirm there are no plain-HTTP or invalid-certificate resources.",
  }),
  defineTest("SEC-002", "HSTS header inspection", "G", "Inspect Strict-Transport-Security presence and max-age.", "low", {
    limitations: "HSTS is a desirable control, not a universal statutory requirement.",
    remediation:
      "Send a Strict-Transport-Security header with a suitable max-age.",
    verification:
      "Check the Strict-Transport-Security response header after deployment.",
  }),
  defineTest("SEC-003", "Content Security Policy inspection", "G", "Inspect CSP presence and basic directives.", "low", {
    limitations: "No specific CSP is legally mandated; context and deployment matter.",
    remediation:
      "Send a Content-Security-Policy header appropriate to the site's scripts and resources.",
    verification:
      "Check the Content-Security-Policy response header after deployment.",
  }),
  defineTest("SEC-004", "MIME-sniffing protection inspection", "G", "Inspect X-Content-Type-Options.", "low", {
    limitations: "Header absence is a technical weakness, not automatically a DPDP violation.",
    remediation:
      "Send the X-Content-Type-Options: nosniff header.",
    verification:
      "Check the X-Content-Type-Options response header after deployment.",
  }),
  defineTest("SEC-005", "Referrer policy inspection", "G", "Inspect Referrer-Policy.", "low", {
    limitations: "No specific referrer policy is universally mandated.",
    remediation:
      "Send a Referrer-Policy header (for example, strict-origin-when-cross-origin).",
    verification:
      "Check the Referrer-Policy response header after deployment.",
  }),
  defineTest("SEC-006", "Detection of obvious public personal-data exposure", "G", "Search visible page text for patterns resembling exposed personal data.", "high", {
    legalReferenceIds: ["ACT-S8"],
    limitations: "Contact emails and phone numbers may be intentionally public; every match requires human review.",
    remediation:
      "Remove or mask unintended personal data (emails, phone numbers, ID numbers) from public page text.",
    verification:
      "Review each flagged match manually and re-run after removing the exposure.",
  }),
  defineTest("SEC-007", "Insecure form destination detection", "G", "Check form actions for HTTP or unexpected external destinations.", "high", {
    legalReferenceIds: ["ACT-S8"],
    remediation:
      "Point form actions to HTTPS destinations you control or that are documented processors.",
    verification:
      "Re-run and confirm form actions are secure and expected.",
  }),
  defineTest("SEC-008", "Third-party network destination inventory", "G", "Inventory third-party hosts observed in static resources and, where available, browser requests.", "medium", {
    legalReferenceIds: ["ACT-S8"],
    remediation:
      "Reduce and document third-party hosts, and load them only when necessary.",
    verification:
      "Re-run and review the third-party host inventory for unexpected destinations.",
  }),
  defineTest("SEC-009", "Browser security errors", "G", "Record TLS, mixed-content, certificate, and browser console/network errors.", "medium", {
    limitations: "Requires browser evidence.",
    remediation:
      "Fix the TLS, mixed-content, and console/network errors surfaced by the browser.",
    verification:
      "Re-run with browser evidence and confirm the errors are cleared.",
  }),
  defineTest("SEC-010", "Evidence and test coverage reporting", "G", "Verify that the audit reports executed, unavailable, and not-applicable checks with coverage statistics.", "low", {
    automated: true,
    executionMethod: "Engine self-check of run summary and coverage",
    remediation:
      "No user action required unless this self-check fails; keep the coverage statistics accurate.",
    verification:
      "Re-run and confirm executed, unavailable, and not-applicable checks are reported.",
  }),
];

const THIRD_PARTY_TESTS: TestDefinition[] = [
  defineTest("THIRD-001", "Third-party processing and transfer indicators", "H", "Compare observed third-party hosts with notice disclosures and processor/transfer language.", "medium", {
    legalReferenceIds: ["ACT-S5", "ACT-S8", "ACT-S16"],
    limitations: "A hostname in a notice is not legally required for every request; network context and processor roles need review.",
    remediation:
      "Document processors and sub-processors and, where relevant, cross-border transfers in the notice or a processor list.",
    verification:
      "Re-run and compare the observed third-party hosts with what the notice discloses.",
  }),
];

const RETENTION_TESTS: TestDefinition[] = [
  defineTest("RETENTION-001", "Retention and deletion indicators", "I", "Extract retention periods, deletion language, and account/data deletion controls.", "medium", {
    legalReferenceIds: ["ACT-S8", "ACT-S12"],
    limitations: "Notice language does not prove that deletion actually occurs; organizational evidence is required.",
    remediation:
      "State retention periods for each data category and provide account/data deletion controls.",
    verification:
      "Re-run and confirm retention periods and deletion controls are present.",
  }),
];

const ORG_TESTS: TestDefinition[] = [
  defineTest("ORG-001", "Processing inventory questionnaire", "J", "Request and review a processing inventory covering data categories, purposes, systems, and owners.", "high", {
    legalReferenceIds: ["ACT-S8"],
    automated: false,
    remediation:
      "Provide a current processing inventory covering data categories, purposes, systems, and owners for reviewer assessment.",
    verification:
      "An organization reviewer confirms the inventory is complete, current, and signed off.",
  }),
  defineTest("ORG-002", "Retention and deletion evidence review", "J", "Review retention schedules, deletion jobs, and exception handling.", "high", {
    legalReferenceIds: ["ACT-S8", "ACT-S12"],
    automated: false,
    remediation:
      "Provide retention schedules, deletion job evidence, and exception handling for reviewer assessment.",
    verification:
      "A reviewer confirms deletions run as scheduled and exceptions are documented.",
  }),
  defineTest("ORG-003", "Processor arrangements evidence review", "J", "Review processor contracts, instructions, sub-processors, and assurance.", "high", {
    legalReferenceIds: ["ACT-S8"],
    automated: false,
    remediation:
      "Provide processor contracts, written instructions, sub-processor lists, and assurance evidence.",
    verification:
      "A reviewer confirms contracts are in place and instructions are documented.",
  }),
  defineTest("ORG-004", "Security safeguards evidence review", "J", "Review security governance, access control, encryption, monitoring, backups, and testing.", "high", {
    legalReferenceIds: ["ACT-S8"],
    automated: false,
    remediation:
      "Provide evidence of security governance, access control, encryption, monitoring, backups, and testing.",
    verification:
      "A reviewer confirms the safeguards are implemented and periodically tested.",
  }),
  defineTest("ORG-005", "Breach-response readiness questionnaire", "J", "Review breach detection, notification, containment, and evidence procedures.", "high", {
    legalReferenceIds: ["ACT-S8"],
    automated: false,
    remediation:
      "Provide a breach-response plan covering detection, notification, containment, and evidence.",
    verification:
      "A reviewer confirms the plan is documented and has been exercised.",
  }),
  defineTest("ORG-006", "Consent-record evidence review", "J", "Review consent capture, versioning, withdrawal, and propagation records.", "high", {
    legalReferenceIds: ["ACT-S6"],
    automated: false,
    remediation:
      "Provide consent capture, versioning, withdrawal, and propagation records.",
    verification:
      "A reviewer confirms consent records are complete and withdrawal propagates.",
  }),
  defineTest("ORG-007", "Rights-request fulfilment evidence review", "J", "Review access, correction, erasure, nomination, and grievance fulfilment records.", "high", {
    legalReferenceIds: ["ACT-S11", "ACT-S12", "ACT-S13"],
    automated: false,
    remediation:
      "Provide fulfilment records for access, correction, erasure, nomination, and grievance requests.",
    verification:
      "A reviewer confirms requests are logged and resolved within the prescribed timelines.",
  }),
  defineTest("ORG-008", "Cross-border processing evidence review", "J", "Review transfer inventory, destinations, restrictions, and safeguards.", "medium", {
    legalReferenceIds: ["ACT-S16"],
    automated: false,
    remediation:
      "Provide a transfer inventory with destinations, applicable restrictions, and safeguards.",
    verification:
      "A reviewer confirms transfers are inventoried and safeguards are in place.",
  }),
  defineTest("ORG-009", "Children's-data procedure review", "J", "Review age assurance, parental consent, and child-safety procedures.", "high", {
    legalReferenceIds: ["ACT-S9"],
    automated: false,
    remediation:
      "Provide age-assurance, parental-consent, and child-safety procedures where children's data is processed.",
    verification:
      "A reviewer confirms the procedures are documented and followed.",
  }),
  defineTest("ORG-010", "Significant Data Fiduciary applicability assessment", "J", "Assess whether the organization has been notified as an SDF and, if so, whether additional obligations are evidenced.", "medium", {
    legalReferenceIds: ["ACT-S10"],
    automated: false,
    remediation:
      "Confirm whether the organization has been notified as a Significant Data Fiduciary and evidence the additional obligations if so.",
    verification:
      "A reviewer confirms the SDF status and, where applicable, DPO, DPIA, and audit evidence.",
  }),
];

export const TEST_REGISTRY: TestDefinition[] = [
  ...CRAWL_TESTS,
  ...NOTICE_TESTS,
  ...CONSENT_TESTS,
  ...FORM_TESTS,
  ...RIGHTS_TESTS,
  ...CHILD_TESTS,
  ...SECURITY_TESTS,
  ...THIRD_PARTY_TESTS,
  ...RETENTION_TESTS,
  ...ORG_TESTS,
];

export const REGISTRY_BY_ID = new Map(TEST_REGISTRY.map((test) => [test.id, test]));

export const CATEGORY_ORDER: CategoryCode[] = Object.keys(
  CATEGORIES,
) as CategoryCode[];

export function registryCountsByCategory(): Record<CategoryCode, number> {
  return TEST_REGISTRY.reduce(
    (counts, test) => {
      counts[test.category] += 1;
      return counts;
    },
    Object.fromEntries(
      CATEGORY_ORDER.map((category) => [category, 0]),
    ) as Record<CategoryCode, number>,
  );
}
