import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export async function GET(request: Request) {
  try {
    // Read the secret to prevent abuse
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    
    if (secret !== "start-cleaning-now") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchSize = parseInt(url.searchParams.get("batch") || "20");

    await inngest.send({
      name: "data.verification.v2.start",
      data: {
        batchSize: batchSize,
        startTime: Date.now(),
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Data verification and cleanup task dispatched to the cloud successfully." 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
