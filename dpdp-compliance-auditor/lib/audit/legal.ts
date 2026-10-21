import type {
  CommencementGroup,
  LegalDocument,
  LegalEffectiveStatus,
  LegalReference,
} from "./types";

const ACT_URL =
  "https://www.indiacode.nic.in/handle/123456789/22037?locale=en";
const RULES_URL =
  "https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa";
const COMMENCEMENT_URL =
  "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014";
const VERIFIED_ON = "2026-10-19";

const GAZETTE_DATE = "2025-11-13";
const SUBSTANTIVE_EFFECTIVE_FROM = "2027-05-13";
const CONSENT_MANAGER_EFFECTIVE_FROM = "2026-11-13";

interface ProvisionCommencement {
  effectiveFrom: string;
  effectiveStatus: LegalEffectiveStatus;
  commencementGroup: CommencementGroup;
}

const EIGHTEEN_MONTHS: ProvisionCommencement = {
  effectiveFrom: SUBSTANTIVE_EFFECTIVE_FROM,
  effectiveStatus: "not_yet_effective",
  commencementGroup: "eighteen_months",
};

const ONE_YEAR: ProvisionCommencement = {
  effectiveFrom: CONSENT_MANAGER_EFFECTIVE_FROM,
  effectiveStatus: "not_yet_effective",
  commencementGroup: "one_year",
};

const COMMENCEMENT_CAVEAT =
  "Commencement is phased by the 2025-11-13 Gazette notification; dates are calculated from the publication date and may be amended. Verify the Gazette text before relying on a provision. This is a readiness observation, not a current finding of statutory breach.";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: "DPDP_ACT_2023",
    title: "The Digital Personal Data Protection Act, 2023 (Act 22 of 2023)",
    sourceUrl: ACT_URL,
    publishedDate: "2023-08-11",
    effectiveStatus: "partially_in_force",
    effectiveFrom: GAZETTE_DATE,
    summary:
      "India's principal digital personal data protection statute. The commencement notification phases substantive obligations: the main notice, consent and other provisions commence 18 months after the 2025-11-13 Gazette (2027-05-13), while Section 6(9) (Consent Manager registration) is in the earlier one-year group (2026-11-13). Each provision is stored with its own effective date and status.",
    verifiedOn: VERIFIED_ON,
    notes:
      "Source checked via India Code and MeitY/PIB commencement materials. Commencement dates are calculated from the 2025-11-13 Gazette publication and may be amended; verify the Gazette text and any amendments before relying on a provision for an enforcement decision.",
  },
  {
    id: "DPDP_RULES_2025",
    title: "Digital Personal Data Protection Rules, 2025",
    sourceUrl: RULES_URL,
    publishedDate: GAZETTE_DATE,
    effectiveStatus: "partially_in_force",
    effectiveFrom: GAZETTE_DATE,
    summary:
      "Rules notified with the Act in November 2025. Rules 3 to 15, 21 and 22 are on a later phased timeline; specific rule commencement must be checked against the Gazette before use.",
    verifiedOn: VERIFIED_ON,
    notes:
      "The audit currently maps only verified Act sections. Rule-level mappings are deliberately withheld until each rule's commencement date is confirmed. See PIB release PRID=2190014.",
  },
];

function actSection(
  id: string,
  provision: string,
  summary: string,
  evidenceRequired: string[],
  applicability: string,
  commencement: ProvisionCommencement,
): LegalReference {
  return {
    id,
    documentTitle: "The Digital Personal Data Protection Act, 2023 (Act 22 of 2023)",
    provision,
    sourceUrl: ACT_URL,
    version: "Act 22 of 2023, as published on India Code",
    publishedDate: "2023-08-11",
    effectiveFrom: commencement.effectiveFrom,
    effectiveStatus: commencement.effectiveStatus,
    commencementGroup: commencement.commencementGroup,
    applicability,
    evidenceRequired,
    summary,
    verifiedOn: VERIFIED_ON,
    notes: COMMENCEMENT_CAVEAT,
  };
}

