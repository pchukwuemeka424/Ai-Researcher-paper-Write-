"use client";

import { useEffect, useRef, type ReactNode } from "react";

type DocCmd =
	| "bold"
	| "italic"
	| "underline"
	| "insertUnorderedList"
	| "insertOrderedList"
	| "justifyLeft"
	| "justifyCenter"
	| "justifyRight"
	| "undo"
	| "redo"
	| "insertHTML"
	| "formatBlock";

function ToolbarButton({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			className="rp-doc-toolbar-btn"
			aria-label={label}
			title={label}
			onMouseDown={(e) => e.preventDefault()}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function toEditorHtml(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	if (/<[a-z][\s\S]*>/i.test(trimmed)) return value;
	return trimmed
		.split(/\n{2,}/)
		.map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
		.join("");
}

export function htmlHasText(html: string): boolean {
	return html
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/\s+/g, " ")
		.trim().length > 0;
}

export function ResearchDocEditor({
	value,
	placeholder,
	ariaLabel,
	minHeight = "22rem",
	onChange,
	onBlur,
}: {
	value: string;
	placeholder: string;
	ariaLabel: string;
	minHeight?: string;
	onChange: (html: string) => void;
	onBlur?: () => void;
}) {
	const editorRef = useRef<HTMLDivElement>(null);
	const lastValueRef = useRef(value);

	useEffect(() => {
		const el = editorRef.current;
		if (!el) return;
		if (value === lastValueRef.current) return;
		const next = toEditorHtml(value);
		if (el.innerHTML !== next) {
			el.innerHTML = next;
		}
		lastValueRef.current = value;
	}, [value]);

	useEffect(() => {
		const el = editorRef.current;
		if (!el) return;
		el.innerHTML = toEditorHtml(value);
		lastValueRef.current = value;
		// Mount only
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const runCommand = (cmd: DocCmd, arg?: string) => {
		editorRef.current?.focus();
		document.execCommand(cmd, false, arg);
		const html = editorRef.current?.innerHTML ?? "";
		lastValueRef.current = html;
		onChange(html);
	};

	return (
		<div className="rp-doc">
			<div className="rp-doc-toolbar" role="toolbar" aria-label="Document formatting">
				<ToolbarButton label="Bold" onClick={() => runCommand("bold")}>
					<strong>B</strong>
				</ToolbarButton>
				<ToolbarButton label="Italic" onClick={() => runCommand("italic")}>
					<em>I</em>
				</ToolbarButton>
				<ToolbarButton label="Underline" onClick={() => runCommand("underline")}>
					<span style={{ textDecoration: "underline" }}>U</span>
				</ToolbarButton>
				<span className="rp-doc-toolbar-sep" aria-hidden />
				<ToolbarButton label="Heading" onClick={() => runCommand("formatBlock", "h2")}>
					H
				</ToolbarButton>
				<ToolbarButton label="Paragraph" onClick={() => runCommand("formatBlock", "p")}>
					¶
				</ToolbarButton>
				<span className="rp-doc-toolbar-sep" aria-hidden />
				<ToolbarButton label="Bulleted list" onClick={() => runCommand("insertUnorderedList")}>
					••
				</ToolbarButton>
				<ToolbarButton label="Numbered list" onClick={() => runCommand("insertOrderedList")}>
					1.
				</ToolbarButton>
				<ToolbarButton
					label="Insert table"
					onClick={() =>
						runCommand(
							"insertHTML",
							'<table><thead><tr><th>Heading 1</th><th>Heading 2</th><th>Heading 3</th></tr></thead><tbody><tr><td>Value</td><td>Value</td><td>Value</td></tr><tr><td>Value</td><td>Value</td><td>Value</td></tr></tbody></table><p><br></p>',
						)
					}
				>
					▦
				</ToolbarButton>
				<span className="rp-doc-toolbar-sep" aria-hidden />
				<ToolbarButton label="Align left" onClick={() => runCommand("justifyLeft")}>
					≡
				</ToolbarButton>
				<ToolbarButton label="Align center" onClick={() => runCommand("justifyCenter")}>
					≣
				</ToolbarButton>
				<ToolbarButton label="Align right" onClick={() => runCommand("justifyRight")}>
					≡
				</ToolbarButton>
				<span className="rp-doc-toolbar-sep" aria-hidden />
				<ToolbarButton label="Undo" onClick={() => runCommand("undo")}>
					↶
				</ToolbarButton>
				<ToolbarButton label="Redo" onClick={() => runCommand("redo")}>
					↷
				</ToolbarButton>
			</div>

			<div className="rp-doc-page">
				<div
					ref={editorRef}
					className="rp-doc-surface"
					contentEditable
					role="textbox"
					aria-multiline="true"
					aria-label={ariaLabel}
					data-placeholder={placeholder}
					suppressContentEditableWarning
					style={{ minHeight }}
					onInput={() => {
						const html = editorRef.current?.innerHTML ?? "";
						lastValueRef.current = html;
						onChange(html);
					}}
					onBlur={() => onBlur?.()}
				/>
			</div>
		</div>
	);
}
