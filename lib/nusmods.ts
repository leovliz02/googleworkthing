import {
  NUSModsModule,
  TimetableLesson,
  MappedBusStop,
  ClassTransitInfo,
} from './types';
import { getShuttleArrivals } from './nextbus';

const NUSMODS_BASE_URL = 'https://api.nusmods.com/v2/2025-2026';

/**
 * Venue to Bus Stop Mapping Dictionary
 * Strictly follows rules in .agents/rules/workspace.md:
 * - COM1, COM2, COM3 -> COM 3 (COM3)
 * - LT27, S17, SCIENCE -> LT 27 / Science (LT27)
 * - UT, UTOWN, ERC -> University Town (UTOWN)
 * - CLB, LIBRARY, AS -> Central Library / FASS (CLB)
 * - BIZ1, BIZ2, HSSML -> BIZ 2 (BIZ2)
 * - EA, E1, E2, ENG -> Engineering (EA)
 * - KR-MRT, NUH -> Kent Ridge MRT (KR-MRT)
 * - Fallback: University Town (UTOWN)
 */
export const VENUE_MAPPING: Array<{
  keywords: string[];
  stopCode: string;
  stopName: string;
}> = [
  { keywords: ['COM1', 'COM2', 'COM3'], stopCode: 'COM3', stopName: 'COM 3' },
  { keywords: ['LT27', 'S17', 'SCIENCE'], stopCode: 'LT27', stopName: 'LT 27 / Science' },
  { keywords: ['UT', 'UTOWN', 'ERC'], stopCode: 'UTOWN', stopName: 'University Town' },
  { keywords: ['CLB', 'LIBRARY', 'AS'], stopCode: 'CLB', stopName: 'Central Library / FASS' },
  { keywords: ['BIZ1', 'BIZ2', 'HSSML'], stopCode: 'BIZ2', stopName: 'BIZ 2' },
  { keywords: ['EA', 'E1', 'E2', 'ENG'], stopCode: 'EA', stopName: 'Engineering' },
  { keywords: ['KR-MRT', 'NUH'], stopCode: 'KR-MRT', stopName: 'Kent Ridge MRT' },
];

const FALLBACK_STOP: MappedBusStop = {
  stopCode: 'UTOWN',
  stopName: 'University Town',
  venueQuery: 'FALLBACK',
};

/**
 * Resolves classroom venue code (e.g., 'COM1-VIRC', 'S17-0402', 'LT27') to nearest bus stop
 */
export function resolveVenueToBusStop(venue: string): MappedBusStop {
  if (!venue) {
    return { ...FALLBACK_STOP, venueQuery: 'UNKNOWN' };
  }

  // Normalize: uppercase and remove spaces/hyphens for matching
  const normalized = venue.toUpperCase().trim();
  const stripped = normalized.replace(/[\s\-_]/g, '');

  for (const mapping of VENUE_MAPPING) {
    for (const kw of mapping.keywords) {
      const cleanKw = kw.toUpperCase().replace(/[\s\-_]/g, '');
      // Match if keyword is found as prefix or substring
      if (stripped.startsWith(cleanKw) || stripped.includes(cleanKw) || normalized.includes(kw)) {
        return {
          stopCode: mapping.stopCode,
          stopName: mapping.stopName,
          venueQuery: venue,
        };
      }
    }
  }

  return {
    ...FALLBACK_STOP,
    venueQuery: venue,
  };
}

// Mock modules for offline resilience
const MOCK_MODULES: Record<string, NUSModsModule> = {
  CS2030S: {
    moduleCode: 'CS2030S',
    title: 'Programming Methodology II',
    semesterData: [
      {
        semester: 2,
        timetable: [
          {
            classNo: '1',
            lessonType: 'Lecture',
            weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
            day: 'Monday',
            startTime: '1000',
            endTime: '1200',
            venue: 'COM1-VIRC',
          },
          {
            classNo: '01',
            lessonType: 'Lab',
            weeks: [3, 5, 7, 9, 11],
            day: 'Wednesday',
            startTime: '1400',
            endTime: '1600',
            venue: 'COM1-0205',
          },
        ],
      },
    ],
  },
  CS1101S: {
    moduleCode: 'CS1101S',
    title: 'Programming Methodology',
    semesterData: [
      {
        semester: 1,
        timetable: [
          {
            classNo: '1',
            lessonType: 'Lecture',
            weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
            day: 'Tuesday',
            startTime: '1000',
            endTime: '1200',
            venue: 'LT27',
          },
        ],
      },
    ],
  },
  IS1108: {
    moduleCode: 'IS1108',
    title: 'Digital Ethics and Data Privacy',
    semesterData: [
      {
        semester: 2,
        timetable: [
          {
            classNo: '1',
            lessonType: 'Sectional Teaching',
            weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
            day: 'Thursday',
            startTime: '0900',
            endTime: '1200',
            venue: 'BIZ1-0202',
          },
        ],
      },
    ],
  },
};

/**
 * Fetch module data from NUSMods API
 */
export async function getModule(moduleCode: string): Promise<NUSModsModule | null> {
  const cleanCode = (moduleCode || '').trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const res = await fetch(`${NUSMODS_BASE_URL}/modules/${encodeURIComponent(cleanCode)}.json`, {
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data: NUSModsModule = await res.json();
      return data;
    }
  } catch (err) {
    console.warn(`NUSMods fetch failed for ${cleanCode}, checking mock:`, err);
  }

  // Fallback to mock data if available
  if (MOCK_MODULES[cleanCode]) {
    return MOCK_MODULES[cleanCode];
  }

  return null;
}

/**
 * Extract the first lesson from module timetable
 */
export function getFirstLesson(moduleData: NUSModsModule): TimetableLesson | null {
  if (!moduleData.semesterData || moduleData.semesterData.length === 0) {
    return null;
  }

  // Prefer semester 2 (current spring semester) or semester 1
  const sortedSemesters = [...moduleData.semesterData].sort((a, b) => b.semester - a.semester);
  for (const sem of sortedSemesters) {
    if (sem.timetable && sem.timetable.length > 0) {
      // Find lecture first, or first item
      const lecture = sem.timetable.find(
        (l) => l.lessonType.toLowerCase() === 'lecture'
      );
      return lecture || sem.timetable[0];
    }
  }

  return null;
}

/**
 * Combines timetable query, venue resolution, and live shuttle arrivals
 */
export async function getClassTransit(moduleCode: string): Promise<ClassTransitInfo | null> {
  const mod = await getModule(moduleCode);
  if (!mod) return null;

  const lesson = getFirstLesson(mod);
  if (!lesson) return null;

  const mappedStop = resolveVenueToBusStop(lesson.venue);
  const shuttles = await getShuttleArrivals(mappedStop.stopCode);

  return {
    moduleCode: mod.moduleCode,
    title: mod.title,
    lesson,
    mappedStop,
    shuttles,
  };
}

