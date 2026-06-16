"use client";

type Props = {
	path: string | null;
	content: string | null;
	loading: boolean;
	error: string | null;
	onClose: () => void;
};

export function OutputModal({ path, content, loading, error, onClose }: Props) {
	if (!path) return null;

	return (
		<div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
			<div className="modal" onClick={(e) => e.stopPropagation()}>
				<header className="modal-header">
					<h3>{path}</h3>
					<button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
						×
					</button>
				</header>
				<div className="modal-body">
					{loading && <p className="muted">Loading…</p>}
					{error && <p className="error-text">{error}</p>}
					{content && <pre>{content}</pre>}
				</div>
			</div>
		</div>
	);
}
