import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authenticate, login, logout, AppError } from "@/lib/auth";
import {
  dashboard,
  createIncident,
  dispatch,
  complete,
  maintenance,
  runQuery,
  addResourceTag,
  updateResourceTag,
  removeResourceTag,
} from "@/lib/service";
import { listNotes, createNote, updateNote, deleteNote } from "@/lib/mongo";
import { searchIncidents } from "@/lib/semantic";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname.slice("/api/".length);
    const method = req.method;
    if (method !== "GET") {
      const origin = req.headers.get("origin");
      if (origin && new URL(origin).host !== req.headers.get("host"))
        throw new AppError(403, "Cross-origin write rejected");
      if (Number(req.headers.get("content-length") || 0) > 16384)
        throw new AppError(413, "Request too large");
    }
    const respond = (data: unknown, status = 200) =>
      NextResponse.json(data, {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    if (path === "auth/login" && method === "POST") {
      const d = z
        .object({
          email: z.email().max(254),
          password: z.string().min(1).max(200),
        })
        .parse(await req.json());
      const { token, actor } = await login(d.email, d.password);
      const res = respond(actor);
      res.cookies.set("crisis_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: req.nextUrl.protocol === "https:",
        maxAge: 28800,
        path: "/",
      });
      return res;
    }
    const token = req.cookies.get("crisis_session")?.value;
    const actor = await authenticate(token);
    if (path === "auth/me" && method === "GET") return respond(actor);
    if (path === "auth/logout" && method === "POST") {
      await logout(token!);
      const res = respond({ ok: true });
      res.cookies.delete("crisis_session");
      return res;
    }
    if (path === "dashboard" && method === "GET")
      return respond(await dashboard(actor));
    if (path === "incidents/search" && method === "GET")
      return respond(await searchIncidents(actor, {
        query: req.nextUrl.searchParams.get("q"),
        limit: req.nextUrl.searchParams.get("limit") || 5,
      }));
    if (path === "incidents" && method === "POST")
      return respond(await createIncident(actor, await req.json()), 201);
    if (path === "dispatch" && method === "POST")
      return respond(await dispatch(actor, await req.json()), 201);
    if (path === "complete" && method === "POST")
      return respond(await complete(actor, await req.json()));
    if (path === "maintenance" && method === "POST")
      return respond(await maintenance(actor, await req.json()), 201);
    if (path === "resource-tags") {
      if (method === "POST")
        return respond(await addResourceTag(actor, await req.json()), 201);
      if (method === "PATCH")
        return respond(await updateResourceTag(actor, await req.json()));
      if (method === "DELETE")
        return respond(await removeResourceTag(actor, await req.json()));
    }
    if (path === "queries" && method === "GET")
      return respond(
        await runQuery(actor, req.nextUrl.searchParams.get("key") || "join"),
      );
    if (path === "notes" && method === "GET") {
      const id = z.coerce
        .number()
        .int()
        .positive()
        .parse(req.nextUrl.searchParams.get("incident"));
      return respond(
        await listNotes(
          actor,
          id,
          req.nextUrl.searchParams.get("search") || "",
        ),
      );
    }
    if (path === "notes" && method === "POST")
      return respond(await createNote(actor, await req.json()), 201);
    if (path.startsWith("notes/")) {
      const id = path.slice(6);
      if (method === "PATCH")
        return respond(await updateNote(actor, id, await req.json()));
      if (method === "DELETE") return respond(await deleteNote(actor, id));
    }
    throw new AppError(404, "Endpoint not found");
  } catch (e) {
    let status = 500,
      message = "Request could not be completed";
    if (e instanceof AppError) {
      status = e.status;
      message = e.message;
    } else if (e instanceof ZodError) {
      status = 400;
      message = e.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } else if (e instanceof SyntaxError) {
      status = 400;
      message = "Invalid JSON";
    } else if (
      e instanceof Error &&
      /Mongo(Network|ServerSelection|TopologyClosed|NotConnected)/.test(e.name)
    ) {
      status = 503;
      message =
        "MongoDB is unavailable. The operation was not confirmed; retry after reconnecting.";
    } else {
      const err = e as { code?: string; message?: string };
      if (err.code === "42501") {
        status = 403;
        message = "Database permission denied";
      } else if (
        ["23503", "23505", "23514", "23502", "P0001"].includes(err.code || "")
      ) {
        status = 409;
        message =
          err.code === "P0001"
            ? err.message!
            : "The change conflicts with database constraints";
      } else console.error("API failure", e);
    }
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
