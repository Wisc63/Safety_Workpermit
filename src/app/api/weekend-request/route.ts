import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

async function ensureTable() {
  const pool = await getPool();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Weekend_Request' AND schema_id = SCHEMA_ID('dbo'))
    CREATE TABLE dbo.Weekend_Request (
      ID INT IDENTITY(1,1) PRIMARY KEY,
      Created_Date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
      Work_Date DATE NOT NULL,
      Department NVARCHAR(50) NOT NULL,
      Controller NVARCHAR(200) NOT NULL,
      Controller_Tel NVARCHAR(20) NULL,
      Job_Detail NVARCHAR(500) NOT NULL,
      Area NVARCHAR(200) NOT NULL,
      WP_No NVARCHAR(20) NULL,
      Contractor_Company NVARCHAR(200) NULL,
      Foreman_Name NVARCHAR(200) NULL,
      Contractor_Tel NVARCHAR(20) NULL,
      Employees NVARCHAR(MAX) NULL
    )
  `);
}

export async function GET(req: NextRequest) {
  await ensureTable();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  try {
    const pool = await getPool();
    const request = pool.request();
    let where = '';

    if (q) {
      request.input('q', sql.NVarChar(300), `%${q}%`);
      where = `WHERE CONVERT(NVARCHAR(10), Work_Date, 120) LIKE @q
        OR Department LIKE @q
        OR Controller LIKE @q
        OR ISNULL(WP_No, '') LIKE @q
        OR Job_Detail LIKE @q
        OR Area LIKE @q`;
    }

    const result = await request.query(
      `SELECT * FROM dbo.Weekend_Request ${where} ORDER BY Work_Date DESC, ID DESC`
    );
    return NextResponse.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureTable();
  const { workDate, department, controller, controllerTel, jobDetail, area,
    wpNo, contractorCompany, foremanName, contractorTel, employees } = await req.json();
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('workDate', sql.Date, workDate)
      .input('dept', sql.NVarChar(50), department)
      .input('ctrl', sql.NVarChar(200), controller)
      .input('ctrlTel', sql.NVarChar(20), controllerTel || null)
      .input('job', sql.NVarChar(500), jobDetail)
      .input('area', sql.NVarChar(200), area)
      .input('wpNo', sql.NVarChar(20), wpNo || null)
      .input('ctrCompany', sql.NVarChar(200), contractorCompany || null)
      .input('foreman', sql.NVarChar(200), foremanName || null)
      .input('ctrTel', sql.NVarChar(20), contractorTel || null)
      .input('emps', sql.NVarChar(sql.MAX), employees ? JSON.stringify(employees) : null)
      .query(`
        INSERT INTO dbo.Weekend_Request
          (Work_Date, Department, Controller, Controller_Tel, Job_Detail, Area,
           WP_No, Contractor_Company, Foreman_Name, Contractor_Tel, Employees)
        OUTPUT INSERTED.ID
        VALUES (@workDate, @dept, @ctrl, @ctrlTel, @job, @area,
                @wpNo, @ctrCompany, @foreman, @ctrTel, @emps)
      `);
    return NextResponse.json({ success: true, id: result.recordset[0].ID });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  await ensureTable();
  const { id, workDate, department, controller, controllerTel, jobDetail, area,
    wpNo, contractorCompany, foremanName, contractorTel, employees } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('workDate', sql.Date, workDate)
      .input('dept', sql.NVarChar(50), department)
      .input('ctrl', sql.NVarChar(200), controller)
      .input('ctrlTel', sql.NVarChar(20), controllerTel || null)
      .input('job', sql.NVarChar(500), jobDetail)
      .input('area', sql.NVarChar(200), area)
      .input('wpNo', sql.NVarChar(20), wpNo || null)
      .input('ctrCompany', sql.NVarChar(200), contractorCompany || null)
      .input('foreman', sql.NVarChar(200), foremanName || null)
      .input('ctrTel', sql.NVarChar(20), contractorTel || null)
      .input('emps', sql.NVarChar(sql.MAX), employees ? JSON.stringify(employees) : null)
      .query(`
        UPDATE dbo.Weekend_Request SET
          Work_Date=@workDate, Department=@dept, Controller=@ctrl, Controller_Tel=@ctrlTel,
          Job_Detail=@job, Area=@area, WP_No=@wpNo, Contractor_Company=@ctrCompany,
          Foreman_Name=@foreman, Contractor_Tel=@ctrTel, Employees=@emps
        WHERE ID=@id
      `);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureTable();
  const { id } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.Weekend_Request WHERE ID=@id');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
