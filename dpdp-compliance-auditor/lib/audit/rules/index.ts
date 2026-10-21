import type { TestEvaluator } from "../types";
import { CHILD_RULES } from "./children";
import { CONSENT_RULES } from "./consent";
import { CRAWL_RULES } from "./crawl";
import { FORM_RULES } from "./forms";
import { NOTICE_RULES } from "./notice";
import { ORG_RULES } from "./org";
import { RETENTION_RULES } from "./retention";
import { RIGHTS_RULES } from "./rights";
import { SECURITY_RULES } from "./security";
import { THIRD_PARTY_RULES } from "./third-party";

export const ALL_RULES: Record<string, TestEvaluator> = {
  ...CRAWL_RULES,
  ...NOTICE_RULES,
  ...CONSENT_RULES,
  ...FORM_RULES,
  ...RIGHTS_RULES,
  ...CHILD_RULES,
  ...SECURITY_RULES,
  ...THIRD_PARTY_RULES,
  ...RETENTION_RULES,
  ...ORG_RULES,
};
