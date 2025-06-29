import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { SustainabilityData, ApiResponse, BulkImportResult } from "@/lib/types"

// GET /api/sustainability-data - Get sustainability data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const flightId = searchParams.get("flightId")
    const aircraftId = searchParams.get("aircraftId")
    const routeId = searchParams.get("routeId")
    const calculationStandard = searchParams.get("calculationStandard")
    const minEfficiencyScore = searchParams.get("minEfficiencyScore")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let whereClause = "WHERE 1=1"
    const queryParams: any[] = []
    let paramIndex = 1

    if (flightId) {
      whereClause += ` AND flight_id = $${paramIndex}`
      queryParams.push(flightId)
      paramIndex++
    }

    if (aircraftId) {
      whereClause += ` AND aircraft_id = $${paramIndex}`
      queryParams.push(aircraftId)
      paramIndex++
    }

    if (routeId) {
      whereClause += ` AND route_id = $${paramIndex}`
      queryParams.push(routeId)
      paramIndex++
    }

    if (calculationStandard) {
      whereClause += ` AND calculation_standard = $${paramIndex}`
      queryParams.push(calculationStandard)
      paramIndex++
    }

    if (minEfficiencyScore) {
      whereClause += ` AND overall_score >= $${paramIndex}`
      queryParams.push(Number.parseFloat(minEfficiencyScore))
      paramIndex++
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM sustainability_data ${whereClause}`
    const countResult = await db.query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0]?.total || "0")

    // Get paginated results
    const offset = (page - 1) * limit
    const dataQuery = `
      SELECT * FROM sustainability_data 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const dataResult = await db.query(dataQuery, queryParams)

    const response: ApiResponse<SustainabilityData[]> = {
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
    console.error("Error fetching sustainability data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch sustainability data" }, { status: 500 })
  }
}

// POST /api/sustainability-data - Create or bulk import sustainability data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a bulk import
    if (Array.isArray(body)) {
      return await handleBulkImport(body)
    }

    // Single sustainability data creation
    const {
      flightId,
      aircraftId,
      routeId,
      emissionsCalculation,
      fuelConsumption,
      efficiencyScores,
      environmentalImpact,
      sustainabilityMetrics,
    } = body

    const query = `
      INSERT INTO sustainability_data (
        flight_id, aircraft_id, route_id,
        total_co2, co2_per_km, co2_per_seat, calculation_standard,
        total_fuel, fuel_per_km, fuel_per_seat, fuel_type,
        aircraft_efficiency, route_efficiency, overall_score,
        carbon_footprint, noise_impact, air_quality_impact,
        biofuel_percentage, offset_programs, certifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `

    const result = await db.query(query, [
      flightId,
      aircraftId,
      routeId,
      emissionsCalculation?.totalCO2,
      emissionsCalculation?.co2PerKm,
      emissionsCalculation?.co2PerSeat,
      emissionsCalculation?.calculationStandard,
      fuelConsumption?.totalFuel,
      fuelConsumption?.fuelPerKm,
      fuelConsumption?.fuelPerSeat,
      fuelConsumption?.fuelType,
      efficiencyScores?.aircraftEfficiency,
      efficiencyScores?.routeEfficiency,
      efficiencyScores?.overallScore,
      environmentalImpact?.carbonFootprint,
      environmentalImpact?.noiseImpact,
      environmentalImpact?.airQualityImpact,
      sustainabilityMetrics?.biofuelPercentage,
      sustainabilityMetrics?.offsetPrograms,
      sustainabilityMetrics?.certifications,
    ])

    const response: ApiResponse<SustainabilityData> = {
      success: true,
      data: result.rows[0],
      message: "Sustainability data created successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating sustainability data:", error)
    return NextResponse.json({ success: false, error: "Failed to create sustainability data" }, { status: 500 })
  }
}

async function handleBulkImport(sustainabilityDataArray: any[]): Promise<NextResponse> {
  const importId = crypto.randomUUID()
  let successfulImports = 0
  let failedImports = 0
  const errors: string[] = []

  try {
    // Create bulk import record
    await db.query(
      `INSERT INTO bulk_imports (id, import_type, total_records, successful_imports, failed_imports, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [importId, "sustainability_data", sustainabilityDataArray.length, 0, 0, "processing"],
    )

    // Process each sustainability data record
    for (const [index, sustainabilityData] of sustainabilityDataArray.entries()) {
      try {
        const {
          flightId,
          aircraftId,
          routeId,
          emissionsCalculation,
          fuelConsumption,
          efficiencyScores,
          environmentalImpact,
          sustainabilityMetrics,
        } = sustainabilityData

        await db.query(
          `INSERT INTO sustainability_data (
            flight_id, aircraft_id, route_id,
            total_co2, co2_per_km, co2_per_seat, calculation_standard,
            total_fuel, fuel_per_km, fuel_per_seat, fuel_type,
            aircraft_efficiency, route_efficiency, overall_score,
            carbon_footprint, noise_impact, air_quality_impact,
            biofuel_percentage, offset_programs, certifications
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (flight_id, aircraft_id) DO UPDATE SET
            total_co2 = EXCLUDED.total_co2,
            overall_score = EXCLUDED.overall_score,
            updated_at = CURRENT_TIMESTAMP`,
          [
            flightId,
            aircraftId,
            routeId,
            emissionsCalculation?.totalCO2,
            emissionsCalculation?.co2PerKm,
            emissionsCalculation?.co2PerSeat,
            emissionsCalculation?.calculationStandard,
            fuelConsumption?.totalFuel,
            fuelConsumption?.fuelPerKm,
            fuelConsumption?.fuelPerSeat,
            fuelConsumption?.fuelType,
            efficiencyScores?.aircraftEfficiency,
            efficiencyScores?.routeEfficiency,
            efficiencyScores?.overallScore,
            environmentalImpact?.carbonFootprint,
            environmentalImpact?.noiseImpact,
            environmentalImpact?.airQualityImpact,
            sustainabilityMetrics?.biofuelPercentage,
            sustainabilityMetrics?.offsetPrograms,
            sustainabilityMetrics?.certifications,
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
      totalRecords: sustainabilityDataArray.length,
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
