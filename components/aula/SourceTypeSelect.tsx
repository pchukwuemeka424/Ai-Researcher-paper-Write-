"use client";

import { SOURCE_TYPE_GROUPS, type SourceType } from "@/lib/source-types";

type Props = {
	id?: string;
	value: SourceType;
	onChange: (type: SourceType) => void;
};

export function SourceTypeSelect({ id = "source-type", value, onChange }: Props) {
	return (
		<div className="ref-source-select-wrap">
			<label className="ref-style-select-label" htmlFor={id}>
				Source type
			</label>
			<div className="ref-style-select-inner">
				<select
					id={id}
					className="ref-style-select"
					value={value}
					onChange={(e) => onChange(e.target.value as SourceType)}
				>
					{SOURCE_TYPE_GROUPS.map((group) => (
						<optgroup key={group.id} label={group.label}>
							{group.types.map((t) => (
								<option key={t.id} value={t.id}>
									{t.label}
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
