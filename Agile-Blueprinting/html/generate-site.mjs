import fs from "node:fs";
import path from "node:path";
import marked from "marked";

const topicRoot = path.resolve("ai-vs-agile");
const artifactsRoot = path.join(topicRoot, "artifacts");
const htmlRoot = path.join(topicRoot, "html");

const artifactGroups = [
  {
    title: "Core Methodology",
    files: [
      "EXECUTIVE-NARRATIVES.md",
      "GLOSSARY.md",
      "BLUEPRINT-TO-RELEASE.md",
      "VISUAL-INFOGRAPHIC-OUTLINE.md",
    ],
  },
  {
    title: "Governance and Operations",
    files: [
      "HITL-CHECKPOINT-MATRIX.md",
      "SINGLE-PANE-OF-GLASS.md",
      "COMMUNICATIONS-MODEL.md",
      "AMENDMENT-RESCOPE-FLOW.md",
      "AGENT-ARTIFACT-CONTRACT.md",
      "AGENT-PROMPTS.md",
      "agent-prompts/README.md",
    ],
  },
  {
    title: "Codex Operationalization",
    files: [
      "CODEX-OPERATIONALIZATION-PLAN.md",
      "CODEX-VSCODE-IMPLEMENTATION-PLAN.md",
      "MVP-CODEX-COMMANDS.md",
      "MVP-CODEX-SKILL-SPECS.md",
      "PRD-INTERVIEW-STAGES.md",
      "PRD-TEMPLATE.md",
    ],
  },
];

const allMarkdownFiles = artifactGroups.flatMap((group) => group.files);

function slugify(value) {
  return value
    .replace(/\.md$/i, "")
    .replace(/README$/i, "readme")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function outputName(markdownPath) {
  return `${slugify(markdownPath)}.html`;
}

function titleFromMarkdown(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return fallback
    .replace(/\.md$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n+/, "");
}

function pageShell({ title, subtitle, body, current = "artifacts" }) {
  const nav = [
    ["index.html", "Index"],
    ["spog-sample.html", "SPOG Sample"],
    ["visual-infographic-outline.html", "Visuals"],
    ["glossary.html", "Glossary"],
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Agile Blueprinting</title>
  <link rel="stylesheet" href="site.css">
</head>
<body>
  <div class="site-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-title">Agile Blueprinting</div>
          <div class="brand-kicker">Blueprint to Release briefing package</div>
        </div>
        <nav class="topnav" aria-label="Primary">
          ${nav
            .map(([href, label]) => `<a href="${href}"${current === label.toLowerCase() ? " aria-current=\"page\"" : ""}>${label}</a>`)
            .join("\n          ")}
        </nav>
      </div>
    </header>
    <main class="page">
      <div class="page-nav">
        <a href="index.html">Back to index</a>
        <a href="spog-sample.html">View SPOG sample</a>
      </div>
      <section class="hero">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </section>
      ${body}
    </main>
  </div>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rewriteLinks(markdown) {
  let rewritten = markdown;
  for (const mdFile of allMarkdownFiles) {
    const base = path.basename(mdFile);
    const htmlFile = outputName(mdFile);
    rewritten = rewritten.replaceAll(`](${mdFile})`, `](${htmlFile})`);
    rewritten = rewritten.replaceAll(`](${base})`, `](${htmlFile})`);
  }

  const images = [
    "agile-blueprinting-leadership-infographic.png",
    "agile-blueprinting-one-page-explainer.png",
    "blueprint-to-release-flow.png",
    "mvp-codex-skill-rollout.png",
  ];

  for (const image of images) {
    rewritten = rewritten.replaceAll(`\`${image}\``, `[${image}](../artifacts/${image})`);
  }

  return rewritten;
}

function renderMarkdownArtifact(mdFile) {
  const sourcePath = path.join(artifactsRoot, mdFile);
  const raw = fs.readFileSync(sourcePath, "utf8");
  const title = titleFromMarkdown(raw, mdFile);
  const markdown = rewriteLinks(stripFrontmatter(raw));
  const html = marked.parse(markdown, { gfm: true, breaks: false });
  const subtitle = `HTML rendering of ${mdFile} from the ai-vs-agile artifact set.`;
  const body = `<article class="content">${html}</article>`;
  fs.writeFileSync(
    path.join(htmlRoot, outputName(mdFile)),
    pageShell({ title, subtitle, body }),
  );
}

function renderIndex() {
  const groupHtml = artifactGroups
    .map((group) => {
      const links = group.files
        .map((file) => {
          const raw = fs.readFileSync(path.join(artifactsRoot, file), "utf8");
          const title = titleFromMarkdown(raw, file);
          return `<li><a href="${outputName(file)}">${escapeHtml(title)}</a></li>`;
        })
        .join("\n");
      return `<section class="toc-card">
        <h2 class="card-title">${escapeHtml(group.title)}</h2>
        <ul class="artifact-list">${links}</ul>
      </section>`;
    })
    .join("\n");

  const visuals = [
    ["agile-blueprinting-leadership-infographic.png", "Leadership infographic"],
    ["agile-blueprinting-one-page-explainer.png", "One-page Agile Blueprinting explainer"],
    ["blueprint-to-release-flow.png", "Blueprint to Release flow"],
    ["mvp-codex-skill-rollout.png", "MVP Codex skill rollout"],
  ]
    .map(([file, label]) => `<figure>
      <a href="../artifacts/${file}"><img src="../artifacts/${file}" alt="${escapeHtml(label)}"></a>
      <figcaption>${escapeHtml(label)}</figcaption>
    </figure>`)
    .join("\n");

  const body = `
    <section class="hero">
      <h1>Agile Blueprinting</h1>
      <p>Static HTML package for the Blueprint to Release artifacts, governance model, operationalization plan, and leadership-ready visuals.</p>
      <div class="meta-row">
        <span class="pill">Federal workspace aesthetic</span>
        <span class="pill">Static HTML</span>
        <span class="pill">Topic: ai-vs-agile</span>
      </div>
    </section>
    <section class="grid">${groupHtml}</section>
    <section class="panel">
      <h2 class="card-title">Visual Series</h2>
      <div class="figure-grid">${visuals}</div>
    </section>
    <section class="panel">
      <h2 class="card-title">Prototype</h2>
      <p>The sample Single Pane of Glass includes the full intended widget set, including later-phase widgets, with modal drill-throughs for leadership review.</p>
      <p><a class="button-link" href="spog-sample.html">Open SPOG sample</a></p>
    </section>`;

  fs.writeFileSync(
    path.join(htmlRoot, "index.html"),
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agile Blueprinting | HTML Package</title>
  <link rel="stylesheet" href="site.css">
</head>
<body>
  <div class="site-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-title">Agile Blueprinting</div>
          <div class="brand-kicker">Blueprint to Release briefing package</div>
        </div>
        <nav class="topnav" aria-label="Primary">
          <a href="index.html" aria-current="page">Index</a>
          <a href="spog-sample.html">SPOG Sample</a>
          <a href="visual-infographic-outline.html">Visuals</a>
          <a href="glossary.html">Glossary</a>
        </nav>
      </div>
    </header>
    <main class="page">${body}</main>
  </div>
</body>
</html>
`,
  );
}

for (const mdFile of allMarkdownFiles) {
  renderMarkdownArtifact(mdFile);
}

renderIndex();
