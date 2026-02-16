export type FetchState = "idle" | "loading" | "success" | "error";

export type RouteContext = {
  params: Promise<{ id: string }>;
};