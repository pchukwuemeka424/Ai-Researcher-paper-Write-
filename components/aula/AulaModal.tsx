"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { IconX } from "@/components/ui/ButtonIcon";

type Props = {
	open: boolean;
	title: string;
	description?: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
	size?: "md" | "lg";
};

export function AulaModal({
	open,
	title,
	description,
	onClose,
	children,
	footer,
	size = "md",
}: Props) {
	const titleId = useId();
	const descId = useId();
	const closeRef = useRef<HTMLButtonElement>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	useEffect(() => {
		if (open) closeRef.current?.focus();
	}, [open]);

	if (!open || !mounted) return null;

	return createPortal(
		<div className="modal-backdrop aula-modal-backdrop" role="presentation" onClick={onClose}>
			<div
				className={`aula-modal aula-modal-${size}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descId : undefined}
				onClick={(e) => e.stopPropagation()}
			>
				<header className="aula-modal-header">
					<div>
						<h2 id={titleId} className="aula-modal-title">
							{title}
						</h2>
						{description ? (
							<p id={descId} className="aula-modal-desc">
								{description}
							</p>
						) : null}
					</div>
					<button
						ref={closeRef}
						type="button"
						className="aula-modal-close"
						aria-label="Close"
						onClick={onClose}
					>
						<IconX size={18} />
					</button>
				</header>
				<div className="aula-modal-body">{children}</div>
				{footer ? <footer className="aula-modal-footer">{footer}</footer> : null}
			</div>
		</div>,
		document.body,
	);
}
