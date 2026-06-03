import type { Metadata } from "next";
import HomeClient from "./HomeClient.tsx";

export const metadata: Metadata = {
	title: "Dashboard - WhatsApp Bot Admin",
	description: "Gestioná tus conversaciones, prompts y configuraciones del WhatsApp Bot.",
};

export default function Home() {
	return <HomeClient />;
}
