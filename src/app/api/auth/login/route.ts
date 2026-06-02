import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const { email, password } = await request.json();

		const adminEmail = process.env.ADMIN_EMAIL;
		const adminPassword = process.env.ADMIN_PASSWORD;

		if (!adminEmail || !adminPassword) {
			return NextResponse.json(
				{ error: "Credenciales de administrador no configuradas en el servidor" },
				{ status: 500 }
			);
		}

		if (email === adminEmail && password === adminPassword) {
			const response = NextResponse.json({ success: true });
			
			// Establecemos la cookie de sesión (usamos la misma contraseña como token simple)
			response.cookies.set("bot_session", adminPassword, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 60 * 60 * 24 * 7, // 1 semana
			});

			return response;
		}

		return NextResponse.json(
			{ error: "Credenciales inválidas" },
			{ status: 401 }
		);
	} catch (error) {
		return NextResponse.json(
			{ error: "Error en el servidor" },
			{ status: 500 }
		);
	}
}