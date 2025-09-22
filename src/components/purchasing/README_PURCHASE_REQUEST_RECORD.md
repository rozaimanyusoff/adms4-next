Purchase Request Record
=======================

Component: `purchase-request-record`

Purpose
-------
Displays a single purchase request fetched from the API endpoint `/api/purchases/requests`.

Props
-----
- `id?: number | string` — fetch by request id (preferred)
- `prNo?: string` — lookup by PR number (if id not provided)
- `data?: PurchaseRequest | null` — pass already-fetched data to avoid a network call
- `className?: string` — optional wrapper class

Example
-------
Import and use inside a page or another component:

```tsx
import PurchaseRequestRecord from '@/components/purchasing/purchase-request-record';

export default function Page() {
  return (
    <div>
      {/* Fetch by id */}
      <PurchaseRequestRecord id={116} />

      {/* Or lookup by PR number */}
      <PurchaseRequestRecord prNo="109900" />
    </div>
  );
}
```

Notes
-----
- The component uses `authenticatedApi` from `src/config/api.ts` and expects the app to provide auth token via localStorage (matching project conventions).
- Endpoint variants supported: `/api/purchases/requests/:id` and `/api/purchases/requests?pr_no=...`.