export const LEGAL_REFERENCES: Record<string, LegalReference> = {
  "ACT-S5": actSection(
    "ACT-S5",
    "Section 5 — Notice",
    "A Data Fiduciary must give the Data Principal a clear, standalone notice describing the personal data and purposes, the manner of exercising rights and making complaints, and the communication link to the Data Fiduciary's website or app. The notice must enable informed consent.",
    [
      "Notice text and its location",
      "Personal-data categories requested",
      "Processing purposes",
      "Rights and complaint mechanism",
      "Data Fiduciary contact/link",
    ],
    "Data Fiduciaries processing digital personal data of Data Principals in India, subject to the Act's application and exemptions.",
    EIGHTEEN_MONTHS,
  ),
  "ACT-S6": actSection(
    "ACT-S6",
    "Section 6(1)-(8), (10) — Consent",
    "Consent must be free, specific, informed, unconditional and unambiguous, expressed by a clear affirmative action, and limited to the specified purpose. Consent must be capable of withdrawal, and withdrawal must be as easy as giving consent.",
    [
      "Consent interface and exact labels",
      "Affirmative-action mechanics",
      "Purpose-specific choices",
      "Withdrawal control and observed behaviour",
      "Consent records or persistence",
    ],
    "Processing based on consent; not every cookie or technical signal is consent-based processing.",
    EIGHTEEN_MONTHS,
  ),
  "ACT-S6-9": actSection(
    "ACT-S6-9",
    "Section 6(9) — Consent Manager registration",
    "A Consent Manager must be registered with the Data Protection Board and must enable a Data Principal to give, manage, review and withdraw consent through an accessible, transparent and interoperable platform. This provision is in the earlier one-year commencement group.",
    [
      "Consent Manager registration evidence",
      "Board registration reference",
      "Interoperability and accessibility evidence",
    ],
    "Registered Consent Managers; not a website-level obligation for a Data Fiduciary that does not operate a Consent Manager.",
    ONE_YEAR,
  ),
  "ACT-S8": actSection(
    "ACT-S8",
    "Section 8 — General obligations of Data Fiduciary",
    "A Data Fiduciary must be accountable for compliance, use processors under contract, ensure accuracy and erasure where required, implement reasonable security safeguards, and notify personal-data breaches as required. Specific security controls are contextual; the Act does not prescribe particular HTTP headers.",
    [
      "Security and organizational evidence",
      "Processor contracts and instructions",
      "Retention/erasure records",
      "Breach-response evidence",
    ],
    "Data Fiduciaries, subject to the Act's application, exemptions and phased commencement.",
    EIGHTEEN_MONTHS,
  ),
  "ACT-S9": actSection(
    "ACT-S9",
    "Section 9 — Processing of personal data of children",
    "A Data Fiduciary must obtain verifiable parental consent before processing children's personal data and must not undertake tracking, behavioural monitoring or targeted advertising directed at children, subject to exemptions and prescribed conditions.",
    [
      "Age-assurance design",
      "Parental-consent workflow",
      "Child-directed content indicators",
      "Child-related tracking evidence",
    ],
    "Processing of children's personal data; not every website with a general audience is automatically subject to a mandatory age gate.",
    EIGHTEEN_MONTHS,
  ),
  "ACT-S10": actSection(
    "ACT-S10",
    "Section 10 — Additional obligations of Significant Data Fiduciary",
    "A Significant Data Fiduciary has additional obligations, including a Data Protection Officer, independent audit, impact assessment and other prescribed measures. SDF status is determined by the Central Government and is not inferable from a website alone.",
    [
      "SDF designation evidence",
      "DPO appointment",
      "Data protection impact assessment",
      "Independent audit evidence",
    ],
    "Only entities notified as Significant Data Fiduciaries; public website signals cannot establish SDF status.",
    EIGHTEEN_MONTHS,
  ),
  "ACT-S11": actSection(
    "ACT-S11",
    "Section 11 — Right to access information about personal data",
    "A Data Principal has the right to obtain a summary of personal data processed, the identities of Data Fiduciaries with whom it has been shared, and related processing information, subject to the Act.",
    [
      "Rights page or request mechanism",
      "Request workflow evidence",
      "Response process evidence",
    ],
    "Data Principals' rights requests; website discovery alone does not prove the workflow works.",
    EIGHTEEN_MONTHS,
  ),
  "ACT-S12": actSection(
    "ACT-S12",
    "Section 12 — Right to correction and erasure of personal data",
    "A Data Principal has the right to correction of inaccurate or misleading personal data, completion of incomplete data, and erasure of personal data no longer necessary for its purpose, subject to legal retention requirements.",
    [
      "Correction/erasure request mechanism",
      "Retention policy",
      "Fulfilment evidence",
    ],
    "Data Principals' correction and erasure requests.",
    EIGHTEEN_MONTHS,
  ),
  "ACT-S13": actSection(
    "ACT-S13",
    "Section 13 — Right of grievance redressal",
    "A Data Principal has the right to a readily available grievance-redressal mechanism. A Data Fiduciary must provide a contact and resolve grievances within the prescribed period, with escalation to the Data Protection Board as provided.",
    [
      "Grievance contact or mechanism",
      "Published escalation path",
      "Response process evidence",
    ],
    "Data Fiduciaries subject to the Act; the existence of a contact form alone does not prove effective redressal.",
    EIGHTEEN_MONTHS,
  ),
  "ACT-S16": actSection(
    "ACT-S16",
    "Section 16 — Processing of personal data outside India",
    "Cross-border processing is permitted subject to Central Government restrictions notified under the Act. The Act does not require every third-party hostname to be listed in a privacy notice.",
    [
      "Cross-border transfer inventory",
      "Applicable government restrictions",
      "Processor/sub-processor locations",
      "Transfer safeguards evidence",
    ],
    "Data Fiduciaries transferring personal data outside India, subject to notified restrictions and exemptions.",
    EIGHTEEN_MONTHS,
  ),
};

export function resolveLegalReferences(ids: string[]): LegalReference[] {
  return ids
    .map((id) => LEGAL_REFERENCES[id])
    .filter((reference): reference is LegalReference => Boolean(reference));
}

export const LEGAL_FRAMEWORK_VERSION =
  "DPDP Act 2023 (Act 22 of 2023) + DPDP Rules 2025; per-provision commencement verified 2026-10-19";

export const COMMENCEMENT_SUMMARY =
  "Most substantive DPDP Act provisions mapped here commence on 2027-05-13 (18 months after the 2025-11-13 Gazette); Section 6(9) (Consent Manager registration) commences on 2026-11-13 (one-year group). Dates are calculated from the Gazette publication date and may be amended.";

export const LEGAL_SOURCE_LINKS = {
  act: ACT_URL,
  rules: RULES_URL,
  commencement: COMMENCEMENT_URL,
} as const;
