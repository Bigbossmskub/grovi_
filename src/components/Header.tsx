import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSection } from '../contexts/SectionContext'
import { useAuth } from '../contexts/AuthContext'

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentSection } = useSection();

  const handleSignIn = () => {
    navigate('/auth')
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }


  // Scroll to section if on homepage, otherwise navigate
  const handleNavigation = (pathOrSection: string) => {
    if (pathOrSection.startsWith('#')) {
      const id = pathOrSection.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    navigate(pathOrSection)
  }

  const renderAuthSection = () => {
    if (!isAuthenticated) {
      return (
        <div className="auth">
          <a onClick={handleSignIn} className="login-btn">เข้าสู่ระบบ</a>
        </div>
      )
    }

    return (
      <div className="auth">
        <span>สวัสดี, {user?.name || user?.username || 'ผู้ใช้'}</span>
        <a onClick={handleLogout} className="logout-btn">ออกจากระบบ</a>
      </div>
    )
  }

  // Don't render header on certain pages if needed
  if (location.pathname === '/compare') {
    return null
  }

  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="brand">
          <div className="logo">
            <img src="/src/iconlog0_grovi.png" alt="Grovi Logo" />
          </div>
        </div>
        <nav className="nav-menu">
          <a 
            onClick={() => handleNavigation('/')} 
            className={location.pathname === '/' && currentSection === 'landing' ? 'active' : ''}
          >
            หน้าหลัก
          </a>
          <a 
            onClick={() => handleNavigation('/map')} 
            className={location.pathname === '/map' ? 'active' : ''}
          >
            แผนที่
          </a>
          {location.pathname === '/' ? (
            <>
              <a onClick={() => handleNavigation('#rice-info')} className={currentSection === 'rice-info' ? 'active' : ''}>ข้าวคืออะไร</a>
              <a onClick={() => handleNavigation('#user-guide')} className={currentSection === 'user-guide' ? 'active' : ''}>วิธีการใช้งาน</a>

            </>
          ) : (
            <>
              <a onClick={() => handleNavigation('/rice-info')} className={location.pathname === '/rice-info' ? 'active' : ''}>ข้าวคืออะไร</a>
              <a onClick={() => handleNavigation('/user-guide')} className={location.pathname === '/user-guide' ? 'active' : ''}>วิธีการใช้งาน</a>
      
            </>
          )}
        </nav>
      </div>
      <div className="header-right">
        <div className="language-selector">
          <span>🇹🇭</span>
          <span>ไทย</span>
        </div>
        {renderAuthSection()}
      </div>
    </header>
  )
}

export default Header
