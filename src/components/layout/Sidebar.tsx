'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Ticket, Wrench, PlusSquare, LayoutList, Check, FileText, List } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const incidentRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === '/dashboard';
  const isIncident = pathname.startsWith('/tickets');
  const isService = pathname.startsWith('/service-requests');

  // Close popups when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (incidentRef.current && !incidentRef.current.contains(e.target as Node)) {
        setIncidentOpen(false);
      }
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close popups on navigation
  useEffect(() => {
    setIncidentOpen(false);
    setServiceOpen(false);
  }, [pathname]);

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-[88px] bg-white border-r border-gray-200 z-40 flex flex-col">
      <nav className="flex flex-col items-center gap-1 py-4 w-full">

        {/* Home */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1.5 w-full px-2 py-3.5 transition-colors relative ${
            isHome ? 'text-[#003087]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isHome && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#003087] rounded-r-full" />}
          <Home className="h-5 w-5" strokeWidth={isHome ? 2 : 1.5} />
          <span className="text-[11px] font-medium">Home</span>
        </Link>

        {/* Incident */}
        <div ref={incidentRef} className="w-full relative">
          <button
            onClick={() => setIncidentOpen((o) => !o)}
            className={`flex flex-col items-center gap-1.5 w-full px-2 py-3.5 transition-colors relative ${
              isIncident ? 'text-[#003087]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isIncident && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#003087] rounded-r-full" />}
            <Ticket className="h-5 w-5" strokeWidth={isIncident ? 2 : 1.5} />
            <span className="text-[11px] font-medium">Issue</span>
          </button>

          {/* Flyout popup */}
          {incidentOpen && (
            <div className="absolute left-full top-0 ml-2 z-50 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden">
              <Link
                href="/tickets/create"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                  <PlusSquare className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-gray-700">Generate Ticket</span>
                {pathname === '/tickets/create' && (
                  <Check className="h-4 w-4 text-gray-400 ml-auto" />
                )}
              </Link>

              <div className="h-px bg-gray-100 mx-3" />

              <Link
                href="/tickets"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                  <LayoutList className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-gray-700">List</span>
                {pathname === '/tickets' && (
                  <Check className="h-4 w-4 text-gray-400 ml-auto" />
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Service */}
        <div ref={serviceRef} className="w-full relative">
          <button
            onClick={() => setServiceOpen((o) => !o)}
            className={`flex flex-col items-center gap-1.5 w-full px-2 py-3.5 transition-colors relative ${
              isService ? 'text-[#003087]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isService && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#003087] rounded-r-full" />}
            <Wrench className="h-5 w-5" strokeWidth={isService ? 2 : 1.5} />
            <span className="text-[11px] font-medium">Service</span>
          </button>

          {/* Flyout popup */}
          {serviceOpen && (
            <div className="absolute left-full top-0 ml-2 z-50 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden">
              <Link
                href="/service-requests/create"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                  <FileText className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-gray-700">Raise Request</span>
                {pathname === '/service-requests/create' && (
                  <Check className="h-4 w-4 text-gray-400 ml-auto" />
                )}
              </Link>

              <div className="h-px bg-gray-100 mx-3" />

              <Link
                href="/service-requests"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                  <List className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-gray-700">My Requests</span>
                {pathname === '/service-requests' && (
                  <Check className="h-4 w-4 text-gray-400 ml-auto" />
                )}
              </Link>
            </div>
          )}
        </div>

      </nav>
    </aside>
  );
}
