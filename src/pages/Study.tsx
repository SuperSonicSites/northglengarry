import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { domainLabel, domains, getSource, meta } from '../lib/data'
import { curriculum } from '../lib/curriculum'
import { useProgress, countDone } from '../lib/progress'
import { SourceLink } from '../components/SourceLink'
import type { CurriculumUnit } from '../types'

const PHASE_LABEL: Record<number, string> = {
  1: 'Phase 1 · weeks 1–4 · financial and council',
  2: 'Phase 2 · weeks 5–8 · infrastructure and planning',
  3: 'Phase 3 · weeks 9–13 · community, public safety, stewardship',
}

export function Study() {
  const { progress, update, toggleDone, reset } = useProgress()
  const [open, setOpen] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const done = countDone(progress)
  const today = meta.dataAsOf

  // Coverage by domain is the requirement: the user must be able to see which
  // parts of the municipality they have and have not studied.
  const coverage = useMemo(() => {
    const rows: { id: string; name: string; total: number; done: number }[] = []
    const ids = [...domains.map((d) => d.id), 'stewardship']
    for (const id of ids) {
      const units = curriculum.units.filter((u) => u.domainId === id)
      rows.push({
        id,
        name: domainLabel(id),
        total: units.length,
        done: units.filter((u) => progress[String(u.day)]?.done).length,
      })
    }
    return rows
  }, [progress])

  const units = useMemo(() => {
    if (filter === 'all') return curriculum.units
    if (filter === 'todo') return curriculum.units.filter((u) => !progress[String(u.day)]?.done)
    if (filter === 'done') return curriculum.units.filter((u) => progress[String(u.day)]?.done)
    return curriculum.units.filter((u) => u.domainId === filter)
  }, [filter, progress])

  const next = curriculum.units.find((u) => !progress[String(u.day)]?.done)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Study mode</h1>
        <p className="lede">{curriculum.note}</p>
      </header>

      <section className="block">
        <div className="progress-strip">
          <div>
            <span className="summary-num">
              {done}
              <span className="of">/{curriculum.units.length}</span>
            </span>
            <span className="summary-lab">units complete</span>
          </div>
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${(done / curriculum.units.length) * 100}%` }} />
          </div>
          {next ? (
            <button className="primary" onClick={() => setOpen(next.day)}>
              Next up: day {next.day} — {next.title}
            </button>
          ) : (
            <span className="summary-lab">Curriculum complete.</span>
          )}
        </div>
        <p className="caveat">
          Progress and reflections are stored in this browser only and are never transmitted.
          Clearing site data clears them. The reflections are a study aid, not part of the record —
          nothing written here reaches the dashboard's data files.
        </p>
      </section>

      <section className="block">
        <h2>Coverage by domain</h2>
        <div className="coverage">
          {coverage.map((row) => (
            <div key={row.id} className="coverage-row">
              <span className="coverage-name">{row.name}</span>
              <span className="coverage-bar" aria-hidden="true">
                <span style={{ width: `${row.total ? (row.done / row.total) * 100 : 0}%` }} />
              </span>
              <span className="coverage-count">
                {row.done}/{row.total}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="filter-row">
          <h2>Daily units</h2>
          <div className="filters">
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
              All
            </button>
            <button className={filter === 'todo' ? 'on' : ''} onClick={() => setFilter('todo')}>
              Remaining
            </button>
            <button className={filter === 'done' ? 'on' : ''} onClick={() => setFilter('done')}>
              Complete
            </button>
            {[...domains.map((d) => d.id), 'stewardship'].map((id) => (
              <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>
                {domainLabel(id)}
              </button>
            ))}
          </div>
        </div>

        <ol className="unit-list">
          {units.map((unit, i) => {
            const prev = units[i - 1]
            const showPhase = !prev || prev.phase !== unit.phase
            return (
              <li key={unit.day}>
                {showPhase && filter === 'all' ? (
                  <h3 className="phase-head">{PHASE_LABEL[unit.phase]}</h3>
                ) : null}
                <UnitRow
                  unit={unit}
                  done={Boolean(progress[String(unit.day)]?.done)}
                  reflection={progress[String(unit.day)]?.reflection ?? ''}
                  expanded={open === unit.day}
                  onToggleOpen={() => setOpen(open === unit.day ? null : unit.day)}
                  onToggleDone={() => toggleDone(unit.day, today)}
                  onReflection={(text) => update(unit.day, { reflection: text })}
                />
              </li>
            )
          })}
        </ol>
      </section>

      <section className="block">
        <h2>Reset progress</h2>
        <p className="definition">
          Clears every completion mark and reflection in this browser. There is no undo and no
          copy held anywhere else.
        </p>
        <button
          className="danger"
          onClick={() => {
            if (window.confirm('Clear all study progress and reflections in this browser?')) reset()
          }}
        >
          Clear all study progress
        </button>
      </section>
    </div>
  )
}

function UnitRow({
  unit,
  done,
  reflection,
  expanded,
  onToggleOpen,
  onToggleDone,
  onReflection,
}: {
  unit: CurriculumUnit
  done: boolean
  reflection: string
  expanded: boolean
  onToggleOpen: () => void
  onToggleDone: () => void
  onReflection: (text: string) => void
}) {
  return (
    <div className={done ? 'unit unit-done' : 'unit'} id={`day-${unit.day}`}>
      <div className="unit-head">
        <label className="unit-check">
          <input type="checkbox" checked={done} onChange={onToggleDone} />
          <span className="sr-only">Mark day {unit.day} complete</span>
        </label>
        <button className="unit-title" onClick={onToggleOpen} aria-expanded={expanded}>
          <span className="unit-day">Day {unit.day}</span>
          <span className="unit-name">{unit.title}</span>
          <span className="unit-domain">{domainLabel(unit.domainId)}</span>
        </button>
      </div>

      {expanded ? (
        <div className="unit-body">
          <p className="unit-primer">{unit.primer}</p>

          <h4>Reading</h4>
          <ul className="unit-reading">
            {unit.reading.map((r, i) => {
              const source = getSource(r.sourceId)
              return (
                <li key={i}>
                  <SourceLink refr={{ sourceId: r.sourceId, locator: r.locator }} />
                  {source ? <span className="source-meta"> {source.publisher}</span> : null}
                  <p className="reading-why">{r.why}</p>
                </li>
              )
            })}
          </ul>

          <h4>Questions</h4>
          <ol className="question-list">
            {unit.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>

          <h4>Reflection</h4>
          <p className="unit-reflection-prompt">{unit.reflection}</p>
          <textarea
            value={reflection}
            placeholder="Written reflection. Stored in this browser only."
            onChange={(e) => onReflection(e.target.value)}
            rows={4}
          />

          {unit.topicId ? (
            <p className="unit-link">
              Stewardship entry: <Link to={`/stewardship/${unit.topicId}`}>open topic</Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
