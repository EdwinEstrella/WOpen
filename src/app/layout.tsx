import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Bot Personal",
	description: "Shell local para agente de WhatsApp con SDD/OpenSpec.",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="es">
			<body>{children}</body>
		</html>
	);
}
