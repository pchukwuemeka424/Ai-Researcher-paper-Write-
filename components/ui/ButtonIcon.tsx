type Props = {
	size?: number;
	className?: string;
};

const defaults = {
	size: 16,
	className: undefined as string | undefined,
};

function svgProps({ size, className }: Props) {
	return {
		width: size ?? defaults.size,
		height: size ?? defaults.size,
		viewBox: "0 0 24 24",
		fill: "none" as const,
		stroke: "currentColor",
		strokeWidth: 2,
		className,
		"aria-hidden": true as const,
	};
}

export function IconDashboard(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<rect x="3" y="3" width="7" height="9" rx="1" />
			<rect x="14" y="3" width="7" height="5" rx="1" />
			<rect x="14" y="12" width="7" height="9" rx="1" />
			<rect x="3" y="16" width="7" height="5" rx="1" />
		</svg>
	);
}

export function IconBookmark(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
		</svg>
	);
}

export function IconGrid(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="7" height="7" rx="1" />
		</svg>
	);
}

export function IconMarkdown(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
		</svg>
	);
}

export function IconCopy(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<rect x="9" y="9" width="13" height="13" rx="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	);
}

export function IconCheck(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconDownload(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M12 3v12M8 11l4 4 4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconRefresh(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
			<path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconTrash(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconRotateCcw(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M3 12a9 9 0 0 1 15-6.7L21 8" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M21 12a9 9 0 0 1-15 6.7L3 16" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconStop(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<rect x="6" y="6" width="12" height="12" rx="1" />
		</svg>
	);
}

export function IconSparkles(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M12 3l1.2 4.2L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-0.8L12 3z" strokeLinejoin="round" />
			<path d="M5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15z" strokeLinejoin="round" />
		</svg>
	);
}

export function IconChevronLeft(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconChevronRight(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconArrowRight(props: Props) {
	return <IconChevronRight {...props} />;
}

export function IconX(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
		</svg>
	);
}

export function IconFileText(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
		</svg>
	);
}

export function IconLogOut(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconSearch(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<circle cx="11" cy="11" r="7" />
			<path d="m21 21-4.3-4.3" strokeLinecap="round" />
		</svg>
	);
}

export function IconBook(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
		</svg>
	);
}

export function IconEdit(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconLightbulb(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconFilter(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconClock(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconGraduationCap(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M22 10 12 5 2 10l10 5 10-5z" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconAward(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<circle cx="12" cy="8" r="5" />
			<path d="M8.5 13 7 22l5-2.5L17 22l-1.5-9" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconMicroscope(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M6 18h8M4 22h16" strokeLinecap="round" />
			<path d="M6 18a6 6 0 0 1 12 0" strokeLinecap="round" />
			<path d="M12 2v8M9 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconBriefcase(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<rect x="2" y="7" width="20" height="14" rx="2" />
			<path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" strokeLinecap="round" />
		</svg>
	);
}

export function IconLayers(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M12 2 2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
			<path d="m2 17 10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconTarget(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<circle cx="12" cy="12" r="9" />
			<circle cx="12" cy="12" r="5" />
			<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
		</svg>
	);
}

export function IconMoveRight(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconUpload(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M12 16V4M8 8l4-4 4 4M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconFolder(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeLinejoin="round" />
		</svg>
	);
}

export function IconPlus(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M12 5v14M5 12h14" strokeLinecap="round" />
		</svg>
	);
}

export function IconTable(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<rect x="3" y="4" width="18" height="16" rx="2" />
			<path d="M3 10h18M3 14h18M9 4v16M15 4v16" strokeLinecap="round" />
		</svg>
	);
}

export function IconBraces(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M8 4H6.5A2.5 2.5 0 0 0 4 6.5v3A1.5 1.5 0 0 1 2.5 11 1.5 1.5 0 0 1 4 12.5v3A2.5 2.5 0 0 0 6.5 18H8" strokeLinecap="round" />
			<path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5v3A1.5 1.5 0 0 0 21.5 11 1.5 1.5 0 0 0 20 12.5v3A2.5 2.5 0 0 1 17.5 18H16" strokeLinecap="round" />
		</svg>
	);
}

export function IconArchive(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<rect x="3" y="4" width="18" height="5" rx="1" />
			<path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" strokeLinecap="round" />
		</svg>
	);
}

export function IconDatabase(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<ellipse cx="12" cy="5" rx="8" ry="3" />
			<path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
		</svg>
	);
}

export function IconStickyNote(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z" strokeLinejoin="round" />
			<path d="M15 3v6h6M9 13h6M9 17h4" strokeLinecap="round" />
		</svg>
	);
}

export function IconChartBar(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconChartLine(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M7 14l4-4 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconChartArea(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
			<path
				d="M7 16l4-5 3 2 6-7v10H7z"
				strokeLinejoin="round"
				fill="currentColor"
				fillOpacity="0.12"
			/>
		</svg>
	);
}

export function IconChartPie(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M21.21 15.89A10 10 0 1 1 8 2.83" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M22 12A10 10 0 0 0 12 2v10z" strokeLinejoin="round" />
		</svg>
	);
}

export function IconChartScatter(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx="8" cy="14" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="16" cy="13" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="18.5" cy="7" r="1.5" fill="currentColor" stroke="none" />
		</svg>
	);
}

export function IconSliders(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" strokeLinecap="round" />
			<path d="M1 14h6M9 8h6M17 16h6" strokeLinecap="round" />
		</svg>
	);
}

export function IconLibrary(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
		</svg>
	);
}

export function IconFileSpreadsheet(props: Props) {
	const p = svgProps(props);
	return (
		<svg {...p}>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
			<path d="M14 2v6h6M8 13h8M8 17h8M10 9h1" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
