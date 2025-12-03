import axios from 'axios'
import { API_CONFIG } from './api'

// Configure axios defaults
axios.defaults.baseURL = API_CONFIG.BASE_URL
axios.defaults.timeout = 30000 // 30 seconds timeout

// Request interceptor
axios.interceptors.request.use(
  (config) => {
    // Add any common headers here
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
axios.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

export default axios
