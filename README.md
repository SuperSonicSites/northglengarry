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
| Data points | 201 — 5 transcribed from real sources, 196 placeholders |
| Detail tables | 23 — 2 built from real sources, 21 placeholders |
| Source documents identified | 69 |
| Source documents with a URL recorded | 56 — **none confirmed by retrieval**, see below |

### About those URLs

A research pass located real, specific documents for most of the source library:
the township's 2022 Asset Management Plan, its Strategic Plan 2023-2027, budgets
back to 2022, audited statements for 2021-2023, Zoning By-law 39-2000, the
drinking water and wastewater annual reports, the SDG Counties Official Plan
(2018, consolidated February 2025), the county budget and transportation
services, the Statistics Canada census profiles at census subdivision 3501050,
the ministry's Financial Information Return portal, and more.

**Those URLs were found through a public search index and have not been opened.**
Outbound fetching was blocked by the egress policy of the environment this build
was assembled in — every host, including Wikipedia, returned 403 on direct
retrieval. So no link in the library has been followed and no document has been
read end to end.

That distinction is carried in the data rather than glossed: a source with a
`url` and no `retrieved` date renders a **Not confirmed by retrieval** marker in
the source library, is counted on the Data Integrity page, and raises a warning
from `npm run validate`. An unretrieved URL is a lead, not a citation. Opening
each one, confirming it resolves to the document described, capturing a stored
copy, and setting `retrieved` is the first half of the source inventory audit.

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
- **No *confirmed* source URLs**, for the environmental reason set out above. What is recorded is
  what a public search index reports, marked unconfirmed everywhere it appears rather than
  presented as a citation. Nothing is inferred about a document's contents from the fact that its
  URL exists.
- **No polling, voter, canvassing, or opponent data**, per the non-goals.
- **No personal information from council packages.** Where a decision concerned a named applicant,
  the decision is recorded and the individual is not.

## What the research pass corrected

Searching for the real documents did not just add links. It corrected things the first build had
assumed, which is the argument for doing it before transcription rather than after:

- **The library is a county service.** Library provision in North Glengarry comes from the
  Stormont, Dundas and Glengarry County Library, established 1971 from the merger of seven rural
  libraries — not a township library board. The indicator was carrying the wrong tier, the wrong
  geography, and an implied township accountability that does not exist.
- **There is no township official plan.** The operative plan is the SDG Counties Official Plan
  (2018, consolidated February 2025), which came fully into effect after Ontario Land Tribunal
  decisions in February and June 2022. Zoning stays township — By-law 39-2000, as amended.
- **There are two drinking water systems, not two water "systems" per settlement.** One Alexandria
  system draws surface water from the Mill Pond and supplies both Alexandria and Maxville through
  separate distribution networks; Glen Robertson is a separate groundwater system. Real inventory
  figures replaced the placeholders. Glen Robertson has a standing sodium exceedance.
- **The fire service has three stations**, not two: Alexandria, Apple Hill, and Maxville, staffed
  by "over fifty" volunteers across 643 square kilometres.
- **Debt is reported on two different bases.** The 2025 budget states a start-of-year position
  split into rate-funded and tax-supported ($9.57M total, $6.06M rate-funded); the Financial
  Information Return reports year-end principal. Recorded as a domain gap so the two are never
  silently merged into one series.
- **The strategic plan has named pillars** — GROW, FOSTER, CHAMPION, on a stated foundation of
  human resources, information technology, financial stability, and corporate values. The pillar
  names are now recorded as sourced; whether each carries a measure is left explicitly unconfirmed
  rather than asserted, because that requires reading the plan page by page.
- **The 2021 population is contested.** Two figures circulate, 10,144 and 10,119. The dashboard
  records 10,144 and states the discrepancy in a note rather than reconciling it silently.

## Open questions carried from the requirements

These are unresolved by design and are listed at the foot of the health overview. Several change
what the product should be, not merely how it looks — particularly the sequencing question (by
domain, as built, or by the council calendar so study tracks upcoming decisions) and the access
question (sponsor only, or a small circle from the start), which is the difference between the
Basic authentication gate as built and Cloudflare Access.
