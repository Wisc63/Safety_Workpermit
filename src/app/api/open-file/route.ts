import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST(req: NextRequest) {
  const { filePath } = await req.json();
  if (!filePath) {
    return NextResponse.json({ error: 'Missing filePath' }, { status: 400 });
  }

  return new Promise<NextResponse>((resolve) => {
    // Open Explorer with the file selected
    exec(`explorer /select,"${filePath}"`, (err) => {
      if (err) {
        // If file not found, open the containing folder
        const folder = filePath.substring(0, filePath.lastIndexOf('\\'));
        exec(`explorer "${folder}"`, () => {
          resolve(NextResponse.json({ success: true }));
        });
      } else {
        resolve(NextResponse.json({ success: true }));
      }
    });
  });
}
