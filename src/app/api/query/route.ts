import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) return NextResponse.json({ error: 'Falta la consulta' }, { status: 400 });

    const [rows] = await db.query(query);
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}