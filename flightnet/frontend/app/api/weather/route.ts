import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { WeatherCondition, ApiResponse } from "@/lib/types"

// GET /api/weather - Get weather conditions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const flightRouteId = searchParams.get("flightRouteId")
    const latitude = searchParams.get("latitude")
    const longitude = searchParams.get("longitude")
    const radius = Number.parseFloat(searchParams.get("radius") || "100") // km
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    let query = "SELECT * FROM weather_conditions WHERE 1=1"
    const queryParams: any[] = []
    let paramIndex = 1

    if (flightRouteId) {
      query += ` AND flight_route_id = $${paramIndex}`
      queryParams.push(flightRouteId)
      paramIndex++
    }

    if (latitude && longitude) {
      // Use Haversine formula for distance calculation
      query += ` AND (
        6371 * acos(
          cos(radians($${paramIndex})) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($${paramIndex + 1})) + 
          sin(radians($${paramIndex})) * sin(radians(latitude))
        )
      ) <= $${paramIndex + 2}`
      queryParams.push(Number.parseFloat(latitude), Number.parseFloat(longitude), radius)
      paramIndex += 3
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`
    queryParams.push(limit)

    const result = await db.query(query, queryParams)

    const response: ApiResponse<WeatherCondition[]> = {
      success: true,
      data: result.rows,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching weather data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch weather data" }, { status: 500 })
  }
}

// POST /api/weather - Add weather condition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      flightRouteId,
      latitude,
      longitude,
      altitude,
      windSpeed,
      windDirection,
      turbulenceLevel,
      temperature,
      pressure,
      visibility,
      precipitation,
      stormActivity,
    } = body

    // Validate required fields
    if (latitude === undefined || longitude === undefined || altitude === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: latitude, longitude, altitude" },
        { status: 400 },
      )
    }

    const query = `
      INSERT INTO weather_conditions (
        flight_route_id, latitude, longitude, altitude, wind_speed, wind_direction,
        turbulence_level, temperature, pressure, visibility, precipitation, storm_activity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `

    const result = await db.query(query, [
      flightRouteId || null,
      latitude,
      longitude,
      altitude,
      windSpeed || 0,
      windDirection || 0,
      turbulenceLevel || "none",
      temperature || 0,
      pressure || 1013.25,
      visibility || 10,
      precipitation || 0,
      stormActivity || false,
    ])

    const response: ApiResponse<WeatherCondition> = {
      success: true,
      data: result.rows[0],
      message: "Weather condition added successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error adding weather condition:", error)
    return NextResponse.json({ success: false, error: "Failed to add weather condition" }, { status: 500 })
  }
}
