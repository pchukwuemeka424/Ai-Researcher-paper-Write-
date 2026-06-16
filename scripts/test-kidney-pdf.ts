import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { generateResearchPaperPdfBuffer, normalizePdfText } from "../lib/research-paper-pdf";

async function main() {
	const raw = execSync(
		'mongosh "mongodb://127.0.0.1:27017/feynman" --quiet --eval "print(JSON.stringify(db.savedresearches.findOne({}).content))"',
		{ encoding: "utf8" },
	);
	const content = JSON.parse(raw.trim()) as string;
	const out = join(dirname(fileURLToPath(import.meta.url)), "..", "tmp", "kidney-paper-test.pdf");

	const buf = await generateResearchPaperPdfBuffer(content, { author: "Prince chukwuemeka" });
	if (!buf) throw new Error("no pdf");
	writeFileSync(out, Buffer.from(buf));
	console.log("Wrote", out, buf.byteLength, "bytes");

	const intro = content.slice(content.indexOf("**Introduction**"), content.indexOf("**Introduction**") + 1500);
	const codes = new Set([...intro].filter((c) => c.charCodeAt(0) > 127).map((c) => c.charCodeAt(0)));
	console.log("non-ascii in intro before:", [...codes].sort((a, b) => a - b));
	const norm = normalizePdfText(intro);
	const codes2 = new Set([...norm].filter((c) => c.charCodeAt(0) > 127).map((c) => c.charCodeAt(0)));
	console.log("non-ascii in intro after normalize:", [...codes2]);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
