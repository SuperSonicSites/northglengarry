import { Suspense, lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Overview } from './pages/Overview'
import { DomainPage } from './pages/DomainPage'

/**
 * The health overview and the domain views load eagerly: they are the
 * dashboard's working surface and the two-minute test applies to them. Study
 * mode carries the ninety day curriculum and the source library carries its
 * own filtering, so both are split out of the initial payload.
 */
const StewardshipIndex = lazy(() =>
  import('./pages/Stewardship').then((m) => ({ default: m.StewardshipIndex })),
)
const StewardshipTopicPage = lazy(() =>
  import('./pages/Stewardship').then((m) => ({ default: m.StewardshipTopicPage })),
)
const Study = lazy(() => import('./pages/Study').then((m) => ({ default: m.Study })))
const Sources = lazy(() => import('./pages/Sources').then((m) => ({ default: m.Sources })))
const DataIntegrity = lazy(() =>
  import('./pages/DataIntegrity').then((m) => ({ default: m.DataIntegrity })),
)

function NotFound() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Return to the health overview</Link>.
      </p>
    </div>
  )
}

function Loading() {
  return (
    <div className="page">
      <p className="empty">Loading…</p>
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="domain/:slug" element={<DomainPage />} />
          <Route path="stewardship" element={<StewardshipIndex />} />
          <Route path="stewardship/:id" element={<StewardshipTopicPage />} />
          <Route path="study" element={<Study />} />
          <Route path="sources" element={<Sources />} />
          <Route path="data-integrity" element={<DataIntegrity />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
