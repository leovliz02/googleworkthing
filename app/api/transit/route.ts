import { NextRequest, NextResponse } from 'next/server';
import { getShuttleArrivals, getAnnouncements, getLiveBuses } from '@/lib/nextbus';
import { getClassTransit } from '@/lib/nusmods';
import { TransitApiResponse } from '@/lib/types';

const STOP_NAMES: Record<string, string> = {
  UTOWN: 'University Town',
  COM3: 'COM 3',
  'KR-MRT': 'Kent Ridge MRT',
  CLB: 'Central Library / FASS',
  LT27: 'LT 27 / Science',
  EA: 'Engineering',
  BIZ2: 'BIZ 2',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stopParam = (searchParams.get('stop') || 'UTOWN').trim().toUpperCase();
    const moduleParam = searchParams.get('module')?.trim().toUpperCase();

    // Fetch shuttle arrivals, announcements, and live buses in parallel
    const [shuttles, announcements, buses] = await Promise.all([
      getShuttleArrivals(stopParam),
      getAnnouncements(),
      getLiveBuses(),
    ]);

    let classInfo = undefined;
    if (moduleParam) {
      classInfo = (await getClassTransit(moduleParam)) || undefined;
    }

    const responseData: TransitApiResponse = {
      stop: stopParam,
      stopName: STOP_NAMES[stopParam] || stopParam,
      shuttles,
      announcements,
      classInfo,
      buses,
      timestamp: Date.now(),
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      ((error as { digest: string }).digest.startsWith('NEXT_PRERENDER_') ||
        (error as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE')
    ) {
      throw error;
    }
    console.error('Transit API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve transit data',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
