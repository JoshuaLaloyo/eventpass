import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";

// Poster upload to Cloudinary (signed). If Cloudinary env vars are not set,
// the create-event form falls back to a plain poster URL field.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ORGANIZER");
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return jsonError(501, "UPLOADS_NOT_CONFIGURED", "Cloudinary is not configured — paste a poster URL instead");
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) return jsonError(400, "VALIDATION", "No file received");
    if (file.size > 5 * 1024 * 1024) return jsonError(400, "VALIDATION", "Poster must be under 5 MB");

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "eventpass/posters";
    const signature = crypto
      .createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
      .digest("hex");

    const upstream = new FormData();
    upstream.append("file", file);
    upstream.append("api_key", CLOUDINARY_API_KEY);
    upstream.append("timestamp", String(timestamp));
    upstream.append("folder", folder);
    upstream.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: upstream });
    const data = await res.json();
    if (!res.ok || !data.secure_url) return jsonError(502, "UPLOAD_FAILED", "Poster upload failed");
    return NextResponse.json({ url: data.secure_url });
  } catch (e) {
    return handleRouteError(e);
  }
}
