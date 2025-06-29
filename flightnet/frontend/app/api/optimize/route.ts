import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { OptimizationRequest, OptimizationResult, ApiResponse } from "@/lib/types"

// POST /api/optimize - Optimize a flight route
export async function POST(request: NextRequest) {
  try {
    const body: OptimizationRequest = await request.json()

    const { flightRouteId, criteria, constraints = {}, weatherData = true, realTimeUpdates = false } = body

    // Validate required fields
    if (!flightRouteId || !criteria) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: flightRouteId and criteria" },
        { status: 400 },
      )
    }

    // Get the original flight route
    const originalRouteQuery = `
      SELECT 
        fr.*,
        da.latitude as departure_latitude,
        da.longitude as departure_longitude,
        aa.latitude as arrival_latitude,
        aa.longitude as arrival_longitude,
        ac.fuel_consumption_rate,
        ac.cruise_speed,
        ac.max_range
      FROM flight_routes fr
      JOIN airports da ON fr.departure_airport_id = da.id
      JOIN airports aa ON fr.arrival_airport_id = aa.id
      JOIN aircraft ac ON fr.aircraft_id = ac.id
      WHERE fr.id = $1
    `

    const originalRouteResult = await db.query(originalRouteQuery, [flightRouteId])

    if (originalRouteResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Flight route not found" }, { status: 404 })
    }

    const originalRoute = originalRouteResult.rows[0]

    // Get weather data if requested
    let weatherConditions = []
    if (weatherData) {
      const weatherQuery = `
        SELECT * FROM weather_conditions 
        WHERE flight_route_id = $1 
        ORDER BY timestamp DESC
        LIMIT 10
      `
      const weatherResult = await db.query(weatherQuery, [flightRouteId])
      weatherConditions = weatherResult.rows
    }

    // Simulate optimization algorithm
    const optimizationResult = await performOptimization(originalRoute, criteria, constraints, weatherConditions)

    // Store optimization result (optional)
    if (realTimeUpdates) {
      await storeOptimizationResult(flightRouteId, optimizationResult)
    }

    const response: ApiResponse<OptimizationResult> = {
      success: true,
      data: optimizationResult,
      message: "Route optimization completed successfully",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error optimizing route:", error)
    return NextResponse.json({ success: false, error: "Failed to optimize route" }, { status: 500 })
  }
}

// Optimization algorithm simulation
async function performOptimization(
  originalRoute: any,
  criteria: string,
  constraints: any,
  weatherConditions: any[],
): Promise<OptimizationResult> {
  // This is a simplified simulation - implement your actual optimization logic here

  const baseImprovements = {
    fuel: { fuelSavings: 0.15, timeSavings: 0.05, costSavings: 0.12 },
    time: { fuelSavings: 0.08, timeSavings: 0.18, costSavings: 0.1 },
    cost: { fuelSavings: 0.12, timeSavings: 0.08, costSavings: 0.2 },
    balanced: { fuelSavings: 0.1, timeSavings: 0.1, costSavings: 0.15 },
  }

  const improvement = baseImprovements[criteria as keyof typeof baseImprovements] || baseImprovements.balanced

  // Apply weather impact
  const weatherImpact = []
  let confidenceReduction = 0

  if (weatherConditions.length > 0) {
    const hasStorms = weatherConditions.some((w) => w.storm_activity)
    const hasTurbulence = weatherConditions.some(
      (w) => w.turbulence_level === "moderate" || w.turbulence_level === "severe",
    )

    if (hasStorms) {
      weatherImpact.push("Storm activity detected - route adjusted to avoid severe weather")
      confidenceReduction += 0.1
    }

    if (hasTurbulence) {
      weatherImpact.push("Turbulence zones identified - altitude adjustments recommended")
      confidenceReduction += 0.05
    }
  }

  // Calculate optimized values
  const optimizedRoute = {
    ...originalRoute,
    altitude: constraints.maxAltitude
      ? Math.min(originalRoute.altitude + 2000, constraints.maxAltitude)
      : originalRoute.altitude + 2000,
    distance: originalRoute.distance * (1 - improvement.fuelSavings * 0.3),
    estimated_flight_time: originalRoute.estimated_flight_time * (1 - improvement.timeSavings),
    fuel_consumption: originalRoute.fuel_consumption * (1 - improvement.fuelSavings),
    cost: originalRoute.cost * (1 - improvement.costSavings),
    status: "planned",
  }

  // Generate alternative routes
  const alternativeRoutes = [
    {
      ...optimizedRoute,
      id: "alt-1",
      flight_number: originalRoute.flight_number + "-ALT1",
      altitude: originalRoute.altitude - 5000,
      distance: originalRoute.distance * 1.05,
      estimated_flight_time: originalRoute.estimated_flight_time * 1.08,
      fuel_consumption: originalRoute.fuel_consumption * 0.92,
      cost: originalRoute.cost * 0.95,
    },
    {
      ...optimizedRoute,
      id: "alt-2",
      flight_number: originalRoute.flight_number + "-ALT2",
      altitude: originalRoute.altitude + 5000,
      distance: originalRoute.distance * 0.98,
      estimated_flight_time: originalRoute.estimated_flight_time * 0.95,
      fuel_consumption: originalRoute.fuel_consumption * 0.88,
      cost: originalRoute.cost * 0.9,
    },
  ]

  const result: OptimizationResult = {
    originalRoute,
    optimizedRoute,
    improvements: {
      fuelSavings: improvement.fuelSavings,
      timeSavings: improvement.timeSavings,
      costSavings: improvement.costSavings,
      distanceChange: (optimizedRoute.distance - originalRoute.distance) / originalRoute.distance,
    },
    confidence: Math.max(0.7, 0.95 - confidenceReduction),
    alternativeRoutes,
    weatherImpact,
    recommendations: [
      `Optimized for ${criteria} efficiency`,
      "Weather conditions have been considered",
      "Alternative routes available for comparison",
    ],
  }

  return result
}

async function storeOptimizationResult(flightRouteId: string, result: OptimizationResult) {
  // Store optimization results in database for future reference
  const query = `
    INSERT INTO optimization_results (
      flight_route_id, 
      criteria, 
      fuel_savings, 
      time_savings, 
      cost_savings, 
      confidence,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
  `

  await db.query(query, [
    flightRouteId,
    "optimization",
    result.improvements.fuelSavings,
    result.improvements.timeSavings,
    result.improvements.costSavings,
    result.confidence,
  ])
}
