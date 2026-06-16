"use client";

import type { ReactNode } from "react";

import { DISCIPLINE_GROUPS } from "@/lib/research-disciplines";

type Props = {
	id?: string;
	value: string;
	onChange: (disciplineId: string) => void;
	label?: string;
	labelIcon?: ReactNode;
	hint?: string;
	wrapClassName?: string;
	selectClassName?: string;
};

export function DisciplineSelect({
	id = "discipline",
	value,
	onChange,
	label = "Your field or discipline",
	labelIcon,
	hint,
	wrapClassName,
	selectClassName,
}: Props) {
	return (
		<div className={wrapClassName ? `ref-source-select-wrap ${wrapClassName}` : "ref-source-select-wrap"}>
			<label className="research-field-label research-field-label-row" htmlFor={id}>
				{labelIcon && <span className="research-field-icon research-field-icon-indigo">{labelIcon}</span>}
				<span>{label}</span>
			</label>
			<div className={labelIcon ? "ref-style-select-inner research-select-icon-wrap" : "ref-style-select-inner"}>
				{labelIcon && (
					<span className="research-select-leading-icon" aria-hidden>
						{labelIcon}
					</span>
				)}
				<select
					id={id}
					className={
						selectClassName
							? `ref-style-select ${selectClassName}${labelIcon ? " research-form-select-with-icon" : ""}`
							: labelIcon
								? "ref-style-select research-form-select-with-icon"
								: "ref-style-select"
					}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				>
					{DISCIPLINE_GROUPS.map((group) => (
						<optgroup key={group.id} label={group.label}>
							{group.disciplines.map((d) => (
								<option key={d.id} value={d.id}>
									{d.label}
								</option>
							))}
						</optgroup>
					))}
				</select>
				<svg className="ref-style-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
			{hint && <p className="research-input-hint">{hint}</p>}
		</div>
	);
}
