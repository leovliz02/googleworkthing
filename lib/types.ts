// ==========================================
// NUS Live Transit Proxy API Types
// ==========================================

export interface ProxyTiming {
  name: string;
  arrivalTime: string;
  nextArrivalTime?: string;
  arrivalTime_ts?: string;
  nextArrivalTime_ts?: string;
  busStopCode?: string;
  arrivalTime_veh_plate?: string;
  nextArrivalTime_veh_plate?: string;
  arrivalTime_capacity?: number;
  arrivalTime_ridership?: number;
  nextArrivalTime_capacity?: number;
  nextArrivalTime_ridership?: number;
}

export interface ProxyStopResponse {
  etas?: {
    lastUpdated?: string;
    busStopName?: string;
    busStopCaption?: string;
    timings?: ProxyTiming[];
  };
  degraded?: boolean;
  error?: string;
}

export interface ProxyBus {
  id: string;
  route: string;
  plate: string;
  tripStart?: string;
  status?: string;
  lat: number;
  lng: number;
  bearing: number;
  speedKmh: number;
  prevStop?: string;
  anchorStop?: string;
  anchorEtaMin?: number;
  errorBoundM?: number;
  occupancy?: {
    ridership: number | null;
    capacity: number | null;
  };
}

export interface ProxyBusesResponse {
  asOf: string;
  buses: ProxyBus[];
}

export interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    name: string;
    caption: string;
    LongName?: string;
    ShortName?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface GeoJsonStopsResponse {
  type: string;
  features: GeoJsonFeature[];
}

// ==========================================
// NUS NextBus API Types
// ==========================================

export interface BusStop {
  caption: string;
  name: string;
  Longitude?: number;
  Latitude?: number;
}

export interface BusStopsResponse {
  BusStopsResult?: {
    busstops: BusStop[];
  };
}

export interface RawShuttle {
  name: string;
  arrivalTime: string;
  nextArrivalTime?: string;
  passengers?: string;
  nextPassengers?: string;
  busPlate?: string;
  nextBusPlate?: string;
  audioFile?: string;
}

export interface ShuttleServiceResponse {
  ShuttleServiceResult?: {
    caption: string;
    name: string;
    shuttles: RawShuttle[];
  };
}

export interface RawAnnouncement {
  id?: string;
  text?: string;
  message?: string;
  created_on?: string;
}

export interface AnnouncementsResponse {
  ActiveAnnouncementsResult?: {
    announcements: RawAnnouncement[];
  };
  AnnouncementsResult?: {
    announcements: RawAnnouncement[];
  };
}

// ==========================================
// NUSMods API Types
// ==========================================

export interface TimetableLesson {
  classNo: string;
  lessonType: string;
  weeks: number[] | { start: string; end: string };
  day: string;
  startTime: string;
  endTime: string;
  venue: string;
  size?: number;
}

export interface SemesterData {
  semester: number;
  timetable: TimetableLesson[];
  examDate?: string;
  examDuration?: number;
}

export interface NUSModsModule {
  moduleCode: string;
  title: string;
  description?: string;
  semesterData: SemesterData[];
}

// ==========================================
// Application & Domain Types
// ==========================================

export type UrgencyBadge = 'green' | 'yellow' | 'red';

export interface ProcessedShuttle {
  name: string;
  eta: string;
  etaMinutes: number | null;
  nextEta?: string;
  urgency: UrgencyBadge;
  busPlate?: string;
  nextBusPlate?: string;
  passengers?: string;
  nextPassengers?: string;
}

export interface MappedBusStop {
  stopCode: string;
  stopName: string;
  venueQuery: string;
}

export interface ClassTransitInfo {
  moduleCode: string;
  title: string;
  lesson: TimetableLesson;
  mappedStop: MappedBusStop;
  shuttles: ProcessedShuttle[];
}

export interface TransitApiResponse {
  stop: string;
  stopName: string;
  shuttles: ProcessedShuttle[];
  announcements: string[];
  classInfo?: ClassTransitInfo;
  buses?: ProxyBus[];
  timestamp: number;
  error?: string;
}

