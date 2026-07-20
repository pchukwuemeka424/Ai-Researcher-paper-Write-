import type { NextConfig } from "next";

const DEV_BACKEND = process.env.FEYNMAN_BACKEND_URL ?? "http://127.0.0.1:3141";

const nextConfig: NextConfig = {
	output: "export",
	images: {
		unoptimized: true,
	},
	turbopack: {
		root: import.meta.dirname,
	},
	// Ideas / outline generation can exceed the default ~30s rewrite proxy timeout.
	experimental: {
		proxyTimeout: 180_000,
	},
	async rewrites() {
		if (process.env.NODE_ENV !== "development") {
			return [];
		}
		return [
			{
				source: "/api/:path*",
				destination: `${DEV_BACKEND}/api/:path*`,
			},
			{
				source: "/ws",
				destination: `${DEV_BACKEND}/ws`,
			},
		];
	},
};

export default nextConfig;
