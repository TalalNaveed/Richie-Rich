import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Get API key from environment variable (server-side only)
  const apiKey = process.env.NESSIE_API_KEY || request.headers.get("x-api-key")

  if (!apiKey) {
    console.error("API key is missing. Set NESSIE_API_KEY environment variable.")
    return NextResponse.json(
      { error: "API key is required. Set NESSIE_API_KEY environment variable." },
      { status: 400 }
    )
  }

  try {
    // Use enterprise endpoint to get all customers
    const apiUrl = `http://api.nessieisreal.com/enterprise/customers?key=${apiKey}`
    console.log("Fetching enterprise customers from:", apiUrl.replace(apiKey, "***"))
    
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      cache: "no-store",
    })

    console.log("API Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error:", response.status, errorText)
      return NextResponse.json(
        { error: `Failed to fetch customers: ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }

    const responseData = await response.json()
    console.log("Enterprise customers fetched - type:", typeof responseData, "Is array:", Array.isArray(responseData))
    
    // Extract the customers array from the response
    let customersArray: any[] = []
    
    if (Array.isArray(responseData)) {
      customersArray = responseData
    } else if (responseData && typeof responseData === 'object') {
      // Response is an object - find the array property
      if (Array.isArray(responseData.customers)) {
        customersArray = responseData.customers
      } else if (Array.isArray(responseData.data)) {
        customersArray = responseData.data
      } else if (Array.isArray(responseData.results)) {
        customersArray = responseData.results
      } else {
        // Look for any array property in the object
        const keys = Object.keys(responseData)
        for (const key of keys) {
          if (Array.isArray(responseData[key])) {
            customersArray = responseData[key]
            console.log(`Found customers array in property: ${key}`)
            break
          }
        }
      }
    }
    
    console.log("Normalized customers array:", customersArray?.length || 0, "customers")
    return NextResponse.json(customersArray)
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch customers", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
