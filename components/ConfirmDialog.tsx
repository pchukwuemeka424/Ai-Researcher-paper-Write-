"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	loading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Delete",
	cancelLabel = "Cancel",
	loading = false,
	onConfirm,
	onCancel,
}: Props) {
	const titleId = useId();
	const descId = useId();
	const confirmRef = useRef<HTMLButtonElement>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [open]);

	useEffect(() => {
		if (!open || loading) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, loading, onCancel]);

	useEffect(() => {
		if (open && !loading) {
			confirmRef.current?.focus();
		}
	}, [open, loading]);

	if (!open || !mounted) return null;

	const modal = (
		<div
			className="modal-backdrop confirm-dialog-backdrop"
			role="presentation"
			onClick={loading ? undefined : onCancel}
		>
			<div
				className="confirm-dialog"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="confirm-dialog-icon" aria-hidden>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
							stroke="currentColor"
							strokeWidth="1.75"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>

				<h2 id={titleId} className="confirm-dialog-title">
					{title}
				</h2>
				<p id={descId} className="confirm-dialog-description">
					{description}
				</p>

				<div className="confirm-dialog-actions">
					<button type="button" className="ghost-btn" onClick={onCancel} disabled={loading}>
						{cancelLabel}
					</button>
					<button
						ref={confirmRef}
						type="button"
						className="danger-btn confirm-dialog-confirm"
						onClick={onConfirm}
						disabled={loading}
					>
						{loading ? "Removing…" : confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);

	return createPortal(modal, document.body);
}
