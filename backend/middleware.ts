import { auth } from "./auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  // Allow auth routes
  if (isApiAuthRoute) {
    return;
  }

  // You can add protected routes here
  // Example: protect all /api/protected/* routes
  if (req.nextUrl.pathname.startsWith("/api/protected") && !isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return;
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

