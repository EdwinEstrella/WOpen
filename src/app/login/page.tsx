import type { Metadata } from "next";
import LoginForm from "./LoginForm.tsx";

export const metadata: Metadata = {
	title: "Iniciar sesión - WhatsApp Bot Admin",
	description: "Iniciá sesión en el panel de administración del WhatsApp Bot.",
};

export default function LoginPage() {
	return <LoginForm />;
}
