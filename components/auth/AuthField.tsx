"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
	label: string;
	hint?: string;
	icon?: ReactNode;
	error?: string;
};

export function AuthField({ label, hint, icon, error, id, className, ...inputProps }: Props) {
	return (
		<div className={`auth-field${error ? " auth-field-error" : ""}`}>
			<label className="auth-field-label" htmlFor={id}>
				{label}
				{hint && <span className="auth-field-hint">{hint}</span>}
			</label>
			<div className="auth-field-control">
				{icon && (
					<span className="auth-field-icon" aria-hidden>
						{icon}
					</span>
				)}
				<input id={id} className={className ? `auth-input ${className}` : "auth-input"} {...inputProps} />
			</div>
			{error && <p className="auth-field-error-text">{error}</p>}
		</div>
	);
}
