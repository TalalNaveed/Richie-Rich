"""
MATLAB-Compatible Investment Visualization Script
Generates graphs showing investment returns over time
Can be run standalone or imported as a module
"""

import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

# Try to import matplotlib for graph generation
try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    print("Warning: matplotlib not installed. Install with: pip install matplotlib", file=sys.stderr)

try:
    import yfinance as yf
    HAS_YFINANCE = True
except ImportError:
    HAS_YFINANCE = False


def generate_investment_graphs(
    monthly_breakdown: List[Dict],
    stock_results: List[Dict],
    output_dir: str = "graphs"
) -> Dict[str, str]:
    """
    Generate MATLAB-style graphs showing investment performance
    
    Args:
        monthly_breakdown: List of monthly investment breakdowns
        stock_results: List of stock performance results
        output_dir: Directory to save graphs
    
    Returns:
        Dictionary with paths to generated graph files
    """
    if not HAS_MATPLOTLIB:
        return {"error": "matplotlib not available"}
    
    os.makedirs(output_dir, exist_ok=True)
    graph_paths = {}
    
    # Graph 1: Monthly Investment Growth
    if monthly_breakdown:
        fig, ax = plt.subplots(figsize=(12, 6))
        
        months = [m['monthLabel'] for m in monthly_breakdown]
        savings = [m['savings'] for m in monthly_breakdown]
        potential_values = [m['potential_value'] for m in monthly_breakdown]
        potential_earnings = [m['potential_earnings'] for m in monthly_breakdown]
        
        x = np.arange(len(months))
        width = 0.35
        
        ax.bar(x - width/2, savings, width, label='Potential Savings', color='#f59e0b', alpha=0.7)
        ax.bar(x + width/2, potential_values, width, label='Potential Value (Invested)', color='#10b981', alpha=0.7)
        
        ax.set_xlabel('Month', fontsize=12, fontweight='bold')
        ax.set_ylabel('Amount ($)', fontsize=12, fontweight='bold')
        ax.set_title('Monthly Investment Growth: Savings vs. Potential Returns', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(months, rotation=45, ha='right')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        path1 = os.path.join(output_dir, 'monthly_investment_growth.png')
        plt.savefig(path1, dpi=300, bbox_inches='tight')
        plt.close()
        graph_paths['monthly_growth'] = path1
    
    # Graph 2: Cumulative Returns
    if monthly_breakdown:
        fig, ax = plt.subplots(figsize=(12, 6))
        
        months = [m['monthLabel'] for m in monthly_breakdown]
        cumulative_savings = np.cumsum([m['savings'] for m in monthly_breakdown])
        cumulative_value = np.cumsum([m['potential_value'] for m in monthly_breakdown])
        cumulative_earnings = cumulative_value - cumulative_savings
        
        ax.plot(months, cumulative_savings, 'o-', label='Cumulative Savings', linewidth=2, markersize=8, color='#f59e0b')
        ax.plot(months, cumulative_value, 's-', label='Cumulative Value (Invested)', linewidth=2, markersize=8, color='#10b981')
        ax.fill_between(months, cumulative_savings, cumulative_value, alpha=0.3, color='#10b981', label='Earnings')
        
        ax.set_xlabel('Month', fontsize=12, fontweight='bold')
        ax.set_ylabel('Cumulative Amount ($)', fontsize=12, fontweight='bold')
        ax.set_title('Cumulative Investment Returns Over Time', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.xticks(rotation=45, ha='right')
        
        plt.tight_layout()
        path2 = os.path.join(output_dir, 'cumulative_returns.png')
        plt.savefig(path2, dpi=300, bbox_inches='tight')
        plt.close()
        graph_paths['cumulative_returns'] = path2
    
    # Graph 3: Portfolio Allocation
    if stock_results:
        fig, ax = plt.subplots(figsize=(10, 8))
        
        symbols = [s['symbol'] for s in stock_results]
        weights = [s['weight'] * 100 for s in stock_results]
        returns = [s['return_percent'] for s in stock_results]
        
        colors = ['#10b981', '#3b82f6', '#8b5cf6']
        
        bars = ax.barh(symbols, weights, color=colors[:len(symbols)])
        ax.set_xlabel('Portfolio Weight (%)', fontsize=12, fontweight='bold')
        ax.set_ylabel('Stock Symbol', fontsize=12, fontweight='bold')
        ax.set_title('Portfolio Allocation by Stock', fontsize=14, fontweight='bold')
        
        # Add return percentages as labels
        for i, (bar, ret) in enumerate(zip(bars, returns)):
            width = bar.get_width()
            ax.text(width + 1, bar.get_y() + bar.get_height()/2, 
                   f'{ret:.1f}% return', 
                   ha='left', va='center', fontweight='bold')
        
        ax.grid(True, alpha=0.3, axis='x')
        plt.tight_layout()
        path3 = os.path.join(output_dir, 'portfolio_allocation.png')
        plt.savefig(path3, dpi=300, bbox_inches='tight')
        plt.close()
        graph_paths['portfolio_allocation'] = path3
    
    return graph_paths


def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "JSON input required"}, indent=2))
        sys.exit(1)
    
    try:
        input_data = json.loads(sys.argv[1])
        
        monthly_breakdown = input_data.get('monthlyBreakdown', [])
        stock_results = input_data.get('stockResults', [])
        output_dir = input_data.get('outputDir', 'graphs')
        
        graph_paths = generate_investment_graphs(monthly_breakdown, stock_results, output_dir)
        
        print(json.dumps(graph_paths, indent=2))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}, indent=2))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()

