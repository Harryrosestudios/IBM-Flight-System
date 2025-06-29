import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { WeatherData, ApiResponse, BulkImportResult } from "@/lib/types"

// GET /api/weather-data - Get weather data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const icaoCode = searchParams.get("icaoCode")
    const iataCode = searchParams.get("iataCode")
    const airportName = searchParams.get("airportName")
    const weatherCategory = searchParams.get("weatherCategory")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let whereClause = "WHERE 1=1"
    const queryParams: any[] = []
    let paramIndex = 1

    if (icaoCode) {
      whereClause += ` AND icao_code = $${paramIndex}`
      queryParams.push(icaoCode)
      paramIndex++
    }

    if (iataCode) {
      whereClause += ` AND iata_code = $${paramIndex}`
      queryParams.push(iataCode)
      paramIndex++
    }

    if (airportName) {
      whereClause += ` AND airport_name ILIKE $${paramIndex}`
      queryParams.push(`%${airportName}%`)
      paramIndex++
    }

    if (weatherCategory) {
      whereClause += ` AND weather_category = $${paramIndex}`
      queryParams.push(weatherCategory)
      paramIndex++
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM weather_data ${whereClause}`
    const countResult = await db.query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0]?.total || "0")

    // Get paginated results
    const offset = (page - 1) * limit
    const dataQuery = `
      SELECT * FROM weather_data 
      ${whereClause}
      ORDER BY observation_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const dataResult = await db.query(dataQuery, queryParams)

    const response: ApiResponse<WeatherData[]> = {
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
    console.error("Error fetching weather data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch weather data" }, { status: 500 })
  }
}

// POST /api/weather-data - Create or bulk import weather data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a bulk import
    if (Array.isArray(body)) {
      return await handleBulkImport(body)
    }

    // Single weather data creation
    const { airportIdentification, metarReport, tafForecast } = body

    if (!airportIdentification?.icaoCode) {
      return NextResponse.json({ success: false, error: "ICAO code is required" }, { status: 400 })
    }

    const query = `
      INSERT INTO weather_data (
        icao_code, iata_code, airport_name, airport_latitude, airport_longitude,
        raw_metar, observation_time, temperature_celsius, temperature_fahrenheit,
        wind_direction, wind_speed, wind_gusts, visibility_miles, visibility_meters,
        pressure_inhg, pressure_hpa, pressure_mb, humidity, weather_conditions, cloud_cover, weather_category,
        raw_taf, taf_valid_from, taf_valid_to, taf_temp_min, taf_temp_max,
        taf_wind_direction, taf_wind_speed, taf_visibility, taf_conditions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
      RETURNING *
    `

    const result = await db.query(query, [
      airportIdentification.icaoCode,
      airportIdentification.iataCode,
      airportIdentification.airportName,
      airportIdentification.coordinates?.latitude,
      airportIdentification.coordinates?.longitude,
      metarReport?.rawMetar,
      metarReport?.observationTime,
      metarReport?.temperature?.celsius,
      metarReport?.temperature?.fahrenheit,
      metarReport?.windConditions?.direction,
      metarReport?.windConditions?.speed,
      metarReport?.windConditions?.gusts,
      metarReport?.visibility?.miles,
      metarReport?.visibility?.meters,
      metarReport?.atmosphericPressure?.inHg,
      metarReport?.atmosphericPressure?.hPa,
      metarReport?.atmosphericPressure?.mb,
      metarReport?.humidity,
      metarReport?.weatherConditions,
      metarReport?.cloudCover,
      metarReport?.weatherCategory,
      tafForecast?.rawTaf,
      tafForecast?.validFrom,
      tafForecast?.validTo,
      tafForecast?.temperatureRange?.min,
      tafForecast?.temperatureRange?.max,
      tafForecast?.windForecast?.direction,
      tafForecast?.windForecast?.speed,
      tafForecast?.visibilityForecast,
      tafForecast?.conditionPredictions,
    ])

    const response: ApiResponse<WeatherData> = {
      success: true,
      data: result.rows[0],
      message: "Weather data created successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating weather data:", error)
    return NextResponse.json({ success: false, error: "Failed to create weather data" }, { status: 500 })
  }
}

async function handleBulkImport(weatherDataArray: any[]): Promise<NextResponse> {
  const importId = crypto.randomUUID()
  let successfulImports = 0
  let failedImports = 0
  const errors: string[] = []

  try {
    // Create bulk import record
    await db.query(
      `INSERT INTO bulk_imports (id, import_type, total_records, successful_imports, failed_imports, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [importId, "weather_data", weatherDataArray.length, 0, 0, "processing"],
    )

    // Process each weather data record
    for (const [index, weatherData] of weatherDataArray.entries()) {
      try {
        const { airportIdentification, metarReport, tafForecast } = weatherData

        if (!airportIdentification?.icaoCode) {
          throw new Error("ICAO code is required")
        }

        await db.query(
          `INSERT INTO weather_data (
            icao_code, iata_code, airport_name, airport_latitude, airport_longitude,
            raw_metar, observation_time, temperature_celsius, temperature_fahrenheit,
            wind_direction, wind_speed, wind_gusts, visibility_miles, visibility_meters,
            pressure_inhg, pressure_hpa, pressure_mb, humidity, weather_conditions, cloud_cover, weather_category,
            raw_taf, taf_valid_from, taf_valid_to, taf_temp_min, taf_temp_max,
            taf_wind_direction, taf_wind_speed, taf_visibility, taf_conditions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
          ON CONFLICT (icao_code, observation_time) DO UPDATE SET
            raw_metar = EXCLUDED.raw_metar,
            temperature_celsius = EXCLUDED.temperature_celsius,
            weather_category = EXCLUDED.weather_category,
            updated_at = CURRENT_TIMESTAMP`,
          [
            airportIdentification.icaoCode,
            airportIdentification.iataCode,
            airportIdentification.airportName,
            airportIdentification.coordinates?.latitude,
            airportIdentification.coordinates?.longitude,
            metarReport?.rawMetar,
            metarReport?.observationTime,
            metarReport?.temperature?.celsius,
            metarReport?.temperature?.fahrenheit,
            metarReport?.windConditions?.direction,
            metarReport?.windConditions?.speed,
            metarReport?.windConditions?.gusts,
            metarReport?.visibility?.miles,
            metarReport?.visibility?.meters,
            metarReport?.atmosphericPressure?.inHg,
            metarReport?.atmosphericPressure?.hPa,
            metarReport?.atmosphericPressure?.mb,
            metarReport?.humidity,
            metarReport?.weatherConditions,
            metarReport?.cloudCover,
            metarReport?.weatherCategory,
            tafForecast?.rawTaf,
            tafForecast?.validFrom,
            tafForecast?.validTo,
            tafForecast?.temperatureRange?.min,
            tafForecast?.temperatureRange?.max,
            tafForecast?.windForecast?.direction,
            tafForecast?.windForecast?.speed,
            tafForecast?.visibilityForecast,
            tafForecast?.conditionPredictions,
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
      totalRecords: weatherDataArray.length,
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
