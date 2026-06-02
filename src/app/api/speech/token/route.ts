import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return NextResponse.json(
      { error: "Azure Speech not configured" },
      { status: 500 }
    );
  }

  const endpoint = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Length": "0",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: `Azure token exchange failed: ${res.status} ${errText}` },
      { status: 502 }
    );
  }

  const token = await res.text();

  return NextResponse.json(
    { token, region },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
