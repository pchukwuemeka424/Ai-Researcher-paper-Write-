/** Shared guidance for the interest-topic step and idea-generation prompts. */

export const VAGUE_TOPIC_EXAMPLES = [
	"Artificial Intelligence in Education",
	"Social Media and Business Growth",
	"Cybersecurity Challenges",
	"Machine Learning Applications in Healthcare",
	"Climate Change Effects",
] as const;

export const STRONG_TOPIC_EXAMPLES = [
	"How faculty adoption of generative AI tools affects undergraduate essay originality scores in Nigerian federal universities (2024–2025)",
	"Instagram influencer partnerships and repeat-purchase rates among women aged 18–35 in Lagos small fashion retailers",
	"Ransomware incident response time and patient record downtime in tertiary hospitals across Southeast Nigeria",
] as const;

export const TOPIC_INPUT_HINT =
	"Describe your interest area — themes are fine as a starting point. Our multi-agent pipeline will identify discipline, variables, population, context, and research gaps before formulating publishable study titles.";

export const TOPIC_QUALITY_RULES = `STRICT RULES — generate publishable academic study titles, NOT broad themes.

DO NOT output vague titles such as:
${VAGUE_TOPIC_EXAMPLES.map((t) => `- ${t}`).join("\n")}

INSTEAD each title MUST specify:
- What is being studied
- Which variables, constructs, or phenomena are involved
- Who or what is being studied (population or units of analysis)
- The context or setting
- The analytical perspective (design, comparison, longitudinal, etc.)`;
