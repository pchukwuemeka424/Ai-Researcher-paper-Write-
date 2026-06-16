const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 1280;

export function isAcceptedSlideImageType(type: string): boolean {
	return ACCEPTED_TYPES.has(type);
}

function readFileAsDataUrl(file: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") resolve(reader.result);
			else reject(new Error("Could not read image file."));
		};
		reader.onerror = () => reject(new Error("Could not read image file."));
		reader.readAsDataURL(file);
	});
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Could not load image."));
		image.src = dataUrl;
	});
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Could not process image."));
			},
			type,
			quality,
		);
	});
}

async function compressDataUrl(dataUrl: string, mimeType: string): Promise<string> {
	const image = await loadImage(dataUrl);
	const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
	const width = Math.max(1, Math.round(image.width * scale));
	const height = Math.max(1, Math.round(image.height * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Could not process image.");
	context.drawImage(image, 0, 0, width, height);

	const outputType = mimeType === "image/png" ? "image/png" : "image/jpeg";
	const quality = outputType === "image/jpeg" ? 0.88 : undefined;
	let blob = await canvasToBlob(canvas, outputType, quality);
	let result = await readFileAsDataUrl(blob);

	if (result.length <= MAX_OUTPUT_BYTES) return result;

	if (outputType === "image/jpeg") {
		for (const q of [0.75, 0.6, 0.45]) {
			blob = await canvasToBlob(canvas, "image/jpeg", q);
			result = await readFileAsDataUrl(blob);
			if (result.length <= MAX_OUTPUT_BYTES) return result;
		}
	}

	if (result.length > MAX_OUTPUT_BYTES) {
		throw new Error("Image is too large. Try a smaller file.");
	}

	return result;
}

export async function readSlideImageFile(file: File): Promise<string> {
	if (!isAcceptedSlideImageType(file.type)) {
		throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
	}
	if (file.size > MAX_INPUT_BYTES) {
		throw new Error("Image must be 5 MB or smaller.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	return compressDataUrl(dataUrl, file.type);
}
