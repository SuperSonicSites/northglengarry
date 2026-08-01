import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { domains, integrityTotals, meta } from '../lib/data'
import { formatDate } from '../lib/format'

function ScrollToAnchor() {
  const { hash, pathname } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ block: 'start' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [hash, pathname])
  return null
}

export function Layout() {
  const totals = integrityTotals()
  const sampleCount = totals.samplePoints + totals.sampleTables

  return (
    <div className="app">
      <ScrollToAnchor />

      <a className="skip" href="#main">
        Skip to content
      </a>

      {sampleCount > 0 ? (
        <div className="alert" role="status">
          <strong>This build contains placeholder figures.</strong> {totals.samplePoints} data
          points and {totals.sampleTables} tables are marked <em>Sample</em>: structurally valid,
          not transcribed from the cited documents, and not to be quoted.{' '}
          <NavLink to="/data-integrity">See what needs replacing</NavLink>.
        </div>
      ) : null}

      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <span className="brand-name">North Glengarry Stewardship Dashboard</span>
            <span className="brand-sub">
              {meta.municipality} · within the {meta.upperTier} · {meta.province}
            </span>
          </div>
          <div className="brand-meta">
            <span className="private-mark" title="Private preparation instrument. Not a public or campaign asset.">
              Private
            </span>
            <span>Data as at {formatDate(meta.dataAsOf)}</span>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end>
            Health overview
          </NavLink>
          {domains.map((d) => (
            <NavLink key={d.id} to={`/domain/${d.slug}`}>
              {d.name}
            </NavLink>
          ))}
          <NavLink to="/stewardship">Stewardship</NavLink>
          <NavLink to="/study">Study mode</NavLink>
          <NavLink to="/sources">Sources</NavLink>
          <NavLink to="/data-integrity">Data integrity</NavLink>
        </nav>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="site-foot">
        <p>
          <strong>Neutrality.</strong> {meta.neutralityNote}
        </p>
        <p>
          <strong>Personal information.</strong> {meta.privacyNote}
        </p>
        <p className="foot-meta">
          Version {meta.version} · Private to the sponsor and invited reviewers · Not a campaign
          asset
        </p>
      </footer>
    </div>
  )
}
