"""
Dedalus Sonar Stock Research Module
Uses Dedalus Labs SDK with Sonar MCP for comprehensive stock research
- Uses OpenAI model via Dedalus
- Uses Sonar MCP for deep research and internet access
"""

import asyncio
import json
import sys
import os
from typing import Dict, Any, Optional
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def research_stock_with_dedalus_sonar(symbol: str) -> Dict[str, Any]:
    """
    Research a stock using Dedalus Labs with Sonar MCP
    - Uses OpenAI model via Dedalus
    - Uses Sonar MCP for deep research and internet access
    
    Args:
        symbol: Stock symbol (e.g., "AAPL")
        
    Returns:
        Dictionary containing comprehensive stock research data
    """
    try:
        # Initialize Dedalus client
        client = AsyncDedalus()
        runner = DedalusRunner(client)
        
        # Create detailed research prompt with explicit instructions
        research_prompt = f"""Research {symbol} stock. Use your available MCP tools to search the internet for real-time data.

REQUIREMENTS:
1. Use your MCP search tools to find current stock price of {symbol}
2. Search for historical performance data (1 year, 3 years, 5 years percentage returns)
3. Get financial metrics (revenue, net income, EPS, P/E ratio, debt-to-equity)
4. Find analyst ratings (buy/hold/sell counts)
5. Search for recent news (last 3-5 articles with titles, dates, sources, sentiment)
6. Identify risk factors and opportunities
7. Provide investment recommendation with reasoning

CRITICAL: 
- You MUST use your MCP search tools to find real data
- Fill in ALL actual values - do NOT use placeholders like "...", 0.0, or "Company name"
- If you cannot find specific data, try a different keyword and different searching approach until you find relevant information.

Return ONLY valid JSON in this exact format:
{{
    "symbol": "{symbol}",
    "companyName": "Actual company name",
    "currentPrice": 123.45,
    "priceChange": {{"value": 1.23, "percent": 1.0}},
    "historicalPerformance": {{"oneYear": 15.5, "threeYears": 45.2, "fiveYears": 120.8}},
    "financialMetrics": {{"revenue": "$394B", "netIncome": "$99B", "earningsPerShare": 6.11, "debtToEquity": 1.73}},
    "analystRatings": {{"buy": 25, "hold": 8, "sell": 2, "averageRating": 4.2}},
    "recentNews": [
        {{"title": "Actual news title", "date": "2024-01-15", "source": "Bloomberg", "sentiment": "positive"}}
    ],
    "riskFactors": ["Actual risk factor 1", "Actual risk factor 2"],
    "opportunities": ["Actual opportunity 1", "Actual opportunity 2"],
    "recommendation": {{
        "action": "buy",
        "confidence": 85,
        "reasoning": "Detailed reasoning based on research",
        "priceTarget": 175.00,
        "timeHorizon": "12 months"
    }}
}}

Use your MCP search tools to find real data. Return ONLY the JSON, no explanations."""
        
        # Run research with Dedalus - try multiple search options with fallbacks
        # Strategy: Try models with built-in search first, then MCP servers, then fallback
        
        # Attempt 1: Model with built-in internet search (best option)
        try:
            print("Attempt 1: Using gpt-4o-mini-search-preview (built-in search)...", file=sys.stderr)
            result = await asyncio.wait_for(
                runner.run(
                    input=research_prompt,
                    model="openai/gpt-4o-mini-search-preview",  # Model with built-in internet search
                    mcp_servers=[],  # No MCP needed - model has search built-in
                    stream=False
                ),
                timeout=120
            )
            print("✅ Success with gpt-4o-mini-search-preview", file=sys.stderr)
        except Exception as search_model_error:
            print(f"Search model failed: {search_model_error}, trying Brave Search MCP...", file=sys.stderr)
            
            # Attempt 2: Brave Search MCP
            try:
                print("Attempt 2: Using Brave Search MCP...", file=sys.stderr)
                result = await asyncio.wait_for(
                    runner.run(
                        input=research_prompt,
                        model="openai/gpt-4o-mini",
                        mcp_servers=[
                            "windsor/brave-search-mcp"  # Brave Search MCP for web search
                        ],
                        stream=False
                    ),
                    timeout=120
                )
                print("✅ Success with Brave Search MCP", file=sys.stderr)
            except Exception as brave_error:
                print(f"Brave Search failed: {brave_error}, trying Exa MCP...", file=sys.stderr)
                
                # Attempt 3: Exa MCP (semantic search)
                try:
                    print("Attempt 3: Using Exa MCP (semantic search)...", file=sys.stderr)
                    result = await asyncio.wait_for(
                        runner.run(
                            input=research_prompt,
                            model="openai/gpt-4o-mini",
                            mcp_servers=[
                                "joerup/exa-mcp"  # Exa MCP for semantic search
                            ],
                            stream=False
                        ),
                        timeout=120
                    )
                    print("✅ Success with Exa MCP", file=sys.stderr)
                except Exception as exa_error:
                    print(f"Exa MCP failed: {exa_error}, trying both MCPs together...", file=sys.stderr)
                    
                    # Attempt 4: Try both MCP servers together
                    try:
                        print("Attempt 4: Using both Brave Search + Exa MCP...", file=sys.stderr)
                        result = await asyncio.wait_for(
                            runner.run(
                                input=research_prompt,
                                model="openai/gpt-4o-mini",
                                mcp_servers=[
                                    "windsor/brave-search-mcp",
                                    "joerup/exa-mcp"
                                ],
                                stream=False
                            ),
                            timeout=120
                        )
                        print("✅ Success with both MCPs", file=sys.stderr)
                    except Exception as both_error:
                        print(f"All MCP attempts failed: {both_error}, using model knowledge only...", file=sys.stderr)
                        # Final fallback: use model knowledge (no internet access)
                        result = await asyncio.wait_for(
                            runner.run(
                                input=research_prompt,
                                model="openai/gpt-4o-mini",
                                mcp_servers=[],
                                stream=False
                            ),
                            timeout=60
                        )
                        print("⚠️ Using model knowledge only (no real-time data)", file=sys.stderr)
        
        # Parse the response
        output_text = result.final_output
        print(f"DEBUG: Raw output length: {len(output_text)}", file=sys.stderr)
        print(f"DEBUG: Output preview: {output_text[:500]}", file=sys.stderr)
        
        # Try to extract JSON from the output
        # The model might return JSON wrapped in markdown code blocks
        # Remove markdown code blocks if present
        if '```json' in output_text:
            json_start = output_text.find('```json') + 7
            json_end = output_text.find('```', json_start)
            if json_end > json_start:
                json_str = output_text[json_start:json_end].strip()
            else:
                json_str = output_text[json_start:].strip()
        elif '```' in output_text:
            json_start = output_text.find('```') + 3
            json_end = output_text.find('```', json_start)
            if json_end > json_start:
                json_str = output_text[json_start:json_end].strip()
            else:
                json_str = output_text[json_start:].strip()
        else:
            # Try to find JSON object boundaries
            json_start = output_text.find('{')
            json_end = output_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = output_text[json_start:json_end]
            else:
                json_str = output_text
        
        try:
            research_data = json.loads(json_str)
            
            # Validate that we got real data, not placeholders
            current_price = research_data.get("currentPrice")
            company_name = research_data.get("companyName", "")
            
            # Check for placeholder data
            is_placeholder = (
                (current_price == 0.0 or current_price is None) and 
                (company_name == "Company name" or company_name == symbol or not company_name)
            )
            
            if is_placeholder:
                print("WARNING: Received placeholder data, checking if we can extract real data...", file=sys.stderr)
                # Try to extract price from the raw text if JSON parsing failed
                import re
                price_match = re.search(r'\$?(\d+\.?\d*)', output_text)
                if price_match:
                    try:
                        extracted_price = float(price_match.group(1))
                        if extracted_price > 0:
                            research_data["currentPrice"] = extracted_price
                            print(f"✅ Extracted price from text: ${extracted_price}", file=sys.stderr)
                    except ValueError:
                        pass
            
            # Final validation - if still no real price, use fallback
            if research_data.get("currentPrice") is None or research_data.get("currentPrice") == 0.0:
                if not research_data.get("recentNews") or len(research_data.get("recentNews", [])) == 0:
                    print("WARNING: No real data found, using fallback", file=sys.stderr)
                    return create_fallback_research(symbol, output_text)
            
            # Ensure currentPrice is a number
            if research_data.get("currentPrice") is not None:
                try:
                    research_data["currentPrice"] = float(research_data["currentPrice"])
                except (ValueError, TypeError):
                    print(f"WARNING: Invalid currentPrice value: {research_data.get('currentPrice')}", file=sys.stderr)
            
            # Ensure researchDate is set
            if 'researchDate' not in research_data:
                from datetime import datetime
                research_data['researchDate'] = datetime.now().isoformat()
            
            print(f"DEBUG: Parsed currentPrice: {research_data.get('currentPrice')}", file=sys.stderr)
            return research_data
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}", file=sys.stderr)
            print(f"Attempted to parse: {json_str[:500]}", file=sys.stderr)
            # If JSON parsing fails, return structured fallback
            return create_fallback_research(symbol, output_text)
            
    except asyncio.TimeoutError:
        print(f"Error researching {symbol}: Request timed out.", file=sys.stderr)
        return create_error_research(symbol, "Request timed out.")
    except Exception as e:
        print(f"Error researching {symbol}: {str(e)}", file=sys.stderr)
        return create_error_research(symbol, str(e))


