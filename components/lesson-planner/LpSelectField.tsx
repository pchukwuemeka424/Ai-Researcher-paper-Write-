"use client";

import type { ReactNode } from "react";

type Props = {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	hint?: string;
	placeholder?: string;
	children: ReactNode;
};

export function LpSelectField({
	id,
	label,
	value,
	onChange,
	hint,
	placeholder = "Select…",
	children,
}: Props) {
	const isEmpty = !value;

	return (
		<div className="lp-select-wrap">
			<label className="lp-label" htmlFor={id}>
				{label}
			</label>
			<div className="lp-select-inner">
				<select
					id={id}
					className={`lp-select${isEmpty ? " lp-select-placeholder" : ""}`}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				>
					<option value="" disabled hidden>
						{placeholder}
					</option>
					{children}
				</select>
				<svg className="lp-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
			{hint && <p className="lp-select-hint">{hint}</p>}
		</div>
	);
}
