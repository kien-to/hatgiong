import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import './index.css'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/market', lazy: () => import('./pages/MarketPage').then((m) => ({ Component: m.MarketPage })) },
      { path: '/stock/:symbol', lazy: () => import('./pages/StockPage').then((m) => ({ Component: m.StockPage })) },
      { path: '/portfolio', lazy: () => import('./pages/PortfolioPage').then((m) => ({ Component: m.PortfolioPage })) },
      { path: '/learn', lazy: () => import('./pages/LearnPage').then((m) => ({ Component: m.LearnPage })) },
      { path: '/learn/review', lazy: () => import('./pages/ReviewPage').then((m) => ({ Component: m.ReviewPage })) },
      { path: '/learn/:lessonId', lazy: () => import('./pages/LessonPage').then((m) => ({ Component: m.LessonPage })) },
      { path: '/classes', lazy: () => import('./pages/ClassesPage').then((m) => ({ Component: m.ClassesPage })) },
      { path: '/classes/:classId', lazy: () => import('./pages/ClassesPage').then((m) => ({ Component: m.ClassReportPage })) },
      { path: '/privacy', lazy: () => import('./pages/PrivacyPage').then((m) => ({ Component: m.PrivacyPage })) },
      { path: '/terms', lazy: () => import('./pages/TermsPage').then((m) => ({ Component: m.TermsPage })) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
