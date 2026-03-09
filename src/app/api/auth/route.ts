import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_USER, ADMIN_PASSWORD } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    const res = NextResponse.json({ success: true });
    res.cookies.set('isAdmin', 'true', { httpOnly: true, path: '/', maxAge: 60 * 60 * 8 });
    return res;
  }
  return NextResponse.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('isAdmin', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const isAdmin = req.cookies.get('isAdmin')?.value === 'true';
  return NextResponse.json({ isAdmin });
}
