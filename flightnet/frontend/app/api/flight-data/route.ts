import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { FlightData, ApiResponse, BulkImportResult } from "@/lib/types"

// GET /api/flight-data - Get flight data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const flightNumber = searchParams.get("flightNumber")
    const airlineCode = searchParams.get("airlineCode")
    const departureAirport = searchParams.get("departureAirport")
    const arrivalAirport = searchParams.get("arrivalAirport")
    const flightStatus = searchParams.get("flightStatus")
    const isLive = searchParams.get("isLive")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let whereClause = "WHERE 1=1"
    const queryParams: any[] = []
    let paramIndex = 1

    if (flightNumber) {
      whereClause += ` AND (flight_number ILIKE $${paramIndex} OR iata_flight_number ILIKE $${paramIndex} OR icao_flight_number ILIKE $${paramIndex})`
      queryParams.push(`%${flightNumber}%`)
      paramIndex++
    }

    if (airlineCode) {
      whereClause += ` AND (airline_iata_code = $${paramIndex} OR airline_icao_code = $${paramIndex})`
      queryParams.push(airlineCode)
      paramIndex++
    }

    if (departureAirport) {
      whereClause += ` AND departure_airport_code = $${paramIndex}`
      queryParams.push(departureAirport)
      paramIndex++
    }

    if (arrivalAirport) {
      whereClause += ` AND arrival_airport_code = $${paramIndex}`
      queryParams.push(arrivalAirport)
      paramIndex++
    }

    if (flightStatus) {
      whereClause += ` AND flight_status = $${paramIndex}`
      queryParams.push(flightStatus)
      paramIndex++
    }

    if (isLive !== null) {
      whereClause += ` AND is_live = $${paramIndex}`
      queryParams.push(isLive === "true")
      paramIndex++
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM flight_data ${whereClause}`
    const countResult = await db.query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0]?.total || "0")

    // Get paginated results
    const offset = (page - 1) * limit
    const dataQuery = `
      SELECT * FROM flight_data 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const dataResult = await db.query(dataQuery, queryParams)

    const response: ApiResponse<FlightData[]> = {
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching flight data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch flight data" }, { status: 500 })
  }
}

// POST /api/flight-data - Create or bulk import flight data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a bulk import
    if (Array.isArray(body)) {
      return await handleBulkImport(body)
    }

    // Single flight data creation
    const {
      flightNumber,
      iataFlightNumber,
      icaoFlightNumber,
      currentPosition,
      departureDetails,
      arrivalDetails,
      aircraftDetails,
      airlineInfo,
      flightStatus,
      isLive,
    } = body

    if (!flightNumber) {
      return NextResponse.json({ success: false, error: "Flight number is required" }, { status: 400 })
    }

    const query = `
      INSERT INTO flight_data (
        flight_number, iata_flight_number, icao_flight_number,
        current_latitude, current_longitude, current_altitude, heading, speed,
        departure_airport_code, departure_airport_name, departure_scheduled_time, departure_actual_time, departure_gate, departure_terminal,
        arrival_airport_code, arrival_airport_name, arrival_scheduled_time, arrival_estimated_time, arrival_actual_time, arrival_gate, arrival_terminal,
        aircraft_registration, aircraft_icao_code, aircraft_type,
        airline_name, airline_iata_code, airline_icao_code,
        flight_status, is_live
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
      RETURNING *
    `

    const result = await db.query(query, [
      flightNumber,
      iataFlightNumber,
      icaoFlightNumber,
      currentPosition?.latitude,
      currentPosition?.longitude,
      currentPosition?.altitude,
      currentPosition?.heading,
      currentPosition?.speed,
      departureDetails?.airportCode,
      departureDetails?.airportName,
      departureDetails?.scheduledTime,
      departureDetails?.actualTime,
      departureDetails?.gate,
      departureDetails?.terminal,
      arrivalDetails?.airportCode,
      arrivalDetails?.airportName,
      arrivalDetails?.scheduledTime,
      arrivalDetails?.estimatedTime,
      arrivalDetails?.actualTime,
      arrivalDetails?.gate,
      arrivalDetails?.terminal,
      aircraftDetails?.registrationNumber,
      aircraftDetails?.icaoCode,
      aircraftDetails?.aircraftType,
      airlineInfo?.name,
      airlineInfo?.iataCode,
      airlineInfo?.icaoCode,
      flightStatus,
      isLive,
    ])

    const response: ApiResponse<FlightData> = {
      success: true,
      data: result.rows[0],
      message: "Flight data created successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating flight data:", error)
    return NextResponse.json({ success: false, error: "Failed to create flight data" }, { status: 500 })
  }
}

