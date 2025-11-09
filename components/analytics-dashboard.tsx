"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Target, Zap, TrendingDown, ArrowUpCircle } from "lucide-react"
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface MonthlySavingsData {
  month: string
  monthLabel: string
  savings: number
  transactionCount: number
}

interface InvestmentEarnings {
  totalEarnings: number
  totalReturnPercent: number
  finalValue: number
  initialInvestment: number
  stockResults: Array<{
    symbol: string
    weight: number
    final_value: number
    return_percent: number
  }>
  monthlyBreakdown: Array<{
    month: string
    monthLabel: string
    savings: number
    potential_value: number
    potential_earnings: number
  }>
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"]

interface CategoryData {
  name: string
  value: number
  percentage: number
}

export function AnalyticsDashboard() {
  const [lastMonthSavings, setLastMonthSavings] = useState(0)
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlySavingsData[]>([])
  const [investmentEarnings, setInvestmentEarnings] = useState<InvestmentEarnings | null>(null)
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [earningsLoading, setEarningsLoading] = useState(true)
  const financeScore = 8.4

  useEffect(() => {
    async function fetchMonthlySavings() {
      try {
        const response = await fetch('/api/monthly-savings?userId=1')
        if (!response.ok) {
          throw new Error('Failed to fetch monthly savings')
        }
        const data = await response.json()
        setLastMonthSavings(data.lastMonthSavings || 0)
        setMonthlyHistory(data.monthlyHistory || [])
      } catch (error) {
        console.error('Error fetching monthly savings:', error)
      } finally {
        setLoading(false)
      }
    }
    
    async function fetchInvestmentEarnings() {
      try {
        const response = await fetch('/api/investment-earnings?userId=1')
        if (!response.ok) {
          throw new Error('Failed to fetch investment earnings')
        }
        const data = await response.json()
        setInvestmentEarnings(data)
      } catch (error) {
        console.error('Error fetching investment earnings:', error)
      } finally {
        setEarningsLoading(false)
      }
    }
    
    async function fetchSpendingByCategory() {
      try {
        const response = await fetch('/api/spending-by-category?userId=1')
        if (!response.ok) {
          throw new Error('Failed to fetch spending by category')
        }
        const data = await response.json()
        setCategoryData(data.categories || [])
      } catch (error) {
        console.error('Error fetching spending by category:', error)
      } finally {
        setCategoryLoading(false)
      }
    }
    
    fetchMonthlySavings()
    fetchInvestmentEarnings()
    fetchSpendingByCategory()
  }, [])

  // Format savings data for chart
  const savingsData = monthlyHistory.map(m => ({
    month: m.monthLabel,
    savings: m.savings,
  })).reverse() // Reverse to show oldest to newest

  // Format earnings data for interactive chart - ensure chronological order and cumulative values
  const earningsData = investmentEarnings?.monthlyBreakdown
    ? (() => {
        const sorted = [...investmentEarnings.monthlyBreakdown]
          .sort((a, b) => a.month.localeCompare(b.month)) // Sort by month chronologically
        
        // Calculate cumulative values so graph always goes up
        let cumulativeSavings = 0
        let cumulativeEarnings = 0
        let cumulativeValue = 0
        
        return sorted.map(m => {
          cumulativeSavings += m.savings
          cumulativeEarnings += m.potential_earnings
          cumulativeValue += m.potential_value
          
          return {
            month: m.monthLabel,
            savings: cumulativeSavings,
            earnings: cumulativeEarnings,
            totalValue: cumulativeValue,
          }
        })
      })()
    : []

  return (
    <div className="space-y-8">
      {/* Finance Score & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Finance Score Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-blue-50/50 dark:from-white/10 dark:to-blue-950/20 border border-blue-200/30 dark:border-blue-800/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Finance Score</p>
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            {financeScore.toFixed(1)}
          </p>
          <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">Excellent financial health</p>
        </div>

        {/* What You Could Have Saved Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-50/90 to-emerald-50/90 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/50 dark:border-green-800/30 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">What You Could Have Saved</p>
            <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          {loading ? (
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">...</p>
          ) : (
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">${lastMonthSavings.toFixed(2)}</p>
          )}
          <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-2">Last month potential savings</p>
        </div>

        {/* What You Could Have Earned Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-50/90 to-teal-50/90 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/30 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">What You Could Have Earned</p>
            <ArrowUpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          {earningsLoading ? (
            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">...</p>
          ) : investmentEarnings && investmentEarnings.totalEarnings !== undefined ? (
            <>
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                ${(investmentEarnings.totalEarnings || 0).toFixed(2)}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-2">
                {(investmentEarnings.totalReturnPercent || 0).toFixed(1)}% return on investments
              </p>
            </>
          ) : (
            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">$0.00</p>
          )}
        </div>

        {/* Spending Trend Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-amber-50/50 dark:from-white/10 dark:to-amber-950/20 border border-amber-200/30 dark:border-amber-800/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Spending</p>
            <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-4xl font-bold text-amber-700 dark:text-amber-300">$847</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-2">
            <span className="text-amber-600 dark:text-amber-400 font-semibold">+3.2%</span> vs last month
          </p>
        </div>

        {/* Income Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-indigo-50/50 dark:from-white/10 dark:to-indigo-950/20 border border-indigo-200/30 dark:border-indigo-800/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Income</p>
            <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-4xl font-bold text-indigo-700 dark:text-indigo-300">$3,750</p>
          <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-2">This month</p>
        </div>
      </div>

      {/* Interactive Earnings Chart - Full Width */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 via-green-50/50 to-emerald-50/50 dark:from-white/10 dark:via-green-950/20 dark:to-emerald-950/20 border border-green-200/30 dark:border-green-800/20 rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2 text-green-700 dark:text-green-300">What You Could Have Earned Each Month</h3>
          <p className="text-sm text-muted-foreground">Interactive area chart showing potential earnings and total value with 10% annual compound interest</p>
        </div>
        {earningsLoading ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-muted-foreground">Loading earnings data...</p>
          </div>
        ) : earningsData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-muted-foreground">No earnings data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={earningsData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="month" 
                stroke="rgba(255,255,255,0.5)" 
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)" 
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "rgba(0,0,0,0.9)", 
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "10px",
                  padding: "14px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'earnings') return [`$${value.toFixed(2)}`, '💰 Earnings']
                  if (name === 'totalValue') return [`$${value.toFixed(2)}`, '💵 Total Value']
                  if (name === 'savings') return [`$${value.toFixed(2)}`, '💸 Savings']
                  return [`$${value.toFixed(2)}`, name]
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.95)', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}
              />
              <Area 
                type="monotone" 
                dataKey="totalValue" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                name="Total Value"
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Area 
                type="monotone" 
                dataKey="earnings" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorEarnings)" 
                name="Earnings"
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.9)' }}>{value}</span>}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-purple-50/50 dark:from-white/10 dark:to-purple-950/20 border border-purple-200/30 dark:border-purple-800/20 rounded-2xl p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-2 text-purple-700 dark:text-purple-300">Spending by Category</h3>
            <p className="text-sm text-muted-foreground">Your spending breakdown across different categories</p>
          </div>
          {categoryLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-muted-foreground">Loading category data...</p>
            </div>
          ) : categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-muted-foreground">No spending data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: "rgba(0,0,0,0.85)", 
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      padding: "12px"
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      return [
                        `$${value.toFixed(2)} (${props.payload.percentage}%)`,
                        props.payload.name
                      ];
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.9)', marginBottom: '8px', fontWeight: 'bold' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                    formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.9)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Category breakdown list */}
              <div className="space-y-2 pt-4 border-t border-purple-200/30 dark:border-purple-800/20">
                {categoryData.map((category, index) => (
                  <div 
                    key={category.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium text-foreground">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">${category.value.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{category.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Monthly Savings History */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-green-50/50 dark:from-white/10 dark:to-green-950/20 border border-green-200/30 dark:border-green-800/20 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-300">Monthly Potential Savings History</h3>
          <p className="text-xs text-muted-foreground mb-6">Your potential savings by month</p>
          {loading ? (
            <div className="flex items-center justify-center h-[250px]">
              <p className="text-muted-foreground">Loading savings data...</p>
            </div>
          ) : monthlyHistory.length === 0 ? (
            <div className="flex items-center justify-center h-[250px]">
              <p className="text-muted-foreground">No savings data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="month" 
                  stroke="rgba(255,255,255,0.5)" 
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.5)" 
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "rgba(0,0,0,0.85)", 
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    padding: "12px"
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Potential Savings']}
                  labelStyle={{ color: 'rgba(255,255,255,0.9)', marginBottom: '8px', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="savings" 
                  fill="#10b981" 
                  radius={[8, 8, 0, 0]}
                  className="hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
