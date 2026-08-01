import { Link } from 'react-router-dom'
import { domains, headlineIndicators, integrityTotals, meta, stewardshipTopics } from '../lib/data'
import { IndicatorTile } from '../components/IndicatorCard'
import { summarise } from '../lib/trend'

export function Overview() {
  const headline = headlineIndicators()
  const totals = integrityTotals()

  // Composition of movement across the headline set, stated as counts rather
  // than as a score. A single number for "municipal health" would be a
  // judgement the interface has no business making.
  const readings = headline.map(({ indicator }) => summarise(indicator).reading)
  const favourable = readings.filter((r) => r === 'favourable').length
  const unfavourable = readings.filter((r) => r === 'unfavourable').length
  const neutral = readings.filter((r) => r === 'neutral' || r === 'unknown').length

  return (
    <div className="page">
      <section className="hero">
        <h1>How healthy is North Glengarry?</h1>
        <p className="lede">
          {headline.length} headline indicators drawn from six domains, each with its current
          value, its direction over the default five-year window, and a link into the domain view
          that explains it. Direction of travel is stated; whether a direction is welcome is left
          to the reader.
        </p>
        <div className="summary-strip">
          <div>
            <span className="summary-num">{headline.length}</span>
            <span className="summary-lab">headline indicators</span>
          </div>
          <div>
            <span className="summary-num">{favourable}</span>
            <span className="summary-lab">moving with their stated polarity</span>
          </div>
          <div>
            <span className="summary-num">{unfavourable}</span>
            <span className="summary-lab">moving against it</span>
          </div>
          <div>
            <span className="summary-num">{neutral}</span>
            <span className="summary-lab">directionless or without a polarity</span>
          </div>
        </div>
        <p className="caveat">
          Polarity is a property of the indicator, recorded in the data, not an assessment of
          council or staff. Several indicators — the levy, the assessment base, capital spending —
          carry no polarity at all, because movement in either direction can be sound depending on
          what produced it.
        </p>
      </section>

      <section className="tiles">
        {headline.map(({ domain, indicator }) => (
          <IndicatorTile key={`${domain.id}-${indicator.id}`} domain={domain} indicator={indicator} />
        ))}
      </section>

      <section className="block">
        <h2>Domains</h2>
        <div className="domain-grid">
          {domains.map((d) => (
            <Link key={d.id} className="domain-card" to={`/domain/${d.slug}`}>
              <h3>{d.name}</h3>
              <p>{d.tagline}</p>
              <span className="domain-card-meta">
                {d.indicators.length} indicators · {d.tables.length} tables ·{' '}
                {d.sourceIds.length} sources
              </span>
            </Link>
          ))}
          <Link className="domain-card domain-card-synthesis" to="/stewardship">
            <h3>Stewardship</h3>
            <p>
              The synthesis layer. For each topic: what is happening, why, the direction, the
              reading list, the questions to ask, the opportunities, and the risks.
            </p>
            <span className="domain-card-meta">{stewardshipTopics.length} topics</span>
          </Link>
        </div>
      </section>

      <section className="block">
        <h2>How to read this dashboard</h2>
        <div className="reading-rules">
          <div>
            <h3>Source or silence</h3>
            <p>
              Every figure carries its source document and, where known, the page or schedule
              inside it. A figure with no citable source does not appear. Clicking any citation
              goes to that document's entry in the source library.
            </p>
          </div>
          <div>
            <h3>Uncertainty is shown</h3>
            <p>
              Figures the source states as estimates, or that this dashboard interpolates, are
              marked <em>Estimated</em>. Figures covering only part of a period or population are
              marked <em>Partial</em>. Placeholder figures awaiting transcription are marked{' '}
              <em>Sample</em> and counted on the Data Integrity page.
            </p>
          </div>
          <div>
            <h3>Two tiers, always labelled</h3>
            <p>
              North Glengarry is a lower-tier municipality within the {meta.upperTier}. Roads,
              planning approvals, paramedics, and social services are split between the tiers.
              Every indicator and table states which body owns the thing it describes.
            </p>
          </div>
          <div>
            <h3>Record and interpretation are separated</h3>
            <p>
              In the stewardship layer, statements drawn from documents, the analyst's reading, and
              questions with no located source are rendered as three visibly different kinds of
              thing, and never merged.
            </p>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>Where the data stands</h2>
        <p>
          {totals.sourcedPoints} of {totals.seriesPoints} data points are transcribed from a source
          document. {totals.samplePoints} remain placeholders. {totals.sourcesLinked} of{' '}
          {totals.sourcesTotal} source documents have a recorded link or stored copy.
        </p>
        <p>
          <Link to="/data-integrity">Data integrity</Link> lists every outstanding item.{' '}
          <Link to="/study">Study mode</Link> sequences the work into ninety daily units.
        </p>
      </section>

      <section className="block open-questions">
        <h2>Open questions for the working session</h2>
        <p className="definition">
          Carried from the requirements. These are unresolved by design and shape what the
          dashboard can become.
        </p>
        <ol>
          {meta.openQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
