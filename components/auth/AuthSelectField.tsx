"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
	label: string;
	hint?: string;
	icon?: ReactNode;
	error?: string;
	placeholder?: string;
	children: ReactNode;
};

export function AuthSelectField({
	label,
	hint,
	icon,
	error,
	id,
	className,
	placeholder = "Select…",
	value,
	children,
	...selectProps
}: Props) {
	const isEmpty = !value;

	return (
		<div className={`auth-field${error ? " auth-field-error" : ""}`}>
			<label className="auth-field-label" htmlFor={id}>
				{label}
				{hint && <span className="auth-field-hint">{hint}</span>}
			</label>
			<div className="auth-field-control auth-field-control-select">
				{icon && (
					<span className="auth-field-icon" aria-hidden>
						{icon}
					</span>
				)}
				<select
					id={id}
					className={
						className
							? `auth-input auth-select${isEmpty ? " auth-select-placeholder" : ""} ${className}`
							: `auth-input auth-select${isEmpty ? " auth-select-placeholder" : ""}`
					}
					value={value}
					{...selectProps}
				>
					<option value="" disabled hidden>
						{placeholder}
					</option>
					{children}
				</select>
				<svg className="auth-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
			{error && <p className="auth-field-error-text">{error}</p>}
		</div>
	);
}
