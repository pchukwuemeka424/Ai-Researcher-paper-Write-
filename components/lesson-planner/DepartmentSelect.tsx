"use client";

import { DISCIPLINE_GROUPS } from "@/lib/research-disciplines";

import { LpSelectField } from "@/components/lesson-planner/LpSelectField";

type Props = {
	id?: string;
	value: string;
	onChange: (disciplineId: string) => void;
	label?: string;
};

export function DepartmentSelect({
	id = "lesson-department",
	value,
	onChange,
	label = "Department",
}: Props) {
	return (
		<LpSelectField
			id={id}
			label={label}
			value={value}
			onChange={onChange}
			placeholder="Select department"
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
		</LpSelectField>
	);
}
