import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { FieldProvider } from './contexts/FieldContext'
import { SectionProvider } from './contexts/SectionContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import MapPage from './pages/MapPage'
import FieldDetailPage from './pages/FieldDetailPage'
import HealthPage from './pages/HealthPage'
import AnalysisPage from './pages/AnalysisPage'
import ComparePage from './pages/ComparePage'
import RiceInfoPage from './pages/RiceInfoPage'
import UserGuidePage from './pages/UserGuidePage'
// import ResearchPage from './pages/ResearchPage'
// import ContactPage from './pages/ContactPage'
import TunnelDashboard from './pages/TunnelDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <FieldProvider>
        <SectionProvider>
          <Router>
            <div className="app">
              <Header />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/rice-info" element={<RiceInfoPage />} />
                <Route path="/user-guide" element={<UserGuidePage />} />
                {/* <Route path="/research" element={<ResearchPage />} /> */}
                {/* <Route path="/contact" element={<ContactPage />} /> */}
                <Route path="/tunnel-dashboard" element={<TunnelDashboard />} />
                <Route 
                  path="/map" 
                  element={
                    <ProtectedRoute>
                      <MapPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/field/:fieldId" 
                  element={
                    <ProtectedRoute>
                      <FieldDetailPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/health/:fieldId" 
                  element={
                    <ProtectedRoute>
                      <HealthPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/analysis/:fieldId" 
                  element={
                    <ProtectedRoute>
                      <AnalysisPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/compare/:fieldId" 
                  element={
                    <ProtectedRoute>
                      <ComparePage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </SectionProvider>
      </FieldProvider>
    </AuthProvider>
  )
}

export default App
