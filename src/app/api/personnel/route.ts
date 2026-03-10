import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get('department');
  try {
    const pool = await getPool();
    if (department) {
      const result = await pool.request()
        .input('dept', sql.NVarChar(5), department)
        .query('SELECT * FROM dbo.Personnel WHERE Department = @dept ORDER BY Person_Name');
      return NextResponse.json(result.recordset);
    }
    const result = await pool.request().query('SELECT * FROM dbo.Personnel ORDER BY Department, Person_Name');
    return NextResponse.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { Department, Person_Name, Personnel_Tel, Personnel_Position } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('dept', sql.NVarChar(5), Department)
      .input('name', sql.NVarChar(200), Person_Name)
      .input('tel', sql.NVarChar(10), Personnel_Tel || null)
      .input('pos', sql.NVarChar(50), Personnel_Position || 'Unknown')
      .query('INSERT INTO dbo.Personnel (Department, Person_Name, Personnel_Tel, Personnel_Position) VALUES (@dept, @name, @tel, @pos)');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { ID, Department, Person_Name, Personnel_Tel, Personnel_Position } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, ID)
      .input('dept', sql.NVarChar(5), Department)
      .input('name', sql.NVarChar(200), Person_Name)
      .input('tel', sql.NVarChar(10), Personnel_Tel || null)
      .input('pos', sql.NVarChar(50), Personnel_Position || 'Unknown')
      .query('UPDATE dbo.Personnel SET Department=@dept, Person_Name=@name, Personnel_Tel=@tel, Personnel_Position=@pos WHERE ID=@id');
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
      .query('DELETE FROM dbo.Personnel WHERE ID=@id');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
