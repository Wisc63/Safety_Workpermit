import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM dbo.Contractor ORDER BY Contractor');
    return NextResponse.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { Contractor, Foreman_Name, Foreman_Tel } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('contractor', sql.NVarChar(50), Contractor)
      .input('foreman', sql.NVarChar(100), Foreman_Name)
      .input('tel', sql.NVarChar(10), Foreman_Tel)
      .query('INSERT INTO dbo.Contractor (Contractor, Foreman_Name, Foreman_Tel) VALUES (@contractor, @foreman, @tel)');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { ID, Contractor, Foreman_Name, Foreman_Tel } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, ID)
      .input('contractor', sql.NVarChar(50), Contractor)
      .input('foreman', sql.NVarChar(100), Foreman_Name)
      .input('tel', sql.NVarChar(10), Foreman_Tel)
      .query('UPDATE dbo.Contractor SET Contractor=@contractor, Foreman_Name=@foreman, Foreman_Tel=@tel WHERE ID=@id');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { ID } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, ID)
      .query('DELETE FROM dbo.Contractor WHERE ID=@id');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
