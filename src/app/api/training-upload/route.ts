import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const isAdmin = req.cookies.get('isAdmin')?.value === 'true';
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file || !fileName) {
      return NextResponse.json({ error: 'Missing file or fileName' }, { status: 400 });
    }

    const uncPath = '\\192.168.42.41\public\SHE\Work Permit\Training Record';
    try { fs.mkdirSync(uncPath, { recursive: true }); } catch { /* may already exist */ }

    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const filePath = path.join(uncPath, safeFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, filePath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
