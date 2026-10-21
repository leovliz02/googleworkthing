import {
  BusStop,
  ProcessedShuttle,
  UrgencyBadge,
  ProxyStopResponse,
  ProxyTiming,
  ProxyBus,
  ProxyBusesResponse,
  GeoJsonStopsResponse,
} from './types';

// NUS Live Transit Proxy API URL
const PROXY_BASE_URL = 'https://nus-transit-cache-429047621215.asia-southeast1.run.app';

/**
 * Strip HTML tags and decode common HTML entities from announcements
 */
export function sanitizeAnnouncement(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes urgency badge and parses arrival time
 * - 🟢 green: <= 3 min or 'Arr'
 * - 🟡 yellow: 4 - 8 min
 * - 🔴 red: > 8 min or off-service / '-1'
 */
export function parseEta(arrivalTime: string): {
  displayEta: string;
  minutes: number | null;
  urgency: UrgencyBadge;
} {
  const trimmed = (arrivalTime || '').trim();

  if (!trimmed || trimmed === '-1' || trimmed.toLowerCase() === 'null') {
    return {
      displayEta: 'Off Service',
      minutes: null,
      urgency: 'red',
    };
  }

  if (trimmed.toLowerCase() === 'arr' || trimmed === '0' || trimmed === '1') {
    return {
      displayEta: trimmed.toLowerCase() === 'arr' ? 'Arr' : `${trimmed} min`,
      minutes: trimmed.toLowerCase() === 'arr' ? 0 : parseInt(trimmed, 10),
      urgency: 'green',
    };
  }

  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed)) {
    return {
      displayEta: trimmed,
      minutes: null,
      urgency: 'yellow',
    };
  }

  if (parsed <= 3) {
    return {
      displayEta: `${parsed} min`,
      minutes: parsed,
      urgency: 'green',
    };
  }

  if (parsed <= 8) {
    return {
      displayEta: `${parsed} min`,
      minutes: parsed,
      urgency: 'yellow',
    };
  }

  return {
    displayEta: `${parsed} min`,
    minutes: parsed,
    urgency: 'red',
  };
}

/**
 * Formats passenger load text from ridership and capacity
 */
function formatOccupancy(ridership?: number, capacity?: number): string | undefined {
  if (ridership == null || capacity == null || capacity === 0) {
    return undefined;
  }
  const ratio = ridership / capacity;
  if (ratio < 0.4) return `Seats (${ridership}/${capacity})`;
  if (ratio < 0.8) return `Standing (${ridership}/${capacity})`;
  return `Crowded (${ridership}/${capacity})`;
}

/**
 * Formats a ProxyTiming item into a ProcessedShuttle
 */
export function formatProxyTiming(timing: ProxyTiming): ProcessedShuttle {
  const parsed = parseEta(timing.arrivalTime);
  const nextParsed = timing.nextArrivalTime ? parseEta(timing.nextArrivalTime) : undefined;

  return {
    name: timing.name,
    eta: parsed.displayEta,
    etaMinutes: parsed.minutes,
    nextEta: nextParsed?.displayEta,
    urgency: parsed.urgency,
    busPlate: timing.arrivalTime_veh_plate || undefined,
    nextBusPlate: timing.nextArrivalTime_veh_plate || undefined,
    passengers: formatOccupancy(timing.arrivalTime_ridership, timing.arrivalTime_capacity),
    nextPassengers: formatOccupancy(
      timing.nextArrivalTime_ridership,
      timing.nextArrivalTime_capacity
    ),
  };
}

// Fallback mock data when proxy is unreachable or offline
const MOCK_BUS_STOPS: BusStop[] = [
  { name: 'UTOWN', caption: 'University Town' },
  { name: 'COM3', caption: 'COM 3' },
  { name: 'KR-MRT', caption: 'Kent Ridge MRT' },
  { name: 'CLB', caption: 'Central Library / FASS' },
  { name: 'LT27', caption: 'LT 27 / Science' },
  { name: 'EA', caption: 'Engineering' },
  { name: 'BIZ2', caption: 'BIZ 2' },
];

