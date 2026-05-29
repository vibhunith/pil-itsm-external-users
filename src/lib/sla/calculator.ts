/**
 * SLA Calculator
 *
 * Business Hours: Mon–Fri, 09:00–18:00 (local server time)
 * Calendar Hours: 24/7, no exclusions
 */

const BUSINESS_START_HOUR = 9;  // 09:00
const BUSINESS_END_HOUR = 18;   // 18:00

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function isInBusinessHours(date: Date): boolean {
  if (isWeekend(date)) return false;
  const h = date.getHours();
  return h >= BUSINESS_START_HOUR && h < BUSINESS_END_HOUR;
}

/**
 * Add `hours` of business time to `from`.
 * Business hours are Mon–Fri, 09:00–18:00.
 */
function addBusinessHours(from: Date, hours: number): Date {
  const result = new Date(from);
  let remaining = hours * 60; // work in minutes

  // If we're starting outside business hours, advance to next business window
  if (!isInBusinessHours(result)) {
    result.setTime(nextBusinessStart(result).getTime());
  }

  while (remaining > 0) {
    const endOfDay = new Date(result);
    endOfDay.setHours(BUSINESS_END_HOUR, 0, 0, 0);

    const minutesToEndOfDay = Math.max(
      0,
      (endOfDay.getTime() - result.getTime()) / 60_000
    );

    if (remaining <= minutesToEndOfDay) {
      result.setTime(result.getTime() + remaining * 60_000);
      remaining = 0;
    } else {
      remaining -= minutesToEndOfDay;
      // Move to next business day start
      result.setTime(nextBusinessStart(endOfDay).getTime());
    }
  }

  return result;
}

function nextBusinessStart(from: Date): Date {
  const next = new Date(from);
  // Move to next day
  next.setDate(next.getDate() + 1);
  next.setHours(BUSINESS_START_HOUR, 0, 0, 0);

  // Skip weekends
  while (isWeekend(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function addCalendarHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export interface SLACalculationInput {
  operationalHours: 'Calendar Hours' | 'Business Hours' | string;
  respondWithinHours: number;
  resolveWithinHours: number;
  from?: Date; // defaults to now
}

export interface SLACalculationOutput {
  initialResponseClockSLA: string; // ISO 8601
  initialResolutionClockSLA: string; // ISO 8601
}

export function calculateSLA(input: SLACalculationInput): SLACalculationOutput {
  const start = input.from ?? new Date();
  const isBusinessHours = input.operationalHours === 'Business Hours';

  const responseDeadline = isBusinessHours
    ? addBusinessHours(start, input.respondWithinHours)
    : addCalendarHours(start, input.respondWithinHours);

  const resolutionDeadline = isBusinessHours
    ? addBusinessHours(start, input.resolveWithinHours)
    : addCalendarHours(start, input.resolveWithinHours);

  return {
    initialResponseClockSLA: responseDeadline.toISOString(),
    initialResolutionClockSLA: resolutionDeadline.toISOString(),
  };
}
