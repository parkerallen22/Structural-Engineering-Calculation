import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Deprecated endpoint. Use the print preview workflow.' },
    { status: 410 },
  );
}
