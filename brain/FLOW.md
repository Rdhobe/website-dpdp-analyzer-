# FLOW.md — Application and Business Flows

**Last updated:** 2026-10-19

The implemented flow is the audit dashboard: a user submits an authorized URL, the app queues a run, a detached worker crawls and evaluates it, and the results appear in the dashboard. All other product flows below are **Proposed** based on the requirements and are not implemented.

## 1. Current Flow (Implemented)

```mermaid
flowchart LR
    U["User opens /"] --> D["components/audit/audit-dashboard.tsx"]
    D --> F["NewAuditForm: enter authorized URL"]
    F --> A["POST /api/audits (queued AuditRun)"]
    A --> W["lib/audit/launcher.ts spawns workers/audit-worker.ts"]
    W --> R["lib/audit/runner.ts: crawl + deterministic rules"]
    R --> S["lib/audit/store.ts (.data/audits)"]
    S --> H["Dashboard history + /audits/[id] detail + /audits/compare"]
```

The earlier single-page landing inspector was removed on 2026-10-19. There is still no authentication, database, or queue; runs are queued in-process and executed by a detached worker, with a file-backed store.

When screenshot capture is enabled, the worker stores a full-page screenshot and element crops under `.data/audits/<runId>/screenshots/`; the detail view renders them for each finding, the browser snapshots, and a run-level gallery via `/api/audits/{id}/screenshots/{name}`.

## 2. Target End-to-End Audit Flow (Proposed)

```mermaid
flowchart TD
    A["User signs in"] --> B["Create audit project"]
    B --> C["Enter root URL + scope"]
    C --> D{"Auth needed?"}
    D -->|No| E["Public crawl mode"]
    D -->|Credentials| F["Provide authorized credentials / login URL"]
    D -->|Manual| G["Controlled browser login (MFA/CAPTCHA)"]
    E --> H["Validate URL and scope"]
    F --> H
    G --> H
    H --> I{"Valid and authorized?"}
    I -->|No| J["Show validation error; do not crawl"]
    I -->|Yes| K["Create audit run; enqueue crawl job"]
    K --> L["Crawler discovers and processes pages"]
    L --> M["Extract evidence per page"]
    M --> N["Run deterministic DPDP checks"]
    N --> O{"AI enabled and configured?"}
    O -->|Yes| P["Retrieval-grounded AI analysis with citation validation"]
    O -->|No| Q["Deterministic findings only"]
    P --> R["Persist findings + evidence"]
    Q --> R
    R --> S["Dashboard: overview, pages, findings"]
    S --> T["User reviews findings / assigns reviewer"]
    T --> U["Remediation guidance and draft copy"]
    U --> V["User fixes website"]
    V --> W["Re-run audit / selected checks"]
    W --> X["Compare with previous run"]
    X --> S
    S --> Y["Export PDF / JSON / CSV"]
```

## 3. Project Creation and Validation Flow (Proposed)

```mermaid
flowchart TD
    A["Open new project form"] --> B["Enter project name"]
    B --> C["Enter root URL"]
    C --> D["Select auth mode"]
    D --> E["Configure limits and scope"]
    E --> F["Configure analysis toggles"]
    F --> G["Confirm authorization attestation"]
    G --> H["Client + server validation"]
    H --> I{"Valid?"}
    I -->|No| J["Field-level errors; preserve entered values"]
    I -->|Yes| K["Persist project as tenant-scoped record"]
    K --> L["Redirect to project overview"]
```

Validation must include:

- URL scheme must be `http` or `https`; no embedded credentials.
- Host must not be localhost, a private IP, or a metadata endpoint.
- Depth, page count, concurrency, delay, timeout, and file size within bounds.
- Include/exclude paths syntactically valid.
- Credentials required only when auth mode is credentials-based.
- Approved subdomains must belong to a plausible related domain and be explicitly listed.

## 4. Authentication (Target Website) Flow (Proposed)

```mermaid
flowchart TD
    A["Audit requires authentication"] --> B{"Auth mode"}
    B -->|Public| C["No login; crawl public pages"]
    B -->|Credentials| D["Open login URL in controlled browser"]
    D --> E["Detect form or use provided selectors"]
    E --> F["Submit provided credentials"]
    F --> G{"Redirect / auth state verified?"}
    G -->|No| H["Record auth failure; ask user to correct config"]
    G -->|Yes| I["Persist session cookies in isolated profile"]
    B -->|Manual| J["Launch headed browser session for user"]
    J --> K["User completes MFA/CAPTCHA manually"]
    K --> L{"Session verified?"}
    L -->|No| H
    L -->|Yes| I
    I --> M["Crawl authenticated scope"]
    M --> N{"Session expired mid-crawl?"}
    N -->|Yes| O["Pause; attempt re-auth if safe, else ask user"]
    N -->|No| P["Continue"]
    P --> Q["Logout and destroy session/profile"]
    O --> Q
    H --> Q
```

Rules:

- Never bypass MFA/CAPTCHA or access controls.
- Verify authenticated state by checking a protected page or expected user indicator, not just the absence of a login form.
- Credentials and cookies never appear in logs or exports.
- Sessions are not shared across projects or tenants.

## 5. Crawl and Progress Flow (Proposed)

```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as API
    participant Q as Queue
    participant W as Crawl Worker
    participant DB as Database

    UI->>API: POST /api/projects/{id}/audits
    API->>DB: Create audit (status=queued)
    API->>Q: Enqueue crawl
    API-->>UI: audit_id
    UI->>API: Subscribe to progress (SSE/WS)
    Q->>W: Start job
    W->>DB: status=running, record start
    loop Each URL
        W->>W: Normalize, scope-check, fetch/render
        W->>DB: Save page snapshot, status, errors
        W-->>API: Progress counts/current URL
        API-->>UI: Progress event
    end
    W->>DB: status=crawled (or partial/failed)
    W->>Q: Enqueue extraction/analysis
    API-->>UI: Crawl complete
```

