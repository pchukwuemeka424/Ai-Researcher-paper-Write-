import { useEffect, type ReactNode } from "react";

/** Lightweight accessible modal. Closes on Escape and backdrop click. */
export function Modal({
	open,
	onClose,
	title,
	description,
	children,
	wide,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: ReactNode;
	wide?: boolean;
}) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div className="rn-modal-backdrop" onClick={onClose} role="presentation">
			<div
				className={`rn-modal${wide ? " rn-modal-wide" : ""}`}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="rn-modal-title"
				aria-describedby={description ? "rn-modal-desc" : undefined}
			>
				<header className="rn-modal-header">
					<div className="rn-modal-header-copy">
						<p className="rn-modal-eyebrow">Research Note</p>
						<h2 id="rn-modal-title" className="rn-modal-title">
							{title}
						</h2>
						{description ? (
							<p id="rn-modal-desc" className="rn-modal-desc">
								{description}
							</p>
						) : null}
					</div>
					<button type="button" className="rn-modal-close" onClick={onClose} aria-label="Close">
						×
					</button>
				</header>
				<div className="rn-modal-body">{children}</div>
			</div>
		</div>
	);
}
