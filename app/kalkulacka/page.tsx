'use client';

import { MainNav } from '@/components/main-nav';
import BessCalculator from '@/components/bess/BessCalculator';

export default function KalkulackaPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MainNav />
      <BessCalculator />
    </div>
  );
}
