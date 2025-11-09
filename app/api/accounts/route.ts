
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
    // Use HTTP as per the API documentation
    const apiUrl = `http://api.nessieisreal.com/enterprise/accounts?key=${apiKey}`
    console.log("Fetching enterprise accounts from:", apiUrl.replace(apiKey, "***"))
    console.log("API Key present:", !!apiKey, "Length:", apiKey?.length)
   
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      // Add cache control
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
    console.log("Enterprise accounts fetched - type:", typeof responseData, "Is array:", Array.isArray(responseData))
   
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
      console.log("First account:", accountsArray[0].nickname || accountsArray[0]._id)
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


