"use client";

import { useEffect } from "react";

export default function ChatRedirectPage() {
	useEffect(() => {
		const q = window.location.search;
		window.location.replace(`/dashboard/chat${q}`);
	}, []);

	return null;
}
