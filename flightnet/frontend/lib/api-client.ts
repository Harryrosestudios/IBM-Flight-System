// API client for frontend integration
import type {
  FlightRoute,
  Airport,
  WeatherCondition,
  OptimizationRequest,
  OptimizationResult,
  FlightRouteFilters,
  PaginationParams,
  ApiResponse,
  AircraftData,
  FlightData,
  WeatherData,
  SustainabilityData,
  GeopoliticalRiskData,
  BulkImportResult,
} from "./types"

class ApiClient {
  private baseUrl: string

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Flight Routes API
  async getFlights(filters?: FlightRouteFilters, pagination?: PaginationParams) {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === "altitudeRange" && typeof value === "object") {
            params.append("minAltitude", value.min.toString())
            params.append("maxAltitude", value.max.toString())
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    if (pagination) {
      Object.entries(pagination).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/flights${queryString ? `?${queryString}` : ""}`

    return this.request<FlightRoute[]>(endpoint)
  }

  async getFlight(id: string) {
    return this.request<FlightRoute>(`/flights/${id}`)
  }

  async createFlight(flightData: Partial<FlightRoute>) {
    return this.request<FlightRoute>("/flights", {
      method: "POST",
      body: JSON.stringify(flightData),
    })
  }

  async updateFlight(id: string, flightData: Partial<FlightRoute>) {
    return this.request<FlightRoute>(`/flights/${id}`, {
      method: "PUT",
      body: JSON.stringify(flightData),
    })
  }

  async deleteFlight(id: string) {
    return this.request<{ id: string }>(`/flights/${id}`, {
      method: "DELETE",
    })
  }

  // Aircraft Data API
  async getAircraftData(filters?: {
    registrationNumber?: string
    icaoHexCode?: string
    airlineCode?: string
    aircraftType?: string
    operationalStatus?: string
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/aircraft-data${queryString ? `?${queryString}` : ""}`

    return this.request<AircraftData[]>(endpoint)
  }

  async createAircraftData(aircraftData: Partial<AircraftData> | Partial<AircraftData>[]) {
    return this.request<AircraftData | BulkImportResult>("/aircraft-data", {
      method: "POST",
      body: JSON.stringify(aircraftData),
    })
  }

  // Flight Data API
  async getFlightData(filters?: {
    flightNumber?: string
    airlineCode?: string
    departureAirport?: string
    arrivalAirport?: string
    flightStatus?: string
    isLive?: boolean
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/flight-data${queryString ? `?${queryString}` : ""}`

    return this.request<FlightData[]>(endpoint)
  }

  async createFlightData(flightData: Partial<FlightData> | Partial<FlightData>[]) {
    return this.request<FlightData | BulkImportResult>("/flight-data", {
      method: "POST",
      body: JSON.stringify(flightData),
    })
  }

  // Weather Data API
  async getWeatherData(filters?: {
    icaoCode?: string
    iataCode?: string
    airportName?: string
    weatherCategory?: string
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/weather-data${queryString ? `?${queryString}` : ""}`

    return this.request<WeatherData[]>(endpoint)
  }

  async createWeatherData(weatherData: Partial<WeatherData> | Partial<WeatherData>[]) {
    return this.request<WeatherData | BulkImportResult>("/weather-data", {
      method: "POST",
      body: JSON.stringify(weatherData),
    })
  }

  // Sustainability Data API
  async getSustainabilityData(filters?: {
    flightId?: string
    aircraftId?: string
    routeId?: string
    calculationStandard?: string
    minEfficiencyScore?: number
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/sustainability-data${queryString ? `?${queryString}` : ""}`

    return this.request<SustainabilityData[]>(endpoint)
  }

  async createSustainabilityData(sustainabilityData: Partial<SustainabilityData> | Partial<SustainabilityData>[]) {
    return this.request<SustainabilityData | BulkImportResult>("/sustainability-data", {
      method: "POST",
      body: JSON.stringify(sustainabilityData),
    })
  }

  // Geopolitical Risk Data API
  async getGeopoliticalRiskData(filters?: {
    countryCode?: string
    countryName?: string
    riskLevel?: string
    minRiskScore?: number
    maxRiskScore?: number
    currentTrend?: string
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/geopolitical-risk-data${queryString ? `?${queryString}` : ""}`

    return this.request<GeopoliticalRiskData[]>(endpoint)
  }

  async createGeopoliticalRiskData(riskData: Partial<GeopoliticalRiskData> | Partial<GeopoliticalRiskData>[]) {
    return this.request<GeopoliticalRiskData | BulkImportResult>("/geopolitical-risk-data", {
      method: "POST",
      body: JSON.stringify(riskData),
    })
  }

  // Bulk Import Status API
  async getBulkImportStatus(importId: string) {
    return this.request<any>(`/bulk-import/status/${importId}`)
  }

  // Optimization API
  async optimizeRoute(request: OptimizationRequest) {
    return this.request<OptimizationResult>("/optimize", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  // Airports API
  async getAirports(search?: string, limit?: number) {
    const params = new URLSearchParams()
    if (search) params.append("search", search)
    if (limit) params.append("limit", limit.toString())

    const queryString = params.toString()
    const endpoint = `/airports${queryString ? `?${queryString}` : ""}`

    return this.request<Airport[]>(endpoint)
  }

  async createAirport(airportData: Partial<Airport>) {
    return this.request<Airport>("/airports", {
      method: "POST",
      body: JSON.stringify(airportData),
    })
  }

  // Weather API (original)
  async getWeather(params?: {
    flightRouteId?: string
    latitude?: number
    longitude?: number
    radius?: number
    limit?: number
  }) {
    const searchParams = new URLSearchParams()

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const queryString = searchParams.toString()
    const endpoint = `/weather${queryString ? `?${queryString}` : ""}`

    return this.request<WeatherCondition[]>(endpoint)
  }

  async addWeatherCondition(weatherData: Partial<WeatherCondition>) {
    return this.request<WeatherCondition>("/weather", {
      method: "POST",
      body: JSON.stringify(weatherData),
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export class for custom instances
export { ApiClient }
