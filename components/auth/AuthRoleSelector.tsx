"use client";

export type AuthAccountRole = "lecturer" | "student";

type Props = {
	value: AuthAccountRole;
	onChange: (role: AuthAccountRole) => void;
	disabled?: boolean;
};

const ROLES: {
	id: AuthAccountRole;
	label: string;
	description: string;
}[] = [
	{
		id: "lecturer",
		label: "Lecturer",
		description: "Research, teaching & admin tools",
	},
	{
		id: "student",
		label: "Student",
		description: "Research board & idea workspace",
	},
];

export function AuthRoleSelector({ value, onChange, disabled }: Props) {
	return (
		<div className="auth-role-selector" role="radiogroup" aria-label="Account type">
			{ROLES.map((role) => {
				const active = value === role.id;
				return (
					<button
						key={role.id}
						type="button"
						role="radio"
						aria-checked={active}
						disabled={disabled}
						className={`auth-role-option${active ? " auth-role-option-active" : ""}`}
						onClick={() => onChange(role.id)}
					>
						<span className="auth-role-option-label">{role.label}</span>
						<span className="auth-role-option-desc">{role.description}</span>
					</button>
				);
			})}
		</div>
	);
}
