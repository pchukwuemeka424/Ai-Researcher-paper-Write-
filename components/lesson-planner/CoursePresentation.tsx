"use client";

import { useCallback, useRef, useState } from "react";

import {
	IconAlert,
	IconCheck,
	IconChevronLeft,
	IconChevronRight,
	IconCopy,
	IconDownload,
	IconImage,
	IconRefresh,
	IconTrash,
	IconUpload,
} from "@/components/lesson-planner/LessonPlannerIcons";
import {
	presentationFilename,
	presentationToMarkdown,
	type CoursePresentation,
	type PresentationSlide,
} from "@/lib/lesson-presentation";
import { downloadPresentationPdf } from "@/lib/presentation-pdf";
import { readSlideImageFile } from "@/lib/presentation-image";

type CoursePresentationProps = {
	presentation: CoursePresentation | null;
	loading?: boolean;
	error?: string | null;
	onRetry?: () => void;
	onPresentationChange?: (presentation: CoursePresentation) => void;
};

type SlideImageUploadProps = {
	slide: PresentationSlide;
	slideNumber: number;
	onUpload: (imageUrl: string) => void;
	onRemove: () => void;
};

function SlideImageUpload({ slide, slideNumber, onUpload, onRemove }: SlideImageUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const handleFile = async (file: File | undefined) => {
		if (!file) return;
		setUploading(true);
		setUploadError(null);
		try {
			const imageUrl = await readSlideImageFile(file);
			onUpload(imageUrl);
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : "Could not upload image.");
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	return (
		<div className="lp-deck-media">
			{slide.imageUrl ? (
				<>
					<img src={slide.imageUrl} alt="" className="lp-deck-media-image" />
					<div className="lp-deck-media-actions">
						<button
							type="button"
							className="lp-btn lp-btn-outline lp-btn-xs"
							onClick={() => inputRef.current?.click()}
							disabled={uploading}
						>
							<IconUpload size={14} />
							Replace
						</button>
						<button
							type="button"
							className="lp-btn lp-btn-ghost lp-btn-xs"
							onClick={onRemove}
							disabled={uploading}
						>
							<IconTrash size={14} />
							Remove
						</button>
					</div>
				</>
			) : (
				<div className="lp-deck-media-empty">
					{uploading ? (
						<div className="lp-slide-upload-skeleton" aria-hidden />
					) : (
						<>
							<div className="lp-slide-upload-icon" aria-hidden>
								<IconImage size={32} />
							</div>
							<p className="lp-deck-media-empty-title">Slide {slideNumber} illustration</p>
							<p className="lp-deck-media-empty-text">JPEG, PNG, WebP, or GIF up to 5 MB</p>
							<button
								type="button"
								className="lp-btn lp-btn-primary lp-btn-sm"
								onClick={() => inputRef.current?.click()}
							>
								<IconUpload size={16} />
								Upload image
							</button>
						</>
					)}
				</div>
			)}
			{uploadError && (
				<p className="lp-slide-upload-error">
					<IconAlert size={14} />
					{uploadError}
				</p>
			)}
			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif"
				className="lp-file-input"
				onChange={(event) => void handleFile(event.target.files?.[0])}
			/>
		</div>
	);
}

export function CoursePresentationPanel({
	presentation,
	loading,
	error,
	onRetry,
	onPresentationChange,
}: CoursePresentationProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [copied, setCopied] = useState(false);
	const [downloadingPdf, setDownloadingPdf] = useState(false);
	const [pdfError, setPdfError] = useState<string | null>(null);

	const slideCount = presentation?.slides.length ?? 0;
	const activeSlide = presentation?.slides[activeIndex];
	const hasSlides = slideCount > 0;
	const imageCount = presentation?.slides.filter((slide) => slide.imageUrl).length ?? 0;

	const updateSlideImage = useCallback(
		(index: number, imageUrl: string | null) => {
			if (!presentation || !onPresentationChange) return;
			onPresentationChange({
				...presentation,
				slides: presentation.slides.map((slide, slideIndex) =>
					slideIndex === index ? { ...slide, imageUrl } : slide,
				),
			});
		},
		[presentation, onPresentationChange],
	);

	const goPrev = useCallback(() => {
		setActiveIndex((index) => Math.max(0, index - 1));
	}, []);

	const goNext = useCallback(() => {
		setActiveIndex((index) => Math.min(slideCount - 1, index + 1));
	}, [slideCount]);

	const handleCopy = async () => {
		if (!presentation) return;
		try {
			await navigator.clipboard.writeText(presentationToMarkdown(presentation));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			/* clipboard unavailable */
		}
	};

	const handleDownloadMarkdown = () => {
		if (!presentation) return;
		const blob = new Blob([presentationToMarkdown(presentation)], {
			type: "text/markdown;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = presentationFilename(presentation.title);
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const handleDownloadPdf = async () => {
		if (!presentation) return;
		setDownloadingPdf(true);
		setPdfError(null);
		try {
			await downloadPresentationPdf(presentation);
		} catch (err) {
			setPdfError(err instanceof Error ? err.message : "Could not create PDF.");
		} finally {
			setDownloadingPdf(false);
		}
	};

	if (loading) {
		return (
			<div className="lp-state lp-state-loading" role="status" aria-live="polite">
				<div className="lp-spinner" aria-hidden />
				<p className="lp-state-title">Building presentation slides…</p>
				<p className="lp-state-detail">
					Writing explanatory slide content with key points for your lecture.
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="lp-state lp-state-error">
				<div className="lp-state-icon" aria-hidden>
					<IconAlert size={24} />
				</div>
				<h3 className="lp-state-title">Could not generate presentation</h3>
				<p className="lp-state-detail">{error}</p>
				{onRetry && (
					<button type="button" className="lp-btn lp-btn-primary" onClick={onRetry}>
						<IconRefresh size={18} />
						Try again
					</button>
				)}
			</div>
		);
	}

	if (!hasSlides || !activeSlide || !presentation) return null;

	return (
		<div className="lp-deck">
			<div className="lp-deck-header">
				<div className="lp-deck-stats">
					<span className="lp-deck-stat">
						<strong>{slideCount}</strong> slides
					</span>
					<span className="lp-deck-stat">
						<strong>{imageCount}</strong> with images
					</span>
				</div>
				<div className="lp-toolbar">
					<button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={() => void handleCopy()}>
						{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
						{copied ? "Copied" : "Copy"}
					</button>
					<button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={handleDownloadMarkdown}>
						<IconDownload size={16} />
						Markdown
					</button>
					<button
						type="button"
						className="lp-btn lp-btn-primary lp-btn-sm"
						onClick={() => void handleDownloadPdf()}
						disabled={downloadingPdf}
					>
						{downloadingPdf ? (
							<>
								<span className="lp-btn-spinner" aria-hidden />
								Exporting…
							</>
						) : (
							<>
								<IconDownload size={16} />
								Download PDF
							</>
						)}
					</button>
				</div>
			</div>

			{pdfError && (
				<p className="lp-deck-error" role="alert">
					<IconAlert size={14} />
					{pdfError}
				</p>
			)}

			<div className="lp-deck-layout">
				<aside className="lp-deck-sidebar" aria-label="Slide list">
					<p className="lp-deck-sidebar-label">All slides</p>
					<ol className="lp-deck-list">
						{presentation.slides.map((slide, index) => (
							<li key={`${slide.title}-${index}`}>
								<button
									type="button"
									className={`lp-deck-list-item${index === activeIndex ? " lp-deck-list-item-active" : ""}`}
									onClick={() => setActiveIndex(index)}
									aria-current={index === activeIndex ? "true" : undefined}
								>
									<span className="lp-deck-list-num">{index + 1}</span>
									<span className="lp-deck-list-body">
										<span className="lp-deck-list-title">{slide.title}</span>
										{slide.imageUrl && (
											<span className="lp-deck-list-badge">
												<IconImage size={12} />
												Image
											</span>
										)}
									</span>
								</button>
							</li>
						))}
					</ol>
				</aside>

				<div className="lp-deck-main">
					<article className="lp-deck-slide" aria-live="polite">
						<header className="lp-deck-slide-bar">
							<span className="lp-deck-slide-course">{presentation.title}</span>
							<span className="lp-deck-slide-count">
								Slide {activeIndex + 1} / {slideCount}
							</span>
						</header>

						<div className="lp-deck-slide-body">
							{onPresentationChange && (
								<SlideImageUpload
									slide={activeSlide}
									slideNumber={activeIndex + 1}
									onUpload={(imageUrl) => updateSlideImage(activeIndex, imageUrl)}
									onRemove={() => updateSlideImage(activeIndex, null)}
								/>
							)}
							<div className="lp-deck-slide-content">
								<h3 className="lp-deck-slide-title">{activeSlide.title}</h3>
								<p className="lp-deck-slide-explanation">{activeSlide.explanation}</p>
								{activeSlide.bullets.length > 0 && (
									<ul className="lp-deck-slide-bullets">
										{activeSlide.bullets.map((bullet, bulletIndex) => (
											<li key={`${bulletIndex}-${bullet}`}>{bullet}</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</article>

					<div className="lp-deck-nav">
						<button
							type="button"
							className="lp-btn lp-btn-outline lp-btn-sm"
							onClick={goPrev}
							disabled={activeIndex === 0}
						>
							<IconChevronLeft size={16} />
							Previous
						</button>
						<div className="lp-slide-dots" role="tablist" aria-label="Slides">
							{presentation.slides.map((slide, index) => (
								<button
									key={`dot-${slide.title}-${index}`}
									type="button"
									role="tab"
									aria-selected={index === activeIndex}
									aria-label={`Slide ${index + 1}: ${slide.title}`}
									className={`lp-slide-dot${index === activeIndex ? " lp-slide-dot-active" : ""}${slide.imageUrl ? " lp-slide-dot-has-image" : ""}`}
									onClick={() => setActiveIndex(index)}
								/>
							))}
						</div>
						<button
							type="button"
							className="lp-btn lp-btn-outline lp-btn-sm"
							onClick={goNext}
							disabled={activeIndex >= slideCount - 1}
						>
							Next
							<IconChevronRight size={16} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
