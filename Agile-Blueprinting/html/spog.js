const phases = [
  {
    id: "intake-direction",
    title: "Intake & Direction",
    description: "Confirm the request is understandable, categorized, routed, and directionally approved.",
    posture: "Ready to proceed with amendment handling visible.",
  },
  {
    id: "blueprint-readiness",
    title: "Blueprint Readiness",
    description: "Confirm the customer need, blueprint, and handoff criteria can govern delivery.",
    posture: "Proceed with bounded discovery assumptions.",
  },
  {
    id: "build-evidence",
    title: "Build & Evidence",
    description: "Confirm implementation and validation evidence are sufficient for human review.",
    posture: "Proceed with accepted testing follow-up.",
  },
  {
    id: "release-readiness",
    title: "Release Readiness",
    description: "Confirm documentation, packaging, deployment, consolidated evidence, and ship/hold decision.",
    posture: "Ship with documented follow-up.",
  },
  {
    id: "post-release-closure",
    title: "Post-Release & Closure",
    description: "Confirm production outcome, requester acceptance, and closure evidence.",
    posture: "Waiting on deployment and final acceptance.",
  },
];

const widgets = [
  {
    id: "intake",
    phase: "intake-direction",
    title: "Intake Triage",
    status: "ready",
    score: 96,
    owner: "Support",
    approver: "Support leadership",
    summary: "Request is understandable, categorized, and linked to the source ticket.",
    reviewer: "M. Alvarez, Support Lead",
    decision: "Ready to proceed",
    evidence: ["Requester and affected user group captured", "Business impact summarized", "Supporting screenshots attached"],
    details: "The intake package is complete enough for categorization and delivery lane selection. No ambiguity remains that would prevent routing.",
  },
  {
    id: "categorization",
    phase: "intake-direction",
    title: "Ticket Categorization",
    status: "ready",
    score: 94,
    owner: "Support",
    approver: "Support leadership",
    summary: "Work categorized as amendment with linked parent request.",
    reviewer: "M. Alvarez, Support Lead",
    decision: "Ready to proceed",
    evidence: ["Parent ticket referenced", "Amendment rationale recorded", "Customer-visible change described"],
    details: "Engineering retains final authority on whether this remains an amendment or becomes a new request. Current sample shows a course correction within the same outcome.",
  },
  {
    id: "lane",
    phase: "intake-direction",
    title: "Delivery Lane Selection",
    status: "ready",
    score: 92,
    owner: "Engineering",
    approver: "Engineering leadership",
    summary: "Pre-defined categorization routes work to Amendment / Re-Scope lane.",
    reviewer: "D. Chen, Engineering Manager",
    decision: "Ready to proceed",
    evidence: ["Lane rule matched", "Affected work identified", "Unrelated work allowed to continue"],
    details: "Affected work is evaluated case by case. Where practical, delivery continues to avoid unnecessary delay.",
  },
  {
    id: "discovery",
    phase: "blueprint-readiness",
    title: "Discovery Readiness",
    status: "caution",
    score: 82,
    owner: "Product",
    approver: "Product leadership",
    summary: "Core workflow is understood; two edge cases remain as explicit assumptions.",
    reviewer: "J. Patel, Product Director",
    decision: "Proceed with risk",
    evidence: ["Customer conversation notes", "Workflow walkthrough", "Assumption log"],
    details: "Open questions do not block blueprint drafting because they are bounded and visible. They must be resolved before final acceptance validation.",
  },
  {
    id: "prd",
    phase: "blueprint-readiness",
    title: "PRD / Blueprint Review",
    status: "ready",
    score: 90,
    owner: "Product leadership",
    approver: "Engineering",
    summary: "Blueprint is coherent enough to work from and preserves unknowns visibly.",
    reviewer: "D. Chen, Engineering Manager",
    decision: "Ready to proceed",
    evidence: ["Scope boundaries", "Acceptance criteria", "Risk register", "Open questions"],
    details: "Engineering accepts the write-up quality as sufficient for implementation planning. Product remains responsible for writing the final amendment description.",
  },
  {
    id: "customer-direction",
    phase: "intake-direction",
    title: "Customer Direction",
    status: "ready",
    score: 91,
    owner: "Product",
    approver: "Customer",
    summary: "Customer confirms the intended outcome before build continues.",
    reviewer: "Customer representative",
    decision: "Ready to proceed",
    evidence: ["Direction confirmation", "Customer notes", "Product summary"],
    details: "If the customer is the requester, customer approval remains required even when Product coordinates the process.",
  },
  {
    id: "ready",
    phase: "blueprint-readiness",
    title: "Definition of Ready",
    status: "ready",
    score: 88,
    owner: "Product",
    approver: "Engineering",
    summary: "Blueprint has enough context for Engineering and agent handoff.",
    reviewer: "D. Chen, Engineering Manager",
    decision: "Ready to proceed",
    evidence: ["Readiness checklist", "Assumptions", "Acceptance criteria", "Out-of-scope list"],
    details: "The sample demonstrates readiness as a governance gate, not an estimation ceremony.",
  },
  {
    id: "planning",
    phase: "blueprint-readiness",
    title: "Agent Planning Review",
    status: "ready",
    score: 87,
    owner: "Engineering",
    approver: "DevOps",
    summary: "Agent missions, inputs, outputs, and escalation conditions are clear.",
    reviewer: "R. Williams, DevOps Lead",
    decision: "Ready to proceed",
    evidence: ["Implementation prompt", "Unit test prompt", "E2E prompt", "Evidence contract"],
    details: "This includes later-state agent orchestration even though the MVP rollout starts with a smaller operational skill set.",
  },
  {
    id: "implementation",
    phase: "build-evidence",
    title: "Implementation Review",
    status: "ready",
    score: 93,
    owner: "Engineering",
    approver: "Engineering lead",
    summary: "Code/config changes align to the blueprint and amendment scope.",
    reviewer: "T. Nguyen, Engineering Lead",
    decision: "Ready to proceed",
    evidence: ["Files changed", "Implementation notes", "Local build result", "Known deviations"],
    details: "The implementation agent output is treated as evidence for human review, not as a substitute for review.",
  },
  {
    id: "pr",
    phase: "build-evidence",
    title: "Pull Request Review",
    status: "ready",
    score: 89,
    owner: "Engineering",
    approver: "Engineering lead",
    summary: "PR is reviewable, linked, and includes the required evidence package.",
    reviewer: "T. Nguyen, Engineering Lead",
    decision: "Ready to merge",
    evidence: ["PR link", "Diff summary", "Review comments", "Merge readiness"],
    details: "Sample state assumes all blocking comments are resolved and non-blocking comments are documented.",
  },
  {
    id: "tests",
    phase: "build-evidence",
    title: "Testing Review",
    status: "caution",
    score: 84,
    owner: "QA",
    approver: "QA leadership",
    summary: "Unit and E2E evidence pass; one manual regression area accepted as follow-up.",
    reviewer: "K. Brooks, QA Manager",
    decision: "Proceed with risk",
    evidence: ["Unit test log", "E2E screenshots", "Manual smoke result", "Regression note"],
    details: "The full requirement, including amendments, is validated by the same role that would validate it without amendments.",
  },
  {
    id: "acceptance",
    phase: "build-evidence",
    title: "Acceptance Validation",
    status: "ready",
    score: 86,
    owner: "QA",
    approver: "Product",
    summary: "Delivered behavior matches the expected business outcome.",
    reviewer: "J. Patel, Product Director",
    decision: "Ready to proceed",
    evidence: ["Acceptance checklist", "Expected vs actual summary", "Screenshots", "Customer confirmation path"],
    details: "Final approval remains with whoever made the request unless Product is the requester for its own work.",
  },
  {
    id: "security",
    phase: "build-evidence",
    title: "Security / Risk Review",
    status: "ready",
    score: 95,
    owner: "Engineering",
    approver: "Security",
    summary: "No new access, data exposure, or compliance concerns identified.",
    reviewer: "S. Romero, Security",
    decision: "Ready to proceed",
    evidence: ["Risk checklist", "Dependency scan", "Access review", "Accepted risk log"],
    details: "Security is represented inside Support for the current operating model, with DevOps and QA contributing.",
  },
  {
    id: "docs",
    phase: "release-readiness",
    title: "Documentation / Comms",
    status: "info",
    score: 78,
    owner: "DevOps",
    approver: "Product",
    summary: "Internal release notes drafted; detailed templates deferred to later SLA work.",
    reviewer: "J. Patel, Product Director",
    decision: "Ready with follow-up",
    evidence: ["Release note draft", "Support note", "Customer-facing summary"],
    details: "Communications are adequate for this sample, but the broader cadence model remains deferred until SLA definitions are complete.",
  },
  {
    id: "packaging",
    phase: "release-readiness",
    title: "Packaging Review",
    status: "ready",
    score: 90,
    owner: "DevOps",
    approver: "DevOps lead",
    summary: "Build, version, and package metadata are ready for release candidate handling.",
    reviewer: "R. Williams, DevOps Lead",
    decision: "Ready to proceed",
    evidence: ["Build artifact", "Version tag", "Package manifest", "Rollback package"],
    details: "The sample includes this widget even if not all packaging automation exists in the phase 1 rollout.",
  },
  {
    id: "deployment",
    phase: "release-readiness",
    title: "Deployment Review",
    status: "ready",
    score: 88,
    owner: "DevOps",
    approver: "DevOps leadership",
    summary: "Deployment window, environment readiness, and rollback path are recorded.",
    reviewer: "A. Morgan, DevOps Director",
    decision: "Ready to deploy",
    evidence: ["Deployment plan", "Environment checklist", "Rollback plan", "Release window"],
    details: "All open supporting tickets remain open until deployment and final validation are accepted.",
  },
  {
    id: "spog-evidence",
    phase: "release-readiness",
    title: "SPOG / Evidence Review",
    status: "ready",
    score: 91,
    owner: "Engineering",
    approver: "Engineering leadership",
    summary: "Expected artifacts are present and human reviews are recorded.",
    reviewer: "D. Chen, Engineering Manager",
    decision: "Ready for ship/hold decision",
    evidence: ["Artifact inventory", "HITL sign-offs", "Agent evidence index", "Decision log"],
    details: "This widget is the integrity check for the dashboard itself.",
  },
  {
    id: "final",
    phase: "release-readiness",
    title: "Final Ship / Hold",
    status: "caution",
    score: 85,
    owner: "Engineering leadership",
    approver: "Engineering leadership",
    summary: "Recommendation is ship with accepted documentation follow-up.",
    reviewer: "D. Chen, Engineering Manager",
    decision: "Ship with risk",
    evidence: ["Risk acceptance", "Leadership decision log", "Open follow-up", "Release recommendation"],
    details: "The final decision can be ship, hold, revise, re-scope, or split release. Sample state shows ship with a bounded follow-up.",
  },
  {
    id: "post-release",
    phase: "post-release-closure",
    title: "Post-Release Validation",
    status: "info",
    score: 72,
    owner: "Product / Support",
    approver: "QA / Product",
    summary: "Scheduled after deployment; placeholder validation plan is visible.",
    reviewer: "Pending scheduled review",
    decision: "Waiting on release",
    evidence: ["Validation owner", "Target review date", "Expected confirmation"],
    details: "This is intentionally shown even before deployment so leadership can see the closure path.",
  },
  {
    id: "closure",
    phase: "post-release-closure",
    title: "Closure / Done Review",
    status: "info",
    score: 70,
    owner: "Product / Support",
    approver: "Customer / Product",
    summary: "All supporting tickets remain open until final approval confirms expected delivery.",
    reviewer: "Pending final approval owner",
    decision: "Waiting on acceptance",
    evidence: ["Closure owner", "Customer confirmation request", "Supporting ticket list"],
    details: "Closure evidence asks the requester to confirm that what was delivered is what they expected to receive.",
  },
  {
    id: "amendment",
    phase: "intake-direction",
    title: "Amendment / Re-Scope",
    status: "ready",
    score: 93,
    owner: "Product / Support",
    approver: "Engineering",
    summary: "Linked amendment ticket records the new requirement without rewriting the parent story.",
    reviewer: "D. Chen, Engineering Manager",
    decision: "Accepted as amendment",
    evidence: ["Linked amendment ticket", "Parent call-out", "Technical impact", "Customer impact"],
    details: "Engineering owns the final amendment vs new request decision. Once final, the decision is immutable.",
  },
];

