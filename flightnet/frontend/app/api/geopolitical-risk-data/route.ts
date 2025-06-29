import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { GeopoliticalRiskData, ApiResponse, BulkImportResult } from "@/lib/types"

// GET /api/geopolitical-risk-data - Get geopolitical risk data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const countryCode = searchParams.get("countryCode")
    const countryName = searchParams.get("countryName")
    const riskLevel = searchParams.get("riskLevel")
    const minRiskScore = searchParams.get("minRiskScore")
    const maxRiskScore = searchParams.get("maxRiskScore")
    const currentTrend = searchParams.get("currentTrend")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let whereClause = "WHERE 1=1"
    const queryParams: any[] = []
    let paramIndex = 1

    if (countryCode) {
      whereClause += ` AND country_code = $${paramIndex}`
      queryParams.push(countryCode.toUpperCase())
      paramIndex++
    }

    if (countryName) {
      whereClause += ` AND country_name ILIKE $${paramIndex}`
      queryParams.push(`%${countryName}%`)
      paramIndex++
    }

    if (riskLevel) {
      whereClause += ` AND risk_level = $${paramIndex}`
      queryParams.push(riskLevel)
      paramIndex++
    }

    if (minRiskScore) {
      whereClause += ` AND overall_risk_score >= $${paramIndex}`
      queryParams.push(Number.parseFloat(minRiskScore))
      paramIndex++
    }

    if (maxRiskScore) {
      whereClause += ` AND overall_risk_score <= $${paramIndex}`
      queryParams.push(Number.parseFloat(maxRiskScore))
      paramIndex++
    }

    if (currentTrend) {
      whereClause += ` AND current_trend = $${paramIndex}`
      queryParams.push(currentTrend)
      paramIndex++
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM geopolitical_risk_data ${whereClause}`
    const countResult = await db.query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0]?.total || "0")

    // Get paginated results
    const offset = (page - 1) * limit
    const dataQuery = `
      SELECT * FROM geopolitical_risk_data 
      ${whereClause}
      ORDER BY overall_risk_score DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const dataResult = await db.query(dataQuery, queryParams)

    const response: ApiResponse<GeopoliticalRiskData[]> = {
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
    console.error("Error fetching geopolitical risk data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch geopolitical risk data" }, { status: 500 })
  }
}

// POST /api/geopolitical-risk-data - Create or bulk import geopolitical risk data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a bulk import
    if (Array.isArray(body)) {
      return await handleBulkImport(body)
    }

    // Single geopolitical risk data creation
    const { countryCode, countryName, riskAssessment, riskTrends, intelligenceData, globalIndices } = body

    if (!countryCode || !countryName) {
      return NextResponse.json({ success: false, error: "Country code and name are required" }, { status: 400 })
    }

    const query = `
      INSERT INTO geopolitical_risk_data (
        country_code, country_name, overall_risk_score, risk_level,
        political_risk, economic_risk, security_risk, social_risk, stability_score,
        current_trend, thirty_day_forecast, historical_trend,
        current_alerts, warnings, risk_descriptions, sources, intelligence_last_updated,
        gpr_index, regional_comparison, global_ranking
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `

    const result = await db.query(query, [
      countryCode.toUpperCase(),
      countryName,
      riskAssessment?.overallRiskScore,
      riskAssessment?.riskLevel,
      riskAssessment?.riskFactors?.political,
      riskAssessment?.riskFactors?.economic,
      riskAssessment?.riskFactors?.security,
      riskAssessment?.riskFactors?.social,
      riskAssessment?.stabilityScore,
      riskTrends?.currentTrend,
      riskTrends?.thirtyDayForecast,
      riskTrends?.historicalTrend,
      intelligenceData?.currentAlerts,
      intelligenceData?.warnings,
      intelligenceData?.riskDescriptions,
      intelligenceData?.sources,
      intelligenceData?.lastUpdated,
      globalIndices?.gprIndex,
      globalIndices?.regionalComparison,
      globalIndices?.globalRanking,
    ])

    const response: ApiResponse<GeopoliticalRiskData> = {
      success: true,
      data: result.rows[0],
      message: "Geopolitical risk data created successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating geopolitical risk data:", error)
    return NextResponse.json({ success: false, error: "Failed to create geopolitical risk data" }, { status: 500 })
  }
}

async function handleBulkImport(riskDataArray: any[]): Promise<NextResponse> {
  const importId = crypto.randomUUID()
  let successfulImports = 0
  let failedImports = 0
  const errors: string[] = []

  try {
    // Create bulk import record
    await db.query(
      `INSERT INTO bulk_imports (id, import_type, total_records, successful_imports, failed_imports, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [importId, "geopolitical_risk_data", riskDataArray.length, 0, 0, "processing"],
    )

    // Process each geopolitical risk data record
    for (const [index, riskData] of riskDataArray.entries()) {
      try {
        const { countryCode, countryName, riskAssessment, riskTrends, intelligenceData, globalIndices } = riskData

        if (!countryCode || !countryName) {
          throw new Error("Country code and name are required")
        }

        await db.query(
          `INSERT INTO geopolitical_risk_data (
            country_code, country_name, overall_risk_score, risk_level,
            political_risk, economic_risk, security_risk, social_risk, stability_score,
            current_trend, thirty_day_forecast, historical_trend,
            current_alerts, warnings, risk_descriptions, sources, intelligence_last_updated,
            gpr_index, regional_comparison, global_ranking
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (country_code) DO UPDATE SET
            overall_risk_score = EXCLUDED.overall_risk_score,
            risk_level = EXCLUDED.risk_level,
            current_trend = EXCLUDED.current_trend,
            updated_at = CURRENT_TIMESTAMP`,
          [
            countryCode.toUpperCase(),
            countryName,
            riskAssessment?.overallRiskScore,
            riskAssessment?.riskLevel,
            riskAssessment?.riskFactors?.political,
            riskAssessment?.riskFactors?.economic,
            riskAssessment?.riskFactors?.security,
            riskAssessment?.riskFactors?.social,
            riskAssessment?.stabilityScore,
            riskTrends?.currentTrend,
            riskTrends?.thirtyDayForecast,
            riskTrends?.historicalTrend,
            intelligenceData?.currentAlerts,
            intelligenceData?.warnings,
            intelligenceData?.riskDescriptions,
            intelligenceData?.sources,
            intelligenceData?.lastUpdated,
            globalIndices?.gprIndex,
            globalIndices?.regionalComparison,
            globalIndices?.globalRanking,
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
      totalRecords: riskDataArray.length,
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
