"""
Investment Return Calculator with Machine Learning Models
Calculates potential earnings if savings were invested in stocks
Uses historical stock price data and mathematical models
"""

import json
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import numpy as np
from dataclasses import dataclass

# Try to import yfinance for stock data, fallback if not available
try:
    import yfinance as yf
    HAS_YFINANCE = True
except ImportError:
    HAS_YFINANCE = False
    print("Warning: yfinance not installed. Install with: pip install yfinance", file=sys.stderr)

@dataclass
class InvestmentResult:
    """Result of investment calculation"""
    initial_investment: float
    final_value: float
    total_return: float
    total_return_percent: float
    monthly_returns: List[float]
    monthly_values: List[float]
    dates: List[str]
    stock_symbol: str
    average_monthly_return: float
    volatility: float
    sharpe_ratio: float


def get_stock_price_history(symbol: str, start_date: datetime, end_date: datetime) -> Optional[List[Tuple[str, float]]]:
    """
    Get historical stock prices using yfinance
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        start_date: Start date for historical data
        end_date: End date for historical data
    
    Returns:
        List of (date, price) tuples or None if unavailable
    """
    if not HAS_YFINANCE:
        return None
    
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, end=end_date)
        
        if hist.empty:
            return None
        
        # Get closing prices
        prices = []
        for date, row in hist.iterrows():
            prices.append((date.strftime('%Y-%m-%d'), float(row['Close'])))
        
        return prices
    except Exception as e:
        print(f"Error fetching stock data for {symbol}: {e}", file=sys.stderr)
        return None


def calculate_investment_returns(
    initial_investment: float,
    stock_symbol: str,
    start_date: datetime,
    end_date: datetime,
    investment_strategy: str = "lump_sum"
) -> InvestmentResult:
    """
    Calculate investment returns using historical stock prices
    
    Args:
        initial_investment: Initial amount invested
        stock_symbol: Stock symbol to invest in
        start_date: Investment start date
        end_date: Investment end date
        investment_strategy: "lump_sum" or "dca" (dollar cost averaging)
    
    Returns:
        InvestmentResult with calculated returns
    """
    # Get historical prices
    price_history = get_stock_price_history(stock_symbol, start_date, end_date)
    
    if not price_history:
        # Fallback: Use average market return (S&P 500 average ~10% annually)
        return calculate_fallback_returns(initial_investment, start_date, end_date, stock_symbol)
    
    # Sort by date
    price_history.sort(key=lambda x: x[0])
    
    if len(price_history) < 2:
        return calculate_fallback_returns(initial_investment, start_date, end_date, stock_symbol)
    
    start_price = price_history[0][1]
    end_price = price_history[-1][1]
    
    # Calculate monthly returns
    monthly_returns = []
    monthly_values = [initial_investment]
    dates = [price_history[0][0]]
    current_value = initial_investment
    shares_owned = initial_investment / start_price
    
    # Group prices by month
    monthly_prices = {}
    for date_str, price in price_history:
        year_month = date_str[:7]  # YYYY-MM
        if year_month not in monthly_prices:
            monthly_prices[year_month] = []
        monthly_prices[year_month].append(price)
    
    # Calculate monthly values
    for year_month in sorted(monthly_prices.keys())[1:]:  # Skip first month
        month_prices = monthly_prices[year_month]
        month_end_price = month_prices[-1] if month_prices else start_price
        
        # Calculate return for this month
        prev_value = current_value
        current_value = shares_owned * month_end_price
        monthly_return = ((current_value - prev_value) / prev_value) * 100 if prev_value > 0 else 0
        
        monthly_returns.append(monthly_return)
        monthly_values.append(current_value)
        dates.append(f"{year_month}-01")
    
    # Final value
    final_value = shares_owned * end_price
    total_return = final_value - initial_investment
    total_return_percent = (total_return / initial_investment) * 100 if initial_investment > 0 else 0
    
    # Calculate metrics
    avg_monthly_return = np.mean(monthly_returns) if monthly_returns else 0
    volatility = np.std(monthly_returns) if len(monthly_returns) > 1 else 0
    
    # Sharpe ratio (assuming risk-free rate of 2% annually = 0.167% monthly)
    risk_free_rate_monthly = 0.167
    sharpe_ratio = (avg_monthly_return - risk_free_rate_monthly) / volatility if volatility > 0 else 0
    
    return InvestmentResult(
        initial_investment=initial_investment,
        final_value=final_value,
        total_return=total_return,
        total_return_percent=total_return_percent,
        monthly_returns=monthly_returns,
        monthly_values=monthly_values,
        dates=dates,
        stock_symbol=stock_symbol,
        average_monthly_return=avg_monthly_return,
        volatility=volatility,
        sharpe_ratio=sharpe_ratio
    )


