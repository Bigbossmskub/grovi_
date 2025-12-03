// API Configuration
export const API_CONFIG = {
  // Base URL สำหรับเรียก API — ถ้าไม่เจอ ENV จะ fallback เป็น localhost
  BASE_URL: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
}

// Helper function: get full API URL
export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`
}

// Helper function: get full image URL
export const getImageUrl = (imagePath: string) => {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  return `${API_CONFIG.BASE_URL}/${cleanPath}`
}
