"use client";

import { Fragment } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const COLORS = ["#2563eb", "#0d9488", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#65a30d", "#db2777"];

type Point = { name: string; value: number; [key: string]: string | number };

export function AdminBarChart({
	data,
	dataKey = "value",
	height = 240,
	color = COLORS[0],
}: {
	data: Point[];
	dataKey?: string;
	height?: number;
	color?: string;
}) {
	if (!data.length) return <p className="muted admin-chart-empty">No chart data</p>;
	return (
		<div className="admin-chart" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 60 : 30} />
					<YAxis tick={{ fontSize: 11 }} width={48} />
					<Tooltip />
					<Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

export function AdminMultiBarChart({
	data,
	series,
	height = 260,
}: {
	data: Point[];
	series: Array<{ key: string; label: string; color?: string }>;
	height?: number;
}) {
	if (!data.length) return <p className="muted admin-chart-empty">No chart data</p>;
	return (
		<div className="admin-chart" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis tick={{ fontSize: 11 }} width={48} />
					<Tooltip />
					<Legend />
					{series.map((s, i) => (
						<Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

export function AdminLineChart({
	data,
	dataKey = "value",
	height = 240,
	color = COLORS[0],
}: {
	data: Point[];
	dataKey?: string;
	height?: number;
	color?: string;
}) {
	if (!data.length) return <p className="muted admin-chart-empty">No chart data</p>;
	return (
		<div className="admin-chart" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis tick={{ fontSize: 11 }} width={48} />
					<Tooltip />
					<Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

export function AdminAreaChart({
	data,
	dataKey = "value",
	height = 240,
	color = COLORS[0],
}: {
	data: Point[];
	dataKey?: string;
	height?: number;
	color?: string;
}) {
	if (!data.length) return <p className="muted admin-chart-empty">No chart data</p>;
	return (
		<div className="admin-chart" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis tick={{ fontSize: 11 }} width={48} />
					<Tooltip />
					<Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2} />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

export function AdminPieChart({
	data,
	height = 240,
}: {
	data: Point[];
	height?: number;
}) {
	if (!data.length) return <p className="muted admin-chart-empty">No chart data</p>;
	return (
		<div className="admin-chart" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
						{data.map((_, i) => (
							<Cell key={i} fill={COLORS[i % COLORS.length]} />
						))}
					</Pie>
					<Tooltip />
					<Legend />
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}

export function AdminHeatmap({
	rows,
	cols,
	values,
}: {
	rows: string[];
	cols: string[];
	values: number[][];
}) {
	const flat = values.flat();
	const max = Math.max(1, ...flat);
	return (
		<div className="admin-heatmap" role="img" aria-label="Usage heatmap">
			<div className="admin-heatmap-corner" />
			{cols.map((c) => (
				<div key={c} className="admin-heatmap-col-label">
					{c}
				</div>
			))}
			{rows.map((row, ri) => (
				<Fragment key={row}>
					<div className="admin-heatmap-row-label">{row}</div>
					{cols.map((col, ci) => {
						const v = values[ri]?.[ci] ?? 0;
						const intensity = v / max;
						return (
							<div
								key={`${row}-${col}`}
								className="admin-heatmap-cell"
								title={`${row} ${col}: ${v}`}
								style={{ background: `rgba(37, 99, 235, ${0.08 + intensity * 0.85})` }}
							>
								{v > 0 ? v : ""}
							</div>
						);
					})}
				</Fragment>
			))}
		</div>
	);
}

export function toChartPoints(
	rows: Array<{ label?: string; key?: string; name?: string; value?: number; [k: string]: unknown }>,
	valueKey = "value",
): Point[] {
	return rows.map((row) => ({
		name: String(row.label ?? row.name ?? row.key ?? ""),
		value: Number(row[valueKey] ?? row.value ?? 0),
		...Object.fromEntries(
			Object.entries(row).filter(([k]) => !["label", "name", "key"].includes(k)),
		),
	}));
}