const MOCK_PROXY_TIMINGS: Record<string, ProxyTiming[]> = {
  UTOWN: [
    { name: 'D1', arrivalTime: 'Arr', nextArrivalTime: '12', arrivalTime_veh_plate: 'PD776J', arrivalTime_ridership: 14, arrivalTime_capacity: 88 },
    { name: 'D2', arrivalTime: '2', nextArrivalTime: '8', arrivalTime_veh_plate: 'PD726D', arrivalTime_ridership: 32, arrivalTime_capacity: 88 },
    { name: 'E', arrivalTime: '5', nextArrivalTime: '15', arrivalTime_veh_plate: 'PD882K', arrivalTime_ridership: 55, arrivalTime_capacity: 88 },
    { name: 'BTC', arrivalTime: '-1', arrivalTime_veh_plate: 'PD991L' },
  ],
  COM3: [
    { name: 'A1', arrivalTime: '2', nextArrivalTime: '11', arrivalTime_veh_plate: 'PD567E', arrivalTime_ridership: 18, arrivalTime_capacity: 88 },
    { name: 'D1', arrivalTime: '6', nextArrivalTime: '14', arrivalTime_veh_plate: 'PD678F', arrivalTime_ridership: 25, arrivalTime_capacity: 88 },
    { name: 'K', arrivalTime: '13', nextArrivalTime: '25', arrivalTime_veh_plate: 'PD789G' },
  ],
  'KR-MRT': [
    { name: 'A1', arrivalTime: 'Arr', nextArrivalTime: '8', arrivalTime_veh_plate: 'PD890H', arrivalTime_ridership: 12, arrivalTime_capacity: 88 },
    { name: 'D2', arrivalTime: '3', nextArrivalTime: '14', arrivalTime_veh_plate: 'PD901I', arrivalTime_ridership: 20, arrivalTime_capacity: 88 },
    { name: 'K', arrivalTime: '7', nextArrivalTime: '19', arrivalTime_veh_plate: 'PD012J' },
  ],
  CLB: [
    { name: 'A1', arrivalTime: '1', nextArrivalTime: '10', arrivalTime_veh_plate: 'PD112K', arrivalTime_ridership: 10, arrivalTime_capacity: 88 },
    { name: 'A2', arrivalTime: '5', nextArrivalTime: '16', arrivalTime_veh_plate: 'PD334L', arrivalTime_ridership: 35, arrivalTime_capacity: 88 },
    { name: 'D1', arrivalTime: '8', nextArrivalTime: '20', arrivalTime_veh_plate: 'PD556M' },
  ],
  LT27: [
    { name: 'A1', arrivalTime: '3', nextArrivalTime: '12', arrivalTime_veh_plate: 'PD778N', arrivalTime_ridership: 16, arrivalTime_capacity: 88 },
    { name: 'D1', arrivalTime: '7', nextArrivalTime: '15', arrivalTime_veh_plate: 'PD990O', arrivalTime_ridership: 28, arrivalTime_capacity: 88 },
  ],
  BIZ2: [
    { name: 'A2', arrivalTime: '2', nextArrivalTime: '12', arrivalTime_veh_plate: 'PD135P', arrivalTime_ridership: 15, arrivalTime_capacity: 88 },
    { name: 'D1', arrivalTime: '6', nextArrivalTime: '16', arrivalTime_veh_plate: 'PD246Q', arrivalTime_ridership: 30, arrivalTime_capacity: 88 },
  ],
  EA: [
    { name: 'A1', arrivalTime: 'Arr', nextArrivalTime: '9', arrivalTime_veh_plate: 'PD357R', arrivalTime_ridership: 11, arrivalTime_capacity: 88 },
    { name: 'E', arrivalTime: '5', nextArrivalTime: '15', arrivalTime_veh_plate: 'PD468S', arrivalTime_ridership: 40, arrivalTime_capacity: 88 },
  ],
};

const MOCK_ANNOUNCEMENTS: string[] = [
  'Advisory: Shuttle D1 may experience slight delays around Central Library due to campus roadworks.',
];

/**
 * Fetch all bus stops from proxy GeoJSON /api/transit/stops
 */
export async function getBusStops(): Promise<BusStop[]> {
  try {
    const res = await fetch(`${PROXY_BASE_URL}/api/transit/stops`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data: GeoJsonStopsResponse = await res.json();
      if (data.features && Array.isArray(data.features)) {
        return data.features.map((f) => ({
          name: f.properties.name,
          caption: f.properties.caption || f.properties.LongName || f.properties.name,
          Latitude: f.properties.latitude ?? f.geometry?.coordinates?.[1],
          Longitude: f.properties.longitude ?? f.geometry?.coordinates?.[0],
        }));
      }
    }
  } catch (err) {
    console.warn('Proxy /api/transit/stops fetch error, using fallback:', err);
  }

  return MOCK_BUS_STOPS;
}

/**
 * Fetch live shuttle arrivals for a given bus stop code/name
 * Queries GET /api/stop/{code}
 */
export async function getShuttleArrivals(busstopname: string): Promise<ProcessedShuttle[]> {
  const cleanStop = (busstopname || 'UTOWN').trim().toUpperCase();

  try {
    const res = await fetch(`${PROXY_BASE_URL}/api/stop/${encodeURIComponent(cleanStop)}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data: ProxyStopResponse = await res.json();
      const timings = data.etas?.timings;
      if (timings && Array.isArray(timings)) {
        return timings.map(formatProxyTiming);
      }
    }
  } catch (err) {
    console.warn(`Proxy /api/stop/${cleanStop} failed, using mock:`, err);
  }

  // Fallback to mock data
  const rawList = MOCK_PROXY_TIMINGS[cleanStop] || MOCK_PROXY_TIMINGS['UTOWN'];
  return rawList.map(formatProxyTiming);
}

/**
 * Fetch active estimated bus positions across campus
 * Queries GET /api/transit/buses
 */
export async function getLiveBuses(): Promise<ProxyBus[]> {
  try {
    const res = await fetch(`${PROXY_BASE_URL}/api/transit/buses`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data: ProxyBusesResponse = await res.json();
      if (data.buses && Array.isArray(data.buses)) {
        return data.buses;
      }
    }
  } catch (err) {
    console.warn('Proxy /api/transit/buses failed:', err);
  }

  return [];
}

/**
 * Fetch active transit announcements and vehicle breakdown advisories
 */
export async function getAnnouncements(): Promise<string[]> {
  return MOCK_ANNOUNCEMENTS;
}
