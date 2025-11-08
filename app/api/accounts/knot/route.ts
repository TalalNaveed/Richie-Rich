import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Get API token from environment variable (server-side only)
  const apiToken = process.env.KNOT_API_TOKEN || request.headers.get("x-api-token")
  const clientId = process.env.KNOT_CLIENT_ID
  const clientSecret = process.env.KNOT_CLIENT_SECRET

  if (!apiToken) {
    console.error("Knot API token is missing. Set KNOT_API_TOKEN environment variable.")
    return NextResponse.json(
      { error: "API token is required. Set KNOT_API_TOKEN environment variable." },
      { status: 400 }
    )
  }

  try {
    // Knot API endpoint for accounts
    const apiUrl = `https://api.getknot.dev/v1/accounts`
    console.log("Fetching accounts from Knot API:", apiUrl.replace(apiToken, "***"))
    console.log("API Token present:", !!apiToken, "Length:", apiToken?.length)
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiToken}`,
        ...(clientId && { "X-Client-Id": clientId }),
      },
      cache: "no-store",
    })

    console.log("API Response status:", response.status)
    console.log("API Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error:", response.status, response.statusText)
      console.error("API Error details:", errorText)
      
      return NextResponse.json(
        { error: `Failed to fetch accounts: ${response.statusText}`, details: errorText, status: response.status },
        { status: response.status }
      )
    }

    const responseData = await response.json()
    console.log("Accounts fetched - type:", typeof responseData, "Is array:", Array.isArray(responseData))
    
    // Extract the accounts array from the response
    let accountsArray: any[] = []
    
    if (Array.isArray(responseData)) {
      // Direct array response
      accountsArray = responseData
    } else if (responseData && typeof responseData === 'object') {
      // Response is an object - find the array property
      // Check common property names first
      if (Array.isArray(responseData.accounts)) {
        accountsArray = responseData.accounts
      } else if (Array.isArray(responseData.data)) {
        accountsArray = responseData.data
      } else if (Array.isArray(responseData.results)) {
        accountsArray = responseData.results
      } else if (Array.isArray(responseData.items)) {
        accountsArray = responseData.items
      } else {
        // Look for any array property in the object
        const keys = Object.keys(responseData)
        for (const key of keys) {
          if (Array.isArray(responseData[key])) {
            accountsArray = responseData[key]
            console.log(`Found accounts array in property: ${key}`)
            break
          }
        }
      }
    }
    
    console.log("Normalized accounts array:", accountsArray?.length || 0, "accounts")
    if (accountsArray.length > 0) {
      console.log("First account:", accountsArray[0].name || accountsArray[0].id)
    }
    
    return NextResponse.json(accountsArray)
  } catch (error) {
    console.error("Fetch error:", error)
    console.error("Error details:", error instanceof Error ? error.stack : "Unknown error")
    return NextResponse.json(
      { error: "Failed to fetch accounts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

