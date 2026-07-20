import type { ReactNode } from "react";

type IconProps = { size?: number; className?: string };

function Icon({ size = 18, className, children }: IconProps & { children: ReactNode }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			{children}
		</svg>
	);
}

export function IconArrowLeft(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M19 12H5M12 19l-7-7 7-7" />
		</Icon>
	);
}

export function IconDashboard(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="7" height="7" rx="1" />
		</Icon>
	);
}

export function IconSparkles(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
			<circle cx="12" cy="12" r="3" />
		</Icon>
	);
}

export function IconBook(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
		</Icon>
	);
}

export function IconSave(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
			<path d="M17 21v-8H7v8M7 3v5h8" />
		</Icon>
	);
}

export function IconCalendar(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="3" y="4" width="18" height="18" rx="2" />
			<path d="M16 2v4M8 2v4M3 10h18" />
		</Icon>
	);
}

export function IconCopy(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="9" y="9" width="13" height="13" rx="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</Icon>
	);
}

export function IconCheck(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M20 6L9 17l-5-5" />
		</Icon>
	);
}

export function IconDownload(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
		</Icon>
	);
}

export function IconPresentation(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="2" y="3" width="20" height="14" rx="2" />
			<path d="M8 21h8M12 17v4" />
		</Icon>
	);
}

export function IconRefresh(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M21 12a9 9 0 1 1-2.6-6.3" />
			<path d="M21 3v6h-6" />
		</Icon>
	);
}

export function IconPlus(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 5v14M5 12h14" />
		</Icon>
	);
}

export function IconUpload(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
		</Icon>
	);
}

export function IconImage(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<circle cx="8.5" cy="8.5" r="1.5" />
			<path d="M21 15l-5-5L5 21" />
		</Icon>
	);
}

export function IconChevronLeft(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M15 18l-6-6 6-6" />
		</Icon>
	);
}

export function IconChevronRight(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M9 18l6-6-6-6" />
		</Icon>
	);
}

export function IconTrash(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
		</Icon>
	);
}

export function IconAlert(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 8v4M12 16h.01" />
		</Icon>
	);
}

export function IconLayers(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 2L2 7l10 5 10-5-10-5z" />
			<path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
		</Icon>
	);
}

export function IconTarget(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="10" />
			<circle cx="12" cy="12" r="6" />
			<circle cx="12" cy="12" r="2" />
		</Icon>
	);
}

export function IconClipboard(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
			<rect x="8" y="2" width="8" height="4" rx="1" />
		</Icon>
	);
}

export function IconListChecks(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 6h11M10 12h11M10 18h11M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" />
		</Icon>
	);
}

export function IconClock(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 6v6l4 2" />
		</Icon>
	);
}

export function IconFileText(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
		</Icon>
	);
}

export function IconChevronDown(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m6 9 6 6 6-6" />
		</Icon>
	);
}
