"use client";

import type { ReactNode } from "react";

import type { AdminTablePagination } from "@/hooks/useAdminTable";

export type AdminTableColumn<T> = {
	key: string;
	header: ReactNode;
	cell: (row: T) => ReactNode;
	className?: string;
	headerClassName?: string;
	align?: "left" | "center" | "right";
	width?: string;
};

type SelectableConfig = {
	selectedIds: Set<string>;
	onToggle: (id: string) => void;
	onToggleAll: () => void;
	allVisibleSelected: boolean;
};

type Props<T> = {
	columns: AdminTableColumn<T>[];
	data: T[];
	rowKey: (row: T) => string;
	loading?: boolean;
	emptyMessage?: string;
	emptyFilteredMessage?: string;
	hasActiveFilters?: boolean;
	search?: string;
	onSearchChange?: (value: string) => void;
	searchPlaceholder?: string;
	filters?: ReactNode;
	bulkBar?: ReactNode;
	selectable?: SelectableConfig;
	rowClassName?: (row: T) => string | undefined;
	pagination: AdminTablePagination;
	className?: string;
};

function SearchIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<circle cx="11" cy="11" r="7" />
			<path d="M20 20l-3-3" strokeLinecap="round" />
		</svg>
	);
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			{direction === "left" ? (
				<path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
			) : (
				<path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
			)}
		</svg>
	);
}

function pageWindow(current: number, total: number): number[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

	const pages = new Set<number>([1, total, current, current - 1, current + 1]);
	const sorted = Array.from(pages)
		.filter((p) => p >= 1 && p <= total)
		.sort((a, b) => a - b);

	return sorted;
}

