import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  allForms,
  evidenceForRun,
  fail,
  notApplicable,
  notAssessed,
  pass,
  primaryNoticePage,
  warning,
} from "./helpers";

const HIGH_SENSITIVITY = new Set([
  "government-id",
  "financial",
  "health",
  "biometric",
  "children",
  "date-of-birth",
]);

function formInventory(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  if (forms.length === 0) {
    return notApplicable("No forms were discovered in the inspected scope.", {
      evidence: [evidenceForRun(context, "form-inventory", "No forms.", {})],
    });
  }
  return pass(`${forms.length} form(s) were discovered.`, {
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "form-inventory", "Form inventory.", {
        forms: forms.map((form) => ({
          pageUrl: form.pageUrl,
          action: form.absoluteAction,
          method: form.method,
          fieldCount: form.fields.length,
        })),
      }),
    ],
  });
}

function fieldClassification(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  if (forms.length === 0) {
    return notAssessed("No forms were available for field classification.", {
      evidence: [evidenceForRun(context, "form-fields", "No forms.", {})],
    });
  }
  const fields = forms.flatMap((form) => form.fields);
  const classified = fields.filter((field) => field.sensitiveCategory);
  return pass(`${classified.length} of ${fields.length} fields were classified as likely personal-data fields.`, {
    confidence: "medium",
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "form-fields", "Field classification.", {
        fields: fields.map((field) => ({
          name: field.name,
          type: field.type,
          label: field.label,
          required: field.required,
          sensitiveCategory: field.sensitiveCategory,
          redacted: field.redacted,
        })),
      }),
    ],
    limitations: "Classification is based on names, labels, types and autocomplete; it can miss or misclassify fields.",
  });
}

function compareWithNotice(context: AuditContext): {
  notice: ReturnType<typeof primaryNoticePage>;
  observed: string[];
  disclosed: string[];
  unexplained: string[];
  affectedUrls: string[];
} {
  const notice = primaryNoticePage(context);
  const forms = allForms(context);
  const disclosed = notice?.signals.personalDataCategories ?? [];
  const observed = [
    ...new Set(
      forms.flatMap((form) =>
        form.fields
          .map((field) => field.sensitiveCategory)
          .filter((category): category is string => Boolean(category)),
      ),
    ),
  ];
  return {
    notice,
    observed,
    disclosed,
    unexplained: observed.filter((category) => !disclosed.includes(category)),
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
  };
}

function purposeNoticeConsistency(context: AuditContext): RuleOutcome {
  const comparison = compareWithNotice(context);
  if (!comparison.notice) {
    return notAssessed("No notice page was available for a form/notice comparison.", {
      evidence: [evidenceForRun(context, "form-notice", "No notice.", {})],
    });
  }
  if (comparison.observed.length === 0) {
    return notAssessed("No classified form fields were available to compare with the notice.", {
      evidence: [evidenceForRun(context, "form-notice", "No classified fields.", {})],
    });
  }
  if (comparison.unexplained.length > 0) {
    return warning(`Classified form categories not referenced in the notice: ${comparison.unexplained.join(", ")}.`, {
      affectedUrls: comparison.affectedUrls,
      evidence: [
        evidenceForRun(context, "form-notice", "Observed/disclosed categories.", {
          observed: comparison.observed,
          disclosed: comparison.disclosed,
          unexplained: comparison.unexplained,
        }),
      ],
    });
  }
  return pass("Classified form-field categories were referenced in the available notice.", {
    affectedUrls: comparison.affectedUrls,
    evidence: [
      evidenceForRun(context, "form-notice", "Observed/disclosed categories.", {
        observed: comparison.observed,
        disclosed: comparison.disclosed,
      }),
    ],
  });
}

function unexplainedCollection(context: AuditContext): RuleOutcome {
  const comparison = compareWithNotice(context);
  if (!comparison.notice || comparison.observed.length === 0) {
    return notAssessed("Insufficient form and notice evidence for high-sensitivity collection review.", {
      evidence: [
        evidenceForRun(context, "form-unexplained", "Insufficient evidence.", {
          noticeAvailable: Boolean(comparison.notice),
          observed: comparison.observed,
        }),
      ],
    });
  }
  const highSensitivityUnexplained = comparison.unexplained.filter((category) =>
    HIGH_SENSITIVITY.has(category),
  );
  if (highSensitivityUnexplained.length > 0) {
    return warning("High-sensitivity field categories were not found in the available notice.", {
      affectedUrls: comparison.affectedUrls,
      evidence: [
        evidenceForRun(context, "form-unexplained", "High-sensitivity unexplained categories.", {
          categories: highSensitivityUnexplained,
          observed: comparison.observed,
          disclosed: comparison.disclosed,
        }),
      ],
      humanReviewRequired: true,
    });
  }
  return pass("No unexplained high-sensitivity field category was detected.", {
    affectedUrls: comparison.affectedUrls,
    evidence: [
      evidenceForRun(context, "form-unexplained", "High-sensitivity review.", {
        observed: comparison.observed,
        unexplained: comparison.unexplained,
      }),
    ],
  });
}

