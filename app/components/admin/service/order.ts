/* The public page groups services by category, but the owner's order is one
   global list (the server keeps a single sort_order). Reordering one group
   therefore sends the whole list: the group's slots keep their places and take
   the ids in their new order, and every other service stays where it was. */
export function orderAfterGroupMove<T extends { id: string; category: string }>(
  all: T[],
  category: string,
  groupIds: string[]
): string[] {
  const slots = all.filter((item) => item.category === category)
  // If the ids don't match what is on screen, the screen is stale. Send the
  // current order unchanged rather than guess.
  if (groupIds.length !== slots.length || !groupIds.every((id) => slots.some((s) => s.id === id))) {
    return all.map((item) => item.id)
  }
  let next = 0
  return all.map((item) => (item.category === category ? groupIds[next++] : item.id))
}
