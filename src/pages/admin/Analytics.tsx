import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { analyticsApi, Range, AnalyticsResponse } from '../../services/analytics';

const ranges: { value: Range; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
];

const trendIcons: Record<string, string> = { up: '↑', down: '↓', stable: '→' };
const trendColors: Record<string, string> = { up: 'text-red-500', down: 'text-green-600', stable: 'text-gray-400' };

export default function Analytics() {
  const [range, setRange] = useState<Range>('90d');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (selectedRange: Range) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getAnalytics(selectedRange);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const handleRangeChange = (newRange: Range) => {
    setRange(newRange);
  };

  if (isLoading && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-7 w-48 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 w-40 bg-gray-100 rounded"></div>
          </div>
          <div className="h-9 w-64 bg-gray-100 rounded-xl"></div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-28 flex flex-col justify-between">
              <div className="h-3 w-28 bg-gray-100 rounded"></div>
              <div className="h-7 w-16 bg-gray-200 rounded"></div>
              <div className="h-3 w-24 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 h-64"></div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-64"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-semibold mb-2">Unable to Load Analytics</p>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchAnalytics(range)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || [];
  const healthTrend = data?.health_trend || [];
  const currentDistribution = data?.current_distribution || [];
  const emergencyCategories = data?.emergency_categories || [];
  const hotspots = data?.hotspots || [];
  const insights = data?.insights || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/app/admin" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900 font-medium">Analytics</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Municipal canopy diagnostics & risk analytics · {data?.range_label || 'Current Period'}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => handleRangeChange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 mb-3 leading-tight">{m.label}</p>
            <p className={`text-2xl font-semibold ${m.color} mb-0.5`}>{m.value}</p>
            <p className="text-xs text-gray-400">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Health % trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <h3 className="font-semibold text-gray-900 text-sm mb-5">Health Distribution Trend (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={healthTrend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [`${v}%`]} />
              <Line type="monotone" dataKey="healthy" stroke="#16a34a" strokeWidth={2} dot={false} name="Healthy %" />
              <Line type="monotone" dataKey="atRisk" stroke="#ea580c" strokeWidth={2} dot={false} name="At Risk %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current distribution pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <h3 className="font-semibold text-gray-900 text-sm mb-5">Current Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={currentDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                dataKey="value"
                paddingAngle={2}
              >
                {currentDistribution.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: unknown) => [`${v}%`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {currentDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Emergency categories */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <h3 className="font-semibold text-gray-900 text-sm mb-5">Emergency Categories</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emergencyCategories} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" fill="#2d6a4f" radius={[0, 4, 4, 0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk hotspots */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-5">Geographic Risk Hotspots</h3>
          <div className="space-y-2">
            {hotspots.map((h, i) => (
              <div key={h.area} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{h.area}</p>
                  <p className="text-xs text-gray-400">
                    {h.emergencies} emergencies · {h.atRisk} at risk
                  </p>
                </div>
                <span className={`text-sm font-semibold ${trendColors[h.trend] || 'text-gray-400'}`}>
                  {trendIcons[h.trend] || '→'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Environmental insights */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 text-sm mb-5">Environmental Insights</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div key={insight.title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{insight.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                  <span className="text-xs text-amber-600 font-medium">{insight.severity}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{insight.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
