import { Link, useParams } from 'react-router-dom'
import {
  domainLabel,
  getDomain,
  getIndicator,
  getTopic,
  stewardshipTopics,
} from '../lib/data'
import { ClaimList } from '../components/Claims'
import { SourceLink, SourceList } from '../components/SourceLink'
import { LastUpdated } from '../components/Badges'
import { formatValue } from '../lib/format'
import { summarise } from '../lib/trend'

export function StewardshipIndex() {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Stewardship</h1>
        <p className="lede">
          The synthesis layer. For any topic, a fixed set of seven questions: what is happening,
          why, whether the trend is improving or declining, what documents explain it, what a mayor
          should ask, what opportunities exist, and what risks to watch.
        </p>
      </header>

      <section className="block">
        <h2>How these entries are constructed</h2>
        <div className="reading-rules">
          <div className="claim claim-sourced static">
            <span className="claim-kind">From the record</span>
            <p>
              Taken from a cited document. Every such statement carries its citation. If a
              citation is missing, the interface says so rather than letting the statement stand.
            </p>
          </div>
          <div className="claim claim-interpretation static">
            <span className="claim-kind">Interpretation</span>
            <p>
              The analyst's reading of what the record shows. Marked as analysis, never presented
              as something a document says.
            </p>
          </div>
          <div className="claim claim-open static">
            <span className="claim-kind">Open question</span>
            <p>
              Something the record does not answer. Shown as a hole so it stays visible, rather
              than being filled with a plausible guess.
            </p>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>Topics</h2>
        <div className="domain-grid">
          {stewardshipTopics.map((t) => (
            <Link key={t.id} className="domain-card" to={`/stewardship/${t.id}`}>
              <span className="topic-domain">{domainLabel(t.domainId)}</span>
              <h3>{t.title}</h3>
              <p>{t.trend.magnitude}</p>
              <span className="domain-card-meta">
                Direction: {t.trend.direction} · confidence {t.trend.confidence} ·{' '}
                {t.reading.length} documents · {t.questions.length} questions
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export function StewardshipTopicPage() {
  const { id } = useParams()
  const topic = id ? getTopic(id) : undefined

  if (!topic) {
    return (
      <div className="page">
        <h1>Topic not found</h1>
        <p>
          <Link to="/stewardship">Return to stewardship</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <span className="topic-domain">{domainLabel(topic.domainId)}</span>
        <h1>{topic.title}</h1>
        <LastUpdated date={topic.lastUpdated} />
      </header>

      {topic.indicatorRefs && topic.indicatorRefs.length > 0 ? (
        <section className="block">
          <h2>Indicators this topic explains</h2>
          <div className="mini-tiles">
            {topic.indicatorRefs.map((ref) => {
              const indicator = getIndicator(ref.domainId, ref.indicatorId)
              if (!indicator) return null
              const trend = summarise(indicator)
              return (
                <Link
                  key={`${ref.domainId}-${ref.indicatorId}`}
                  className="mini-tile"
                  to={`/domain/${domainSlug(ref.domainId)}#${indicator.id}`}
                >
                  <span className="mini-name">{indicator.name}</span>
                  <span className="mini-value">
                    {formatValue(trend.last?.value ?? null, indicator.format)}
                  </span>
                  <span className={`mini-trend trend-${trend.reading}`}>
                    {trend.percent === null
                      ? trend.windowLabel
                      : `${trend.direction === 'down' ? '−' : trend.direction === 'up' ? '+' : ''}${Math.abs(
                          trend.percent,
                        ).toFixed(1)}% · ${trend.windowLabel}`}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="block">
        <h2>1. What is happening?</h2>
        <ClaimList claims={topic.whatIsHappening} />
      </section>

      <section className="block">
        <h2>2. Why is it happening?</h2>
        <ClaimList claims={topic.whyIsItHappening} />
      </section>

      <section className="block">
        <h2>3. Is the trend improving or declining?</h2>
        <div className={`trend-assessment confidence-${topic.trend.confidence}`}>
          <div className="trend-head">
            <span className="trend-direction">{topic.trend.direction}</span>
            <span className="trend-confidence">Confidence: {topic.trend.confidence}</span>
          </div>
          <p className="trend-magnitude">{topic.trend.magnitude}</p>
        </div>
        <ClaimList claims={topic.trend.basis} />
      </section>

      <section className="block">
        <h2>4. What documents explain it?</h2>
        <p className="definition">
          In reading order, with the specific part that matters and why it matters.
        </p>
        <ol className="reading-list">
          {topic.reading.map((item, i) => (
            <li key={i}>
              <div className="reading-title">
                <SourceLink refr={{ sourceId: item.sourceId, locator: item.locator }} />
              </div>
              <p className="reading-why">{item.why}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block">
        <h2>5. What questions should a mayor ask?</h2>
        <p className="definition">
          Framed to be asked of staff in good faith. A question that cannot be answered without
          embarrassment is a worse instrument than one that can.
        </p>
        <ol className="question-list">
          {topic.questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </section>

      <section className="block">
        <h2>6. What opportunities exist?</h2>
        <ClaimList claims={topic.opportunities} />
      </section>

      <section className="block">
        <h2>7. What risks should we be watching?</h2>
        <ul className="risk-list">
          {topic.risks.map((r, i) => (
            <li key={i} className={`risk claim-${r.kind}`}>
              <span className="claim-kind">
                {r.kind === 'sourced'
                  ? 'From the record'
                  : r.kind === 'interpretation'
                    ? 'Interpretation'
                    : 'Open question'}
              </span>
              <p>{r.text}</p>
              <dl className="risk-meta">
                <div>
                  <dt>Leading indicator</dt>
                  <dd>{r.leadingIndicator}</dd>
                </div>
                <div>
                  <dt>Threshold</dt>
                  <dd>{r.threshold}</dd>
                </div>
              </dl>
              {r.sources && r.sources.length > 0 ? (
                <p className="claim-cites">
                  <SourceList refs={r.sources} />
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <nav className="topic-nav">
        <Link to="/stewardship">All stewardship topics</Link>
      </nav>
    </div>
  )
}

/** Topic indicator refs carry domain ids; routes are keyed by slug. */
function domainSlug(domainId: string): string {
  return getDomain(domainId)?.slug ?? domainId
}
