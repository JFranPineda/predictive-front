import type { Equipment } from './types';

/**
 * Condition and availability are different questions, and the source Excels
 * conflated them: 13% of the plant read "APAGADO", which is not a health state
 * but the absence of one. A card must say "no medido" rather than green.
 */
export function displayStatus(equipment: Equipment): {
  /** Null means "never evaluated": the caller supplies the wording, because
   * this file must not hold prose in either language. */
  label: string | null;
  color: string;
  measured: boolean;
} {
  const availability = equipment.availability_status;
  if (availability && !availability.measurable) {
    return { label: availability.name, color: '#94a3b8', measured: false };
  }
  if (!equipment.condition_status) {
    return { label: null, color: '#94a3b8', measured: false };
  }
  return {
    label: equipment.condition_status.name,
    color: equipment.condition_status.color,
    measured: true,
  };
}

/** Days since the last evaluation, against what the plan promised. */
export function overdueDays(equipment: Equipment, today = new Date()): number | null {
  if (!equipment.condition_updated_at) return null;
  const planned: Record<Equipment['monitoring_frequency'], number> = {
    monthly: 30, bimonthly: 60, quarterly: 90, semiannual: 180, annual: 365, on_demand: 0,
  };
  const budget = planned[equipment.monitoring_frequency];
  if (budget === 0) return null;
  const elapsed = Math.floor(
    (today.getTime() - new Date(equipment.condition_updated_at).getTime()) / 86_400_000,
  );
  return elapsed > budget ? elapsed - budget : 0;
}
