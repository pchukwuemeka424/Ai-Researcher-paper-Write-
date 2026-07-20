"use client";

import { useId } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type ChartType = "bar" | "line" | "area" | "pie" | "scatter";

type ResearchChartSpec = {
	type: ChartType;
	kind?: "evidence" | "illustrative";
	title: string;
	caption?: string;
	xKey: string;
	yKeys: string[];
	data: Array<Record<string, string | number>>;
};

type ResearchImageSpec = {
	type: "conceptual-diagram";
	title: string;
	caption: string;
	nodes: Array<{ id: string; label: string }>;
	edges: Array<{ from: string; to: string; label?: string }>;
};

type ResearchFigureSpec = {
	type: "research-figure";
	title: string;
	caption: string;
	mime: string;
	dataUrl: string;
};

const CHART_TYPES = new Set<ChartType>(["bar", "line", "area", "pie", "scatter"]);
const COLORS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed"];

function parseChart(raw: string): ResearchChartSpec | null {
	try {
		const value = JSON.parse(raw) as Partial<ResearchChartSpec>;
		if (!value.type || !CHART_TYPES.has(value.type)) return null;
		if (!value.xKey?.trim() || !Array.isArray(value.yKeys) || !value.yKeys.length) return null;
		if (!Array.isArray(value.data) || !value.data.length) return null;
		const yKeys = value.yKeys.map(String).filter(Boolean).slice(0, 5);
		const data = value.data.slice(0, 30).map((row) => {
			const safe: Record<string, string | number> = {};
			for (const [key, item] of Object.entries(row ?? {})) {
				if (typeof item === "string" || (typeof item === "number" && Number.isFinite(item))) {
					safe[key] = item;
				}
			}
			return safe;
		});
		return {
			type: value.type,
			kind: value.kind === "illustrative" ? "illustrative" : "evidence",
			title: value.title?.trim() || "Research data visualization",
			caption: typeof value.caption === "string" ? value.caption.trim() : "",
			xKey: value.xKey,
			yKeys,
			data,
		};
	} catch {
		return null;
	}
}

function parseImage(raw: string): ResearchImageSpec | null {
	try {
		const value = JSON.parse(raw) as Partial<ResearchImageSpec>;
		if (value.type !== "conceptual-diagram" || !Array.isArray(value.nodes)) return null;
		const nodes = value.nodes
			.filter((node) => node && String(node.id).trim() && String(node.label).trim())
			.slice(0, 9)
			.map((node) => ({ id: String(node.id), label: String(node.label) }));
		if (nodes.length < 2) return null;
		const ids = new Set(nodes.map((node) => node.id));
		const edges = (Array.isArray(value.edges) ? value.edges : [])
			.filter((edge) => edge && ids.has(String(edge.from)) && ids.has(String(edge.to)))
			.slice(0, 12)
			.map((edge) => ({
				from: String(edge.from),
				to: String(edge.to),
				label: edge.label ? String(edge.label) : undefined,
			}));
		return {
			type: "conceptual-diagram",
			title: value.title?.trim() || "Conceptual illustration",
			caption: value.caption?.trim() || "AI-generated conceptual illustration.",
			nodes,
			edges,
		};
	} catch {
		return null;
	}
}

function parseFigure(raw: string): ResearchFigureSpec | null {
	try {
		const value = JSON.parse(raw) as Partial<ResearchFigureSpec>;
		const dataUrl = typeof value.dataUrl === "string" ? value.dataUrl.trim() : "";
		if (!dataUrl.startsWith("data:image/")) return null;
		return {
			type: "research-figure",
			title: value.title?.trim() || "Research figure",
			caption: value.caption?.trim() || "From research note Figures.",
			mime: value.mime?.trim() || "image/png",
			dataUrl,
		};
	} catch {
		return null;
	}
}

function ResearchFigure({ spec }: { spec: ResearchFigureSpec }) {
	return (
		<figure className="research-paper-figure research-paper-figure-asset">
			<p className="research-paper-figure-title">{spec.title}</p>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={spec.dataUrl} alt={spec.title} className="research-paper-figure-img" />
			<p className="research-paper-figure-note">{spec.caption}</p>
		</figure>
	);
}

function ResearchChart({ spec }: { spec: ResearchChartSpec }) {
	const common = (
		<>
			<CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" />
			<XAxis dataKey={spec.xKey} tick={{ fontSize: 11 }} />
			<YAxis tick={{ fontSize: 11 }} />
			<Tooltip />
			<Legend />
		</>
	);

	let chart;
	if (spec.type === "pie") {
		const valueKey = spec.yKeys[0]!;
		chart = (
			<PieChart>
				<Tooltip />
				<Legend />
				<Pie data={spec.data} dataKey={valueKey} nameKey={spec.xKey} outerRadius="78%" label>
					{spec.data.map((_, index) => (
						<Cell key={index} fill={COLORS[index % COLORS.length]} />
					))}
				</Pie>
			</PieChart>
		);
	} else if (spec.type === "scatter") {
		chart = (
			<ScatterChart>
				<CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" />
				<XAxis type="number" dataKey={spec.xKey} name={spec.xKey} tick={{ fontSize: 11 }} />
				<YAxis type="number" dataKey={spec.yKeys[0]} name={spec.yKeys[0]} tick={{ fontSize: 11 }} />
				<Tooltip cursor={{ strokeDasharray: "3 3" }} />
				<Legend />
				<Scatter name={spec.title} data={spec.data} fill={COLORS[0]} />
			</ScatterChart>
		);
	} else if (spec.type === "line") {
		chart = (
			<LineChart data={spec.data}>
				{common}
				{spec.yKeys.map((key, index) => (
					<Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} />
				))}
			</LineChart>
		);
	} else if (spec.type === "area") {
		chart = (
			<AreaChart data={spec.data}>
				{common}
				{spec.yKeys.map((key, index) => (
					<Area
						key={key}
						type="monotone"
						dataKey={key}
						stroke={COLORS[index % COLORS.length]}
						fill={COLORS[index % COLORS.length]}
						fillOpacity={0.2}
					/>
				))}
			</AreaChart>
		);
	} else {
		chart = (
			<BarChart data={spec.data}>
				{common}
				{spec.yKeys.map((key, index) => (
					<Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
				))}
			</BarChart>
		);
	}

	return (
		<figure className="research-paper-chart">
			<figcaption>{spec.title}</figcaption>
			<div className="research-paper-chart-canvas">
				<ResponsiveContainer width="100%" height="100%">
					{chart}
				</ResponsiveContainer>
			</div>
			{(spec.caption || spec.kind === "illustrative") && (
				<p className="research-paper-figure-note">
					{spec.caption || "Illustrative synthetic values—not observed study findings."}
				</p>
			)}
		</figure>
	);
}