Progress events must report real values: discovered, queued, processed, failed, skipped, retries, current URL, queue depth. **No fabricated percentage or ETA.**

Pause/resume/cancel:

```mermaid
stateDiagram-v2
    [*] --> Queued
    Queued --> Running: worker starts
    Running --> Paused: user pauses
    Paused --> Running: user resumes
    Queued --> Cancelled: user cancels
    Running --> Cancelled: user cancels
    Paused --> Cancelled: user cancels
    Running --> Completed: crawl finishes
    Running --> Partial: some pages failed
    Running --> Failed: unrecoverable error
    Cancelled --> [*]
    Completed --> [*]
    Partial --> [*]
    Failed --> [*]
```

Cancellation must clean up browser sessions, credentials in memory, and temporary artifacts according to retention policy.

## 6. Evidence Extraction Flow (Proposed)

```mermaid
flowchart LR
    A["Fetch/render page"] --> B["Capture HTTP metadata"]
    B --> C["Parse DOM: headings, text, links, forms, controls"]
    C --> D["Detect privacy/cookie links and consent UI"]
    D --> E["Record scripts and third-party destinations"]
    E --> F{"Screenshot enabled?"}
    F -->|Yes| G["Capture screenshot"]
    F -->|No| H["Skip screenshot"]
    G --> I["Redact sensitive values"]
    H --> I
    I --> J["Classify page type"]
    J --> K["Persist evidence with timestamp and errors"]
```

## 7. Compliance Analysis Flow (Proposed)

```mermaid
flowchart TD
    A["Extracted evidence"] --> B["Select legal framework version"]
    B --> C["Load applicable rules"]
    C --> D["Run deterministic checks"]
    D --> E["Generate findings with evidence + limitations"]
    E --> F{"AI enabled?"}
    F -->|No| G["Persist deterministic findings"]
    F -->|Yes| H["Retrieve relevant official legal text"]
    H --> I["Check provision applicability/effective date"]
    I --> J["Retrieve relevant website evidence"]
    J --> K["Model analyzes evidence against provision"]
    K --> L["Structured output required"]
    L --> M["Validate schema and citations against legal DB"]
    M --> N{"Citations valid?"}
    N -->|No| O["Reject claim; mark not assessed"]
    N -->|Yes| P["Merge/augment findings; flag uncertainty"]
    O --> G
    P --> G
    G --> Q["Update audit summary and coverage"]
```

## 8. Finding Review and Remediation Flow (Proposed)

```mermaid
flowchart TD
    A["User opens finding"] --> B["View evidence, URLs, legal refs, limitations"]
    B --> C{"Agree with finding?"}
    C -->|No| D["Mark not applicable / false positive with reason"]
    C -->|Yes| E["Assign reviewer and set status"]
    E --> F["Read remediation guidance and draft copy"]
    F --> G["Implement fix on target website"]
    G --> H["Run verification steps"]
    H --> I["Re-run selected checks or full audit"]
    I --> J{"Resolved?"}
    J -->|Yes| K["Mark resolved; record resolution notes"]
    J -->|No| E
    D --> L["Finding retained in audit history"]
    K --> L
```

## 9. Export Flow (Proposed)

```mermaid
sequenceDiagram
    participant U as User
    participant API as API
    participant DB as Database
    participant R as Report Renderer

    U->>API: GET /api/audits/{id}/export?format=pdf
    API->>API: Authorize tenant + audit
    API->>DB: Load audit, findings, evidence, config
    API->>R: Render (redacted)
    R-->>API: PDF/JSON/CSV artifact
    API-->>U: Download + audit ID
    Note over API,DB: Export reproducible from audit ID and rule version
```

## 10. Re-audit and Comparison Flow (Proposed)

1. User selects an audit to re-run (full or selected checks).
2. System creates a new audit run using the same project configuration and legal framework version (or a newly selected version, recorded).
3. Crawl and analysis execute.
4. Findings are matched across runs using stable rule IDs and normalized affected URLs.
5. Dashboard shows: new, resolved, unchanged, regressed findings; coverage changes; configuration changes.
6. Prior audit evidence is retained per retention policy.

## 11. Error and Failure Paths (Proposed)

| Failure | User-visible behavior | System behavior |
| --- | --- | --- |
| Invalid target URL | Field error with reason | No job created |
| Blocked destination (private/metadata) | Explicit blocked message | Attempt logged; no request |
| Auth failure | Actionable message; config link | Audit marked auth-failed; no authenticated claims |
| Session expiry | Paused state with re-auth prompt | Stop authenticated crawling; cleanup |
| Crawl timeout | Page marked failed with reason | Continue within limits |
| Parse failure | Page marked partial; evidence available if any | Record extraction error |
| Worker crash | Audit shows failed/interrupted | Recovery or resumable job; no silent success |
| AI unavailable | Findings remain deterministic | Record AI as skipped/unavailable |
| Invalid AI citation | Claim rejected | Finding marked not assessed/needs review |
| Export failure | Error with retry | Log correlation ID; no partial download |
| Permission denied | Access denied message | No resource details leaked |

## 12. Related Documents

- [FEATURES.md](./FEATURES.md) — features supporting these flows.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — components and data flow.
- [API.md](./API.md) — endpoints used by flows.
- [SECURITY.md](./SECURITY.md) — constraints on auth and crawling.
- [PRD.md](./PRD.md) — requirements behind flows.
