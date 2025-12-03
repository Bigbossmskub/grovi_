import axios from 'axios'
import { API_CONFIG } from './api'

axios.defaults.baseURL = API_CONFIG.BASE_URL
axios.defaults.timeout = 30000

// Request interceptor
axios.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

export default axios
