import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  const resp = await axios.get(
    `https://newsapi.org/v2/everything?q=keyword&apiKey=${process.env.NEWSAPI_KEY}`
  );
  return NextResponse.json({ ...resp.data });
}
