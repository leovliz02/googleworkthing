'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Bus,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  MapPin,
  Users,
  CheckCircle2,
  X,
  GraduationCap,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { TransitApiResponse, ProcessedShuttle } from '@/lib/types';

const POPULAR_STOPS = [
  { code: 'UTOWN', name: 'University Town', badge: 'UTown' },
  { code: 'COM3', name: 'COM 3', badge: 'Computing' },
  { code: 'KR-MRT', name: 'Kent Ridge MRT', badge: 'MRT' },
  { code: 'CLB', name: 'Central Library / FASS', badge: 'Library' },
  { code: 'LT27', name: 'LT 27 / Science', badge: 'Science' },
  { code: 'BIZ2', name: 'BIZ 2', badge: 'Business' },
];

export default function TransitDashboard() {
  const [selectedStop, setSelectedStop] = useState<string>('UTOWN');
  const [data, setData] = useState<TransitApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Auto-refresh countdown (20 seconds)
  const [countdown, setCountdown] = useState<number>(20);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // Smart commute search state
  const [moduleInput, setModuleInput] = useState<string>('');
  const [searchedModule, setSearchedModule] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Fetch transit data
  const fetchTransitData = useCallback(
    async (stop: string, modCode?: string) => {
      try {
        const queryParams = new URLSearchParams({ stop });
        if (modCode) {
          queryParams.set('module', modCode);
        }
        const res = await fetch(`/api/transit?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Network error');
        const json: TransitApiResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to load transit data:', err);
      } finally {
        setLoading(false);
        setSearchLoading(false);
      }
    },
    []
  );

  // Initial load and stop switch
  useEffect(() => {
    setLoading(true);
    fetchTransitData(selectedStop, searchedModule);
    setCountdown(20);
  }, [selectedStop, searchedModule, fetchTransitData]);

  // 20-second auto-refresh timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchTransitData(selectedStop, searchedModule);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedStop, searchedModule, fetchTransitData]);

  // Manual refresh trigger
  const handleManualRefresh = () => {
    setLoading(true);
    fetchTransitData(selectedStop, searchedModule);
    setCountdown(20);
  };

  // Handle module search submit
  const handleModuleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = moduleInput.trim().toUpperCase();
    if (!clean) return;
    setSearchLoading(true);
    setSearchedModule(clean);
  };

  // Helper for Urgency Styles
  const getUrgencyClasses = (urgency: ProcessedShuttle['urgency']) => {
    switch (urgency) {
      case 'green':
        return {
          pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          badge: 'bg-emerald-500 text-white shadow-emerald-500/20',
          border: 'border-emerald-200 dark:border-emerald-800/40',
        };
      case 'yellow':
        return {
          pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          badge: 'bg-amber-500 text-white shadow-amber-500/20',
          border: 'border-amber-200 dark:border-amber-800/40',
        };
      case 'red':
      default:
        return {
          pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          badge: 'bg-rose-500 text-white shadow-rose-500/20',
          border: 'border-rose-200 dark:border-rose-800/40',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-orange-500 selection:text-white">
      {/* Top Disruption Alert Banner */}
      {!bannerDismissed && data?.announcements && data.announcements.length > 0 && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 shadow-md transition-all">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-pulse text-amber-200" />
              <span>
                <strong>Transit Advisory:</strong> {data.announcements.join(' • ')}
              </span>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">NUS Campus Transit</h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE
                </span>
                {data?.buses && data.buses.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    🚌 {data.buses.length} active (est. positions)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time shuttle schedules & timetable routing
              </p>
            </div>
          </div>

          {/* Auto Refresh & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Refreshing in {countdown}s</span>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition shadow-sm hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Smart Commute Search Bar */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">
              <GraduationCap className="w-4 h-4" />
              Smart Class Commute
            </div>
            <h2 className="text-lg font-bold mb-2">Find Shuttles for Your Next Class</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter any NUS module code to resolve your lecture venue and mapped bus stop with live arrivals.
            </p>

            <form onSubmit={handleModuleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. CS2030S, CS1101S, IS1108..."
                  value={moduleInput}
                  onChange={(e) => setModuleInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading || !moduleInput.trim()}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 transition disabled:opacity-50 cursor-pointer"
              >
                {searchLoading ? 'Searching...' : 'Plan Commute'}
              </button>
            </form>
          </div>

          {/* Smart Commute Result Card */}
          {data?.classInfo && (
            <div className="mt-6 p-4 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-orange-600 dark:text-orange-400">
                      {data.classInfo.moduleCode}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {data.classInfo.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <span>
                      📅 <strong>{data.classInfo.lesson.lessonType}:</strong> {data.classInfo.lesson.day}{' '}
                      {data.classInfo.lesson.startTime} - {data.classInfo.lesson.endTime}
                    </span>
                    <span>
                      📍 <strong>Venue:</strong> {data.classInfo.lesson.venue}
                    </span>
                    <span>
                      🚏 <strong>Nearest Stop:</strong> {data.classInfo.mappedStop.stopName} (
                      {data.classInfo.mappedStop.stopCode})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedStop(data.classInfo!.mappedStop.stopCode);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition self-start sm:self-center cursor-pointer"
                >
                  <span>Switch Stop</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Bus Stop Selector */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Select Bus Stop
            </h2>
            <span className="text-xs text-slate-500">
              Active: <strong>{data?.stopName || selectedStop}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {POPULAR_STOPS.map((stop) => {
              const active = selectedStop === stop.code;
              return (
                <button
                  key={stop.code}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedStop(stop.code);
                    });
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {stop.badge}
                  </span>
                  <span className="font-bold text-sm mt-1">{stop.code}</span>
                  <span
                    className={`text-xs truncate w-full ${
                      active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {stop.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Shuttle Arrivals Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <h2 className="text-lg font-bold">
                {data?.stopName || selectedStop}{' '}
                <span className="text-sm font-normal text-slate-500">({selectedStop})</span>
              </h2>
            </div>

            {/* Urgency Legend */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ≤ 3 min
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 4 - 8 min
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> &gt; 8 min / Off
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : !data?.shuttles || data.shuttles.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Bus className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="font-semibold text-base mb-1">No Shuttles Currently Operating</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Services may be paused outside operating hours. Check back during normal campus transit hours.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.shuttles.map((shuttle, idx) => {
                const styles = getUrgencyClasses(shuttle.urgency);
                const isOff = shuttle.eta === 'Off Service';

                return (
                  <div
                    key={`${shuttle.name}-${idx}`}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border ${styles.border} shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-base text-slate-800 dark:text-slate-100">
                          {shuttle.name}
                        </span>
                        <div>
                          <span className="text-xs font-semibold uppercase text-slate-500">
                            Shuttle {shuttle.name}
                          </span>
                          {shuttle.busPlate && (
                            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {shuttle.busPlate}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Urgency Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${styles.pill}`}
                      >
                        {isOff ? 'Off Service' : shuttle.eta}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Next:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {shuttle.nextEta || 'N/A'}
                          </strong>
                        </span>
                      </div>

                      {shuttle.passengers && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{shuttle.passengers}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 mt-12 text-center text-xs text-slate-400">
        <p>NUS Campus Transit Hub & Telegram Bot • Real-time Data via NextBus & NUSMods</p>
      </footer>
    </div>
  );
}
