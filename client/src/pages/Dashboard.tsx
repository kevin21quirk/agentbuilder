import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Stats {
  totalAgents: number; activeAgents: number; totalWorkflows: number; runningWorkflows: number;
  tasksCompleted: number; totalIntegrations: number; connectedIntegrations: number;
  totalExecutions: number; successRate: number; failRate: number;
}
interface ActivityItem { id: string; type: string; title: string; timestamp: string; status: 'success' | 'running' | 'error'; }
interface DailyCount { date: string; count: number; }
interface MonthlyCount { month: string; agents_created: number; workflows_created: number; }

/* ── Donut Ring Gauge ───────────────────────────────────────── */
function DonutGauge({ pct, color, label, size = 120 }: { pct: number; color: string; label: string; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a4a8a" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-white tabular-nums">{pct}%</span>
      </div>
      <span className="mt-2 text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

/* ── Area Chart SVG ─────────────────────────────────────────── */
function AreaChart({ data, color, height = 160, labels }: { data: number[][]; color: string[]; height?: number; labels: string[] }) {
  const w = 500;
  const allVals = data.flat();
  const max = Math.max(...allVals, 1) * 1.15;
  const pad = 30;
  const chartH = height - pad;

  const toPath = (series: number[], close = false) => {
    if (series.length < 2) return close ? `M0,${chartH} L0,${chartH} L${w},${chartH} Z` : `M0,${chartH} L${w},${chartH}`;
    const pts = series.map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = chartH - (v / max) * chartH;
      return `${x},${y}`;
    });
    if (close) return `M0,${chartH} L${pts.join(' L')} L${w},${chartH} Z`;
    return `M${pts.join(' L')}`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        {color.map((c, i) => (
          <linearGradient key={i} id={`ac${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.4" />
            <stop offset="100%" stopColor={c} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1="0" y1={chartH - p * chartH} x2={w} y2={chartH - p * chartH} stroke="#1a4a8a" strokeWidth="0.5" />
      ))}
      {labels.length > 1 && labels.map((l, i) => (
        <text key={i} x={(i / (labels.length - 1)) * w} y={height - 4} fill="#6b9fd4" fontSize="10" textAnchor="middle" fontFamily="monospace">{l}</text>
      ))}
      {data.map((series, i) => (
        <g key={i}>
          <path d={toPath(series, true)} fill={`url(#ac${i})`} />
          <path d={toPath(series)} fill="none" stroke={color[i]} strokeWidth="2" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}

/* ── Live Clock ──────────────────────────────────────────────── */
function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const now = useLiveClock();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyCount[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyCount[]>([]);

  useEffect(() => {
    fetchStats(); fetchActivities(); fetchDailyActivity(); fetchMonthlyData();
  }, []);

  const fetchStats = async () => { try { setStats(await (await fetch('/api/stats')).json()); } catch {} };
  const fetchActivities = async () => { try { setActivities(await (await fetch('/api/activities')).json()); } catch {} };
  const fetchDailyActivity = async () => { try { setDailyActivity(await (await fetch('/api/stats/activity-daily')).json()); } catch {} };
  const fetchMonthlyData = async () => { try { setMonthlyData(await (await fetch('/api/stats/activity-monthly')).json()); } catch {} };

  const ag = stats?.totalAgents ?? 0;
  const agA = stats?.activeAgents ?? 0;
  const wf = stats?.totalWorkflows ?? 0;
  const wfR = stats?.runningWorkflows ?? 0;
  const tasks = stats?.tasksCompleted ?? 0;
  const totalIntegrations = stats?.totalIntegrations ?? 0;
  const connectedIntegrations = stats?.connectedIntegrations ?? 0;
  const successRate = stats?.successRate ?? 0;
  const activeRate = ag > 0 ? Math.round((agA / ag) * 100) : 0;
  const wfActiveRate = wf > 0 ? Math.round((wfR / Math.max(wf, 1)) * 100) : 0;

  const agentSeries = monthlyData.map(m => Number(m.agents_created));
  const wfSeries = monthlyData.map(m => Number(m.workflows_created));
  const monthLabels = monthlyData.map(m => m.month);

  const dailyBars = dailyActivity.map(d => Number(d.count));
  const dailyMax = Math.max(...dailyBars, 1);

  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const topItems = [
    { label: 'Workflow Executions', value: stats?.totalExecutions ?? 0, max: Math.max(stats?.totalExecutions ?? 0, 1), color: '#00d4ff' },
    { label: 'Active Agents', value: agA, max: Math.max(ag, 1), color: '#f59e0b' },
    { label: 'Running Workflows', value: wfR, max: Math.max(wf, 1), color: '#10b981' },
    { label: 'Connected Integrations', value: connectedIntegrations, max: Math.max(totalIntegrations, 1), color: '#a78bfa' },
  ];

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto" style={{ background: '#163d77' }}>
      <div className="grid grid-cols-12 grid-rows-[auto_auto_auto] gap-[1px] min-h-full" style={{ background: 'rgba(255,255,255,0.08)' }}>

        {/* ═══ TOP LEFT: Agent Distribution (donut) ═══════════════ */}
        <div className="col-span-3 row-span-2 p-5 flex flex-col" style={{ background: '#163d77' }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400 mb-4">Agent Distribution</h3>
          {/* Mini donut */}
          <div className="flex-1 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-36 h-36">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#1a4a8a" strokeWidth="12" />
              {/* active segment */}
              <circle cx="60" cy="60" r="50" fill="none" stroke="#00d4ff" strokeWidth="12"
                strokeDasharray={`${(agA / Math.max(ag, 1)) * 314} 314`}
                strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-700" />
              {/* idle segment */}
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="12"
                strokeDasharray={`${((ag - agA) / Math.max(ag, 1)) * 314} 314`}
                strokeDashoffset={`${-(agA / Math.max(ag, 1)) * 314}`}
                strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-700" />
              <text x="60" y="56" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="monospace">{ag}</text>
              <text x="60" y="72" textAnchor="middle" fill="#4a6fa1" fontSize="9" fontFamily="sans-serif">TOTAL</text>
            </svg>
          </div>
          {/* Legend */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#00d4ff' }} /><span className="text-gray-400">Active</span></div>
              <span className="font-mono font-bold text-white">{agA}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} /><span className="text-gray-400">Idle</span></div>
              <span className="font-mono font-bold text-white">{Math.max(ag - agA, 0)}</span>
            </div>
          </div>
          <button onClick={() => navigate('/agents')} className="mt-4 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider">View Agents &rarr;</button>
        </div>

        {/* ═══ TOP CENTER: Main Area Chart ════════════════════════ */}
        <div className="col-span-6 row-span-2 flex flex-col" style={{ background: '#163d77' }}>
          {/* Header with big numbers */}
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400 mb-3">System Activity</h3>
            <div className="flex items-start gap-8">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-white tabular-nums font-mono">{ag}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#10b981', color: '#064e3b' }}>+{agA}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#00d4ff' }} />
                  <span className="text-[11px] text-gray-400">Agents</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-white tabular-nums font-mono">{wf}</span>
                  {wfR > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#f59e0b', color: '#78350f' }}>+{wfR}</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                  <span className="text-[11px] text-gray-400">Workflows</span>
                </div>
              </div>
              <div className="ml-auto text-right">
                <span className="text-[10px] font-mono text-gray-500">{dateStr}</span>
                <div className="text-lg font-mono font-bold text-white tabular-nums tracking-wider">{timeStr}</div>
              </div>
            </div>
          </div>
          {/* Chart */}
          <div className="flex-1 px-3 pb-2">
            <AreaChart
              data={agentSeries.length > 0 ? [agentSeries, wfSeries] : [[0],[0]]}
              color={['#00d4ff', '#f59e0b']}
              height={200}
              labels={monthLabels.length > 0 ? monthLabels : ['']}
            />
          </div>
          {/* Bottom metric strip */}
          <div className="grid grid-cols-5 border-t" style={{ borderColor: '#1a4a8a' }}>
            {[
              { label: 'Agents', val: ag },
              { label: 'Workflows', val: wf },
              { label: 'Executions', val: tasks },
              { label: 'Running', val: wfR },
              { label: 'Integrations', val: totalIntegrations },
            ].map((m, i) => (
              <div key={i} className="p-3 text-center" style={{ borderRight: i < 4 ? '1px solid #1a4a8a' : 'none' }}>
                <div className="text-lg font-bold text-white font-mono tabular-nums">{m.val}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ TOP RIGHT: Status + clock ══════════════════════════ */}
        <div className="col-span-3 row-span-2 p-5 flex flex-col" style={{ background: '#163d77' }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400 mb-3">System Status</h3>
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-emerald-500" /></span>
            <span className="text-xs font-semibold text-emerald-400">All systems operational</span>
          </div>

          {/* Rankings */}
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3 mt-2">Performance Rank</h4>
          <div className="space-y-3 flex-1">
            {topItems.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-300">{item.label}</span>
                  <span className="text-[11px] font-mono font-bold text-white">{item.value}</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: '#1a4a8a' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.value / item.max) * 100}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1a4a8a' }}>
            <button onClick={() => navigate('/integrations')} className="w-full text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider text-left">Manage Integrations &rarr;</button>
          </div>
        </div>

        {/* ═══ BOTTOM LEFT: Activity Sampling Bars ═════════════════ */}
        <div className="col-span-3 p-5" style={{ background: '#163d77' }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400 mb-3">Activity (14d)</h3>
          <div className="flex items-end gap-[3px] h-16">
            {dailyBars.map((v: number, i: number) => (
              <div key={i} className="flex-1 rounded-t transition-all hover:opacity-80" style={{ height: `${dailyMax > 0 ? (v / dailyMax) * 100 : 0}%`, background: `linear-gradient(to top, #00d4ff, #0ea5e9)` }} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] font-mono text-gray-500">14d ago</span>
            <span className="text-[9px] font-mono text-gray-500">today</span>
          </div>
        </div>

        {/* ═══ BOTTOM CENTER: Donut Gauges ════════════════════════ */}
        <div className="col-span-6 p-5 flex items-center justify-around" style={{ background: '#163d77' }}>
          <div className="relative">
            <DonutGauge pct={successRate} color="#10b981" label="Success Rate" size={100} />
          </div>
          <div className="relative">
            <DonutGauge pct={activeRate} color="#00d4ff" label="Agents Active" size={100} />
          </div>
          <div className="relative">
            <DonutGauge pct={wfActiveRate} color="#f59e0b" label="Workflows Running" size={100} />
          </div>
        </div>

        {/* ═══ BOTTOM RIGHT: Event Log ═════════════════════════════ */}
        <div className="col-span-3 p-5 flex flex-col" style={{ background: '#163d77' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">Event Log</h3>
            <button onClick={() => navigate('/logs')} className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors">All &rarr;</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 max-h-[120px]">
            {activities.length === 0 ? (
              <p className="text-[11px] text-gray-600 text-center py-4">No events yet</p>
            ) : (
              activities.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: '1px solid #1a4a8a' }}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    a.status === 'success' ? 'bg-emerald-400' : a.status === 'error' ? 'bg-red-400' : 'bg-blue-400'
                  }`} />
                  <span className="text-[10px] text-gray-300 truncate flex-1">{a.title}</span>
                  <span className={`text-[9px] font-bold uppercase flex-shrink-0 ${
                    a.status === 'success' ? 'text-emerald-400' : a.status === 'error' ? 'text-red-400' : 'text-blue-400'
                  }`}>{a.status === 'success' ? 'OK' : a.status === 'error' ? 'ERR' : 'RUN'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
