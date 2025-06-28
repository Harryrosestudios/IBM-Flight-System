// Database connection and utilities
// Using SQLite for local development instead of Redis for caching

interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
}

class Database {
  private config: DatabaseConfig
  private connection: any = null

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  async connect() {
    // Mock connection - implement with your database driver
    console.log("Connecting to database...")
    this.connection = { connected: true }
    return this.connection
  }

  async disconnect() {
    if (this.connection) {
      console.log("Disconnecting from database...")
      this.connection = null
    }
  }

  async query(sql: string, params?: any[]) {
    // Mock query execution - implement with your database driver
    console.log("Executing query:", sql, params)
    return { rows: [], rowCount: 0 }
  }

  async transaction(callback: (trx: any) => Promise<any>) {
    // Mock transaction - implement with your database driver
    console.log("Starting transaction...")
    try {
      const result = await callback(this.connection)
      console.log("Transaction committed")
      return result
    } catch (error) {
      console.log("Transaction rolled back")
      throw error
    }
  }
}

// Database instance
export const db = new Database({
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "flight_optimizer",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
})

// Database initialization
export async function initializeDatabase() {
  await db.connect()

  // Create tables if they don't exist
  const createTablesSQL = `
    -- Airports table
    CREATE TABLE IF NOT EXISTS airports (
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

    -- Aircraft table
    CREATE TABLE IF NOT EXISTS aircraft (
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

    -- Aircraft data from external APIs
    CREATE TABLE IF NOT EXISTS aircraft_data (
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

    -- Flight data from external APIs
    CREATE TABLE IF NOT EXISTS flight_data (
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

    -- Weather data from external APIs
    CREATE TABLE IF NOT EXISTS weather_data (
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

    -- Sustainability data
    CREATE TABLE IF NOT EXISTS sustainability_data (
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

    -- Geopolitical risk data
    CREATE TABLE IF NOT EXISTS geopolitical_risk_data (
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

    -- Flight routes table
    CREATE TABLE IF NOT EXISTS flight_routes (
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

    -- Waypoints table
    CREATE TABLE IF NOT EXISTS waypoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      flight_route_id UUID REFERENCES flight_routes(id) ON DELETE CASCADE,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      altitude INTEGER NOT NULL,
      sequence INTEGER NOT NULL,
      estimated_time TIMESTAMP,
      fuel_remaining DECIMAL(10, 2)
    );

    -- Weather conditions table
    CREATE TABLE IF NOT EXISTS weather_conditions (
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

    -- Bulk import tracking
    CREATE TABLE IF NOT EXISTS bulk_imports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      import_type VARCHAR(50) NOT NULL,
      total_records INTEGER NOT NULL,
      successful_imports INTEGER NOT NULL,
      failed_imports INTEGER NOT NULL,
      errors TEXT[],
      status VARCHAR(20) DEFAULT 'processing',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );

    -- Indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_flight_routes_altitude ON flight_routes(altitude);
    CREATE INDEX IF NOT EXISTS idx_flight_routes_status ON flight_routes(status);
    CREATE INDEX IF NOT EXISTS idx_flight_routes_departure_time ON flight_routes(departure_time);
    CREATE INDEX IF NOT EXISTS idx_waypoints_flight_route_id ON waypoints(flight_route_id);
    CREATE INDEX IF NOT EXISTS idx_weather_conditions_flight_route_id ON weather_conditions(flight_route_id);
    CREATE INDEX IF NOT EXISTS idx_aircraft_data_registration ON aircraft_data(registration_number);
    CREATE INDEX IF NOT EXISTS idx_flight_data_flight_number ON flight_data(flight_number);
    CREATE INDEX IF NOT EXISTS idx_weather_data_icao ON weather_data(icao_code);
    CREATE INDEX IF NOT EXISTS idx_geopolitical_risk_country ON geopolitical_risk_data(country_code);
    CREATE INDEX IF NOT EXISTS idx_sustainability_data_flight ON sustainability_data(flight_id);
  `

  await db.query(createTablesSQL)
  console.log("Database initialized successfully")
}
