import { NextRequest, NextResponse } from 'next/server';
import { ensureNetworkAccess } from '@/lib/network-auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const isAdmin = req.cookies.get('isAdmin')?.value === 'true';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const wpNo = formData.get('wpNo') as string;

    if (!file || !wpNo) {
      return NextResponse.json({ error: 'Missing file or Work Permit No' }, { status: 400 });
    }

    ensureNetworkAccess();
    const year = wpNo.substring(1, 5);
    const uncPath = `\\\\192.168.42.41\\public\\SHE\\Work Permit\\${year}`;

    // Create directory if not exists (ignore error if already exists)
    try {
      fs.mkdirSync(uncPath, { recursive: true });
    } catch {
      // Directory may already exist
    }

    const fileName = `${wpNo}.pdf`;
    const filePath = path.join(uncPath, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, filePath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
