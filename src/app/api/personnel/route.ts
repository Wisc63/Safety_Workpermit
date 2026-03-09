import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get('department');
  try {
    const pool = await getPool();
    const query = 'SELECT * FROM dbo.Personnel ORDER BY Department, Person_Name';
    if (department) {
      const result = await pool.request()
        .input('dept', sql.NVarChar(5), department)
        .query('SELECT * FROM dbo.Personnel WHERE Department = @dept ORDER BY Person_Name, Person_LastName');
      return NextResponse.json(result.recordset);
    }
    const result = await pool.request().query(query);
    return NextResponse.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { Department, Person_Name, Person_LastName } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('dept', sql.NVarChar(5), Department)
      .input('name', sql.NVarChar(30), Person_Name)
      .input('lastname', sql.NVarChar(30), Person_LastName)
      .query('INSERT INTO dbo.Personnel (Department, Person_Name, Person_LastName) VALUES (@dept, @name, @lastname)');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { ID, Department, Person_Name, Person_LastName } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, ID)
      .input('dept', sql.NVarChar(5), Department)
      .input('name', sql.NVarChar(30), Person_Name)
      .input('lastname', sql.NVarChar(30), Person_LastName)
      .query('UPDATE dbo.Personnel SET Department=@dept, Person_Name=@name, Person_LastName=@lastname WHERE ID=@id');
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
