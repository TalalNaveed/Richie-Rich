"use client"

import { TrendingUp, Target, Zap, DollarSign } from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

const spendingData = [
  { month: "Aug", groceries: 180, dining: 120, entertainment: 90, utilities: 150 },
  { month: "Sep", groceries: 200, dining: 140, entertainment: 80, utilities: 150 },
  { month: "Oct", groceries: 220, dining: 130, entertainment: 100, utilities: 150 },
  { month: "Nov", groceries: 210, dining: 150, entertainment: 95, utilities: 150 },
]

const savingsData = [
  { week: "Week 1", savings: 8.5 },
  { week: "Week 2", savings: 12.3 },
  { week: "Week 3", savings: 6.8 },
  { week: "Week 4", savings: 4.85 },
]

const categoryData = [
  { name: "Groceries", value: 45 },
  { name: "Dining", value: 25 },
  { name: "Entertainment", value: 20 },
  { name: "Utilities", value: 10 },
]

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function AnalyticsDashboard() {
  const totalSavings = 32.45
  const financeScore = 8.4

  return (
    <div className="space-y-8">
      {/* Finance Score & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Finance Score Card */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground font-medium">Finance Score</p>
            <Target className="w-5 h-5 text-primary" />
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {financeScore.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Excellent financial health</p>
        </div>

        {/* Total Savings Card */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground font-medium">This Month</p>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-4xl font-bold text-green-600 dark:text-green-400">${totalSavings.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-2">Total savings found</p>
        </div>

        {/* Spending Trend Card */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground font-medium">Spending</p>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-4xl font-bold">$847</p>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="text-orange-600 dark:text-orange-400">+3.2%</span> vs last month
          </p>
        </div>

        {/* Income Card */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground font-medium">Income</p>
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-4xl font-bold">$3,750</p>
          <p className="text-xs text-muted-foreground mt-2">This month</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Savings Trend */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Savings Found This Month</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={savingsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="week" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
              />
              <Line type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Spending Trends */}
        <div className="lg:col-span-2 backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Monthly Spending Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spendingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
              />
              <Legend />
              <Bar dataKey="groceries" stackId="a" fill="#10b981" />
              <Bar dataKey="dining" stackId="a" fill="#f59e0b" />
              <Bar dataKey="entertainment" stackId="a" fill="#ef4444" />
              <Bar dataKey="utilities" stackId="a" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Investment Recommendations */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-primary/20 to-accent/20 dark:from-primary/10 dark:to-accent/10 border border-primary/30 dark:border-primary/10 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/20 rounded-lg">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Investment Opportunity</h3>
            <p className="text-muted-foreground mb-4">
              You've saved <span className="font-bold text-foreground">${totalSavings.toFixed(2)}</span> this month!
              Consider investing in these opportunities:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { ticker: "AAPL", name: "Apple Inc.", return: "+24.5%" },
                { ticker: "TSLA", name: "Tesla Inc.", return: "+18.2%" },
                { ticker: "VTI", name: "Vanguard Total Stock", return: "+12.8%" },
              ].map((stock) => (
                <button
                  key={stock.ticker}
                  className="p-3 backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-lg hover:bg-white/95 dark:hover:bg-white/15 transition-all duration-300 text-left"
                >
                  <p className="font-bold text-sm">{stock.ticker}</p>
                  <p className="text-xs text-muted-foreground">{stock.name}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">{stock.return} YTD</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
