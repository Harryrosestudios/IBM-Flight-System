import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { AircraftData, ApiResponse, BulkImportResult } from "@/lib/types"

// GET /api/aircraft-data - Get aircraft data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const registrationNumber = searchParams.get("registrationNumber")
    const icaoHexCode = searchParams.get("icaoHexCode")
    const airlineCode = searchParams.get("airlineCode")
    const aircraftType = searchParams.get("aircraftType")
    const operationalStatus = searchParams.get("operationalStatus")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let whereClause = "WHERE 1=1"
    const queryParams: any[] = []
    let paramIndex = 1

    if (registrationNumber) {
      whereClause += ` AND registration_number ILIKE $${paramIndex}`
      queryParams.push(`%${registrationNumber}%`)
      paramIndex++
    }

    if (icaoHexCode) {
      whereClause += ` AND icao_hex_code = $${paramIndex}`
      queryParams.push(icaoHexCode)
      paramIndex++
    }

    if (airlineCode) {
      whereClause += ` AND iata_airline_code = $${paramIndex}`
      queryParams.push(airlineCode)
      paramIndex++
    }

    if (aircraftType) {
      whereClause += ` AND type_code ILIKE $${paramIndex}`
      queryParams.push(`%${aircraftType}%`)
      paramIndex++
    }

    if (operationalStatus) {
      whereClause += ` AND operational_status = $${paramIndex}`
      queryParams.push(operationalStatus)
      paramIndex++
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM aircraft_data ${whereClause}`
    const countResult = await db.query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0]?.total || "0")

    // Get paginated results
    const offset = (page - 1) * limit
    const dataQuery = `
      SELECT * FROM aircraft_data 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const dataResult = await db.query(dataQuery, queryParams)

    const response: ApiResponse<AircraftData[]> = {
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
    console.error("Error fetching aircraft data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch aircraft data" }, { status: 500 })
  }
}

// POST /api/aircraft-data - Create or bulk import aircraft data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a bulk import
    if (Array.isArray(body)) {
      return await handleBulkImport(body)
    }

    // Single aircraft data creation
    const {
      registrationNumber,
      aircraftId,
      modelCode,
      typeCode,
      iataCode,
      icaoCode,
      icaoHexCode,
      manufacturingDetails,
      airlineAssociation,
      technicalSpecs,
      currentStatus,
    } = body

    if (!registrationNumber) {
      return NextResponse.json({ success: false, error: "Registration number is required" }, { status: 400 })
    }

    const query = `
      INSERT INTO aircraft_data (
        registration_number, aircraft_id, model_code, type_code, iata_code, icao_code, icao_hex_code,
        production_line, construction_number, rollout_date, first_flight_date, delivery_date, registration_date,
        iata_airline_code, airline_name, engines_count, engine_type, max_seats, range_km, cruise_speed_kmh,
        plane_age, operational_status, last_seen
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `

    const result = await db.query(query, [
      registrationNumber,
      aircraftId,
      modelCode,
      typeCode,
      iataCode,
      icaoCode,
      icaoHexCode,
      manufacturingDetails?.productionLine,
      manufacturingDetails?.constructionNumber,
      manufacturingDetails?.rolloutDate,
      manufacturingDetails?.firstFlightDate,
      manufacturingDetails?.deliveryDate,
      manufacturingDetails?.registrationDate,
      airlineAssociation?.iataAirlineCode,
      airlineAssociation?.airlineName,
      technicalSpecs?.enginesCount,
      technicalSpecs?.engineType,
      technicalSpecs?.maxSeats,
      technicalSpecs?.range,
      technicalSpecs?.cruiseSpeed,
      currentStatus?.planeAge,
      currentStatus?.operationalStatus,
      currentStatus?.lastSeen,
    ])

    const response: ApiResponse<AircraftData> = {
      success: true,
      data: result.rows[0],
      message: "Aircraft data created successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating aircraft data:", error)
    return NextResponse.json({ success: false, error: "Failed to create aircraft data" }, { status: 500 })
  }
}

async function handleBulkImport(aircraftDataArray: any[]): Promise<NextResponse> {
  const importId = crypto.randomUUID()
  let successfulImports = 0
  let failedImports = 0
  const errors: string[] = []

  try {
    // Create bulk import record
    await db.query(
      `INSERT INTO bulk_imports (id, import_type, total_records, successful_imports, failed_imports, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [importId, "aircraft_data", aircraftDataArray.length, 0, 0, "processing"],
    )

    // Process each aircraft data record
    for (const [index, aircraftData] of aircraftDataArray.entries()) {
      try {
        const {
          registrationNumber,
          aircraftId,
          modelCode,
          typeCode,
          iataCode,
          icaoCode,
          icaoHexCode,
          manufacturingDetails,
          airlineAssociation,
          technicalSpecs,
          currentStatus,
        } = aircraftData

        if (!registrationNumber) {
          throw new Error("Registration number is required")
        }

        await db.query(
          `INSERT INTO aircraft_data (
            registration_number, aircraft_id, model_code, type_code, iata_code, icao_code, icao_hex_code,
            production_line, construction_number, rollout_date, first_flight_date, delivery_date, registration_date,
            iata_airline_code, airline_name, engines_count, engine_type, max_seats, range_km, cruise_speed_kmh,
            plane_age, operational_status, last_seen
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (registration_number) DO UPDATE SET
            aircraft_id = EXCLUDED.aircraft_id,
            model_code = EXCLUDED.model_code,
            updated_at = CURRENT_TIMESTAMP`,
          [
            registrationNumber,
            aircraftId,
            modelCode,
            typeCode,
            iataCode,
            icaoCode,
            icaoHexCode,
            manufacturingDetails?.productionLine,
            manufacturingDetails?.constructionNumber,
            manufacturingDetails?.rolloutDate,
            manufacturingDetails?.firstFlightDate,
            manufacturingDetails?.deliveryDate,
            manufacturingDetails?.registrationDate,
            airlineAssociation?.iataAirlineCode,
            airlineAssociation?.airlineName,
            technicalSpecs?.enginesCount,
            technicalSpecs?.engineType,
            technicalSpecs?.maxSeats,
            technicalSpecs?.range,
            technicalSpecs?.cruiseSpeed,
            currentStatus?.planeAge,
            currentStatus?.operationalStatus,
            currentStatus?.lastSeen,
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
      totalRecords: aircraftDataArray.length,
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