const grid = document.querySelector("[data-phase-stack]");
const modal = document.querySelector("[data-modal]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalBody = document.querySelector("[data-modal-body]");
const closeButtons = document.querySelectorAll("[data-modal-close]");

function statusLabel(status) {
  return {
    ready: "Green",
    caution: "Yellow",
    blocked: "Red",
    info: "Blue",
    na: "Gray",
  }[status];
}

function scoreClass(status) {
  return {
    ready: "ready",
    caution: "caution",
    blocked: "blocked",
    info: "info",
    na: "na",
  }[status];
}

function statusDotClass(status) {
  return {
    ready: "green",
    caution: "yellow",
    blocked: "red",
    info: "blue",
    na: "gray",
  }[status];
}

function rollupFor(phaseWidgets) {
  return phaseWidgets.reduce(
    (counts, widget) => {
      counts.total += 1;
      counts[widget.status] += 1;
      return counts;
    },
    { total: 0, ready: 0, caution: 0, blocked: 0, info: 0, na: 0 },
  );
}

function renderRollup(counts) {
  return [
    ["total", "Widgets", ""],
    ["ready", "Green", "green"],
    ["caution", "Yellow", "yellow"],
    ["blocked", "Red", "red"],
    ["info", "Blue", "blue"],
    ["na", "Gray", "gray"],
  ]
    .map(([key, label, dot]) => `<span class="rollup-pill">${dot ? `<span class="status-dot ${dot}"></span>` : ""}${label}: ${counts[key]}</span>`)
    .join("");
}

function renderWidget(widget) {
  return `<article class="widget">
    <div class="widget-head">
      <div>
        <h3><span class="status-dot ${statusDotClass(widget.status)}"></span>${widget.title}</h3>
        <p>${widget.summary}</p>
      </div>
      <span class="score ${scoreClass(widget.status)}">${widget.score}</span>
    </div>
    <div class="review-line">
      <span>${statusLabel(widget.status)}</span>
      <span>${widget.decision}</span>
    </div>
    <button type="button" class="button-secondary" data-widget-id="${widget.id}">Drill through</button>
  </article>`;
}

function renderWidgets() {
  grid.innerHTML = phases
    .map((phase, index) => {
      const phaseWidgets = widgets.filter((widget) => widget.phase === phase.id);
      const counts = rollupFor(phaseWidgets);
      return `<details class="phase-accordion" ${index === 0 ? "open" : ""}>
        <summary class="phase-summary">
          <div>
            <h3>${phase.title}</h3>
            <p>${phase.description}</p>
          </div>
          <div class="phase-rollup">${renderRollup(counts)}</div>
        </summary>
        <div class="phase-body">
          <p class="phase-posture">${phase.posture}</p>
          <div class="widget-grid">${phaseWidgets.map(renderWidget).join("")}</div>
        </div>
      </details>`;
    })
    .join("");
}

function openModal(widget) {
  modalTitle.textContent = widget.title;
  modalBody.innerHTML = `
    <div class="key-value">
      <div>Status</div><div>${statusLabel(widget.status)} / ${widget.score}</div>
      <div>Owner</div><div>${widget.owner}</div>
      <div>Approver</div><div>${widget.approver}</div>
      <div>HITL reviewer</div><div>${widget.reviewer}</div>
      <div>Decision</div><div>${widget.decision}</div>
      <div>Summary</div><div>${widget.summary}</div>
    </div>
    <h3>Evidence Reviewed</h3>
    <ul>${widget.evidence.map((item) => `<li>${item}</li>`).join("")}</ul>
    <h3>Drill-Through Detail</h3>
    <p>${widget.details}</p>
    <h3>Sample Sign-Off</h3>
    <table>
      <tr><th>Field</th><th>Sample Value</th></tr>
      <tr><td>Reviewed at</td><td>2026-06-05 14:30 ET</td></tr>
      <tr><td>Agent / LLM outcome</td><td>Partially agree where noted; human decision controls.</td></tr>
      <tr><td>Outcome reason</td><td>Evidence is sufficient for this sample review state.</td></tr>
      <tr><td>Required follow-up</td><td>${widget.status === "caution" || widget.status === "info" ? "Track visible follow-up before closure." : "None blocking."}</td></tr>
      <tr><td>Approval record</td><td>Prototype approval record displayed for leadership review only.</td></tr>
    </table>
  `;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-widget-id]");
  if (!button) return;
  const widget = widgets.find((item) => item.id === button.dataset.widgetId);
  if (widget) openModal(widget);
});

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

closeButtons.forEach((button) => button.addEventListener("click", closeModal));
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

renderWidgets();
