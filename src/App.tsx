import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { Sidebar } from './components/ui/Sidebar'
import { ToastNotification } from './components/ui/ToastNotification'
import { ProtectedRoute } from './components/ui/ProtectedRoute'

const GuestsPage = lazy(() => import('./pages/GuestsPage').then(m => ({ default: m.GuestsPage })))
const WishesPage = lazy(() => import('./pages/WishesPage').then(m => ({ default: m.WishesPage })))
const InvitationPage = lazy(() => import('./pages/InvitationPage').then(m => ({ default: m.InvitationPage })))
const DesignerPage = lazy(() => import('./pages/DesignerPage').then(m => ({ default: m.DesignerPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))

function PageLoading() {
  return <div className="min-h-screen w-full bg-slate-50" aria-label="Đang tải trang" />
}

function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    return initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <div className="flex min-h-screen w-full bg-slate-50">
          <Routes>
            {/* Public routes — no sidebar, no auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invitation" element={<InvitationPage />} />
            <Route path="/to/:slug" element={<InvitationPage />} />

            {/* Protected admin routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            } />
          </Routes>
          <ToastNotification />
        </div>
      </Suspense>
    </BrowserRouter>
  )
}

function AdminLayout() {
  return (
    <div className="flex flex-col md:flex-row w-full min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full min-w-0 relative">
        <Routes>
          <Route path="/" element={<GuestsPage />} />
          <Route path="/wishes" element={<WishesPage />} />
          <Route path="/design" element={<DesignerPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
