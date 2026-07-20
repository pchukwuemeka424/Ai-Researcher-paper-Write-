"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { NavIcon } from "@/components/aula/NavIcon";
import { useAuth } from "@/hooks/useAuth";
import { AULA_QUICK_ACCESS } from "@/lib/aula-nav";
import { researchTokenAllowance } from "@/lib/student-tokens";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function MiniCalendar() {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(now);
	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const today = now.getDate();

	const cells: (number | null)[] = [];
	for (let i = 0; i < firstDay; i++) cells.push(null);
	for (let d = 1; d <= daysInMonth; d++) cells.push(d);

	return (
		<section className="aula-panel-widget aula-panel-cal">
			<div className="aula-panel-widget-head">
				<h3 className="aula-panel-widget-title">{monthLabel}</h3>
				<span className="aula-panel-cal-today-label">Today {today}</span>
			</div>
			<div className="aula-cal-grid" role="grid" aria-label="Calendar">
				{WEEKDAYS.map((d) => (
					<span key={d} className="aula-cal-weekday" role="columnheader">
						{d}
					</span>
				))}
				{cells.map((day, i) =>
					day === null ? (
						<span key={`e-${i}`} className="aula-cal-day aula-cal-day-empty" />
					) : (
						<span
							key={day}
							className={`aula-cal-day${day === today ? " aula-cal-day-today" : ""}`}
							role="gridcell"
						>
							{day}
						</span>
					),
				)}
			</div>
		</section>
	);
}

function TokenWidget() {
	const { user } = useAuth();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || !user) return null;

	const allowance = user.tokenQuota?.allowance ?? researchTokenAllowance(user.role) ?? 0;
	const remaining = user.tokenQuota?.remaining ?? allowance;
	const used = Math.max(0, allowance - remaining);
	const percent = allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0;

	return (
		<section className="aula-panel-widget aula-panel-tokens">
			<div className="aula-panel-widget-head">
				<h3 className="aula-panel-widget-title">Token balance</h3>
			</div>
			<p className="aula-panel-token-value">{remaining.toLocaleString()}</p>
			<p className="aula-panel-token-meta">
				{allowance > 0 ? `${percent}% of ${allowance.toLocaleString()} used` : "No allocation set"}
			</p>
			{allowance > 0 && (
				<div className="aula-panel-token-track" aria-hidden>
					<span className="aula-panel-token-fill" style={{ width: `${percent}%` }} />
				</div>
			)}
		</section>
	);
}

export function AulaRightPanel() {
	return (
		<aside className="aula-panel" aria-label="Dashboard widgets">
			<section className="aula-panel-widget aula-panel-shortcuts">
				<div className="aula-panel-widget-head">
					<h3 className="aula-panel-widget-title">Quick links</h3>
				</div>
				<ul className="aula-panel-link-list">
					{AULA_QUICK_ACCESS.map((tool) => (
						<li key={tool.id}>
							<Link href={tool.href} className="aula-panel-link">
								<span className={`aula-panel-link-icon aula-quick-icon-${tool.iconColor}`} aria-hidden>
									<NavIcon id={tool.id} size={14} />
								</span>
								<span className="aula-panel-link-label">{tool.label}</span>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
									<path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</Link>
						</li>
					))}
					<li>
						<Link href="/research/saved" className="aula-panel-link">
							<span className="aula-panel-link-icon aula-quick-icon-teal" aria-hidden>
								<NavIcon id="notes" size={14} />
							</span>
							<span className="aula-panel-link-label">Saved papers</span>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
								<path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</Link>
					</li>
				</ul>
			</section>

			<TokenWidget />
			<MiniCalendar />

			<section className="aula-panel-widget">
				<div className="aula-panel-widget-head">
					<h3 className="aula-panel-widget-title">Focus</h3>
				</div>
				<p className="aula-panel-empty">
					Use Lesson Planner for teaching sessions and Research Assistant for cited paper drafts.
				</p>
			</section>
		</aside>
	);
}
