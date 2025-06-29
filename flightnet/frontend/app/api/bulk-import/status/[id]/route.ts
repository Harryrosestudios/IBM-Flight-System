import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import type { ApiResponse } from "@/lib/types"

// GET /api/bulk-import/status/[id] - Get bulk import status
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const query = `
      SELECT * FROM bulk_imports 
      WHERE id = $1
    `

    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Bulk import not found" }, { status: 404 })
    }

    const response: ApiResponse<any> = {
      success: true,
      data: result.rows[0],
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching bulk import status:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch bulk import status" }, { status: 500 })
  }
}
