import { NextResponse } from 'next/server';
import { getArticles } from '@/app/actions/article';

export async function GET() {
  const result = await getArticles();
  return NextResponse.json(result);
}
