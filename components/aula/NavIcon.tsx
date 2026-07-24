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
		case "research-note":
			return (
				<svg {...props}>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
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
		case "database":
			return (
				<svg {...props}>
					<ellipse cx="12" cy="5" rx="8" ry="3" />
					<path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
					<path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
				</svg>
			);
		case "governance":
			return (
				<svg {...props}>
					<path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" strokeLinejoin="round" />
					<path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		case "analytics":
			return (
				<svg {...props}>
					<path d="M4 19V5M4 19h16" strokeLinecap="round" />
					<path d="M8 15v-4M12 15V8M16 15v-7" strokeLinecap="round" />
				</svg>
			);
		case "policy":
			return (
				<svg {...props}>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<path d="M14 2v6h6M9 13h6M9 17h4" strokeLinecap="round" />
				</svg>
			);
		case "audit":
			return (
				<svg {...props}>
					<path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" strokeLinejoin="round" />
					<circle cx="12" cy="11" r="2.5" />
					<path d="M12 13.5V16" strokeLinecap="round" />
				</svg>
			);
		case "approvals":
			return (
				<svg {...props}>
					<path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" />
				</svg>
			);
		case "reports":
			return (
				<svg {...props}>
					<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
				</svg>
			);
		case "risk":
			return (
				<svg {...props}>
					<path d="M12 3l9 16H3L12 3z" strokeLinejoin="round" />
					<path d="M12 10v4M12 17h.01" strokeLinecap="round" />
				</svg>
			);
		case "compliance":
			return (
				<svg {...props}>
					<path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" />
				</svg>
			);
		case "incident":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 8v5M12 16h.01" strokeLinecap="round" />
				</svg>
			);
		case "inventory":
			return (
				<svg {...props}>
					<path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
					<path d="M3 7l2-3h14l2 3M8 12h8" strokeLinecap="round" />
				</svg>
			);
		case "alert":
			return (
				<svg {...props}>
					<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinejoin="round" />
					<path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
				</svg>
			);
		case "contribution":
			return (
				<svg {...props}>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<path d="M14 2v6h6M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		case "provenance":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="3" />
					<path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
					<path d="m4.9 4.9 2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" strokeLinecap="round" />
				</svg>
			);
		case "privacy":
			return (
				<svg {...props}>
					<rect x="5" y="11" width="14" height="10" rx="2" />
					<path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
				</svg>
			);
		case "retention":
			return (
				<svg {...props}>
					<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinejoin="round" />
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
