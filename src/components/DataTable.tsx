import type { DetailTable } from '../types'
import { formatCell } from '../lib/format'
import { Geography, LastUpdated, ProvenanceBadge, TierBadge } from './Badges'
import { SourceLink } from './SourceLink'

export function DataTable({ table }: { table: DetailTable }) {
  return (
    <section className="panel table-panel" id={table.id}>
      <header className="panel-head">
        <div>
          <h3>{table.title}</h3>
          <div className="badge-row">
            {table.tier ? <TierBadge tier={table.tier} /> : null}
            <ProvenanceBadge provenance={table.provenance} />
          </div>
        </div>
      </header>

      {table.description ? <p className="definition">{table.description}</p> : null}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c.key} className={c.align === 'right' ? 'right' : 'left'}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {table.columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'right' : 'left'}>
                    {formatCell(row[c.key], c.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {table.note ? (
        <p className="methodology">
          <span className="label">Note.</span> {table.note}
        </p>
      ) : null}

      <footer className="panel-foot">
        {table.geography ? <Geography>{table.geography}</Geography> : null}
        <span className="source-line">
          Source: <SourceLink refr={table.source} compact />
        </span>
        <LastUpdated date={table.lastUpdated} />
      </footer>
    </section>
  )
}
