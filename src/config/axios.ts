import axios, { AxiosError } from 'axios'
import { API_CONFIG } from './api'

axios.defaults.baseURL = API_CONFIG.BASE_URL
// ให้เวลาพอสำหรับ cold start ของ Render ฟรี (60–90 วิแนะนำ)
axios.defaults.timeout = 90000

// Request interceptor (เติม token ได้ตรงนี้ถ้ามี)
axios.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// Response interceptor + retry 1 ครั้งกรณี timeout/เน็ตล่ม
axios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config: any = error.config || {}

    // ถ้า timeout/Network Error และยังไม่เคยลองซ้ำ ให้หน่วง 3 วิแล้วลองใหม่ 1 ครั้ง
    const isTimeout = error.code === 'ECONNABORTED'
    const isNetwork = !error.response
    if ((isTimeout || isNetwork) && !config.__retriedOnce) {
      config.__retriedOnce = true
      await new Promise((r) => setTimeout(r, 3000))
      return axios(config)
    }

    // 401 → ลบ token และเด้งไปหน้า /auth
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      window.location.href = '/auth'
    }

    return Promise.reject(error)
  }
)

export default axios
