# Phase 6 – Community-area onboarding (later)

After community-area feeds exist (Phase 4), we can add **onboarding** so each user’s experience is centered on a community area they choose.

---

## When it runs

- **First-time sign-up or first login** – After PDS auth, if the user hasn’t set a community area, prompt them.
- **Optional “Set your area” in settings** – Users can change their choice later.

---

## Flow

1. **Prompt** – “Where’s your experience centered?” Offer:
   - **Enter an address** – User types a Chicago address. The app geocodes it and uses [City of Chicago community area boundaries](https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Community-Areas-Map/cauq-8yn6) to determine which community area contains that point.
   - **Choose from a list** – User picks from the 77 community areas (e.g. Rogers Park, Englewood, Loop).
2. **Resolve address → community area** – Geocode address to lat/lon; point-in-polygon against the boundaries dataset to get the area’s ID or name.
3. **Store preference** – Save the chosen community area in the app DB (e.g. `user_preferences` or extend `account`), keyed by DID.
4. **Recommend feed** – Default or prominently suggest the feed for that community area on the home or feeds page.

---

## Data and implementation

- **Boundaries** – City of Chicago [Boundaries - Community Areas](https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Community-Areas-Map/cauq-8yn6) (GeoJSON or shapefile). Load once; point-in-polygon (lat, lon) → community area. Align IDs/names with Agate’s `neighborhoodId` for consistent feeds.
- **Geocoding** – City of Chicago or third-party geocoder: address → coordinates, then boundary lookup.
- **Privacy** – Store only the chosen community area (and optionally display address); avoid storing precise location long-term. Make the step optional.

Phase 6 depends on **Phase 4 (feeds)** and benefits from **Phase 3 (Agate/neighborhoodId)** so community area IDs are consistent.
