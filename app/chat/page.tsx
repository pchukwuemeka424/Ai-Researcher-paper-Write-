"use client";

import { useEffect } from "react";

/** Legacy /chat → Research Assistant (dashboard chat removed). */
export default function ChatRedirectPage() {
	useEffect(() => {
		const q = window.location.search;
		window.location.replace(`/research${q}`);
	}, []);

	return null;
}
