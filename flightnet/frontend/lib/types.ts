// Database and API Types
export interface Airport {
  id: string
  code: string
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
  elevation: number
  timezone: string
  createdAt: Date
  updatedAt: Date
}

export interface Aircraft {
  id: string
  type: string
  model: string
  manufacturer: string
  maxPassengers: number
  maxRange: number
  cruiseSpeed: number
  fuelCapacity: number
  fuelConsumptionRate: number
  createdAt: Date
  updatedAt: Date
}

export interface FlightRoute {
  id: string
  flightNumber: string
  departureAirportId: string
  arrivalAirportId: string
  aircraftId: string
  altitude: number
  distance: number
  estimatedFlightTime: number
  fuelConsumption: number
  cost: number
  status: "planned" | "active" | "completed" | "cancelled"
  departureTime?: Date
  arrivalTime?: Date
  passengers: number
  waypoints: Waypoint[]
  weatherConditions?: WeatherCondition[]
  optimizationCriteria: "fuel" | "time" | "cost" | "balanced"
  createdAt: Date
  updatedAt: Date

  // Relations
  departureAirport?: Airport
  arrivalAirport?: Airport
  aircraft?: Aircraft
}

export interface Waypoint {
  id: string
  flightRouteId: string
  latitude: number
  longitude: number
  altitude: number
  sequence: number
  estimatedTime?: Date
  fuelRemaining?: number
}

export interface WeatherCondition {
  id: string
  flightRouteId?: string
  latitude: number
  longitude: number
  altitude: number
  windSpeed: number
  windDirection: number
  turbulenceLevel: "none" | "light" | "moderate" | "severe"
  temperature: number
  pressure: number
  visibility: number
  precipitation: number
  stormActivity: boolean
  timestamp: Date
}

// New types for external API data integration

export interface AircraftData {
  id: string
  registrationNumber: string
  aircraftId: string
  modelCode: string
  typeCode: string
  iataCode?: string
  icaoCode?: string
  icaoHexCode?: string
  manufacturingDetails: {
    productionLine?: string
    constructionNumber?: string
    rolloutDate?: Date
    firstFlightDate?: Date
    deliveryDate?: Date
    registrationDate?: Date
  }
  airlineAssociation: {
    iataAirlineCode?: string
    airlineName?: string
  }
  technicalSpecs: {
    enginesCount: number
    engineType: string
    maxSeats: number
    range: number
    cruiseSpeed: number
  }
  currentStatus: {
    planeAge: number
    operationalStatus: "active" | "inactive" | "maintenance" | "retired"
    lastSeen?: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface FlightData {
  id: string
  flightNumber: string
  iataFlightNumber?: string
  icaoFlightNumber?: string
  currentPosition: {
    latitude: number
    longitude: number
    altitude: number
    heading: number
    speed: number
  }
  departureDetails: {
    airportCode: string
    airportName: string
    scheduledTime: Date
    actualTime?: Date
    gate?: string
    terminal?: string
  }
  arrivalDetails: {
    airportCode: string
    airportName: string
    scheduledTime: Date
    estimatedTime?: Date
    actualTime?: Date
    gate?: string
    terminal?: string
  }
  aircraftDetails: {
    registrationNumber: string
    icaoCode: string
    aircraftType: string
  }
  airlineInfo: {
    name: string
    iataCode: string
    icaoCode: string
  }
  flightStatus: "scheduled" | "boarding" | "departed" | "en-route" | "landed" | "cancelled" | "delayed"
  isLive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WeatherData {
  id: string
  airportIdentification: {
    icaoCode: string
    iataCode: string
    airportName: string
    coordinates: {
      latitude: number
      longitude: number
    }
  }
  metarReport: {
    rawMetar: string
    observationTime: Date
    temperature: {
      celsius: number
      fahrenheit: number
    }
    windConditions: {
      direction: number
      speed: number
      gusts?: number
    }
    visibility: {
      miles: number
      meters: number
    }
    atmosphericPressure: {
      inHg: number
      hPa: number
      mb: number
    }
    humidity: number
    weatherConditions: string[]
    cloudCover: string
    weatherCategory: "VFR" | "IFR" | "LIFR" | "MVFR"
  }
  tafForecast?: {
    rawTaf: string
    validFrom: Date
    validTo: Date
    temperatureRange: {
      min: number
      max: number
    }
    windForecast: {
      direction: number
      speed: number
    }
    visibilityForecast: number
    conditionPredictions: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface SustainabilityData {
  id: string
  flightId?: string
  aircraftId?: string
  routeId?: string
  emissionsCalculation: {
    totalCO2: number
    co2PerKm: number
    co2PerSeat: number
    calculationStandard: "ICAO" | "IATA" | "EPA"
  }
  fuelConsumption: {
    totalFuel: number
    fuelPerKm: number
    fuelPerSeat: number
    fuelType: string
  }
  efficiencyScores: {
    aircraftEfficiency: number
    routeEfficiency: number
    overallScore: number
  }
  environmentalImpact: {
    carbonFootprint: number
    noiseImpact: number
    airQualityImpact: number
  }
  sustainabilityMetrics: {
    biofuelPercentage?: number
    offsetPrograms?: string[]
    certifications?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface GeopoliticalRiskData {
  id: string
  countryCode: string
  countryName: string
  riskAssessment: {
    overallRiskScore: number
    riskLevel: "very-low" | "low" | "moderate" | "high" | "very-high"
    riskFactors: {
      political: number
      economic: number
      security: number
      social: number
    }
    stabilityScore: number
  }
  riskTrends: {
    currentTrend: "improving" | "stable" | "deteriorating"
    thirtyDayForecast: number
    historicalTrend: number[]
  }
  intelligenceData: {
    currentAlerts: string[]
    warnings: string[]
    riskDescriptions: string[]
    sources: string[]
    lastUpdated: Date
  }
  globalIndices: {
    gprIndex: number
    regionalComparison: number
    globalRanking: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface OptimizationRequest {
  flightRouteId: string
  criteria: "fuel" | "time" | "cost" | "balanced"
  constraints?: {
    maxAltitude?: number
    minAltitude?: number
    avoidTurbulence?: boolean
    avoidStorms?: boolean
    preferredDepartureTime?: Date
    maxFlightTime?: number
  }
  weatherData?: boolean
  realTimeUpdates?: boolean
}

export interface OptimizationResult {
  originalRoute: FlightRoute
  optimizedRoute: FlightRoute
  improvements: {
    fuelSavings: number
    timeSavings: number
    costSavings: number
    distanceChange: number
  }
  confidence: number
  alternativeRoutes: FlightRoute[]
  weatherImpact: string[]
  recommendations: string[]
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Filter and Query Types
export interface FlightRouteFilters {
  altitude?: number
  altitudeRange?: { min: number; max: number }
  status?: FlightRoute["status"]
  departureAirport?: string
  arrivalAirport?: string
  aircraftType?: string
  dateRange?: { start: Date; end: Date }
  optimizationCriteria?: FlightRoute["optimizationCriteria"]
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// Bulk import types
export interface BulkImportResult {
  totalRecords: number
  successfulImports: number
  failedImports: number
  errors: string[]
  importId: string
  timestamp: Date
}
