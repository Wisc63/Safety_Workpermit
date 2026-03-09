import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trainingFilter = searchParams.get('trainingFilter') || '';
  const contractor = searchParams.get('contractor') || '';

  try {
    const pool = await getPool();
    const request = pool.request();

    const baseSelect = `
      SELECT ID, Contractor, Worker_Name, Worker_Tel, Worker_Position,
             CONVERT(NVARCHAR(10), Training_date, 23) AS Training_date,
             CASE
               WHEN Training_date IS NULL THEN N'Expired'
               WHEN DATEDIFF(day, Training_date, GETDATE()) > 365 THEN N'Expired'
               ELSE N'Allowed'
             END AS Training_status
      FROM dbo.Contractor
      WHERE 1=1
    `;

    let whereClause = '';
    if (contractor) {
      request.input('contractor', sql.NVarChar(50), contractor);
      whereClause += ' AND Contractor = @contractor';
    }

    const filters = trainingFilter ? trainingFilter.split(',').map(f => f.trim()).filter(Boolean) : [];
    const mappedFilters = filters.map(f => f === 'Normal' ? 'Allowed' : f);

    let query: string;
    if (mappedFilters.length > 0 && mappedFilters.length < 2) {
      const statusParams = mappedFilters.map((s, i) => {
        request.input(`tStatus${i}`, sql.NVarChar(20), s);
        return `@tStatus${i}`;
      }).join(',');
      query = `SELECT * FROM (${baseSelect}${whereClause}) AS sub WHERE Training_status IN (${statusParams})`;
    } else {
      query = `${baseSelect}${whereClause}`;
    }

    query += ' ORDER BY Contractor, Worker_Name';
    const result = await request.query(query);
    return NextResponse.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { Contractor, Worker_Name, Worker_Tel, Worker_Position } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('contractor', sql.NVarChar(50), Contractor)
      .input('workerName', sql.NVarChar(100), Worker_Name)
      .input('workerTel', sql.NVarChar(10), Worker_Tel || null)
      .input('workerPos', sql.NVarChar(50), Worker_Position || 'Unknown')
      .query(`INSERT INTO dbo.Contractor (Contractor, Worker_Name, Worker_Tel, Worker_Position, Training_status)
              VALUES (@contractor, @workerName, @workerTel, @workerPos, N'Expired')`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { ID, Contractor, Worker_Name, Worker_Tel, Worker_Position } = await req.json();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, ID)
      .input('contractor', sql.NVarChar(50), Contractor)
      .input('workerName', sql.NVarChar(100), Worker_Name)
      .input('workerTel', sql.NVarChar(10), Worker_Tel || null)
      .input('workerPos', sql.NVarChar(50), Worker_Position || 'Unknown')
      .query(`UPDATE dbo.Contractor
              SET Contractor=@contractor, Worker_Name=@workerName,
                  Worker_Tel=@workerTel, Worker_Position=@workerPos
              WHERE ID=@id`);
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
