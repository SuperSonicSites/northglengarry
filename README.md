# North Glengarry Stewardship Dashboard

A private preparation instrument about the Township of North Glengarry, Ontario, built against
the product requirements document v0.2. It answers *how healthy is North Glengarry?* at the top
level and lets the reader drill from that answer down to the document, table, or council report
that explains it.

It is not a campaign asset. Language throughout is descriptive, content drawn from the record is
kept visibly separate from interpretation, and figures without a source do not appear.

---

## Read this first: the figures in this build are placeholders

The dashboard ships complete — every domain, every panel, the stewardship layer, and the ninety
day curriculum — but the **numbers are sample data**. They are structurally valid, plausibly
shaped, and marked `SAMPLE` everywhere they appear. **None of them has been transcribed from a
real North Glengarry document, and none should be quoted.**

That is a deliberate choice rather than an oversight. Real figures require the source inventory
audit that the requirements name as the first task, and inventing numbers that *looked* sourced
would violate the product's central rule. Instead the instrument is finished and the placeholders
are counted: the banner across the top, the `SAMPLE` badge on every affected panel, and the
**Data integrity** page all report exactly what remains to be replaced. When the count reaches
zero, success criterion three — zero unsourced figures in the interface — is met and checkable.

Current state, reported by `npm run validate`:

| | |
|---|---|
| Data points | 200, all placeholders |
| Detail tables | 23, all placeholders |
| Source documents identified | 40 |
| Source documents linked or stored | 0 — the inventory audit is outstanding |

