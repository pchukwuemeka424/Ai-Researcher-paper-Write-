"use client";

import type { ReactNode } from "react";

import { SCOPE_OPTIONS, type ResearchScope } from "@/lib/research-ideas";

type Props = {
	id?: string;
	value: ResearchScope | "";
	onChange: (scope: ResearchScope | "") => void;
	label?: string;
	labelIcon?: ReactNode;
	hint?: string;
	placeholder?: string;
	wrapClassName?: string;
	selectClassName?: string;
};

export function ResearchScopeSelect({
	id = "research-scope",
	value,
	onChange,
	label = "Research scope",
	labelIcon,
	hint = "Select the level that best matches your project.",
	placeholder = "Select research scope",
	wrapClassName,
	selectClassName,
}: Props) {
	const selected = value ? SCOPE_OPTIONS.find((opt) => opt.id === value) : undefined;

	return (
		<div className={wrapClassName ? `ref-source-select-wrap ${wrapClassName}` : "ref-source-select-wrap"}>
			<label className="research-field-label research-field-label-row" htmlFor={id}>
				{labelIcon && <span className="research-field-icon research-field-icon-violet">{labelIcon}</span>}
				<span>{label}</span>
			</label>
			{hint && <p className="research-input-hint">{hint}</p>}
			<div className={labelIcon ? "ref-style-select-inner research-select-icon-wrap" : "ref-style-select-inner"}>
				{labelIcon && (
					<span className="research-select-leading-icon research-select-leading-icon-violet" aria-hidden>
						{labelIcon}
					</span>
				)}
				<select
					id={id}
					className={
						selectClassName
							? `ref-style-select ${selectClassName}${labelIcon ? " research-form-select-with-icon" : ""}${!value ? " research-form-select-placeholder" : ""}`
							: labelIcon
								? `ref-style-select research-form-select-with-icon${!value ? " research-form-select-placeholder" : ""}`
								: `ref-style-select${!value ? " research-form-select-placeholder" : ""}`
					}
					value={value}
					onChange={(e) => onChange(e.target.value === "" ? "" : (e.target.value as ResearchScope))}
				>
					<option value="" disabled>
						{placeholder}
					</option>
					{SCOPE_OPTIONS.map((opt) => (
						<option key={opt.id} value={opt.id}>
							{opt.label}
						</option>
					))}
				</select>
				<svg className="ref-style-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
			{selected && <p className="research-scope-selected-hint">{selected.hint}</p>}
		</div>
	);
}
