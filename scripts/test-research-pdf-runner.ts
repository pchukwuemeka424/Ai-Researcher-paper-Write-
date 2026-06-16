import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
	collapseSpacedLetterRuns,
	generateResearchPaperPdfBuffer,
	normalizePdfText,
	researchPaperFilename,
} from "../lib/research-paper-pdf";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "tmp");
const outFile = join(outDir, "research-paper-test.pdf");

const SAMPLE = `
**Socioeconomic, Lifestyle, and Health-System Determinants of Kidney Failure in Nigeria: A Mixed-Methods Study**

**Abstract**

Kidney failure is a growing burden. Prior work on s o c i o e c o n o m i c determinants remains insufficient in low-resource settings. This study synthesizes quantitative and qualitative evidence across Nigerian health systems.

**Keywords:** kidney failure; Nigeria; socioeconomic; mixed methods

**Study area:** Public health

**Introduction**

Chronic kidney disease progression to end-stage renal failure imposes substantial morbidity. We examine lifestyle, income, and facility-level factors.

**Methodology**

We conducted a mixed-methods review of peer-reviewed studies (2015–2025) and semi-structured interviews with clinicians (n=24).

**Results / Analysis**

Socioeconomic status and delayed referral were recurrent themes. Urban–rural disparities in dialysis access were pronounced.

**Discussion**

Policy should prioritize early screening and subsidized dialysis in underserved regions.

**Conclusion**

Integrated health-system reforms can mitigate the rising burden of kidney failure in Nigeria.

**References**

1. Example Author (2024). Sample citation. *Journal of Public Health*.
`.trim();

function assert(condition: boolean, message: string): void {
	if (!condition) {
		console.error("FAIL:", message);
		process.exit(1);
	}
}

async function main() {
	// Text normalization
	const collapsed = collapseSpacedLetterRuns("s o c i o e c o n o m i c burden");
	assert(collapsed === "socioeconomic burden", `collapseSpacedLetterRuns: got "${collapsed}"`);

	const normalized = normalizePdfText("  **Title**  ");
	assert(normalized === "Title", `normalizePdfText: got "${normalized}"`);

	const unicode = normalizePdfText("non\u2011communicable AI\u2011enabled");
	assert(unicode === "non-communicable AI-enabled", `unicode normalize: got "${unicode}"`);

	// PDF generation
	const buffer = await generateResearchPaperPdfBuffer(SAMPLE, {
		author: "Test Author",
		affiliation: "Test University",
	});

	assert(buffer !== null, "generateResearchPaperPdfBuffer returned null");
	assert(buffer.byteLength > 4_000, `PDF too small (${buffer.byteLength} bytes)`);

	const header = Buffer.from(buffer.slice(0, 5)).toString("ascii");
	assert(header === "%PDF-", `Invalid PDF header: ${header}`);

	const { mkdirSync } = await import("node:fs");
	mkdirSync(outDir, { recursive: true });
	writeFileSync(outFile, Buffer.from(buffer));

	const slug = researchPaperFilename(
		"Socioeconomic, Lifestyle, and Health-System Determinants of Kidney Failure in Nigeria",
	);
	assert(slug.length > 10, "filename slug too short");

	console.log("PASS: research paper PDF export");
	console.log(`  Size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
	console.log(`  Pages: check file manually`);
	console.log(`  Output: ${outFile}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
