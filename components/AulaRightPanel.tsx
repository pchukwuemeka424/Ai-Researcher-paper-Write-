"use client";

import { useState } from "react";

import { AULA_DEADLINES, AULA_TASKS, type TaskItem } from "@/lib/aula-nav";

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
		<section className="aula-panel-widget">
			<h3 className="aula-panel-widget-title">{monthLabel}</h3>
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

export function AulaRightPanel() {
	const [tasks, setTasks] = useState<TaskItem[]>(AULA_TASKS);
	const doneCount = tasks.filter((t) => t.done).length;

	const toggleTask = (id: string) => {
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
	};

	return (
		<aside className="aula-panel" aria-label="Dashboard widgets">
			<MiniCalendar />

			<section className="aula-panel-widget">
				<h3 className="aula-panel-widget-title">Upcoming deadlines</h3>
				<ul className="aula-deadline-list">
					{AULA_DEADLINES.map((item) => (
						<li key={item.id} className="aula-deadline-item">
							<div>
								<p className="aula-deadline-title">{item.title}</p>
								<p className="aula-deadline-due">{item.dueLabel}</p>
							</div>
							<span className={`aula-deadline-badge aula-deadline-badge-${item.urgency}`}>
								{item.urgency === "urgent" ? "3 days left" : item.urgency === "soon" ? "7 days left" : "14 days left"}
							</span>
						</li>
					))}
				</ul>
			</section>

			<section className="aula-panel-widget">
				<div className="aula-tasks-head">
					<h3 className="aula-panel-widget-title">Tasks</h3>
					<span className="aula-tasks-count">
						{doneCount} / {tasks.length} completed
					</span>
				</div>
				<div className="aula-tasks-progress" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={tasks.length}>
					<span style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
				</div>
				<ul className="aula-task-list">
					{tasks.map((task) => (
						<li key={task.id}>
							<label className="aula-task-item">
								<input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
								<span className={task.done ? "aula-task-done" : undefined}>{task.label}</span>
							</label>
						</li>
					))}
				</ul>
				<button type="button" className="aula-task-add" aria-label="Add task">
					+
				</button>
			</section>
		</aside>
	);
}
