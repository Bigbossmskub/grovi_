import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const handleStartClick = () => {
    if (isAuthenticated) {
      navigate('/map')
    } else {
      navigate('/auth')
    }
  }

  return (
    <section className="page active landing">
      <div className="hero">
        <h1>แพลตฟอร์มติดตามแปลงเกษตร</h1>
        <p className="subtitle">
          ระบบวิเคราะห์ภาพดาวเทียมเพื่อการเกษตรแม่นยำ<br />
          ติดตามสุขภาพพืช วิเคราะห์ดัชนีพืชพรรณ และจัดการแปลงเกษตรอย่างมีประสิทธิภาพ
        </p>
        
        <div className="features">
          <div className="feature-item">
            <div className="icon">🛰️</div>
            <span>ภาพดาวเทียมแบบเรียลไทม์</span>
          </div>
          <div className="feature-item">
            <div className="icon">📊</div>
            <span>วิเคราะห์ดัชนี VI</span>
          </div>
          <div className="feature-item">
            <div className="icon">🌱</div>
            <span>ติดตามสุขภาพพืช</span>
          </div>
          <div className="feature-item">
            <div className="icon">📈</div>
            <span>รายงานและแนวโน้ม</span>
          </div>
        </div>
        
        <button className="cta" onClick={handleStartClick}>
          เริ่มใช้งาน
        </button>
      </div>
    </section>
  )
}

export default LandingPage
