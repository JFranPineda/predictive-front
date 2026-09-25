import type { OrderStatus } from './types';

/**
 * Where an order may go from where it is — the server's rule
 * (`services/domain/order_status.py`), mirrored so the selector only offers
 * moves that will be accepted. A cancelled order stays cancelled.
 */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  planned: ['in_progress', 'done', 'cancelled'],
  in_progress: ['planned', 'done', 'cancelled'],
  done: ['in_progress'],
  cancelled: [],
};

export function reachableStatuses(current: OrderStatus): OrderStatus[] {
  return [current, ...NEXT[current]];
}