async function handleBulkImport(flightDataArray: any[]): Promise<NextResponse> {
  const importId = crypto.randomUUID()
  let successfulImports = 0
  let failedImports = 0
  const errors: string[] = []

  try {
    // Create bulk import record
    await db.query(
      `INSERT INTO bulk_imports (id, import_type, total_records, successful_imports, failed_imports, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [importId, "flight_data", flightDataArray.length, 0, 0, "processing"],
    )

    // Process each flight data record
    for (const [index, flightData] of flightDataArray.entries()) {
      try {
        const {
          flightNumber,
          iataFlightNumber,
          icaoFlightNumber,
          currentPosition,
          departureDetails,
          arrivalDetails,
          aircraftDetails,
          airlineInfo,
          flightStatus,
          isLive,
        } = flightData

        if (!flightNumber) {
          throw new Error("Flight number is required")
        }

        await db.query(
          `INSERT INTO flight_data (
            flight_number, iata_flight_number, icao_flight_number,
            current_latitude, current_longitude, current_altitude, heading, speed,
            departure_airport_code, departure_airport_name, departure_scheduled_time, departure_actual_time, departure_gate, departure_terminal,
            arrival_airport_code, arrival_airport_name, arrival_scheduled_time, arrival_estimated_time, arrival_actual_time, arrival_gate, arrival_terminal,
            aircraft_registration, aircraft_icao_code, aircraft_type,
            airline_name, airline_iata_code, airline_icao_code,
            flight_status, is_live
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
          ON CONFLICT (flight_number, departure_scheduled_time) DO UPDATE SET
            current_latitude = EXCLUDED.current_latitude,
            current_longitude = EXCLUDED.current_longitude,
            flight_status = EXCLUDED.flight_status,
            updated_at = CURRENT_TIMESTAMP`,
          [
            flightNumber,
            iataFlightNumber,
            icaoFlightNumber,
            currentPosition?.latitude,
            currentPosition?.longitude,
            currentPosition?.altitude,
            currentPosition?.heading,
            currentPosition?.speed,
            departureDetails?.airportCode,
            departureDetails?.airportName,
            departureDetails?.scheduledTime,
            departureDetails?.actualTime,
            departureDetails?.gate,
            departureDetails?.terminal,
            arrivalDetails?.airportCode,
            arrivalDetails?.airportName,
            arrivalDetails?.scheduledTime,
            arrivalDetails?.estimatedTime,
            arrivalDetails?.actualTime,
            arrivalDetails?.gate,
            arrivalDetails?.terminal,
            aircraftDetails?.registrationNumber,
            aircraftDetails?.icaoCode,
            aircraftDetails?.aircraftType,
            airlineInfo?.name,
            airlineInfo?.iataCode,
            airlineInfo?.icaoCode,
            flightStatus,
            isLive,
          ],
        )

        successfulImports++
      } catch (error) {
        failedImports++
        errors.push(`Record ${index + 1}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    // Update bulk import record
    await db.query(
      `UPDATE bulk_imports 
       SET successful_imports = $1, failed_imports = $2, errors = $3, status = $4, completed_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [successfulImports, failedImports, errors, "completed", importId],
    )

    const result: BulkImportResult = {
      totalRecords: flightDataArray.length,
      successfulImports,
      failedImports,
      errors,
      importId,
      timestamp: new Date(),
    }

    const response: ApiResponse<BulkImportResult> = {
      success: true,
      data: result,
      message: `Bulk import completed: ${successfulImports} successful, ${failedImports} failed`,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error in bulk import:", error)
    return NextResponse.json({ success: false, error: "Bulk import failed" }, { status: 500 })
  }
}
