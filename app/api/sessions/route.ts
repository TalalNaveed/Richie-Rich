import { NextResponse } from "next/server"

/**
 * Create Session API endpoint
 * Based on Knot API documentation: https://docs.knotapi.com/transaction-link/testing
 * 
 * Creates a session for testing transaction link functionality
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { external_user_id, type = "transaction_link" } = body

    if (!external_user_id) {
      return NextResponse.json(
        { error: "external_user_id is required" },
        { status: 400 }
      )
    }

    // Get credentials from environment variables
    const clientId = process.env.KNOT_CLIENT_ID || "dda0778d-9486-47f8-bd80-6f2512f9bcdb"
    const clientSecret = process.env.KNOT_CLIENT_SECRET || "884d84e855054c32a8e39d08fcd9845d"
    const apiUrl = process.env.KNOT_API_URL || "https://knot.tunnel.tel"
    const sessionsUrl = `${apiUrl}/sessions`

    // Create Basic Auth header
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    const authHeader = `Basic ${credentials}`

    console.log(`Creating session for external_user_id: ${external_user_id}`)

    const response = await fetch(sessionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        type,
        external_user_id,
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Session creation error:", response.status, response.statusText, errorText)
      return NextResponse.json(
        { error: `Failed to create session: ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }

    const sessionData = await response.json()
    console.log("✅ Session created successfully:", sessionData.session_id)

    return NextResponse.json(sessionData)
  } catch (error) {
    console.error("Session creation error:", error)
    return NextResponse.json(
      { error: "Failed to create session", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to retrieve session information
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 }
    )
  }

  // Get credentials from environment variables
  const clientId = process.env.KNOT_CLIENT_ID || "dda0778d-9486-47f8-bd80-6f2512f9bcdb"
  const clientSecret = process.env.KNOT_CLIENT_SECRET || "884d84e855054c32a8e39d08fcd9845d"
  const apiUrl = process.env.KNOT_API_URL || "https://knot.tunnel.tel"
  const sessionsUrl = `${apiUrl}/sessions/${sessionId}`

  // Create Basic Auth header
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const authHeader = `Basic ${credentials}`

  try {
    const response = await fetch(sessionsUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Session retrieval error:", response.status, response.statusText, errorText)
      return NextResponse.json(
        { error: `Failed to retrieve session: ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }

    const sessionData = await response.json()
    return NextResponse.json(sessionData)
  } catch (error) {
    console.error("Session retrieval error:", error)
    return NextResponse.json(
      { error: "Failed to retrieve session", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

