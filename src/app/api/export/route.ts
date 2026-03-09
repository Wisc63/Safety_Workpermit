import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const isAdmin = req.cookies.get('isAdmin')?.value === 'true';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table') || 'workpermit';

  try {
    const pool = await getPool();
    let result;
    let sheetName = 'Sheet1';

    if (table === 'personnel') {
      result = await pool.request().query('SELECT Department, Person_Name, Person_LastName FROM dbo.Personnel ORDER BY Department, Person_Name');
      sheetName = 'Personnel';
    } else if (table === 'contractor') {
      result = await pool.request().query('SELECT Contractor, Foreman_Name, Foreman_Tel FROM dbo.Contractor ORDER BY Contractor');
      sheetName = 'Contractor';
    } else {
      result = await pool.request().query(`
        SELECT Work_Permit_No, CONVERT(NVARCHAR, Created_Date, 103) AS Created_Date,
               Contractor, Contractor_Tel, Request_For, Area,
               CONVERT(NVARCHAR, Start_Date, 103) AS Start_Date,
               CONVERT(NVARCHAR, End_Date, 103) AS End_Date,
               Days, Workers, Department, Controller, Safety_Officer, Status, File_Path
        FROM dbo.Work_Permit ORDER BY Work_Permit_No DESC`);
      sheetName = 'Work_Permit';
    }

    const ws = XLSX.utils.json_to_sheet(result.recordset);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${sheetName}_export.xlsx"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
