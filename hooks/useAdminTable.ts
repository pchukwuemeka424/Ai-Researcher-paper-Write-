"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type AdminTablePagination = {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	startIndex: number;
	endIndex: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	pageSizeOptions: readonly number[];
};

type Options = {
	pageSize?: number;
	resetDeps?: unknown[];
};

export function useAdminTable<T>(items: T[], options?: Options): {
	pageItems: T[];
	pagination: AdminTablePagination;
} {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(options?.pageSize ?? DEFAULT_PAGE_SIZE);
	const resetKey = JSON.stringify(options?.resetDeps ?? []);

	useEffect(() => {
		setPage(1);
	}, [resetKey, items.length, pageSize]);

	const totalItems = items.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	const safePage = Math.min(page, totalPages);
	const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
	const endIndex = Math.min(startIndex + pageSize, totalItems);

	const pageItems = useMemo(
		() => items.slice(startIndex, endIndex),
		[items, startIndex, endIndex],
	);

	const pagination: AdminTablePagination = {
		page: safePage,
		pageSize,
		totalItems,
		totalPages,
		startIndex,
		endIndex,
		onPageChange: setPage,
		onPageSizeChange: (size) => {
			setPageSize(size);
			setPage(1);
		},
		pageSizeOptions: PAGE_SIZE_OPTIONS,
	};

	return { pageItems, pagination };
}
