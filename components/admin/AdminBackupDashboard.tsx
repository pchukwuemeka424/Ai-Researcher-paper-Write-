"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminTable } from "@/hooks/useAdminTable";
import {
	createAdminBackup,
	downloadAdminBackupFile,
	fetchAdminBackupFiles,
	fetchAdminBackupTables,
} from "@/lib/admin-api";
import type { AdminBackupFile, AdminBackupTable } from "@/lib/admin";

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminBackupDashboard() {
	const { ready } = useAdminGuard();
	const [tables, setTables] = useState<AdminBackupTable[]>([]);
	const [files, setFiles] = useState<AdminBackupFile[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [downloading, setDownloading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tableSearch, setTableSearch] = useState("");
	const [fileSearch, setFileSearch] = useState("");

	const loadBackupData = useCallback(async () => {
		setError(null);
		try {
			const [tablesData, filesData] = await Promise.all([
				fetchAdminBackupTables(),
				fetchAdminBackupFiles(),
			]);
			setTables(tablesData);
			setFiles(filesData);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void loadBackupData();
	}, [loadBackupData, ready]);

	const totalDocuments = useMemo(
		() => tables.reduce((sum, table) => sum + table.count, 0),
		[tables],
	);

	const tableQuery = tableSearch.trim().toLowerCase();
	const filteredTables = useMemo(() => {
		if (!tableQuery) return tables;
		return tables.filter(
			(table) =>
				table.label.toLowerCase().includes(tableQuery) ||
				table.key.toLowerCase().includes(tableQuery) ||
				table.collection.toLowerCase().includes(tableQuery),
		);
	}, [tables, tableQuery]);

	const fileQuery = fileSearch.trim().toLowerCase();
	const filteredFiles = useMemo(() => {
		if (!fileQuery) return files;
		return files.filter((file) => file.filename.toLowerCase().includes(fileQuery));
	}, [files, fileQuery]);

	const { pageItems: tablePageItems, pagination: tablePagination } = useAdminTable(filteredTables, {
		resetDeps: [tableQuery],
	});
	const { pageItems: filePageItems, pagination: filePagination } = useAdminTable(filteredFiles, {
		resetDeps: [fileQuery],
	});

	const handleCreateBackup = async () => {
		setCreating(true);
		setError(null);
		try {
			await createAdminBackup();
			await loadBackupData();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setCreating(false);
		}
	};

	const handleDownload = async (filename: string) => {
		setDownloading(filename);
		setError(null);
		try {
			await downloadAdminBackupFile(filename);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setDownloading(null);
		}
	};

	return (
		<AdminShell
			title="Backup"
			subtitle="Export all database tables and manage backup files"
			breadcrumb="Admin Console"
			actions={
				<button
					type="button"
					className="primary-btn"
					onClick={() => void handleCreateBackup()}
					disabled={creating || loading}
				>
					{creating ? "Creating backup…" : "Create backup"}
				</button>
			}
		>
			{loading && <p className="muted">Loading backup data…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{!loading && (
				<>
					<section className="admin-stats">
						<AdminStatCard label="Database tables" value={tables.length} accent="primary" />
						<AdminStatCard label="Total documents" value={totalDocuments} accent="success" />
						<AdminStatCard label="Backup files" value={files.length} hint="Stored on server" />
					</section>

					<AdminPanel
						title="Database tables"
						description="All MongoDB collections included in each backup export."
					>
						<AdminDataTable
							columns={[
								{
									key: "label",
									header: "Table",
									cell: (row) => <strong>{row.label}</strong>,
								},
								{
									key: "key",
									header: "Key",
									cell: (row) => <code>{row.key}</code>,
								},
								{
									key: "collection",
									header: "Collection",
									cell: (row) => row.collection,
								},
								{
									key: "count",
									header: "Documents",
									align: "right",
									cell: (row) => row.count.toLocaleString(),
								},
							]}
							data={tablePageItems}
							rowKey={(row) => row.key}
							search={tableSearch}
							onSearchChange={setTableSearch}
							searchPlaceholder="Search tables…"
							emptyMessage="No database tables found."
							emptyFilteredMessage="No tables match your search."
							hasActiveFilters={Boolean(tableQuery)}
							pagination={tablePagination}
						/>
					</AdminPanel>

					<AdminPanel
						title="Backup files"
						description="JSON exports saved to backend/backups on the server."
						className="admin-panel-spaced"
					>
						<AdminDataTable
							columns={[
								{
									key: "filename",
									header: "File",
									cell: (row) => <code>{row.filename}</code>,
								},
								{
									key: "createdAt",
									header: "Created",
									cell: (row) => formatAdminDate(row.createdAt),
								},
								{
									key: "size",
									header: "Size",
									cell: (row) => formatBytes(row.size),
								},
								{
									key: "tableCount",
									header: "Tables",
									align: "right",
									cell: (row) => row.tableCount ?? "—",
								},
								{
									key: "documentCount",
									header: "Documents",
									align: "right",
									cell: (row) =>
										row.documentCount !== null ? row.documentCount.toLocaleString() : "—",
								},
								{
									key: "actions",
									header: "Actions",
									align: "right",
									cell: (row) => (
										<button
											type="button"
											className="ghost-btn admin-table-action-btn"
											onClick={() => void handleDownload(row.filename)}
											disabled={downloading === row.filename}
										>
											{downloading === row.filename ? "Downloading…" : "Download"}
										</button>
									),
								},
							]}
							data={filePageItems}
							rowKey={(row) => row.filename}
							search={fileSearch}
							onSearchChange={setFileSearch}
							searchPlaceholder="Search backup files…"
							emptyMessage="No backup files yet. Create your first backup above."
							emptyFilteredMessage="No backup files match your search."
							hasActiveFilters={Boolean(fileQuery)}
							pagination={filePagination}
						/>
					</AdminPanel>
				</>
			)}
		</AdminShell>
	);
}
