"use client";

import { useCallback } from "react";

import { CitationStyleSelect } from "@/components/aula/CitationStyleSelect";
import {
	buildChangeCitationStylePrompt,
	buildUpdateReferencesPrompt,
	saveChatCitationStyle,
	type CitationStyle,
} from "@/lib/chat-research-citations";
import { getStyleLabel } from "@/lib/citation-styles";

type Props = {
	visible: boolean;
	disabled?: boolean;
	citationStyle: CitationStyle;
	onCitationStyleChange: (style: CitationStyle) => void;
	onApplyStyle: (prompt: string, style: CitationStyle) => void;
	onUpdateReferences: (prompt: string, style: CitationStyle) => void;
};

export function ResearchCitationToolbar({
	visible,
	disabled = false,
	citationStyle,
	onCitationStyleChange,
	onApplyStyle,
	onUpdateReferences,
}: Props) {
	const handleStyleChange = useCallback(
		(style: CitationStyle) => {
			onCitationStyleChange(style);
			saveChatCitationStyle(style);
		},
		[onCitationStyleChange],
	);

	const handleApplyStyle = useCallback(() => {
		saveChatCitationStyle(citationStyle);
		onApplyStyle(buildChangeCitationStylePrompt(citationStyle), citationStyle);
	}, [citationStyle, onApplyStyle]);

	const handleUpdateReferences = useCallback(() => {
		saveChatCitationStyle(citationStyle);
		onUpdateReferences(buildUpdateReferencesPrompt(citationStyle), citationStyle);
	}, [citationStyle, onUpdateReferences]);

	if (!visible) return null;

	return (
		<div className="chat-citation-bar" role="region" aria-label="Reference style controls">
			<div className="chat-citation-bar-main">
				<span className="chat-citation-bar-label">Citation style</span>
				<CitationStyleSelect
					id="chat-citation-style"
					value={citationStyle}
					onChange={handleStyleChange}
				/>
				<p className="chat-citation-bar-hint">
					Active: <strong>{getStyleLabel(citationStyle)}</strong>
				</p>
			</div>
			<div className="chat-citation-bar-actions">
				<button
					type="button"
					className="chat-workspace-btn"
					disabled={disabled}
					onClick={handleUpdateReferences}
				>
					Update references
				</button>
				<button
					type="button"
					className="chat-workspace-btn chat-workspace-btn-primary"
					disabled={disabled}
					onClick={handleApplyStyle}
				>
					Apply style to paper
				</button>
			</div>
		</div>
	);
}