Everything that is *not* a figure — the domain primers, the two-tier ownership splits, the
methodology and geography notes, the stewardship questions, the source library entries and what
to read each document for, the ninety day curriculum — is real content written for this project
and does not depend on transcription.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # validates data, typechecks, builds to dist/
npm run preview    # serve the production build locally
npm run validate   # data validation on its own
```

Node 22 or newer (Vite 7 requires Node 20.19+ / 22.12+). `.nvmrc` pins 22.

---

## Deploying to Cloudflare Pages

The build is a static site plus one Pages Function that gates access.

### 1. Create the project

Connect this repository in the Cloudflare dashboard under **Workers & Pages → Create → Pages →
Connect to Git**, and set:

| Setting | Value |
|---|---|
| Production branch | `claude/app-cloudflare-pages-d4wmlo` (or `main` once merged) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

Add a build-time environment variable `NODE_VERSION` = `22` if the build picks an older Node than
`.nvmrc` provides.

To deploy from a terminal instead:

```bash
npm run build
npx wrangler pages deploy dist --project-name northglengarry-stewardship
```

### 2. Set the access credentials — the site will not serve without them

Under **Settings → Variables and Secrets**, for **both** Production and Preview:

| Name | Type | Value |
|---|---|---|
| `DASHBOARD_USER` | Plaintext | the username |
| `DASHBOARD_PASSWORD` | **Secret** (encrypted) | a long random password |

`functions/_middleware.js` runs in front of every request, including static assets, and **fails
closed**: with these variables absent the site returns `503` and an instruction to set them,
rather than quietly serving a private dashboard to the public internet. Setting them and
redeploying is what turns the site on.

Preview deployments get their own URL, so set the variables for Preview too or every pull request
build will be a 503.

> There is deliberately no `wrangler.toml` in this repository. For Pages projects, a committed
> `wrangler.toml` becomes the source of truth for environment variables and causes values set in
> the dashboard to be ignored — which is precisely the wrong failure mode for the two variables
> that control access. Configure in the dashboard.

### 3. Consider Cloudflare Access instead

HTTP Basic authentication is right for what this is today: one shared credential, a handful of
trusted readers, no accounts to administer, nothing to leak but a password that can be rotated in
a minute.

It is the wrong tool the moment access needs to be **per-person, revocable, or audited** — which
is the answer if the invited circle grows beyond a few people, or if a public read-only view is
ever contemplated. At that point put **Cloudflare Access** (Zero Trust → Access → Applications) in
front of the same origin with an email or identity-provider policy, and delete
`functions/_middleware.js`. The application itself needs no change either way.

---

## How it is built

| | |
|---|---|
| Framework | React 19 + TypeScript, Vite 7, React Router 7 |
| Data | Hand-editable JSON under `src/data/`. No CMS, no database, no admin backend. |
| Charts | Hand-drawn SVG, no charting library |
| State | Study progress in `localStorage`. Nothing is transmitted anywhere. |
| Dependencies | Three runtime packages: `react`, `react-dom`, `react-router-dom` |

Manual data entry with source attribution is a permanent part of the workflow, not a temporary
bridge, so the data files are shaped to be edited by a person in a text editor: readable keys,
one indicator per object, notes and caveats stored beside the figures they qualify.

### Layout

```
src/
  types.ts                  the data model, with the product rules encoded in the types
  data/
    meta.json               municipality, neutrality and privacy notes, open questions
    sources.json            the source library — 40 documents
    domains/*.json          six domain files: financial, infrastructure, community,
                            safety, planning, council
    stewardship.json        seven synthesis topics, each answering the fixed seven questions
    curriculum.json         the ninety day curriculum
  lib/                      data indexing, formatting, trend maths, study progress
  components/               badges, citations, charts, tables, claim rendering, shell
  pages/                    overview, domain, stewardship, study, sources, data integrity
functions/_middleware.js    the access gate
public/_headers             security headers and asset caching
public/_redirects           SPA fallback so deep links resolve
scripts/validate-data.mjs   the data validator, run as part of the build
```

---

## The two rules, and how they are enforced

**Source or silence.** There is no shape in `types.ts` that permits a figure without a
`SourceRef`. The validator additionally checks that every citation resolves to a document in the
source library, and that any stewardship claim marked `sourced` actually carries one. A violation
fails `npm run build`, so it cannot reach the deployed site.

**Uncertainty is displayed, not hidden.** Every data point declares a `provenance` of `sourced` or
`sample`, and may carry `estimated` or `partial`. The interface renders each distinctly: sample
series are dimmed and watermarked, estimated segments are dashed rather than solid, missing
periods break the line instead of being interpolated across, and panels older than a year say so.

Two supporting rules follow from the requirements:

**Two-tier awareness.** Every indicator, table, and ownership row is labelled with the tier that
owns it — township, county, province, federal, or another body. County-owned assets and
county-delivered services appear where a reader would look for them and are excluded from township
totals, because a commitment to fix a road the township does not own is a commitment that cannot
be kept.

**Record and interpretation never merge.** In the stewardship layer a claim is `sourced`,
`interpretation`, or `open-question`, and the three render as visibly different things. An open
question is shown as a hole rather than filled with a plausible guess.

---

## Replacing a placeholder with a real figure

1. Open the domain file under `src/data/domains/`.
2. Replace `value` with the figure from the document, and set `source.locator` to the page,
   schedule, or table it came from.
3. Set `recorded` to today's date and `provenance` to `"sourced"`.
4. Add `estimated: true` if the source states an estimate, or `partial: true` if it covers only
   part of the period or population.
5. Run `npm run validate`.

The verification pass named in the risk register is a **separate step** from transcription. Enter
the figure, then re-check it against the document before flipping it to `sourced`. Transcription
error from PDFs is the most likely route by which a wrong number reaches this dashboard, and the
curriculum schedules a verification day at the end of each phase for exactly that reason.

---

## What is deliberately not here

- **No comparator municipalities.** The requirements leave the comparator set as an open question
  for the sponsor. Showing a comparison against municipalities nobody has agreed are fair would be
  worse than showing none, so the source library records the candidate criteria and the interface
  shows nothing until the set is chosen.
- **No URLs in the source library.** Every document is recorded as `requested` or `not obtained`
  with a note on what it contains and why it matters. Guessing at deep links to documents nobody
  has confirmed exist would put unverified information into the one artefact the requirements say
  must outlive everything else. The audit is day one of the work.
- **No polling, voter, canvassing, or opponent data**, per the non-goals.
- **No personal information from council packages.** Where a decision concerned a named applicant,
  the decision is recorded and the individual is not.

## Open questions carried from the requirements

These are unresolved by design and are listed at the foot of the health overview. Several change
what the product should be, not merely how it looks — particularly the sequencing question (by
domain, as built, or by the council calendar so study tracks upcoming decisions) and the access
question (sponsor only, or a small circle from the start), which is the difference between the
Basic authentication gate as built and Cloudflare Access.
