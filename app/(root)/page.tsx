// app/(root)/page.tsx

import { Suspense } from 'react';

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
    </Suspense>
  );
}
