import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];

export function DailyChart({ data = [] }) {
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={v => v.slice(5)} // show MM-DD
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    labelFormatter={v => `Date: ${v}`}
                />
                <Bar dataKey="total" name="Total" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function TypePieChart({ data = {} }) {
    const entries = Object.entries(data).map(([name, value]) => ({ name, value }));
    if (entries.length === 0) return <p className="text-center text-slate-400 text-sm py-8">No data yet</p>;

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Pie data={entries} dataKey="value" nameKey="name" outerRadius={75} innerRadius={40} paddingAngle={3}>
                    {entries.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
        </ResponsiveContainer>
    );
}

export function TrendLine({ data = [] }) {
    return (
        <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={v => `Date: ${v}`} />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}