def create_fallback_research(symbol: str, research_text: str) -> Dict[str, Any]:
    """Create structured research data from text output"""
    return {
        "symbol": symbol.upper(),
        "companyName": symbol,
        "recommendation": {
            "action": "hold",
            "confidence": 50,
            "reasoning": research_text[:500] if research_text else "Research completed via Dedalus Sonar",
            "timeHorizon": "12 months"
        },
        "historicalPerformance": {
            "oneYear": 0.0,
            "threeYears": 0.0,
            "fiveYears": 0.0
        },
        "analystRatings": {
            "buy": 0,
            "hold": 0,
            "sell": 0,
            "averageRating": 0.0
        },
        "recentNews": [],
        "riskFactors": [],
        "opportunities": [],
        "researchDate": None
    }


def create_error_research(symbol: str, error: str) -> Dict[str, Any]:
    """Create error response"""
    return {
        "symbol": symbol.upper(),
        "companyName": symbol,
        "error": error,
        "recommendation": {
            "action": "hold",
            "confidence": 0,
            "reasoning": f"Error during research: {error}",
            "timeHorizon": "N/A"
        },
        "historicalPerformance": {
            "oneYear": 0.0,
            "threeYears": 0.0,
            "fiveYears": 0.0
        },
        "analystRatings": {
            "buy": 0,
            "hold": 0,
            "sell": 0,
            "averageRating": 0.0
        },
        "recentNews": [],
        "riskFactors": [],
        "opportunities": [],
        "researchDate": None
    }


async def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Symbol required"}, indent=2))
        sys.exit(1)
    
    symbol = sys.argv[1].upper()
    research = await research_stock_with_dedalus_sonar(symbol)
    
    # Add research date
    from datetime import datetime
    research["researchDate"] = datetime.now().isoformat()
    
    print(json.dumps(research, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

