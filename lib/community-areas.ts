/**
 * Chicago community area ids/names for Phase 4 feeds.
 * Align with neighborhoodId values in guide_item (e.g. from Agate or seed data).
 */
export const COMMUNITY_AREAS: { id: string; name: string }[] = [
  { id: "Loop", name: "Loop" },
  { id: "Near North Side", name: "Near North Side" },
  { id: "Lincoln Park", name: "Lincoln Park" },
  { id: "Lake View", name: "Lake View" },
  { id: "Rogers Park", name: "Rogers Park" },
  { id: "Pilsen", name: "Pilsen" },
  { id: "Near South Side", name: "Near South Side" },
  { id: "Near West Side", name: "Near West Side" },
  { id: "Logan Square", name: "Logan Square" },
  { id: "New City", name: "New City" },
  { id: "Armour Square", name: "Armour Square" },
  { id: "Riverdale", name: "Riverdale" },
];

export function getCommunityAreaById(id: string): { id: string; name: string } | undefined {
  return COMMUNITY_AREAS.find((a) => a.id === id);
}
