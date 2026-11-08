import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { buildCsvExport, buildJsonExport } from "@/lib/export/build";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/export?format=json            → everything, one JSON file
 * GET /api/export?format=csv&collection=<id> → one collection as CSV
 * Session cookie required; RLS limits the data to the caller.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to export your data." }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const stamp = new Date().toISOString().slice(0, 10);

  try {
    if (format === "csv") {
      const collectionId = request.nextUrl.searchParams.get("collection") ?? "";
      if (!UUID.test(collectionId)) return NextResponse.json({ error: "Pick a collection." }, { status: 400 });
      const result = await buildCsvExport(collectionId);
      if (!result) return NextResponse.json({ error: "Collection not found." }, { status: 404 });
      return new NextResponse(result.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${result.filename.replace(".csv", `-${stamp}.csv`)}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    if (format === "json") {
      const json = await buildJsonExport();
      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="lifolio-export-${stamp}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json({ error: "Unknown format." }, { status: 400 });
  } catch (error) {
    console.error("[lifolio] export:", error);
    return NextResponse.json({ error: "Export failed. Try again." }, { status: 500 });
  }
}
