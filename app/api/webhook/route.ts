import { NextRequest, NextResponse } from "next/server";
import { parseTapEvent, assureAdminAuth } from "@atproto/tap";
import { AtUri } from "@atproto/syntax";
import {
  upsertAccount,
  insertStatus,
  deleteStatus,
  deleteAccount,
  insertGuide,
  insertGuideItem,
  deleteGuide,
  deleteGuideItem,
  deleteItemsByGuideUri,
} from "@/lib/db/queries";
import { isStatusphereEnabled } from "@/lib/config";
import * as xyz from "@/src/lexicons/xyz";
import * as com from "@/src/lexicons/com";

const TAP_ADMIN_PASSWORD = process.env.TAP_ADMIN_PASSWORD;

export async function POST(request: NextRequest) {
  if (TAP_ADMIN_PASSWORD) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      assureAdminAuth(TAP_ADMIN_PASSWORD, authHeader);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await request.json();
  const evt = parseTapEvent(body);

  if (evt.type === "identity") {
    if (evt.status === "deleted") {
      await deleteAccount(evt.did);
    } else {
      await upsertAccount({
        did: evt.did,
        handle: evt.handle,
        active: evt.isActive ? 1 : 0,
      });
    }
  }

  if (evt.type === "record") {
    const uri = AtUri.make(evt.did, evt.collection, evt.rkey);

    if (evt.action === "create" || evt.action === "update") {
      if (!evt.record) {
        return NextResponse.json({ success: false });
      }

      if (evt.collection === "xyz.statusphere.status") {
        if (!isStatusphereEnabled()) {
          // Skip indexing; return success so Tap doesn't retry
        } else {
          let record: xyz.statusphere.status.Main;
          try {
            record = xyz.statusphere.status.$parse(evt.record);
          } catch {
            return NextResponse.json({ success: false });
          }
          await insertStatus({
            uri: uri.toString(),
            authorDid: evt.did,
            status: record.status,
            createdAt: record.createdAt,
            indexedAt: new Date().toISOString(),
            current: 1,
          });
        }
      } else if (evt.collection === "com.cpm.guides.guide") {
        let record: com.cpm.guides.guide.Main;
        try {
          record = com.cpm.guides.guide.$parse(evt.record);
        } catch {
          return NextResponse.json({ success: false });
        }
        await insertGuide({
          uri: uri.toString(),
          authorDid: evt.did,
          title: record.title,
          description: record.description ?? "",
          slug: record.slug ?? "",
          forkedFrom: record.forkedFrom ?? "",
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          indexedAt: new Date().toISOString(),
        });
      } else if (evt.collection === "com.cpm.guides.guideItem") {
        let record: com.cpm.guides.guideItem.Main;
        try {
          record = com.cpm.guides.guideItem.$parse(evt.record);
        } catch {
          return NextResponse.json({ success: false });
        }
        await insertGuideItem({
          uri: uri.toString(),
          guideUri: record.guideRef,
          authorDid: evt.did,
          type: record.type,
          sourceId: record.sourceId ?? "",
          sourceUrl: record.sourceUrl ?? "",
          sourceLabel: record.sourceLabel ?? "",
          title: record.title ?? "",
          description: record.description ?? "",
          snapshotAt: record.snapshotAt ?? "",
          indexedAt: new Date().toISOString(),
          latitude:
            record.latitude != null && record.latitude !== ""
              ? parseFloat(record.latitude)
              : null,
          longitude:
            record.longitude != null && record.longitude !== ""
              ? parseFloat(record.longitude)
              : null,
          neighborhoodId: record.neighborhoodId ?? null,
        });
      }
    } else if (evt.action === "delete") {
      if (evt.collection === "xyz.statusphere.status" && isStatusphereEnabled()) {
        await deleteStatus(uri);
      } else if (evt.collection === "com.cpm.guides.guide") {
        await deleteItemsByGuideUri(uri.toString());
        await deleteGuide(uri.toString());
      } else if (evt.collection === "com.cpm.guides.guideItem") {
        await deleteGuideItem(uri.toString());
      }
    }
  }

  return NextResponse.json({ success: true });
}
