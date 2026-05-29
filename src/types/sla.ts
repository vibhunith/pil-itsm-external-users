export interface SLAPolicy {
  id: string;
  name: string;
  urgency: string;
  impact: string;
  priority: string;
  operationalHours: 'Calendar Hours' | 'Business Hours';
  resolveWithinHours: number;
  respondWithinHours: number;
  isPolicyEnabled: boolean;
}

export interface SLAResult {
  priority: string;
  operationalHours: string;
  initialResponseClockSLA: string; // ISO datetime
  initialResolutionClockSLA: string; // ISO datetime
  respondWithinHours: number;
  resolveWithinHours: number;
}
