# North Glengarry Stewardship Dashboard

Private preparation instrument about the Township of North Glengarry, Ontario, built for a
prospective mayor. Static React site reading hand-editable JSON, deployed to Cloudflare Pages
behind an access gate. See `README.md` for the full picture; this file is the working brief.

## Commands

```bash
npm install
npm run dev             # http://localhost:5173
npm run build           # validate → typecheck → build to dist/
npm run validate        # data validation alone
npm run check-sources   # request every unconfirmed source URL
```

Node 22+ required (`.nvmrc` pins 22). `npm run build` fails the build on a data violation — that
is deliberate, do not route around it.

## The rules this project is built on

These come from the product requirements and are not stylistic preferences. Breaking one is a
defect even when the code compiles.

1. **Source or silence.** Every figure carries a `SourceRef` resolving to an entry in
   `src/data/sources.json`. There is no type in `src/types.ts` that permits a number without one.
   If you cannot cite it, it does not go in.
2. **Uncertainty is displayed, not hidden.** Every `DataPoint` declares `provenance`:
   `"sourced"` (transcribed from the cited document and verified) or `"sample"` (placeholder).
   Optional `estimated` and `partial` flags qualify further. The UI renders each distinctly.
3. **Neutral by construction.** Descriptive language only. "Reserve balance is X, down Y percent
   over five years" — never "reserves are dangerously low." No traffic-light colour, no grading of
   staff or council. A neutral reader must not be able to tell the sponsor's position.
4. **Two-tier awareness.** North Glengarry is a lower tier within the United Counties of SDG.
   Every indicator, table, and split row is labelled with the tier that owns it. Getting this
   wrong teaches the wrong thing — the library is a *county* service, the official plan is the
   *county's*, paramedics are the *county's*.
5. **Record and interpretation never merge.** In the stewardship layer a `Claim` is `sourced`,
   `interpretation`, or `open-question`, rendered as three visibly different things. An
   unanswered question is shown as a hole, never filled with a plausible guess.
6. **No personal information** from council packages — no resident names, addresses, or
   delegation submissions. Record the decision, not the individual.

## Current state

Most figures are **placeholders**, marked `SAMPLE` throughout and counted on the Data Integrity
page. A handful are real. Run `npm run validate` for the live count.

Most source documents now carry a URL, but **none has been confirmed by retrieval** — those URLs
were found through a search index in an environment with no outbound network access. A source with
a `url` and no `retrieved` date is a lead, not a citation, and is marked as such everywhere.

Running locally, you probably *do* have network access. That makes two things newly possible and
both are high value:

```bash
npm run check-sources -- --write   # confirm URLs, stamp retrieved dates
```

Then start replacing placeholders with real figures from the documents.

## Replacing a placeholder

1. Open the domain file in `src/data/domains/`.
2. Set `value` from the document; set `source.locator` to the page, schedule, or table.
3. Set `recorded` to today and `provenance` to `"sourced"`.
4. Add `estimated: true` or `partial: true` if the source warrants it.
5. `npm run validate`.

**Transcription and verification are separate steps.** Enter the figure, then re-check it against
the document before flipping to `sourced`. PDF transcription error is the most likely way a wrong
number reaches this dashboard.

## Layout

```
src/types.ts              data model — the rules above are encoded here
src/data/
  meta.json               municipality, neutrality/privacy notes, open questions
  sources.json            the source library (69 documents)
  domains/*.json          financial, infrastructure, community, safety, planning, council
  stewardship.json        seven synthesis topics, fixed seven-question shape
  curriculum.json         the ninety day study curriculum
src/lib/                  data indexing, formatting, trend maths, study progress
src/components/           badges, citations, SVG charts, tables, claim rendering, shell
src/pages/                overview, domain, stewardship, study, sources, data integrity
functions/_middleware.js  Cloudflare Pages access gate (Basic auth, fails closed)
scripts/validate-data.mjs runs in the build; enforces the rules
scripts/check-sources.mjs source URL confirmation pass
```

## Conventions

- Charts are hand-drawn SVG, no charting library. Estimated segments dash, missing periods break
  the line rather than interpolating across, all-sample series are dimmed and watermarked.
- Three runtime dependencies: `react`, `react-dom`, `react-router-dom`. Keep it that way unless
  there is a real reason.
- Canadian spelling in user-facing copy ("kilometres", "programme", "favourable").
- Data files are edited by hand by a person. Readable keys, one indicator per object, caveats
  stored beside the figures they qualify. No cleverness that makes them harder to edit.

## Deployment

Cloudflare Pages: build `npm run build`, output `dist`. Set `DASHBOARD_USER` and
`DASHBOARD_PASSWORD` (as a Secret) for Production **and** Preview — the gate fails closed with a
503 if they are absent. There is deliberately no `wrangler.toml`; for Pages it would override the
dashboard-set variables that control access. Details in `README.md`.
