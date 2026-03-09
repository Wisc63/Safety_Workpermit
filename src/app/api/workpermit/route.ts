import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

async function generateWorkPermitNo(pool: Awaited<ReturnType<typeof getPool>>): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.request()
    .input('pattern', sql.NVarChar(10), `W${year}-%`)
    .query(`SELECT MAX(CAST(SUBSTRING(Work_Permit_No, 7, 4) AS INT)) AS maxNum
            FROM dbo.Work_Permit
            WHERE Work_Permit_No LIKE @pattern`);
  const maxNum = result.recordset[0].maxNum ?? 0;
  const nextNum = String(maxNum + 1).padStart(4, '0');
  return `W${year}-${nextNum}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';

  try {
    const pool = await getPool();
    let query = `SELECT * FROM dbo.Work_Permit WHERE 1=1`;
    const request = pool.request();

    if (q) {
      request.input('q', sql.NVarChar(200), `%${q}%`);
      query += ` AND (Work_Permit_No LIKE @q OR Contractor LIKE @q OR CONVERT(NVARCHAR, Start_Date, 103) LIKE @q OR CONVERT(NVARCHAR, End_Date, 103) LIKE @q)`;
    }

    if (status) {
      const statuses = status.split(',').filter(Boolean);
      if (statuses.length > 0) {
        const statusParams = statuses.map((s, i) => {
          request.input(`status${i}`, sql.NVarChar(20), s);
          return `@status${i}`;
        }).join(',');
        query += ` AND Status IN (${statusParams})`;
      }
    }

    query += ` ORDER BY Work_Permit_No DESC`;
    const result = await request.query(query);
    return NextResponse.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { Contractor, Contractor_Tel, Foreman_Name, Request_For, Area, Start_Date, End_Date, Days, Workers, Department, Controller } = body;
  try {
    const pool = await getPool();
    const wpNo = await generateWorkPermitNo(pool);
    const today = new Date().toISOString().split('T')[0];

    await pool.request()
      .input('wpNo', sql.NVarChar(12), wpNo)
      .input('createdDate', sql.Date, today)
      .input('contractor', sql.NVarChar(500), Contractor)
      .input('contractorTel', sql.NVarChar(200), Contractor_Tel)
      .input('foremanName', sql.NVarChar(500), Foreman_Name ?? null)
      .input('requestFor', sql.NVarChar(200), Request_For)
      .input('area', sql.NVarChar(100), Area)
      .input('startDate', sql.Date, Start_Date)
      .input('endDate', sql.Date, End_Date)
      .input('days', sql.Int, Days)
      .input('workers', sql.Int, Workers)
      .input('department', sql.NVarChar(5), Department)
      .input('controller', sql.NVarChar(60), Controller)
      .query(`INSERT INTO dbo.Work_Permit
        (Work_Permit_No, Created_Date, Contractor, Contractor_Tel, Foreman_Name, Request_For, Area, Start_Date, End_Date, Days, Workers, Department, Controller, Status)
        VALUES (@wpNo, @createdDate, @contractor, @contractorTel, @foremanName, @requestFor, @area, @startDate, @endDate, @days, @workers, @department, @controller, 'Open')`);

    return NextResponse.json({ success: true, Work_Permit_No: wpNo });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { Work_Permit_No, Contractor, Contractor_Tel, Foreman_Name, Request_For, Area, Start_Date, End_Date, Days, Workers, Department, Controller, Safety_Officer, Status, File_Path, Extension_Count } = body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('wpNo', sql.NVarChar(12), Work_Permit_No)
      .input('contractor', sql.NVarChar(500), Contractor)
      .input('contractorTel', sql.NVarChar(200), Contractor_Tel)
      .input('foremanName', sql.NVarChar(500), Foreman_Name ?? null)
      .input('requestFor', sql.NVarChar(200), Request_For)
      .input('area', sql.NVarChar(100), Area)
      .input('startDate', sql.Date, Start_Date)
      .input('endDate', sql.Date, End_Date)
      .input('days', sql.Int, Days)
      .input('workers', sql.Int, Workers)
      .input('department', sql.NVarChar(5), Department)
      .input('controller', sql.NVarChar(60), Controller)
      .input('safetyOfficer', sql.NVarChar(60), Safety_Officer ?? null)
      .input('status', sql.NVarChar(20), Status)
      .input('filePath', sql.NVarChar(500), File_Path ?? null)
      .input('extensionCount', sql.Int, Extension_Count ?? 0)
      .query(`UPDATE dbo.Work_Permit SET
        Contractor=@contractor, Contractor_Tel=@contractorTel, Foreman_Name=@foremanName, Request_For=@requestFor, Area=@area,
        Start_Date=@startDate, End_Date=@endDate, Days=@days, Workers=@workers,
        Department=@department, Controller=@controller, Safety_Officer=@safetyOfficer,
        Status=@status, File_Path=@filePath, Extension_Count=@extensionCount
        WHERE Work_Permit_No=@wpNo`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { Work_Permit_No } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('wpNo', sql.NVarChar(12), Work_Permit_No)
      .query('DELETE FROM dbo.Work_Permit WHERE Work_Permit_No=@wpNo');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
