// src/app/page.tsx
'use client';

import ApprovedReportsChart from "@/components/dashboard/ApprovedReportsChart";
import { useAuthStore } from "@/lib/store";

export default function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Dashboard
      </h1>
      
      <div className="p-6 bg-white border-l-4 rounded-r-lg shadow border-primary">
          <h2 className="text-xl font-semibold text-gray-800">Welcome Back, {user?.full_name}!</h2>
          <p className="mt-1 text-gray-600">Here's a quick overview of your expense activity.</p>
      </div>

      <ApprovedReportsChart />

    </div>
  );
}
