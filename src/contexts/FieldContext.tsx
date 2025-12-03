import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from '../config/axios'
import { useAuth } from './AuthContext'

interface Field {
  id: string
  name: string
  user_id: string
  crop_type?: string
  variety?: string
  planting_season?: string
  planting_date?: string
  geometry: any // GeoJSON geometry
  area_m2: number
  centroid_lat: number
  centroid_lng: number
  address?: string
  created_at: string
}

interface FieldContextType {
  fields: Field[]
  currentField: Field | null
  isLoading: boolean
  createField: (fieldData: any) => Promise<Field>
  updateField: (fieldId: string, fieldData: any) => Promise<Field>
  deleteField: (fieldId: string) => Promise<void>
  getField: (fieldId: string) => Promise<Field>
  setCurrentField: (field: Field | null) => void
  refreshFields: () => Promise<void>
  saveThumbnail: (fieldId: string, thumbnailData: string) => Promise<void>
  getThumbnail: (fieldId: string) => Promise<string | null>
}

const FieldContext = createContext<FieldContextType | undefined>(undefined)

export const useField = () => {
  const context = useContext(FieldContext)
  if (context === undefined) {
    throw new Error('useField must be used within a FieldProvider')
  }
  return context
}

interface FieldProviderProps {
  children: ReactNode
}

export const FieldProvider: React.FC<FieldProviderProps> = ({ children }) => {
  const [fields, setFields] = useState<Field[]>([])
  const [currentField, setCurrentField] = useState<Field | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      refreshFields()
    }
  }, [isAuthenticated])

  const refreshFields = async () => {
    if (!isAuthenticated) return
    
    try {
      setIsLoading(true)
      const response = await axios.get('/fields/')
      setFields(response.data)
    } catch (error) {
      console.error('Failed to fetch fields:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createField = async (fieldData: any): Promise<Field> => {
    try {
      const response = await axios.post('/fields/', fieldData)
      const newField = response.data
      setFields(prev => [...prev, newField])
      return newField
    } catch (error: any) {
      console.error('Failed to create field:', error)
      throw new Error(error.response?.data?.detail || 'สร้างแปลงไม่สำเร็จ')
    }
  }

  const updateField = async (fieldId: string, fieldData: any): Promise<Field> => {
    try {
      const response = await axios.put(`/fields/${fieldId}`, fieldData)
      const updatedField = response.data
      setFields(prev => prev.map(field => field.id === fieldId ? updatedField : field))
      if (currentField?.id === fieldId) {
        setCurrentField(updatedField)
      }
      return updatedField
    } catch (error: any) {
      console.error('Failed to update field:', error)
      throw new Error(error.response?.data?.detail || 'อัปเดตแปลงไม่สำเร็จ')
    }
  }

  const deleteField = async (fieldId: string): Promise<void> => {
    try {
      await axios.delete(`/fields/${fieldId}`)
      setFields(prev => prev.filter(field => field.id !== fieldId))
      if (currentField?.id === fieldId) {
        setCurrentField(null)
      }
    } catch (error: any) {
      console.error('Failed to delete field:', error)
      throw new Error(error.response?.data?.detail || 'ลบแปลงไม่สำเร็จ')
    }
  }

  const getField = async (fieldId: string): Promise<Field> => {
    try {
      const response = await axios.get(`/fields/${fieldId}`)
      const field = response.data
      setCurrentField(field)
      return field
    } catch (error: any) {
      console.error('Failed to get field:', error)
      throw new Error(error.response?.data?.detail || 'ไม่พบข้อมูลแปลง')
    }
  }

  const saveThumbnail = async (fieldId: string, thumbnailData: string): Promise<void> => {
    try {
      await axios.post(`/fields/${fieldId}/thumbnail`, {
        field_id: fieldId,
        image_data: thumbnailData
      })
    } catch (error) {
      console.error('Failed to save thumbnail:', error)
    }
  }

  const getThumbnail = async (fieldId: string): Promise<string | null> => {
    try {
      const response = await axios.get(`/fields/${fieldId}/thumbnail`)
      return response.data.image_data
    } catch (error) {
      console.error('Failed to get thumbnail:', error)
      return null
    }
  }

  const value = {
    fields,
    currentField,
    isLoading,
    createField,
    updateField,
    deleteField,
    getField,
    setCurrentField,
    refreshFields,
    saveThumbnail,
    getThumbnail
  }

  return (
    <FieldContext.Provider value={value}>
      {children}
    </FieldContext.Provider>
  )
}