function ResearchImage({ spec }: { spec: ResearchImageSpec }) {
	const markerId = useId().replace(/:/g, "");
	const positions = new Map(
		spec.nodes.map((node, index) => [
			node.id,
			{ x: 150 + (index % 3) * 300, y: 70 + Math.floor(index / 3) * 130 },
		]),
	);
	const height = Math.max(220, 140 + Math.ceil(spec.nodes.length / 3) * 130);

	return (
		<figure className="research-paper-chart research-paper-image">
			<figcaption>{spec.title}</figcaption>
			<svg viewBox={`0 0 900 ${height}`} role="img" aria-label={spec.title}>
				<defs>
					<marker id={markerId} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
						<path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
					</marker>
				</defs>
				{spec.edges.map((edge, index) => {
					const from = positions.get(edge.from);
					const to = positions.get(edge.to);
					if (!from || !to) return null;
					return (
						<g key={`${edge.from}-${edge.to}-${index}`}>
							<line
								x1={from.x}
								y1={from.y + 42}
								x2={to.x}
								y2={to.y - 42}
								stroke="#64748b"
								strokeWidth="2"
								markerEnd={`url(#${markerId})`}
							/>
							{edge.label && (
								<text
									x={(from.x + to.x) / 2}
									y={(from.y + to.y) / 2 - 7}
									textAnchor="middle"
									fontSize="13"
									fill="#475569"
								>
									{edge.label.slice(0, 42)}
								</text>
							)}
						</g>
					);
				})}
				{spec.nodes.map((node, index) => {
					const position = positions.get(node.id)!;
					return (
						<g key={node.id}>
							<rect
								x={position.x - 112}
								y={position.y - 38}
								width="224"
								height="76"
								rx="14"
								fill={COLORS[index % COLORS.length]}
								fillOpacity="0.12"
								stroke={COLORS[index % COLORS.length]}
								strokeWidth="2"
							/>
							<foreignObject x={position.x - 102} y={position.y - 28} width="204" height="56">
								<div className="research-paper-image-node">{node.label}</div>
							</foreignObject>
						</g>
					);
				})}
			</svg>
			<p className="research-paper-figure-note">{spec.caption}</p>
		</figure>
	);
}

function MarkdownSection({ content }: { content: string }) {
	if (!content.trim()) return null;
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				img: () => null,
				a: ({ href, children }) => (
					<a href={href} target="_blank" rel="noopener noreferrer">
						{children}
					</a>
				),
				h3: ({ children }) => <h3 className="paper-section-heading">{children}</h3>,
			}}
		>
			{content}
		</ReactMarkdown>
	);
}

export function ResearchPaperMarkdown({ content }: { content: string }) {
	const parts: Array<
		| { kind: "markdown"; value: string }
		| { kind: "chart"; spec: ResearchChartSpec }
		| { kind: "image"; spec: ResearchImageSpec }
		| { kind: "figure"; spec: ResearchFigureSpec }
	> = [];
	const pattern = /```(research-chart|research-image|research-figure)\s*([\s\S]*?)```/gi;
	let cursor = 0;
	for (const match of content.matchAll(pattern)) {
		const index = match.index ?? 0;
		if (index > cursor) parts.push({ kind: "markdown", value: content.slice(cursor, index) });
		const lang = match[1]?.toLowerCase() ?? "";
		if (lang === "research-image") {
			const spec = parseImage(match[2] ?? "");
			if (spec) parts.push({ kind: "image", spec });
			else parts.push({ kind: "markdown", value: match[0] });
		} else if (lang === "research-figure") {
			const spec = parseFigure(match[2] ?? "");
			if (spec) parts.push({ kind: "figure", spec });
			else parts.push({ kind: "markdown", value: match[0] });
		} else {
			const spec = parseChart(match[2] ?? "");
			if (spec) parts.push({ kind: "chart", spec });
			else parts.push({ kind: "markdown", value: match[0] });
		}
		cursor = index + match[0].length;
	}
	if (cursor < content.length) parts.push({ kind: "markdown", value: content.slice(cursor) });
	if (!parts.length) parts.push({ kind: "markdown", value: content });

	return (
		<>
			{parts.map((part, index) =>
				part.kind === "chart" ? (
					<ResearchChart key={`chart-${index}`} spec={part.spec} />
				) : part.kind === "image" ? (
					<ResearchImage key={`image-${index}`} spec={part.spec} />
				) : part.kind === "figure" ? (
					<ResearchFigure key={`figure-${index}`} spec={part.spec} />
				) : (
					<MarkdownSection key={`markdown-${index}`} content={part.value} />
				),
			)}
		</>
	);
}
