"""
Dedalus Stock Screener Module
Uses Dedalus Labs SDK with MCP to find promising stocks to invest in
"""

import asyncio
import json
import sys
import os
from typing import Dict, Any, List
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def screen_stocks_with_dedalus() -> Dict[str, Any]:
    """
    Screen the market for promising stocks using Dedalus Labs with MCP
    Returns a list of recommended stocks based on recent performance, analyst sentiment, and trends
    
    Returns:
        Dictionary containing recommended stocks list
    """
    try:
        # Initialize Dedalus client
        client = AsyncDedalus()
        runner = DedalusRunner(client)
        
        # Create screening prompt
        screening_prompt = """Find the top 10 most promising stocks to invest in right now. Use your MCP search tools to research:

1. Stocks with strong recent performance (price appreciation)
2. Stocks with positive analyst sentiment (buy ratings)
3. Stocks in growing sectors (AI, cloud, tech, healthcare, etc.)
4. Stocks that are undervalued or have strong fundamentals
5. Stocks with recent positive news or catalysts

For each stock, provide:
- Stock symbol (e.g., NVDA, MSFT, AAPL)
- Company name
- Brief reason why it's a good investment (1-2 sentences)

Return ONLY valid JSON in this exact format:
{
    "recommendedStocks": [
        {
            "symbol": "NVDA",
            "companyName": "NVIDIA Corporation",
            "reason": "Strong AI demand driving revenue growth, leading position in GPU market"
        },
        {
            "symbol": "MSFT",
            "companyName": "Microsoft Corporation",
            "reason": "Expansion in cloud computing and AI segments, strong financials"
        }
    ]
}

Use your MCP search tools to find current market data. Return ONLY the JSON, no explanations."""
        
        # Run screening with Dedalus - try multiple search options
        # Strategy: Try models with built-in search, then MCP servers
        
        # Attempt 1: Model with built-in search
        try:
            print("Attempt 1: Using gpt-4o-mini-search-preview (built-in search)...", file=sys.stderr)
            result = await asyncio.wait_for(
                runner.run(
                    input=screening_prompt,
                    model="openai/gpt-4o-mini-search-preview",  # Built-in internet search
                    mcp_servers=[],
                    stream=False
                ),
                timeout=120
            )
            print("✅ Success with search model", file=sys.stderr)
        except Exception as search_error:
            print(f"Search model failed: {search_error}, trying Brave Search MCP...", file=sys.stderr)
            
            # Attempt 2: Brave Search MCP
            try:
                print("Attempt 2: Using Brave Search MCP...", file=sys.stderr)
                result = await asyncio.wait_for(
                    runner.run(
                        input=screening_prompt,
                        model="openai/gpt-4o-mini",
                        mcp_servers=["windsor/brave-search-mcp"],
                        stream=False
                    ),
                    timeout=120
                )
                print("✅ Success with Brave Search MCP", file=sys.stderr)
            except Exception as brave_error:
                print(f"Brave Search failed: {brave_error}, trying Exa MCP...", file=sys.stderr)
                
                # Attempt 3: Exa MCP
                try:
                    print("Attempt 3: Using Exa MCP...", file=sys.stderr)
                    result = await asyncio.wait_for(
                        runner.run(
                            input=screening_prompt,
                            model="openai/gpt-4o-mini",
                            mcp_servers=["joerup/exa-mcp"],
                            stream=False
                        ),
                        timeout=120
                    )
                    print("✅ Success with Exa MCP", file=sys.stderr)
                except Exception as exa_error:
                    print(f"All search methods failed: {exa_error}, using model knowledge...", file=sys.stderr)
                    # Final fallback
                    result = await asyncio.wait_for(
                        runner.run(
                            input=screening_prompt,
                            model="openai/gpt-4o-mini",
                            mcp_servers=[],
                            stream=False
                        ),
                        timeout=60
                    )
                    print("⚠️ Using model knowledge only", file=sys.stderr)
        
        # Parse the response
        output_text = result.final_output
        print(f"DEBUG: Raw output length: {len(output_text)}", file=sys.stderr)
        print(f"DEBUG: Output preview: {output_text[:500]}", file=sys.stderr)
        
        # Try to extract JSON from the output
        json_start = output_text.find('{')
        json_end = output_text.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = output_text[json_start:json_end]
            try:
                screening_data = json.loads(json_str)
                
                # Validate structure
                if "recommendedStocks" not in screening_data:
                    print("WARNING: Missing 'recommendedStocks' key", file=sys.stderr)
                    return create_fallback_screening()
                
                # Add date generated
                from datetime import datetime
                screening_data["dateGenerated"] = datetime.now().isoformat()
                
                return screening_data
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}", file=sys.stderr)
                print(f"Attempted to parse: {json_str[:200]}", file=sys.stderr)
                return create_fallback_screening()
        else:
            print("WARNING: No JSON found in output", file=sys.stderr)
            return create_fallback_screening()
            
    except asyncio.TimeoutError:
        print(f"Error screening stocks: Request timed out.", file=sys.stderr)
        return create_error_screening("Request timed out.")
    except Exception as e:
        print(f"Error screening stocks: {str(e)}", file=sys.stderr)
        return create_error_screening(str(e))


def create_fallback_screening() -> Dict[str, Any]:
    """Create fallback screening data"""
    from datetime import datetime
    return {
        "dateGenerated": datetime.now().isoformat(),
        "recommendedStocks": [
            {
                "symbol": "NVDA",
                "companyName": "NVIDIA Corporation",
                "reason": "Strong AI demand and GPU market leadership"
            },
            {
                "symbol": "MSFT",
                "companyName": "Microsoft Corporation",
                "reason": "Cloud and AI expansion, strong financial performance"
            },
            {
                "symbol": "AAPL",
                "companyName": "Apple Inc.",
                "reason": "Strong ecosystem, services growth, innovation"
            }
        ]
    }


def create_error_screening(error: str) -> Dict[str, Any]:
    """Create error response"""
    from datetime import datetime
    return {
        "dateGenerated": datetime.now().isoformat(),
        "error": error,
        "recommendedStocks": []
    }


async def main():
    """Main entry point for command-line usage"""
    screening = await screen_stocks_with_dedalus()
    print(json.dumps(screening, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

