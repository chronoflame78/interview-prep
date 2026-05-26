import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

const publicRoutes = ["/", "/login", "/register"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isApiAuthRoute = pathname.startsWith("/api/auth");

  const isApiRoute = pathname.startsWith("/api/");
  const isDomainSelect = pathname === "/domain-select";

  if (isApiAuthRoute) return;

  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL("/questions", req.nextUrl));
  }

  if (!isPublicRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && !req.auth?.user?.activeDomainId && !isDomainSelect && !isApiRoute && !isPublicRoute) {
    return Response.redirect(new URL("/domain-select", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