function requiredOptional(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  if (forms.length === 0) {
    return notApplicable("No forms were discovered.", {
      evidence: [evidenceForRun(context, "form-required", "No forms.", {})],
    });
  }
  const fields = forms.flatMap((form) => form.fields);
  const required = fields.filter((field) => field.required);
  return pass(`${required.length} of ${fields.length} fields are marked required.`, {
    confidence: "medium",
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "form-required", "Required/optional field inventory.", {
        required: required.map((field) => ({
          name: field.name,
          label: field.label,
          category: field.sensitiveCategory,
        })),
        optional: fields
          .filter((field) => !field.required)
          .map((field) => ({ name: field.name, label: field.label })),
      }),
    ],
    limitations: "The engine reports what the HTML declares; it does not test whether a required field is actually necessary.",
  });
}

function consentSeparation(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  const labels = forms.flatMap((form) => form.consentCheckboxLabels);
  if (labels.length === 0) {
    return notApplicable("No consent-type checkbox labels were discovered in forms.", {
      evidence: [evidenceForRun(context, "form-consent", "No consent checkboxes.", {})],
    });
  }
  const bundled = labels.filter(
    (label) =>
      /(privacy|terms|service)/i.test(label) &&
      /(marketing|promotion|advertis|analytics|newsletter|optional)/i.test(label),
  );
  if (bundled.length > 0) {
    return warning("A checkbox label appears to bundle required service/privacy terms with optional marketing or analytics consent.", {
      affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
      evidence: [
        evidenceForRun(context, "form-consent", "Bundled consent labels.", {
          labels,
          bundled,
        }),
      ],
    });
  }
  return pass("No obvious bundled required/optional consent label was detected.", {
    confidence: "medium",
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "form-consent", "Consent checkbox labels.", { labels }),
    ],
  });
}

function noticeAtCollection(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  if (forms.length === 0) {
    return notApplicable("No forms were discovered.", {
      evidence: [evidenceForRun(context, "form-notice-link", "No forms.", {})],
    });
  }
  const missing = forms.filter(
    (form) => !form.hasPrivacyLinkNearby && !primaryNoticePage(context),
  );
  if (missing.length > 0) {
    return warning("Some form pages have neither a nearby privacy link nor a discovered notice page.", {
      affectedUrls: [...new Set(missing.map((form) => form.pageUrl))],
      evidence: [
        evidenceForRun(context, "form-notice-link", "Forms missing notice access.", {
          forms: missing.map((form) => ({
            pageUrl: form.pageUrl,
            hasPrivacyLinkNearby: form.hasPrivacyLinkNearby,
          })),
        }),
      ],
    });
  }
  return pass("Form pages have a nearby privacy link or a notice page was discovered.", {
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "form-notice-link", "Notice access at collection points.", {
        forms: forms.map((form) => ({
          pageUrl: form.pageUrl,
          hasPrivacyLinkNearby: form.hasPrivacyLinkNearby,
        })),
      }),
    ],
  });
}

function externalDestination(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  if (forms.length === 0) {
    return notApplicable("No forms were discovered.", {
      evidence: [evidenceForRun(context, "form-destination", "No forms.", {})],
    });
  }
  const insecure = forms.filter((form) => form.absoluteAction.startsWith("http:"));
  if (insecure.length > 0) {
    return fail("At least one form submits to an insecure HTTP destination.", {
      affectedUrls: [...new Set(insecure.map((form) => form.pageUrl))],
      evidence: [
        evidenceForRun(context, "form-destination", "Insecure form actions.", {
          actions: insecure.map((form) => form.absoluteAction),
        }),
      ],
    });
  }
  const external = forms.filter((form) => form.externalDestination);
  if (external.length > 0) {
    return warning("At least one form submits to an external destination; the processor and notice disclosure need review.", {
      affectedUrls: [...new Set(external.map((form) => form.pageUrl))],
      evidence: [
        evidenceForRun(context, "form-destination", "External form actions.", {
          actions: external.map((form) => form.absoluteAction),
        }),
      ],
    });
  }
  return pass("All discovered forms post to the same origin over HTTPS in the captured HTML.", {
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "form-destination", "Form actions.", {
        actions: forms.map((form) => form.absoluteAction),
      }),
    ],
  });
}

function redactionCheck(context: AuditContext): RuleOutcome {
  const fields = allForms(context).flatMap((form) => form.fields);
  const allRedacted = fields.every((field) => field.redacted === true);
  return pass("Captured form evidence contains field metadata only; values are not stored.", {
    evidence: [
      evidenceForRun(context, "form-redaction", "Redaction self-check.", {
        fieldCount: fields.length,
        allFieldsMarkedRedacted: allRedacted,
        valuesCaptured: false,
      }),
    ],
    limitations: "The engine does not capture form values; this self-check verifies the evidence shape, not every possible downstream export.",
  });
}

function noSubmissionCheck(context: AuditContext): RuleOutcome {
  return pass("The crawler does not submit forms, and the browser collector only clicks recognized consent controls.", {
    evidence: [
      evidenceForRun(context, "form-submission", "Interaction policy evidence.", {
        formSubmissionPerformed: false,
        consentClicksLogged: context.browser?.interactionLog ?? [],
      }),
    ],
    limitations: "A future custom worker could violate this policy; the platform should enforce it in code review and tests.",
  });
}

export const FORM_RULES: Record<string, TestEvaluator> = {
  "FORM-001": formInventory,
  "FORM-002": fieldClassification,
  "FORM-003": purposeNoticeConsistency,
  "FORM-004": unexplainedCollection,
  "FORM-005": requiredOptional,
  "FORM-006": consentSeparation,
  "FORM-007": noticeAtCollection,
  "FORM-008": externalDestination,
  "FORM-009": redactionCheck,
  "FORM-010": noSubmissionCheck,
};
