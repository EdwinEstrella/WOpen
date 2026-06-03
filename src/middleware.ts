import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	
	// Permitir rutas de API públicas, de autenticación o archivos multimedia
	if (pathname.startsWith('/api/auth/') || pathname.startsWith('/media/')) {
		return NextResponse.next();
	}

	// Proteger todas las demás rutas (raíz, páginas y otras APIs)
	const sessionCookie = request.cookies.get('bot_session');
	const adminPassword = process.env.ADMIN_PASSWORD;

	// Si no hay contraseña configurada en el entorno, o si la cookie no coincide, redirigir
	if (!adminPassword || sessionCookie?.value !== adminPassword) {
		// Si es una petición a la API (no auth), devolver 401
		if (pathname.startsWith('/api/')) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
		}
		
		// Si ya está en /login, permitir
		if (pathname === '/login') {
			return NextResponse.next();
		}

		// Redirigir al login
		return NextResponse.redirect(new URL('/login', request.url));
	}

	// Si está autenticado y trata de ir a /login, redirigir al inicio
	if (pathname === '/login') {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - media (whatsapp media)
		 * - favicon.ico, sitemap.xml, robots.txt (metadata files)
		 */
		'/((?!_next/static|_next/image|media|favicon.ico|sitemap.xml|robots.txt).*)',
	],
};