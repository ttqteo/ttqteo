import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  const resp = await axios.get(`https://newsapi.org/v2/everything`, {
    params: {
      sortBy: "publishedAt",
      apiKey: process.env.NEWSAPI_KEY,
      q: "keyword",
    },
  });
  return NextResponse.json({ ...resp.data });
}