function AdminTablePaginationBar({ pagination }: { pagination: AdminTablePagination }) {
	const { page, pageSize, totalItems, totalPages, startIndex, endIndex, onPageChange, onPageSizeChange, pageSizeOptions } =
		pagination;

	if (totalItems === 0) return null;

	const pages = pageWindow(page, totalPages);
	const rangeLabel =
		totalItems === 0
			? "0 results"
			: `${startIndex + 1}–${endIndex} of ${totalItems.toLocaleString()}`;

	return (
		<footer className="admin-table-footer">
			<div className="admin-table-footer-meta">
				<span className="admin-table-range">{rangeLabel}</span>
				<label className="admin-table-page-size">
					<span className="admin-table-page-size-label">Rows</span>
					<select
						className="topic-input admin-table-page-size-select"
						value={pageSize}
						onChange={(e) => onPageSizeChange(Number(e.target.value))}
						aria-label="Rows per page"
					>
						{pageSizeOptions.map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
				</label>
			</div>

			<nav className="admin-table-pagination" aria-label="Table pagination">
				<button
					type="button"
					className="admin-table-page-btn"
					onClick={() => onPageChange(1)}
					disabled={page <= 1}
					aria-label="First page"
				>
					«
				</button>
				<button
					type="button"
					className="admin-table-page-btn"
					onClick={() => onPageChange(page - 1)}
					disabled={page <= 1}
					aria-label="Previous page"
				>
					<ChevronIcon direction="left" />
				</button>

				{pages.map((pageNum, index) => {
					const prev = pages[index - 1];
					const showEllipsis = prev !== undefined && pageNum - prev > 1;
					return (
						<span key={pageNum} className="admin-table-page-group">
							{showEllipsis && <span className="admin-table-page-ellipsis" aria-hidden>…</span>}
							<button
								type="button"
								className={`admin-table-page-btn admin-table-page-num${pageNum === page ? " admin-table-page-num-active" : ""}`}
								onClick={() => onPageChange(pageNum)}
								aria-label={`Page ${pageNum}`}
								aria-current={pageNum === page ? "page" : undefined}
							>
								{pageNum}
							</button>
						</span>
					);
				})}

				<button
					type="button"
					className="admin-table-page-btn"
					onClick={() => onPageChange(page + 1)}
					disabled={page >= totalPages}
					aria-label="Next page"
				>
					<ChevronIcon direction="right" />
				</button>
				<button
					type="button"
					className="admin-table-page-btn"
					onClick={() => onPageChange(totalPages)}
					disabled={page >= totalPages}
					aria-label="Last page"
				>
					»
				</button>
			</nav>
		</footer>
	);
}

export function AdminDataTable<T>({
	columns,
	data,
	rowKey,
	loading = false,
	emptyMessage = "No records yet.",
	emptyFilteredMessage = "No records match your search or filters.",
	hasActiveFilters = false,
	search,
	onSearchChange,
	searchPlaceholder = "Search…",
	filters,
	bulkBar,
	selectable,
	rowClassName,
	pagination,
	className,
}: Props<T>) {
	const colSpan = columns.length + (selectable ? 1 : 0);
	const showToolbar = onSearchChange !== undefined || filters;

	return (
		<div className={`admin-datatable${className ? ` ${className}` : ""}`}>
			{showToolbar && (
				<div className="admin-toolbar admin-datatable-toolbar">
					{onSearchChange !== undefined && (
						<div className="admin-datatable-search">
							<SearchIcon />
							<input
								type="search"
								className="topic-input admin-datatable-search-input"
								placeholder={searchPlaceholder}
								value={search ?? ""}
								onChange={(e) => onSearchChange(e.target.value)}
								aria-label="Search table"
							/>
						</div>
					)}
					{filters && <div className="admin-toolbar-filters">{filters}</div>}
				</div>
			)}

			{bulkBar}

			<div className="admin-table-wrap admin-datatable-scroll">
				<table className="admin-table admin-datatable-table">
					<thead>
						<tr>
							{selectable && (
								<th className="admin-table-check admin-datatable-sticky-col" scope="col">
									<input
										type="checkbox"
										checked={selectable.allVisibleSelected}
										onChange={selectable.onToggleAll}
										aria-label="Select all on this page"
									/>
								</th>
							)}
							{columns.map((column) => (
								<th
									key={column.key}
									className={[
										column.className,
										column.headerClassName,
										column.align ? `admin-datatable-align-${column.align}` : "",
									]
										.filter(Boolean)
										.join(" ") || undefined}
									style={column.width ? { width: column.width } : undefined}
									scope="col"
								>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{loading && (
							<tr>
								<td colSpan={colSpan} className="admin-datatable-loading">
									<span className="admin-datatable-loading-dot" aria-hidden />
									Loading…
								</td>
							</tr>
						)}

						{!loading && data.length === 0 && (
							<tr>
								<td colSpan={colSpan} className="admin-empty admin-datatable-empty">
									<div className="admin-datatable-empty-inner">
										<p>{hasActiveFilters ? emptyFilteredMessage : emptyMessage}</p>
									</div>
								</td>
							</tr>
						)}

						{!loading &&
							data.map((row) => {
								const id = rowKey(row);
								const selected = selectable?.selectedIds.has(id);
								return (
									<tr
										key={id}
										className={[
											selected ? "admin-row-selected" : "",
											rowClassName?.(row) ?? "",
										]
											.filter(Boolean)
											.join(" ") || undefined}
									>
										{selectable && (
											<td className="admin-table-check admin-datatable-sticky-col">
												<input
													type="checkbox"
													checked={selected}
													onChange={() => selectable.onToggle(id)}
													aria-label="Select row"
												/>
											</td>
										)}
										{columns.map((column) => (
											<td
												key={column.key}
												className={[
													column.className,
													column.align ? `admin-datatable-align-${column.align}` : "",
												]
													.filter(Boolean)
													.join(" ") || undefined}
											>
												{column.cell(row)}
											</td>
										))}
									</tr>
								);
							})}
					</tbody>
				</table>
			</div>

			<AdminTablePaginationBar pagination={pagination} />
		</div>
	);
}
