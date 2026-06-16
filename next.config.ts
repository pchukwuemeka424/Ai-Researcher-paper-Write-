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
