import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { Airport, ApiResponse } from "@/lib/types"

// GET /api/airports - Get all airports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let query = "SELECT * FROM airports"
    const queryParams: any[] = []

    if (search) {
      query += " WHERE code ILIKE $1 OR name ILIKE $1 OR city ILIKE $1"
      queryParams.push(`%${search}%`)
    }

    query += " ORDER BY code LIMIT $" + (queryParams.length + 1)
    queryParams.push(limit)

    const result = await db.query(query, queryParams)

    const response: ApiResponse<Airport[]> = {
      success: true,
      data: result.rows,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching airports:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch airports" }, { status: 500 })
  }
}

// POST /api/airports - Create a new airport
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { code, name, city, country, latitude, longitude, elevation, timezone } = body

    // Validate required fields
    if (!code || !name || !city || !country || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const query = `
      INSERT INTO airports (code, name, city, country, latitude, longitude, elevation, timezone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const result = await db.query(query, [
      code,
      name,
      city,
      country,
      latitude,
      longitude,
      elevation || 0,
      timezone || "UTC",
    ])

    const response: ApiResponse<Airport> = {
      success: true,
      data: result.rows[0],
      message: "Airport created successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating airport:", error)
    return NextResponse.json({ success: false, error: "Failed to create airport" }, { status: 500 })
  }
}
