import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { FlightRoute, ApiResponse } from "@/lib/types"

// GET /api/flights/[id] - Get a specific flight route
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const query = `
      SELECT 
        fr.*,
        da.code as departure_airport_code,
        da.name as departure_airport_name,
        da.city as departure_airport_city,
        da.latitude as departure_latitude,
        da.longitude as departure_longitude,
        aa.code as arrival_airport_code,
        aa.name as arrival_airport_name,
        aa.city as arrival_airport_city,
        aa.latitude as arrival_latitude,
        aa.longitude as arrival_longitude,
        ac.type as aircraft_type,
        ac.model as aircraft_model,
        ac.manufacturer as aircraft_manufacturer
      FROM flight_routes fr
      LEFT JOIN airports da ON fr.departure_airport_id = da.id
      LEFT JOIN airports aa ON fr.arrival_airport_id = aa.id
      LEFT JOIN aircraft ac ON fr.aircraft_id = ac.id
      WHERE fr.id = $1
    `

    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Flight route not found" }, { status: 404 })
    }

    // Get waypoints
    const waypointsQuery = `
      SELECT * FROM waypoints 
      WHERE flight_route_id = $1 
      ORDER BY sequence
    `
    const waypointsResult = await db.query(waypointsQuery, [id])

    // Get weather conditions
    const weatherQuery = `
      SELECT * FROM weather_conditions 
      WHERE flight_route_id = $1 
      ORDER BY timestamp DESC
    `
    const weatherResult = await db.query(weatherQuery, [id])

    const flightRoute = {
      ...result.rows[0],
      waypoints: waypointsResult.rows,
      weatherConditions: weatherResult.rows,
    }

    const response: ApiResponse<FlightRoute> = {
      success: true,
      data: flightRoute,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching flight route:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch flight route" }, { status: 500 })
  }
}

// PUT /api/flights/[id] - Update a flight route
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    // Check if flight route exists
    const existingRoute = await db.query("SELECT id FROM flight_routes WHERE id = $1", [id])
    if (existingRoute.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Flight route not found" }, { status: 404 })
    }

    // Build update query dynamically
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    const allowedFields = [
      "flight_number",
      "altitude",
      "distance",
      "estimated_flight_time",
      "fuel_consumption",
      "cost",
      "status",
      "passengers",
      "departure_time",
      "arrival_time",
      "optimization_criteria",
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`)
        updateValues.push(body[field])
        paramIndex++
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 })
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(id)

    const updateQuery = `
      UPDATE flight_routes 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await db.query(updateQuery, updateValues)

    const response: ApiResponse<FlightRoute> = {
      success: true,
      data: result.rows[0],
      message: "Flight route updated successfully",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error updating flight route:", error)
    return NextResponse.json({ success: false, error: "Failed to update flight route" }, { status: 500 })
  }
}

// DELETE /api/flights/[id] - Delete a flight route
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const result = await db.query("DELETE FROM flight_routes WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Flight route not found" }, { status: 404 })
    }

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
      message: "Flight route deleted successfully",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error deleting flight route:", error)
    return NextResponse.json({ success: false, error: "Failed to delete flight route" }, { status: 500 })
  }
}
