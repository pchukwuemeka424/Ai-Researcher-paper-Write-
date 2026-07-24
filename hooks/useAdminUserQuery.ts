"use client";

import { useEffect, useState } from "react";

/** Reads `?user=` (email or name substring) from the URL for admin user-scoped views. */
export function useAdminUserQuery(initial = ""): [string, (value: string) => void] {
	const [userQuery, setUserQuery] = useState(initial);

	useEffect(() => {
		try {
			const fromUrl = new URLSearchParams(window.location.search).get("user")?.trim() ?? "";
			if (fromUrl) setUserQuery(fromUrl);
		} catch {
			/* ignore */
		}
	}, []);

	return [userQuery, setUserQuery];
}

export function matchesAdminUserQuery(
	query: string,
	fields: Array<string | null | undefined>,
): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return fields.some((field) => (field ?? "").toLowerCase().includes(q));
}
