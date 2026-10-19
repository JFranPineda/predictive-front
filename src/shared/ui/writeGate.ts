import { createContext } from 'react';

/**
 * Whether this installation accepts work right now, and why not (v4 Phase 4).
 * The shell fills it from the licence; shared buttons read it, so a save
 * button is disabled with its reason instead of failing when pressed.
 */
export interface WriteGateState {
  /** Writing is refused: grace period, another installation, clock, lapsed. */
  readOnly: boolean;
  /** The subscription lapsed: reports are refused too. */
  lapsed: boolean;
  reason: string;
}

export const WriteGate = createContext<WriteGateState>({ readOnly: false, lapsed: false, reason: '' });
