type Props = { id: string; size?: number };

export function NavIcon({ id, size = 18 }: Props) {
	const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, "aria-hidden": true as const };

	switch (id) {
		case "dashboard":
			return (
				<svg {...props}>
					<rect x="3" y="3" width="7" height="9" rx="1" />
					<rect x="14" y="3" width="7" height="5" rx="1" />
					<rect x="14" y="12" width="7" height="9" rx="1" />
					<rect x="3" y="16" width="7" height="5" rx="1" />
				</svg>
			);
		case "research":
			return (
				<svg {...props}>
					<circle cx="11" cy="11" r="7" />
					<path d="m21 21-4.3-4.3" strokeLinecap="round" />
				</svg>
			);
		case "references":
			return (
				<svg {...props}>
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
				</svg>
			);
		case "lesson-planner":
			return (
				<svg {...props}>
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
				</svg>
			);
		case "notes":
			return (
				<svg {...props}>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
				</svg>
			);
		case "admin":
			return (
				<svg {...props}>
					<circle cx="12" cy="8" r="4" />
					<path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
				</svg>
			);
		case "users":
			return (
				<svg {...props}>
					<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
					<circle cx="9" cy="7" r="4" />
					<path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
				</svg>
			);
		case "sessions":
			return (
				<svg {...props}>
					<path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		case "lesson":
			return (
				<svg {...props}>
					<path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
				</svg>
			);
		case "chat":
			return (
				<svg {...props}>
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round" />
				</svg>
			);
		case "tokens":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="8" />
					<path d="M12 8v8M9 10.5h5a1.5 1.5 0 0 1 0 3H9a1.5 1.5 0 0 0 0 3h6" strokeLinecap="round" />
				</svg>
			);
		case "folder":
			return (
				<svg {...props}>
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeLinejoin="round" />
				</svg>
			);
		default:
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="9" />
				</svg>
			);
	}
}
