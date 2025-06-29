import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { FlightRoute, FlightRouteFilters, PaginationParams, ApiResponse } from "@/lib/types"

// GET /api/flights - Get all flights with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const filters: FlightRouteFilters = {
      altitude: searchParams.get("altitude") ? Number.parseInt(searchParams.get("altitude")!) : undefined,
      altitudeRange:
        searchParams.get("minAltitude") && searchParams.get("maxAltitude")
          ? {
              min: Number.parseInt(searchParams.get("minAltitude")!),
              max: Number.parseInt(searchParams.get("maxAltitude")!),
            }
          : undefined,
      status: (searchParams.get("status") as FlightRoute["status"]) || undefined,
      departureAirport: searchParams.get("departureAirport") || undefined,
      arrivalAirport: searchParams.get("arrivalAirport") || undefined,
      aircraftType: searchParams.get("aircraftType") || undefined,
    }

    const pagination: PaginationParams = {
      page: Number.parseInt(searchParams.get("page") || "1"),
      limit: Number.parseInt(searchParams.get("limit") || "10"),
      sortBy: searchParams.get("sortBy") || "created_at",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    }

    // Build SQL query with filters
    let whereClause = "WHERE 1=1"
    const queryParams: any[] = []
    let paramIndex = 1

    if (filters.altitude) {
      whereClause += ` AND fr.altitude = $${paramIndex}`
      queryParams.push(filters.altitude)
      paramIndex++
    }

    if (filters.altitudeRange) {
      whereClause += ` AND fr.altitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`
      queryParams.push(filters.altitudeRange.min, filters.altitudeRange.max)
      paramIndex += 2
    }

    if (filters.status) {
      whereClause += ` AND fr.status = $${paramIndex}`
      queryParams.push(filters.status)
      paramIndex++
    }

    if (filters.departureAirport) {
      whereClause += ` AND da.code = $${paramIndex}`
      queryParams.push(filters.departureAirport)
      paramIndex++
    }

    if (filters.arrivalAirport) {
      whereClause += ` AND aa.code = $${paramIndex}`
      queryParams.push(filters.arrivalAirport)
      paramIndex++
    }

    if (filters.aircraftType) {
      whereClause += ` AND ac.type = $${paramIndex}`
      queryParams.push(filters.aircraftType)
      paramIndex++
    }

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM flight_routes fr
      LEFT JOIN airports da ON fr.departure_airport_id = da.id
      LEFT JOIN airports aa ON fr.arrival_airport_id = aa.id
      LEFT JOIN aircraft ac ON fr.aircraft_id = ac.id
      ${whereClause}
    `

    const countResult = await db.query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0]?.total || "0")

    // Get paginated results
    const offset = (pagination.page! - 1) * pagination.limit!
    const dataQuery = `
      SELECT 
        fr.*,
        da.code as departure_airport_code,
        da.name as departure_airport_name,
        da.city as departure_airport_city,
        aa.code as arrival_airport_code,
        aa.name as arrival_airport_name,
        aa.city as arrival_airport_city,
        ac.type as aircraft_type,
        ac.model as aircraft_model,
        ac.manufacturer as aircraft_manufacturer
      FROM flight_routes fr
      LEFT JOIN airports da ON fr.departure_airport_id = da.id
      LEFT JOIN airports aa ON fr.arrival_airport_id = aa.id
      LEFT JOIN aircraft ac ON fr.aircraft_id = ac.id
      ${whereClause}
      ORDER BY fr.${pagination.sortBy} ${pagination.sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(pagination.limit, offset)
    const dataResult = await db.query(dataQuery, queryParams)

    const response: ApiResponse<FlightRoute[]> = {
      success: true,
      data: dataResult.rows,
      pagination: {
        page: pagination.page!,
        limit: pagination.limit!,
        total,
        totalPages: Math.ceil(total / pagination.limit!),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching flights:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch flights" }, { status: 500 })
  }
}

// POST /api/flights - Create a new flight route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      flightNumber,
      departureAirportId,
      arrivalAirportId,
      aircraftId,
      altitude,
      distance,
      estimatedFlightTime,
      fuelConsumption,
      cost,
      passengers,
      departureTime,
      arrivalTime,
      optimizationCriteria = "balanced",
      waypoints = [],
    } = body

    // Validate required fields
    if (!flightNumber || !departureAirportId || !arrivalAirportId || !aircraftId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Start transaction
    const result = await db.transaction(async (trx) => {
      // Insert flight route
      const flightRouteQuery = `
        INSERT INTO flight_routes (
          flight_number, departure_airport_id, arrival_airport_id, aircraft_id,
          altitude, distance, estimated_flight_time, fuel_consumption, cost,
          passengers, departure_time, arrival_time, optimization_criteria
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `

      const flightRouteResult = await db.query(flightRouteQuery, [
        flightNumber,
        departureAirportId,
        arrivalAirportId,
        aircraftId,
        altitude,
        distance,
        estimatedFlightTime,
        fuelConsumption,
        cost,
        passengers,
        departureTime,
        arrivalTime,
        optimizationCriteria,
      ])

      const flightRoute = flightRouteResult.rows[0]

      // Insert waypoints if provided
      if (waypoints.length > 0) {
        const waypointQueries = waypoints.map((waypoint: any, index: number) => {
          return db.query(
            `INSERT INTO waypoints (flight_route_id, latitude, longitude, altitude, sequence)
             VALUES ($1, $2, $3, $4, $5)`,
            [flightRoute.id, waypoint.latitude, waypoint.longitude, waypoint.altitude, index + 1],
          )
        })

        await Promise.all(waypointQueries)
      }

      return flightRoute
    })

    const response: ApiResponse<FlightRoute> = {
      success: true,
      data: result,
      message: "Flight route created successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating flight route:", error)
    return NextResponse.json({ success: false, error: "Failed to create flight route" }, { status: 500 })
  }
}
