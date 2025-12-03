import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const AuthPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register } = useAuth()

  // Registration form state
  const [regData, setRegData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    date_of_birth: ''
  })

  // Login form state
  const [loginData, setLoginData] = useState({
    username_or_email: '',
    password: ''
  })

  // UI state
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    setRegSuccess('')

    // Validation
    if (!regData.name || !regData.username || !regData.email || !regData.password) {
      setRegError('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    if (regData.password.length < 6) {
      setRegError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    try {
      setIsLoading(true)
      await register(regData)
      setRegSuccess('สร้างบัญชีสำเร็จ! กำลังเข้าสู่ระบบ…')
      
      setTimeout(() => {
        const from = location.state?.from?.pathname || '/map'
        navigate(from, { replace: true })
      }, 1000)
    } catch (error: any) {
      setRegError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!loginData.username_or_email || !loginData.password) {
      setLoginError('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    try {
      setIsLoading(true)
      await login(loginData.username_or_email, loginData.password)
      
      const from = location.state?.from?.pathname || '/map'
      navigate(from, { replace: true })
    } catch (error: any) {
      setLoginError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="page active">
      <div className="auth-wrap">
        <div className="auth-card">
          {/* Registration Column */}
          <div className="auth-col" style={{borderRight: '1px solid var(--line)', paddingRight: '12px'}}>
            <h3>ลงทะเบียนผู้ใช้ใหม่</h3>
            <form onSubmit={handleRegister}>
              <div className="field">
                <label>ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={regData.name}
                  onChange={(e) => setRegData({...regData, name: e.target.value})}
                  placeholder="เช่น ธนศักดิ์ ไชยสังคา"
                  disabled={isLoading}
                />
              </div>
              
              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  value={regData.username}
                  onChange={(e) => setRegData({...regData, username: e.target.value})}
                  placeholder="ตัวอย่าง thanasak"
                  disabled={isLoading}
                />
              </div>
              
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={regData.email}
                  onChange={(e) => setRegData({...regData, email: e.target.value})}
                  placeholder="name@example.com"
                  disabled={isLoading}
                />
              </div>
              
              <div className="field">
                <label>รหัสผ่าน</label>
                <input
                  type="password"
                  value={regData.password}
                  onChange={(e) => setRegData({...regData, password: e.target.value})}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  disabled={isLoading}
                />
              </div>
              
              <div className="field">
                <label>วันเดือนปีเกิด</label>
                <input
                  type="date"
                  value={regData.date_of_birth}
                  onChange={(e) => setRegData({...regData, date_of_birth: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              
              <div className="helper">ระบบจะคำนวณอายุอัตโนมัติและบันทึกในโปรไฟล์</div>
              
              {regError && (
                <div className="err" style={{display: 'block'}}>
                  {regError}
                </div>
              )}
              
              {regSuccess && (
                <div className="ok" style={{display: 'block'}}>
                  {regSuccess}
                </div>
              )}
              
              <button 
                type="submit" 
                className="cta" 
                style={{marginTop: '8px'}}
                disabled={isLoading}
              >
                {isLoading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
              </button>
            </form>
          </div>

          {/* Login Column */}
          <div className="auth-col" style={{paddingLeft: '12px'}}>
            <h3>เข้าสู่ระบบ</h3>
            <form onSubmit={handleLogin}>
              <div className="field">
                <label>Username หรือ Email</label>
                <input
                  type="text"
                  value={loginData.username_or_email}
                  onChange={(e) => setLoginData({...loginData, username_or_email: e.target.value})}
                  placeholder="username หรือ email"
                  disabled={isLoading}
                />
              </div>
              
              <div className="field">
                <label>รหัสผ่าน</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  placeholder="รหัสผ่าน"
                  disabled={isLoading}
                />
              </div>
              
              {loginError && (
                <div className="err" style={{display: 'block'}}>
                  {loginError}
                </div>
              )}
              
              <button 
                type="submit" 
                className="cta" 
                style={{marginTop: '8px'}}
                disabled={isLoading}
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
              
              <p className="helper" style={{marginTop: '10px'}}>
                ยังไม่มีบัญชี? กรอกฝั่งซ้ายเพื่อสมัคร
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AuthPage
