"use client";

import { TEACHING_LEVEL_OPTIONS, type TeachingLevel } from "@/lib/lesson-planner";

import { LpSelectField } from "@/components/lesson-planner/LpSelectField";

export type TeachingLevelValue = TeachingLevel | "";

type Props = {
	id?: string;
	value: TeachingLevelValue;
	onChange: (level: TeachingLevelValue) => void;
	label?: string;
};

export function TeachingLevelSelect({
	id = "lesson-level",
	value,
	onChange,
	label = "Teaching level",
}: Props) {
	const selected = TEACHING_LEVEL_OPTIONS.find((opt) => opt.id === value);

	return (
		<LpSelectField
			id={id}
			label={label}
			value={value}
			onChange={(next) => onChange(next as TeachingLevelValue)}
			placeholder="Select teaching level"
			hint={selected?.hint}
		>
			{TEACHING_LEVEL_OPTIONS.map((opt) => (
				<option key={opt.id} value={opt.id}>
					{opt.label}
				</option>
			))}
		</LpSelectField>
	);
}
