"use client";

import { CITATION_STYLE_GROUPS, type CitationStyle } from "@/lib/citation-styles";

type Props = {
	id?: string;
	value: CitationStyle;
	onChange: (style: CitationStyle) => void;
};

export function CitationStyleSelect({ id = "citation-style", value, onChange }: Props) {
	const selected = CITATION_STYLE_GROUPS.flatMap((g) => g.styles).find((s) => s.id === value);

	return (
		<div className="ref-style-select-wrap">
			<label className="ref-style-select-label" htmlFor={id}>
				Reference style
			</label>
			<div className="ref-style-select-inner">
				<select
					id={id}
					className="ref-style-select"
					value={value}
					onChange={(e) => onChange(e.target.value as CitationStyle)}
				>
					{CITATION_STYLE_GROUPS.map((group) => (
						<optgroup key={group.id} label={group.label}>
							{group.styles.map((s) => (
								<option key={s.id} value={s.id}>
									{s.label}
								</option>
							))}
						</optgroup>
					))}
				</select>
				<svg className="ref-style-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
			{selected?.hint && <p className="ref-style-select-hint">{selected.hint}</p>}
		</div>
	);
}
