import { NextResponse } from "next/server";
import { appendLead } from "@/lib/sheets";
import { verifyMsg91Token } from "@/lib/msg91";

export async function POST(req) {
  try {
    const { name, phone, message, accessToken } = await req.json();
    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Naam aur phone zaroori hai" }, { status: 400 });
    }
    // OTP sach me verify hua ya nahi, server pe check
    if (!accessToken || !(await verifyMsg91Token(accessToken))) {
      return NextResponse.json({ error: "OTP verify nahi hua" }, { status: 401 });
    }
    await appendLead({ name: name.trim(), phone: phone.trim(), message: message?.trim() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}