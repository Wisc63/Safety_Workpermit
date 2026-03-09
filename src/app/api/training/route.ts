import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contractor = searchParams.get('contractor') || '';
  try {
    const pool = await getPool();
    const request = pool.request();
    let query = `
      SELECT ID, Contractor, Worker_Name, Worker_Tel, Worker_Position,
             CONVERT(NVARCHAR(10), Training_date, 23) AS Training_date,
             CASE
               WHEN Training_date IS NULL THEN N'Expired'
               WHEN DATEDIFF(day, Training_date, GETDATE()) > 365 THEN N'Expired'
               ELSE N'Allowed'
             END AS Training_status
      FROM dbo.Contractor WHERE 1=1
    `;
    if (contractor) {
      request.input('contractor', sql.NVarChar(50), contractor);
      query += ' AND Contractor = @contractor';
    }
    query += ' ORDER BY Worker_Name';
    const result = await request.query(query);
    return NextResponse.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = req.cookies.get('isAdmin')?.value === 'true';
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workerIds, trainingDate } = await req.json();
  if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0 || !trainingDate) {
    return NextResponse.json({ error: 'Missing workerIds or trainingDate' }, { status: 400 });
  }

  const today = new Date();
  const trained = new Date(trainingDate);
  const diffDays = Math.floor((today.getTime() - trained.getTime()) / (1000 * 60 * 60 * 24));
  const trainingStatus = diffDays > 365 ? 'Expired' : 'Allowed';

  try {
    const pool = await getPool();
    for (const id of workerIds) {
      await pool.request()
        .input('id', sql.Int, id)
        .input('trainingDate', sql.Date, trainingDate)
        .input('trainingStatus', sql.NVarChar(20), trainingStatus)
        .query(`UPDATE dbo.Contractor SET Training_date=@trainingDate, Training_status=@trainingStatus WHERE ID=@id`);
    }
    return NextResponse.json({ success: true, count: workerIds.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
