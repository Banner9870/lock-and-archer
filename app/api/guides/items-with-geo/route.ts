import { NextResponse } from "next/server";
import { listItemsWithGeo } from "@/lib/db/queries";

export async function GET() {
  const items = await listItemsWithGeo(500);
  return NextResponse.json(items);
}
