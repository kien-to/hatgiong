import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ClassesPage, ClassReportPage } from './pages/ClassesPage'
import { HomePage } from './pages/HomePage'
import { ReviewPage } from './pages/ReviewPage'
import { LearnPage } from './pages/LearnPage'
import { LessonPage } from './pages/LessonPage'
import { MarketPage } from './pages/MarketPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { StockPage } from './pages/StockPage'
import './index.css'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/market', element: <MarketPage /> },
      { path: '/stock/:symbol', element: <StockPage /> },
      { path: '/portfolio', element: <PortfolioPage /> },
      { path: '/learn', element: <LearnPage /> },
      { path: '/learn/review', element: <ReviewPage /> },
      { path: '/learn/:lessonId', element: <LessonPage /> },
      { path: '/classes', element: <ClassesPage /> },
      { path: '/classes/:classId', element: <ClassReportPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
