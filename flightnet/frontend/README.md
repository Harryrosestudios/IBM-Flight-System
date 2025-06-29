# FlightPath Optimizer - Comprehensive Backend Integration Guide

A comprehensive flight route optimization system with real-time data processing, weather integration, advanced route planning capabilities, and external API data integration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+ (or SQLite for local development)
- npm or yarn package manager

### Installation

1. **Clone and install dependencies**
   \`\`\`bash
   git clone <your-repo-url>
   cd flight-route-optimizer
   npm install
   \`\`\`

2. **Environment Setup**
   Create a \`.env.local\` file in the root directory:
   \`\`\`env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=flight_optimizer
   DB_USER=postgres
   DB_PASSWORD=your_password

   # API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   API_SECRET_KEY=your_secret_key

   # External API Keys (for your existing API clients)
   AIRCRAFT_API_KEY=your_aircraft_api_key
   FLIGHTS_API_KEY=your_flights_api_key
   WEATHER_API_KEY=your_weather_api_key
   SUSTAINABILITY_API_KEY=your_sustainability_api_key
   GEOPOLITICAL_API_KEY=your_geopolitical_api_key

   # Optional: SQLite for local development (instead of PostgreSQL)
   USE_SQLITE=true
   SQLITE_PATH=./data/flight_optimizer.db
   \`\`\`

3. **Database Setup**
   \`\`\`bash
   # For PostgreSQL
   createdb flight_optimizer

   # For SQLite (automatic creation)
   mkdir -p data

   # Run the application (database tables will be created automatically)
   npm run dev
   \`\`\`

4. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Database Schema

### Core Tables

#### Airports
\`\`\`sql
CREATE TABLE airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  elevation INTEGER NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

#### Aircraft
\`\`\`sql
CREATE TABLE aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100) NOT NULL,
  max_passengers INTEGER NOT NULL,
  max_range INTEGER NOT NULL,
  cruise_speed INTEGER NOT NULL,
  fuel_capacity INTEGER NOT NULL,
  fuel_consumption_rate DECIMAL(8, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

#### Flight Routes
\`\`\`sql
CREATE TABLE flight_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number VARCHAR(20) NOT NULL,
  departure_airport_id UUID REFERENCES airports(id),
  arrival_airport_id UUID REFERENCES airports(id),
  aircraft_id UUID REFERENCES aircraft(id),
  altitude INTEGER NOT NULL,
  distance DECIMAL(10, 2) NOT NULL,
  estimated_flight_time INTEGER NOT NULL,
  fuel_consumption DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'planned',
  departure_time TIMESTAMP,
  arrival_time TIMESTAMP,
  passengers INTEGER NOT NULL,
  optimization_criteria VARCHAR(20) DEFAULT 'balanced',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

#### Waypoints
\`\`\`sql
CREATE TABLE waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_route_id UUID REFERENCES flight_routes(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  estimated_time TIMESTAMP,
  fuel_remaining DECIMAL(10, 2)
);
\`\`\`

#### Weather Conditions
\`\`\`sql
CREATE TABLE weather_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_route_id UUID REFERENCES flight_routes(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude INTEGER NOT NULL,
  wind_speed DECIMAL(5, 2) NOT NULL,
  wind_direction INTEGER NOT NULL,
  turbulence_level VARCHAR(20) NOT NULL,
  temperature DECIMAL(5, 2) NOT NULL,
  pressure DECIMAL(8, 2) NOT NULL,
  visibility DECIMAL(5, 2) NOT NULL,
  precipitation DECIMAL(5, 2) NOT NULL,
  storm_activity BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### External API Data Tables

#### Aircraft Data (from AircraftAPI)
\`\`\`sql
CREATE TABLE aircraft_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(20) UNIQUE NOT NULL,
  aircraft_id VARCHAR(50),
  model_code VARCHAR(50),
  type_code VARCHAR(50),
  iata_code VARCHAR(10),
  icao_code VARCHAR(10),
  icao_hex_code VARCHAR(10),
  production_line VARCHAR(100),
  construction_number VARCHAR(50),
  rollout_date DATE,
  first_flight_date DATE,
  delivery_date DATE,
  registration_date DATE,
  iata_airline_code VARCHAR(10),
  airline_name VARCHAR(255),
  engines_count INTEGER,
  engine_type VARCHAR(100),
  max_seats INTEGER,
  range_km INTEGER,
  cruise_speed_kmh INTEGER,
  plane_age INTEGER,
  operational_status VARCHAR(20),
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

#### Flight Data (from FlightsAPI)
\`\`\`sql
CREATE TABLE flight_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number VARCHAR(20) NOT NULL,
  iata_flight_number VARCHAR(20),
  icao_flight_number VARCHAR(20),
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  current_altitude INTEGER,
  heading INTEGER,
  speed INTEGER,
  departure_airport_code VARCHAR(10),
  departure_airport_name VARCHAR(255),
  departure_scheduled_time TIMESTAMP,
  departure_actual_time TIMESTAMP,
  departure_gate VARCHAR(10),
  departure_terminal VARCHAR(10),
  arrival_airport_code VARCHAR(10),
  arrival_airport_name VARCHAR(255),
  arrival_scheduled_time TIMESTAMP,
  arrival_estimated_time TIMESTAMP,
  arrival_actual_time TIMESTAMP,
  arrival_gate VARCHAR(10),
  arrival_terminal VARCHAR(10),
  aircraft_registration VARCHAR(20),
  aircraft_icao_code VARCHAR(10),
  aircraft_type VARCHAR(50),
  airline_name VARCHAR(255),
  airline_iata_code VARCHAR(10),
  airline_icao_code VARCHAR(10),
  flight_status VARCHAR(20),
  is_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

#### Weather Data (from WeatherAPI)
\`\`\`sql
CREATE TABLE weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icao_code VARCHAR(10) NOT NULL,
  iata_code VARCHAR(10),
  airport_name VARCHAR(255),
  airport_latitude DECIMAL(10, 8),
  airport_longitude DECIMAL(11, 8),
  raw_metar TEXT,
  observation_time TIMESTAMP,
  temperature_celsius DECIMAL(5, 2),
  temperature_fahrenheit DECIMAL(5, 2),
  wind_direction INTEGER,
  wind_speed INTEGER,
  wind_gusts INTEGER,
  visibility_miles DECIMAL(5, 2),
  visibility_meters INTEGER,
  pressure_inhg DECIMAL(6, 2),
  pressure_hpa DECIMAL(6, 2),
  pressure_mb DECIMAL(6, 2),
  humidity INTEGER,
  weather_conditions TEXT[],
  cloud_cover VARCHAR(100),
  weather_category VARCHAR(10),
  raw_taf TEXT,
  taf_valid_from TIMESTAMP,
  taf_valid_to TIMESTAMP,
  taf_temp_min DECIMAL(5, 2),
  taf_temp_max DECIMAL(5, 2),
  taf_wind_direction INTEGER,
  taf_wind_speed INTEGER,
  taf_visibility DECIMAL(5, 2),
  taf_conditions TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

#### Sustainability Data (from SustainabilityAPI)
\`\`\`sql
CREATE TABLE sustainability_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID,
  aircraft_id UUID,
  route_id UUID,
  total_co2 DECIMAL(10, 2),
  co2_per_km DECIMAL(8, 4),
  co2_per_seat DECIMAL(8, 4),
  calculation_standard VARCHAR(20),
  total_fuel DECIMAL(10, 2),
  fuel_per_km DECIMAL(8, 4),
  fuel_per_seat DECIMAL(8, 4),
  fuel_type VARCHAR(50),
  aircraft_efficiency DECIMAL(5, 2),
  route_efficiency DECIMAL(5, 2),
  overall_score DECIMAL(5, 2),
  carbon_footprint DECIMAL(10, 2),
  noise_impact DECIMAL(5, 2),
  air_quality_impact DECIMAL(5, 2),
  biofuel_percentage DECIMAL(5, 2),
  offset_programs TEXT[],
  certifications TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

#### Geopolitical Risk Data (from GeopoliticalAPI)
\`\`\`sql
CREATE TABLE geopolitical_risk_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(3) UNIQUE NOT NULL,
  country_name VARCHAR(255) NOT NULL,
  overall_risk_score DECIMAL(5, 2),
  risk_level VARCHAR(20),
  political_risk DECIMAL(5, 2),
  economic_risk DECIMAL(5, 2),
  security_risk DECIMAL(5, 2),
  social_risk DECIMAL(5, 2),
  stability_score DECIMAL(5, 2),
  current_trend VARCHAR(20),
  thirty_day_forecast DECIMAL(5, 2),
  historical_trend DECIMAL(5, 2)[],
  current_alerts TEXT[],
  warnings TEXT[],
  risk_descriptions TEXT[],
  sources TEXT[],
  intelligence_last_updated TIMESTAMP,
  gpr_index DECIMAL(5, 2),
  regional_comparison DECIMAL(5, 2),
  global_ranking INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

## 🔌 API Endpoints

### Flight Routes

#### GET /api/flights
Get all flight routes with optional filtering.

**Query Parameters:**
- \`altitude\` (number): Filter by specific altitude
- \`minAltitude\` & \`maxAltitude\` (number): Filter by altitude range
- \`status\` (string): Filter by flight status (planned, active, completed, cancelled)
- \`departureAirport\` (string): Filter by departure airport code
- \`arrivalAirport\` (string): Filter by arrival airport code
- \`aircraftType\` (string): Filter by aircraft type
- \`page\` (number): Page number for pagination (default: 1)
- \`limit\` (number): Items per page (default: 10)
- \`sortBy\` (string): Sort field (default: created_at)
- \`sortOrder\` (string): Sort order - asc/desc (default: desc)

**Example Request:**
\`\`\`bash
curl "http://localhost:3000/api/flights?altitude=35000&status=active&page=1&limit=10"
\`\`\`

**Example Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "flight_number": "AA1234",
      "departure_airport_code": "JFK",
      "arrival_airport_code": "LAX",
      "altitude": 35000,
      "distance": 2475.5,
      "estimated_flight_time": 360,
      "fuel_consumption": 18450.0,
      "cost": 12340.0,
      "status": "active",
      "passengers": 180,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
\`\`\`

#### POST /api/flights
Create a new flight route.

**Request Body:**
\`\`\`json
{
  "flightNumber": "AA1234",
  "departureAirportId": "airport-uuid",
  "arrivalAirportId": "airport-uuid",
  "aircraftId": "aircraft-uuid",
  "altitude": 35000,
  "distance": 2475.5,
  "estimatedFlightTime": 360,
  "fuelConsumption": 18450.0,
  "cost": 12340.0,
  "passengers": 180,
  "departureTime": "2024-01-15T14:30:00Z",
  "arrivalTime": "2024-01-15T20:30:00Z",
  "optimizationCriteria": "balanced",
  "waypoints": [
    {
      "latitude": 40.6413,
      "longitude": -73.7781,
      "altitude": 35000
    }
  ]
}
\`\`\`

#### GET /api/flights/[id]
Get a specific flight route by ID.

#### PUT /api/flights/[id]
Update a flight route.

#### DELETE /api/flights/[id]
Delete a flight route.

### Route Optimization

#### POST /api/optimize
Optimize a flight route based on specified criteria.

**Request Body:**
\`\`\`json
{
  "flightRouteId": "flight-uuid",
  "criteria": "fuel",
  "constraints": {
    "maxAltitude": 42000,
    "minAltitude": 28000,
    "avoidTurbulence": true,
    "avoidStorms": true,
    "preferredDepartureTime": "2024-01-15T14:30:00Z",
    "maxFlightTime": 400
  },
  "weatherData": true,
  "realTimeUpdates": false
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "originalRoute": { /* original route data */ },
    "optimizedRoute": { /* optimized route data */ },
    "improvements": {
      "fuelSavings": 0.15,
      "timeSavings": 0.05,
      "costSavings": 0.12,
      "distanceChange": -0.03
    },
    "confidence": 0.92,
    "alternativeRoutes": [ /* alternative route options */ ],
    "weatherImpact": [
      "Storm activity detected - route adjusted to avoid severe weather"
    ],
    "recommendations": [
      "Optimized for fuel efficiency",
      "Weather conditions have been considered"
    ]
  }
}
\`\`\`

### Airports

#### GET /api/airports
Get all airports with optional search.

**Query Parameters:**
- \`search\` (string): Search by code, name, or city
- \`limit\` (number): Maximum results (default: 50)

#### POST /api/airports
Create a new airport.

### Weather

#### GET /api/weather
Get weather conditions.

**Query Parameters:**
- \`flightRouteId\` (string): Get weather for specific flight route
- \`latitude\` & \`longitude\` (number): Get weather for specific location
- \`radius\` (number): Search radius in km (default: 100)
- \`limit\` (number): Maximum results (default: 10)

#### POST /api/weather
Add weather condition data.

### External Data Integration

#### Aircraft Data API

#### POST /api/aircraft-data
Import aircraft data from your AircraftAPI clients.

**Single Record:**
\`\`\`json
{
  "registrationNumber": "N12345",
  "aircraftId": "AC001",
  "modelCode": "B737-800",
  "typeCode": "B738",
  "iataCode": "73H",
  "icaoCode": "B738",
  "icaoHexCode": "A12345",
  "manufacturingDetails": {
    "productionLine": "Boeing 737-800",
    "constructionNumber": "12345",
    "rolloutDate": "2020-01-15",
    "firstFlightDate": "2020-02-01",
    "deliveryDate": "2020-03-01",
    "registrationDate": "2020-03-15"
  },
  "airlineAssociation": {
    "iataAirlineCode": "AA",
    "airlineName": "American Airlines"
  },
  "technicalSpecs": {
    "enginesCount": 2,
    "engineType": "CFM56-7B",
    "maxSeats": 189,
    "range": 5765,
    "cruiseSpeed": 842
  },
  "currentStatus": {
    "planeAge": 4,
    "operationalStatus": "active",
    "lastSeen": "2024-01-15T10:30:00Z"
  }
}
\`\`\`

**Bulk Import:**
\`\`\`json
[
  {
    "registrationNumber": "N12345",
    // ... aircraft data
  },
  {
    "registrationNumber": "N67890",
    // ... aircraft data
  }
]
\`\`\`

#### GET /api/aircraft-data
Query aircraft data with filters.

**Query Parameters:**
- \`registrationNumber\` - Filter by registration number
- \`icaoHexCode\` - Filter by ICAO hex code
- \`airlineCode\` - Filter by airline IATA code
- \`aircraftType\` - Filter by aircraft type
- \`operationalStatus\` - Filter by operational status
- \`page\` - Page number (default: 1)
- \`limit\` - Items per page (default: 50)

#### Flight Data API

#### POST /api/flight-data
Import real-time flight data from your FlightsAPI clients.

**Single Record:**
\`\`\`json
{
  "flightNumber": "AA1234",
  "iataFlightNumber": "AA1234",
  "icaoFlightNumber": "AAL1234",
  "currentPosition": {
    "latitude": 40.6413,
    "longitude": -73.7781,
    "altitude": 35000,
    "heading": 270,
    "speed": 450
  },
  "departureDetails": {
    "airportCode": "JFK",
    "airportName": "John F. Kennedy International",
    "scheduledTime": "2024-01-15T14:30:00Z",
    "actualTime": "2024-01-15T14:35:00Z",
    "gate": "A12",
    "terminal": "8"
  },
  "arrivalDetails": {
    "airportCode": "LAX",
    "airportName": "Los Angeles International",
    "scheduledTime": "2024-01-15T20:30:00Z",
    "estimatedTime": "2024-01-15T20:25:00Z",
    "gate": "B15",
    "terminal": "4"
  },
  "aircraftDetails": {
    "registrationNumber": "N12345",
    "icaoCode": "B738",
    "aircraftType": "Boeing 737-800"
  },
  "airlineInfo": {
    "name": "American Airlines",
    "iataCode": "AA",
    "icaoCode": "AAL"
  },
  "flightStatus": "en-route",
  "isLive": true
}
\`\`\`

#### GET /api/flight-data
Query flight data with filters.

**Query Parameters:**
- \`flightNumber\` - Filter by flight number
- \`airlineCode\` - Filter by airline code
- \`departureAirport\` - Filter by departure airport
- \`arrivalAirport\` - Filter by arrival airport
- \`flightStatus\` - Filter by flight status
- \`isLive\` - Filter by live status (true/false)

#### Weather Data API

#### POST /api/weather-data
Import weather data from your WeatherAPI clients.

**Single Record:**
\`\`\`json
{
  "airportIdentification": {
    "icaoCode": "KJFK",
    "iataCode": "JFK",
    "airportName": "John F. Kennedy International",
    "coordinates": {
      "latitude": 40.6413,
      "longitude": -73.7781
    }
  },
  "metarReport": {
    "rawMetar": "KJFK 151251Z 27008KT 10SM FEW250 M03/M17 A3012 RMK AO2 SLP223 T10281172",
    "observationTime": "2024-01-15T12:51:00Z",
    "temperature": {
      "celsius": -3,
      "fahrenheit": 27
    },
    "windConditions": {
      "direction": 270,
      "speed": 8,
      "gusts": 12
    },
    "visibility": {
      "miles": 10,
      "meters": 16093
    },
    "atmosphericPressure": {
      "inHg": 30.12,
      "hPa": 1020.1,
      "mb": 1020.1
    },
    "humidity": 65,
    "weatherConditions": ["clear"],
    "cloudCover": "FEW250",
    "weatherCategory": "VFR"
  },
  "tafForecast": {
    "rawTaf": "KJFK 151120Z 1512/1618 27008KT P6SM FEW250",
    "validFrom": "2024-01-15T12:00:00Z",
    "validTo": "2024-01-16T18:00:00Z",
    "temperatureRange": {
      "min": -5,
      "max": 2
    },
    "windForecast": {
      "direction": 270,
      "speed": 8
    },
    "visibilityForecast": 10,
    "conditionPredictions": ["clear", "few clouds"]
  }
}
\`\`\`

#### Sustainability Data API

#### POST /api/sustainability-data
Import sustainability metrics from your SustainabilityAPI clients.

**Single Record:**
\`\`\`json
{
  "flightId": "flight-uuid",
  "aircraftId": "aircraft-uuid",
  "routeId": "route-uuid",
  "emissionsCalculation": {
    "totalCO2": 18450.5,
    "co2PerKm": 7.45,
    "co2PerSeat": 97.6,
    "calculationStandard": "ICAO"
  },
  "fuelConsumption": {
    "totalFuel": 7200.0,
    "fuelPerKm": 2.91,
    "fuelPerSeat": 38.1,
    "fuelType": "Jet A-1"
  },
  "efficiencyScores": {
    "aircraftEfficiency": 85.2,
    "routeEfficiency": 92.1,
    "overallScore": 88.7
  },
  "environmentalImpact": {
    "carbonFootprint": 18450.5,
    "noiseImpact": 75.3,
    "airQualityImpact": 68.9
  },
  "sustainabilityMetrics": {
    "biofuelPercentage": 5.0,
    "offsetPrograms": ["Carbon Trust", "Gold Standard"],
    "certifications": ["IATA Environmental Assessment"]
  }
}
\`\`\`

#### Geopolitical Risk Data API

#### POST /api/geopolitical-risk-data
Import geopolitical risk assessments from your GeopoliticalAPI clients.

**Single Record:**
\`\`\`json
{
  "countryCode": "USA",
  "countryName": "United States",
  "riskAssessment": {
    "overallRiskScore": 2.1,
    "riskLevel": "low",
    "riskFactors": {
      "political": 2.0,
      "economic": 1.8,
      "security": 2.5,
      "social": 2.1
    },
    "stabilityScore": 8.7
  },
  "riskTrends": {
    "currentTrend": "stable",
    "thirtyDayForecast": 2.0,
    "historicalTrend": [2.2, 2.1, 2.0, 1.9, 2.1]
  },
  "intelligenceData": {
    "currentAlerts": [],
    "warnings": [],
    "riskDescriptions": ["Low political risk", "Stable economic conditions"],
    "sources": ["State Department", "CIA World Factbook"],
    "lastUpdated": "2024-01-15T10:00:00Z"
  },
  "globalIndices": {
    "gprIndex": 2.1,
    "regionalComparison": 1.8,
    "globalRanking": 15
  }
}
\`\`\`

## 💻 Frontend Integration

### Using the API Client

The application includes a pre-built API client for easy integration:

\`\`\`typescript
import { apiClient } from '@/lib/api-client'

// Get flights with filters
const flights = await apiClient.getFlights({
  altitude: 35000,
  status: 'active'
}, {
  page: 1,
  limit: 10
})

// Create a new flight
const newFlight = await apiClient.createFlight({
  flightNumber: 'AA1234',
  departureAirportId: 'airport-uuid',
  arrivalAirportId: 'airport-uuid',
  aircraftId: 'aircraft-uuid',
  altitude: 35000,
  passengers: 180
})

// Optimize a route
const optimization = await apiClient.optimizeRoute({
  flightRouteId: 'flight-uuid',
  criteria: 'fuel',
  constraints: {
    avoidTurbulence: true,
    avoidStorms: true
  }
})
\`\`\`

### Custom API Integration

For custom integrations, use standard HTTP requests:

\`\`\`javascript
// Fetch flights
const response = await fetch('/api/flights?altitude=35000')
const data = await response.json()

// Create flight
const response = await fetch('/api/flights', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    flightNumber: 'AA1234',
    // ... other flight data
  })
})
\`\`\`

### Frontend Integration with External APIs

### Using the Enhanced API Client

\`\`\`typescript
import { apiClient } from '@/lib/api-client'

// Import aircraft data from your existing API clients
const aircraftData = await yourAircraftAPI.getAllAircraft()
const importResult = await apiClient.createAircraftData(aircraftData)

// Import flight data
const flightData = await yourFlightsAPI.getCurrentFlights()
await apiClient.createFlightData(flightData)

// Import weather data
const weatherData = await yourWeatherAPI.getAirportWeather('KJFK')
await apiClient.createWeatherData(weatherData)

// Import sustainability data
const sustainabilityData = await yourSustainabilityAPI.getFlightEmissions(flightId)
await apiClient.createSustainabilityData(sustainabilityData)

// Import geopolitical risk data
const riskData = await yourGeopoliticalAPI.getCountryRisk('USA')
await apiClient.createGeopoliticalRiskData(riskData)

// Query imported data
const aircraftResults = await apiClient.getAircraftData({
  airlineCode: 'AA',
  operationalStatus: 'active'
})

const flightResults = await apiClient.getFlightData({
  departureAirport: 'JFK',
  isLive: true
})
\`\`\`

### Bulk Import with Status Tracking

\`\`\`typescript
// Bulk import with progress tracking
const bulkAircraftData = await yourAircraftAPI.getAllAircraft()
const importResult = await apiClient.createAircraftData(bulkAircraftData)

if (importResult.success && importResult.data.importId) {
  // Track import progress
  const checkStatus = async () => {
    const status = await apiClient.getBulkImportStatus(importResult.data.importId)
    console.log(\`Import status: \${status.data.status}\`)
    console.log(\`Progress: \${status.data.successfulImports}/\${status.data.totalRecords}\`)
    
    if (status.data.status === 'processing') {
      setTimeout(checkStatus, 5000) // Check again in 5 seconds
    }
  }
  
  checkStatus()
}
\`\`\`

## 🔄 Data Synchronization Strategy

### Real-time Data Updates

\`\`\`typescript
// Example synchronization service
class DataSyncService {
  async syncAircraftData() {
    try {
      const latestData = await yourAircraftAPI.getUpdatedAircraft()
      await apiClient.createAircraftData(latestData)
      console.log('Aircraft data synchronized')
    } catch (error) {
      console.error('Aircraft sync failed:', error)
    }
  }

  async syncFlightData() {
    try {
      const liveFlights = await yourFlightsAPI.getLiveFlights()
      await apiClient.createFlightData(liveFlights)
      console.log('Flight data synchronized')
    } catch (error) {
      console.error('Flight sync failed:', error)
    }
  }

  async syncWeatherData() {
    try {
      const majorAirports = ['KJFK', 'KLAX', 'KORD', 'KATL']
      const weatherPromises = majorAirports.map(async (icao) => {
        const weather = await yourWeatherAPI.getAirportWeather(icao)
        return apiClient.createWeatherData(weather)
      })
      
      await Promise.all(weatherPromises)
      console.log('Weather data synchronized')
    } catch (error) {
      console.error('Weather sync failed:', error)
    }
  }

  // Schedule regular synchronization
  startSync() {
    // Sync aircraft data every hour
    setInterval(() => this.syncAircraftData(), 60 * 60 * 1000)
    
    // Sync flight data every 5 minutes
    setInterval(() => this.syncFlightData(), 5 * 60 * 1000)
    
    // Sync weather data every 15 minutes
    setInterval(() => this.syncWeatherData(), 15 * 60 * 1000)
  }
}

const syncService = new DataSyncService()
syncService.startSync()
\`\`\`

## 🚀 Deployment

### Environment Variables for Production

\`\`\`env
# Database
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=flight_optimizer
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# API Configuration
NEXT_PUBLIC_API_URL=https://your-domain.com/api
API_SECRET_KEY=your-production-secret-key

# External API Keys
AIRCRAFT_API_KEY=your-aircraft-api-key
FLIGHTS_API_KEY=your-flights-api-key
WEATHER_API_KEY=your-weather-api-key
SUSTAINABILITY_API_KEY=your-sustainability-api-key
GEOPOLITICAL_API_KEY=your-geopolitical-api-key

# Optional: Caching (SQLite for local, Redis for production)
CACHE_TYPE=redis
REDIS_URL=redis://your-redis-instance
\`\`\`

### Database Choice: PostgreSQL vs SQLite

**PostgreSQL (Recommended for Production):**
- Better performance for large datasets
- Advanced indexing and query optimization
- Concurrent access support
- Full ACID compliance

**SQLite (Good for Development/Small Deployments):**
- No server setup required
- Single file database
- Perfect for development and testing
- Automatic setup

To switch between databases, update your \`lib/database.ts\` file:

\`\`\`typescript
// For SQLite
import Database from 'better-sqlite3'

const db = new Database(process.env.SQLITE_PATH || './data/flight_optimizer.db')

// For PostgreSQL
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})
\`\`\`

## 📈 Performance Optimization

### Database Indexing

\`\`\`sql
-- Flight routes indexes
CREATE INDEX idx_flight_routes_altitude ON flight_routes(altitude);
CREATE INDEX idx_flight_routes_status ON flight_routes(status);
CREATE INDEX idx_flight_routes_departure_time ON flight_routes(departure_time);

-- Waypoints indexes
CREATE INDEX idx_waypoints_flight_route_id ON waypoints(flight_route_id);
CREATE INDEX idx_waypoints_sequence ON waypoints(flight_route_id, sequence);

-- Weather conditions indexes
CREATE INDEX idx_weather_conditions_location ON weather_conditions(latitude, longitude);
CREATE INDEX idx_weather_conditions_timestamp ON weather_conditions(timestamp);
CREATE INDEX idx_weather_conditions_category ON weather_conditions(weather_category);
\`\`\`

### Database Indexing for External Data

\`\`\`sql
-- Aircraft data indexes
CREATE INDEX idx_aircraft_data_registration ON aircraft_data(registration_number);
CREATE INDEX idx_aircraft_data_airline ON aircraft_data(iata_airline_code);
CREATE INDEX idx_aircraft_data_type ON aircraft_data(type_code);
CREATE INDEX idx_aircraft_data_status ON aircraft_data(operational_status);

-- Flight data indexes
CREATE INDEX idx_flight_data_number ON flight_data(flight_number);
CREATE INDEX idx_flight_data_route ON flight_data(departure_airport_code, arrival_airport_code);
CREATE INDEX idx_flight_data_status ON flight_data(flight_status);
CREATE INDEX idx_flight_data_live ON flight_data(is_live);
CREATE INDEX idx_flight_data_time ON flight_data(departure_scheduled_time);

-- Weather data indexes
CREATE INDEX idx_weather_data_icao ON weather_data(icao_code);
CREATE INDEX idx_weather_data_time ON weather_data(observation_time);
CREATE INDEX idx_weather_data_category ON weather_data(weather_category);

-- Sustainability data indexes
CREATE INDEX idx_sustainability_flight ON sustainability_data(flight_id);
CREATE INDEX idx_sustainability_aircraft ON sustainability_data(aircraft_id);
CREATE INDEX idx_sustainability_score ON sustainability_data(overall_score);

-- Geopolitical risk data indexes
CREATE INDEX idx_geopolitical_country ON geopolitical_risk_data(country_code);
CREATE INDEX idx_geopolitical_risk_level ON geopolitical_risk_data(risk_level);
CREATE INDEX idx_geopolitical_score ON geopolitical_risk_data(overall_risk_score);
\`\`\`

### Caching Strategy

\`\`\`typescript
// lib/cache.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getCachedData(key: string) {
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

export async function setCachedData(key: string, data: any, ttl: number = 300) {
  await redis.setex(key, ttl, JSON.stringify(data))
}
\`\`\`

### Caching Strategy for External Data

\`\`\`typescript
// lib/cache.ts
class CacheService {
  private cache = new Map()
  private ttl = new Map()

  set(key: string, value: any, ttlSeconds: number = 300) {
    this.cache.set(key, value)
    this.ttl.set(key, Date.now() + (ttlSeconds * 1000))
  }

  get(key: string) {
    const expiry = this.ttl.get(key)
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key)
      this.ttl.delete(key)
      return null
    }
    return this.cache.get(key)
  }

  // Cache aircraft data for 1 hour
  async getCachedAircraftData(registrationNumber: string) {
    const cacheKey = \`aircraft:\${registrationNumber}\`
    let data = this.get(cacheKey)
    
    if (!data) {
      data = await apiClient.getAircraftData({ registrationNumber })
      this.set(cacheKey, data, 3600) // 1 hour
    }
    
    return data
  }

  // Cache weather data for 15 minutes
  async getCachedWeatherData(icaoCode: string) {
    const cacheKey = \`weather:\${icaoCode}\`
    let data = this.get(cacheKey)
    
    if (!data) {
      data = await apiClient.getWeatherData({ icaoCode })
      this.set(cacheKey, data, 900) // 15 minutes
    }
    
    return data
  }
}

export const cacheService = new CacheService()
\`\`\`

## 🔒 Security

### API Authentication

\`\`\`typescript
// middleware/auth.ts
import { NextRequest } from 'next/server'

export function authenticateRequest(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    throw new Error('Unauthorized')
  }
}
\`\`\`

### Input Validation

\`\`\`typescript
// lib/validation.ts
import { z } from 'zod'

export const flightRouteSchema = z.object({
  flightNumber: z.string().min(1).max(20),
  altitude: z.number().min(1000).max(50000),
  passengers: z.number().min(1).max(1000),
  // ... other validations
})
\`\`\`

### API Rate Limiting

\`\`\`typescript
// lib/rate-limit.ts
class RateLimiter {
  private requests = new Map()

  isAllowed(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [])
    }
    
    const userRequests = this.requests.get(identifier)
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter((time: number) => time > windowStart)
    
    if (validRequests.length >= maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }
}

export const rateLimiter = new RateLimiter()

// Usage in API routes
export async function POST(request: NextRequest) {
  const clientIP = request.ip || 'unknown'
  
  if (!rateLimiter.isAllowed(clientIP, 100, 60000)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  // Continue with request processing...
}
\`\`\`

## 🧪 Testing

### API Testing Examples

\`\`\`typescript
// __tests__/api/aircraft-data.test.ts
import { POST, GET } from '@/app/api/aircraft-data/route'
import { NextRequest } from 'next/server'

describe('/api/aircraft-data', () => {
  test('POST creates aircraft data', async () => {
    const aircraftData = {
      registrationNumber: 'N12345',
      modelCode: 'B737-800',
      typeCode: 'B738',
      technicalSpecs: {
        enginesCount: 2,
        engineType: 'CFM56-7B',
        maxSeats: 189,
        range: 5765,
        cruiseSpeed: 842
      }
    }

    const request = new NextRequest('http://localhost:3000/api/aircraft-data', {
      method: 'POST',
      body: JSON.stringify(aircraftData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.registration_number).toBe('N12345')
  })

  test('GET filters aircraft data', async () => {
    const request = new NextRequest('http://localhost:3000/api/aircraft-data?airlineCode=AA')
    const response = await GET(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('POST handles bulk import', async () => {
    const bulkData = [
      { registrationNumber: 'N11111', modelCode: 'B737-800' },
      { registrationNumber: 'N22222', modelCode: 'A320-200' }
    ]

    const request = new NextRequest('http://localhost:3000/api/aircraft-data', {
      method: 'POST',
      body: JSON.stringify(bulkData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.totalRecords).toBe(2)
  })
})
\`\`\`

## 📚 Integration Examples

### Complete Data Pipeline Example

\`\`\`typescript
// services/data-pipeline.ts
class DataPipelineService {
  async runFullSync() {
    console.log('Starting full data synchronization...')

    try {
      // 1. Sync aircraft data
      console.log('Syncing aircraft data...')
      const aircraftData = await this.fetchAircraftData()
      const aircraftResult = await apiClient.createAircraftData(aircraftData)
      console.log(\`Aircraft sync: \${aircraftResult.data.successfulImports} records\`)

      // 2. Sync flight data
      console.log('Syncing flight data...')
      const flightData = await this.fetchFlightData()
      const flightResult = await apiClient.createFlightData(flightData)
      console.log(\`Flight sync: \${flightResult.data.successfulImports} records\`)

      // 3. Sync weather data
      console.log('Syncing weather data...')
      const weatherData = await this.fetchWeatherData()
      const weatherResult = await apiClient.createWeatherData(weatherData)
      console.log(\`Weather sync: \${weatherResult.data.successfulImports} records\`)

      // 4. Sync sustainability data
      console.log('Syncing sustainability data...')
      const sustainabilityData = await this.fetchSustainabilityData()
      const sustainabilityResult = await apiClient.createSustainabilityData(sustainabilityData)
      console.log(\`Sustainability sync: \${sustainabilityResult.data.successfulImports} records\`)

      // 5. Sync geopolitical risk data
      console.log('Syncing geopolitical risk data...')
      const riskData = await this.fetchGeopoliticalRiskData()
      const riskResult = await apiClient.createGeopoliticalRiskData(riskData)
      console.log(\`Risk sync: \${riskResult.data.successfulImports} records\`)

      console.log('Full synchronization completed successfully!')

    } catch (error) {
      console.error('Synchronization failed:', error)
      throw error
    }
  }

  private async fetchAircraftData() {
    // Replace with your actual AircraftAPI client calls
    return await yourAircraftAPI.getAllAircraft()
  }

  private async fetchFlightData() {
    // Replace with your actual FlightsAPI client calls
    return await yourFlightsAPI.getCurrentFlights()
  }

  private async fetchWeatherData() {
    // Replace with your actual WeatherAPI client calls
    const airports = ['KJFK', 'KLAX', 'KORD', 'KATL', 'KDFW']
    const weatherPromises = airports.map(icao => yourWeatherAPI.getAirportWeather(icao))
    return await Promise.all(weatherPromises)
  }

  private async fetchSustainabilityData() {
    // Replace with your actual SustainabilityAPI client calls
    return await yourSustainabilityAPI.getAllFlightEmissions()
  }

  private async fetchGeopoliticalRiskData() {
    // Replace with your actual GeopoliticalAPI client calls
    const countries = ['USA', 'CAN', 'GBR', 'FRA', 'DEU', 'JPN', 'AUS']
    const riskPromises = countries.map(code => yourGeopoliticalAPI.getCountryRisk(code))
    return await Promise.all(riskPromises)
  }
}

// Usage
const pipeline = new DataPipelineService()
await pipeline.runFullSync()
\`\`\`

### Scheduled Data Updates

\`\`\`typescript
// services/scheduler.ts
import cron from 'node-cron'

class SchedulerService {
  start() {
    // Run full sync daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running daily full sync...')
      const pipeline = new DataPipelineService()
      await pipeline.runFullSync()
    })

    // Update flight data every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      console.log('Updating flight data...')
      const flightData = await yourFlightsAPI.getCurrentFlights()
      await apiClient.createFlightData(flightData)
    })

    // Update weather data every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('Updating weather data...')
      const majorAirports = ['KJFK', 'KLAX', 'KORD', 'KATL']
      const weatherPromises = majorAirports.map(icao => 
        yourWeatherAPI.getAirportWeather(icao)
      )
      const weatherData = await Promise.all(weatherPromises)
      await apiClient.createWeatherData(weatherData)
    })

    console.log('Scheduler started successfully')
  }
}

export const scheduler = new SchedulerService()
\`\`\`

## 🆘 Troubleshooting

### Common Integration Issues

#### 1. Data Format Mismatches
\`\`\`typescript
// Transform your API data to match our schema
function transformAircraftData(externalData: any) {
  return {
    registrationNumber: externalData.reg_number || externalData.registration,
    aircraftId: externalData.aircraft_id || externalData.id,
    modelCode: externalData.model || externalData.aircraft_model,
    // ... other transformations
  }
}
\`\`\`

#### 2. Rate Limiting from External APIs
\`\`\`typescript
// Implement retry logic with exponential backoff
async function fetchWithRetry(apiCall: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      const delay = Math.pow(2, i) * 1000 // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
\`\`\`

#### 3. Large Dataset Imports
\`\`\`typescript
// Process large datasets in chunks
async function processInChunks<T>(data: T[], chunkSize: number, processor: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    await processor(chunk)
    
    // Add delay between chunks to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// Usage
const largeDataset = await yourAPI.getAllData()
await processInChunks(largeDataset, 100, async (chunk) => {
  await apiClient.createAircraftData(chunk)
})
\`\`\`

## 📞 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue for bugs or feature requests
- **API Integration**: Contact support for help integrating your existing API clients
- **Email**: support@flightpath-optimizer.com

### Data Integration Support

When requesting help with data integration, please provide:

1. **API Documentation** for your external data sources
2. **Sample Data** (sanitized) from your APIs
3. **Expected Data Volume** (records per day/hour)
4. **Update Frequency** requirements
5. **Data Transformation** needs

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** for the excellent React framework
- **PostgreSQL/SQLite** for robust database capabilities
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for beautiful UI components
- **Your existing API clients** for providing comprehensive aviation data

---

**Ready for Takeoff! ✈️**

Your existing API clients can now seamlessly integrate with the FlightPath Optimizer backend. The system is designed to handle high-volume data imports while maintaining performance and data integrity.

For more information, visit our [documentation site](https://docs.flightpath-optimizer.com) or contact our integration support team.
