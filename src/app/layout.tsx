import type { Metadata } from "next";
import { MotionProvider } from "@/components/MotionProvider";
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
			<body>
				<MotionProvider>{children}</MotionProvider>
			</body>
		</html>
	);
}
