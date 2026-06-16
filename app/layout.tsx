import { Inter } from "next/font/google";
import type { Metadata } from "next";

import { Providers } from "@/components/Providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

export const metadata: Metadata = {
	title: APP_NAME,
	description: APP_TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={inter.variable} suppressHydrationWarning>
			<body className={inter.className} suppressHydrationWarning>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
