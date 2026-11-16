import { formatPrice } from '~/lib/format'
import type { AdminService } from '~/lib/admin/types'

export type ServiceCategory = AdminService['category']

export const CATEGORIES: ServiceCategory[] = ['wedding', 'social_corporate']

export const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  wedding: 'Weddings',
  social_corporate: 'Social & Corporate',
}

/** "Starts at $6,000", or "No price shown" when the owner has left the price blank. */
export function priceLine(s: Pick<AdminService, 'price_prefix' | 'price_from_cents'>) {
  if (s.price_from_cents == null) return 'No price shown'
  return `${s.price_prefix} ${formatPrice(s.price_from_cents)}`
}
