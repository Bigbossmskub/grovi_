import React, { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import axios from '../config/axios'

interface SearchResult {
  display_name: string
  lat: number
  lon: number
  type: string
  class: string
}

interface SearchPanelProps {
  map: L.Map | null
}

const SearchPanel: React.FC<SearchPanelProps> = ({ map }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [marker, setMarker] = useState<L.Marker | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current && 
        triggerRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, 350)

    return () => clearTimeout(timeoutId)
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    try {
      setIsLoading(true)
      
      // Try API endpoint first
      const response = await axios.get('/utils/search', {
        params: { q: searchQuery }
      })
      
      setResults(response.data.results || [])
    } catch (error) {
      console.error('Search API failed, trying direct Nominatim:', error)
      
      // Fallback to direct Nominatim search
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=th&q=${encodeURIComponent(searchQuery)}&limit=8&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Grovi-CropMonitoring/1.0'
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          const formattedResults = data.map((item: any) => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: item.type || '',
            class: item.class || ''
          }))
          setResults(formattedResults)
        } else {
          setResults([])
        }
      } catch (fallbackError) {
        console.error('Fallback search failed:', fallbackError)
        setResults([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    console.log('Search result clicked:', result)
    
    if (!map) {
      console.error('Map is not available')
      return
    }

    try {
      // Remove existing marker
      if (marker) {
        map.removeLayer(marker)
      }

      // Add new marker
      const newMarker = L.marker([result.lat, result.lon])
        .addTo(map)
        .bindPopup(result.display_name)
        .openPopup()

      setMarker(newMarker)

      // Fly to location
      map.flyTo([result.lat, result.lon], 13)

      // Clear results and collapse panel
      setResults([])
      setQuery('')
      setIsExpanded(false)
      
      console.log('Successfully navigated to location')
    } catch (error) {
      console.error('Error navigating to location:', error)
    }
  }

  const handleTriggerClick = () => {
    setIsExpanded(true)
  }

  const handleInputFocus = () => {
    setIsExpanded(true)
  }

  const handleSearchButtonClick = () => {
    if (query.trim()) {
      performSearch(query)
    }
  }

  return (
    <>
      {/* Search Trigger - Always visible */}
      <div 
        ref={triggerRef}
        className="search-trigger"
        onClick={handleTriggerClick}
      >
        🔍 ค้นหาพื้นที่
      </div>

      {/* Search Panel */}
      <div 
        ref={panelRef}
        className={`search-panel ${isExpanded ? 'expanded' : ''}`}
      >
        <div className="row">
          <input
            type="text"
            placeholder="ค้นหาพื้นที่ (เช่น อำเภอเชียงม่วน)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearchButtonClick()
              }
            }}
          />
          <button onClick={handleSearchButtonClick} disabled={isLoading}>
            {isLoading ? '...' : 'ค้นหา'}
          </button>
        </div>
        
        {results.length > 0 && (
          <div className="search-results">
            {results.map((result, index) => (
              <div
                key={index}
                className="search-item"
                onClick={() => handleResultClick(result)}
              >
                📍 {result.display_name}
              </div>
            ))}
          </div>
        )}
        
        {query && results.length === 0 && !isLoading && (
          <div className="search-results">
            <div className="search-item muted">ไม่พบผลลัพธ์</div>
          </div>
        )}
      </div>
    </>
  )
}

export default SearchPanel
