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
	placeholder?: string;
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
	placeholder = "Select field or discipline",
	wrapClassName,
	selectClassName,
}: Props) {
	const emptyClass = !value ? " research-form-select-placeholder" : "";

	return (
		<div className={wrapClassName ? `ref-source-select-wrap ${wrapClassName}` : "ref-source-select-wrap"}>
			<label className="research-field-label research-field-label-row" htmlFor={id}>
				{labelIcon && <span className="research-field-icon research-field-icon-indigo">{labelIcon}</span>}
				<span>{label}</span>
			</label>
			{hint && <p className="research-input-hint">{hint}</p>}
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
							? `ref-style-select ${selectClassName}${labelIcon ? " research-form-select-with-icon" : ""}${emptyClass}`
							: labelIcon
								? `ref-style-select research-form-select-with-icon${emptyClass}`
								: `ref-style-select${emptyClass}`
					}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				>
					<option value="" disabled>
						{placeholder}
					</option>
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
		</div>
	);
}
