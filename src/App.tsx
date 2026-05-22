import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/useAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { AppLayout } from '@/features/auth/AppLayout'
import { LibraryPage } from '@/features/library/LibraryPage'
import { ReaderPage } from '@/features/reader/ReaderPage'
import { MiningPage } from '@/features/mining/MiningPage'
import { ReviewPage } from '@/features/review/ReviewPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoutes />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/library" replace />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/library/:id" element={<ReaderPage />} />
              <Route path="/mining" element={<MiningPage />} />
              <Route path="/review" element={<ReviewPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--color-ink-faint)' }}
        />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