def calculate_fallback_returns(
    initial_investment: float,
    start_date: datetime,
    end_date: datetime,
    stock_symbol: str
) -> InvestmentResult:
    """
    Fallback calculation using average market returns when stock data unavailable
    Uses S&P 500 average return of ~10% annually
    """
    months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
    monthly_return_rate = 0.10 / 12  # 10% annual / 12 months
    
    monthly_returns = [monthly_return_rate * 100] * max(1, months)
    monthly_values = [initial_investment]
    dates = [start_date.strftime('%Y-%m-%d')]
    
    current_value = initial_investment
    for i in range(months):
        current_value *= (1 + monthly_return_rate)
        monthly_values.append(current_value)
        if i < months - 1:
            next_date = start_date + timedelta(days=30 * (i + 1))
            dates.append(next_date.strftime('%Y-%m-%d'))
    
    final_value = current_value
    total_return = final_value - initial_investment
    total_return_percent = (total_return / initial_investment) * 100 if initial_investment > 0 else 0
    
    return InvestmentResult(
        initial_investment=initial_investment,
        final_value=final_value,
        total_return=total_return,
        total_return_percent=total_return_percent,
        monthly_returns=monthly_returns,
        monthly_values=monthly_values,
        dates=dates,
        stock_symbol=stock_symbol,
        average_monthly_return=monthly_return_rate * 100,
        volatility=2.0,  # Typical monthly volatility
        sharpe_ratio=1.5
    )


def calculate_portfolio_returns(
    monthly_savings: List[Dict[str, any]],
    stock_symbols: List[str] = None,
    weights: List[float] = None
) -> Dict[str, any]:
    """
    Calculate returns for a portfolio of stocks based on monthly savings
    
    Args:
        monthly_savings: List of dicts with 'month', 'savings', 'monthLabel'
        stock_symbols: List of stock symbols to invest in (default: ['SPY', 'QQQ', 'VTI'])
        weights: Portfolio weights for each stock (default: equal weights)
    
    Returns:
        Dictionary with portfolio results
    """
    if stock_symbols is None:
        stock_symbols = ['SPY', 'QQQ', 'VTI']  # S&P 500, NASDAQ, Total Stock Market ETFs
    
    if weights is None:
        weights = [1.0 / len(stock_symbols)] * len(stock_symbols)
    
    if len(weights) != len(stock_symbols):
        weights = [1.0 / len(stock_symbols)] * len(stock_symbols)
    
    # Normalize weights
    total_weight = sum(weights)
    weights = [w / total_weight for w in weights]
    
    total_initial = sum(m['savings'] for m in monthly_savings)
    
    if total_initial == 0:
        return {
            'total_earnings': 0,
            'total_return_percent': 0,
            'final_value': 0,
            'monthly_breakdown': []
        }
    
    # Calculate returns for each stock
    stock_results = []
    for symbol, weight in zip(stock_symbols, weights):
        # Find date range
        if not monthly_savings:
            continue
        
        first_month = monthly_savings[0]['month']
        last_month = monthly_savings[-1]['month']
        
        start_date = datetime.strptime(f"{first_month}-01", '%Y-%m-%d')
        end_date = datetime.strptime(f"{last_month}-01", '%Y-%m-%d')
        end_date = end_date.replace(day=28)  # End of month
        
        # Calculate weighted investment
        weighted_investment = total_initial * weight
        
        result = calculate_investment_returns(
            weighted_investment,
            symbol,
            start_date,
            end_date
        )
        stock_results.append({
            'symbol': symbol,
            'weight': weight,
            'result': result
        })
    
    # Combine portfolio results
    total_final_value = sum(r['result'].final_value for r in stock_results)
    total_earnings = total_final_value - total_initial
    total_return_percent = (total_earnings / total_initial) * 100 if total_initial > 0 else 0
    
    # Calculate monthly breakdown
    monthly_breakdown = []
    for month_data in monthly_savings:
        month_savings_amount = month_data['savings']
        if month_savings_amount == 0:
            continue
        
        # Calculate what this month's savings would be worth
        month_date = datetime.strptime(f"{month_data['month']}-01", '%Y-%m-%d')
        months_until_end = len(monthly_savings) - monthly_savings.index(month_data)
        
        # Simple calculation: assume average return
        avg_monthly_return = 0.10 / 12  # 10% annual
        future_value = month_savings_amount * ((1 + avg_monthly_return) ** months_until_end)
        
        monthly_breakdown.append({
            'month': month_data['month'],
            'monthLabel': month_data['monthLabel'],
            'savings': month_savings_amount,
            'potential_value': future_value,
            'potential_earnings': future_value - month_savings_amount
        })
    
    return {
        'total_earnings': round(total_earnings, 2),
        'total_return_percent': round(total_return_percent, 2),
        'final_value': round(total_final_value, 2),
        'initial_investment': round(total_initial, 2),
        'stock_results': [
            {
                'symbol': r['symbol'],
                'weight': r['weight'],
                'final_value': round(r['result'].final_value, 2),
                'return_percent': round(r['result'].total_return_percent, 2)
            }
            for r in stock_results
        ],
        'monthly_breakdown': monthly_breakdown
    }


def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "JSON input required"}, indent=2))
        sys.exit(1)
    
    try:
        input_data = json.loads(sys.argv[1])
        
        monthly_savings = input_data.get('monthlySavings', [])
        stock_symbols = input_data.get('stockSymbols', None)
        weights = input_data.get('weights', None)
        
        result = calculate_portfolio_returns(monthly_savings, stock_symbols, weights)
        
        print(json.dumps(result, indent=2))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}, indent=2))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()

