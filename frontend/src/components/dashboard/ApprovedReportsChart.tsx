// src/components/dashboard/ApprovedReportsChart.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface ReportData {
  name: string;
  amount: number;
}

export default function ApprovedReportsChart() {
    const [data, setData] = useState<ReportData[]>([]);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);

    const fetchApprovedReports = useCallback(async () => {
        // FIX: Ensure the API call doesn't run until the token is available.
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            // FIX: Manually add the Authorization header to this specific request.
            const response = await api.get('/expense-report/analytics/approved', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const formattedData = response.data.map((report: any) => ({
                name: new Date(report.decision_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                amount: report.total_amount / 100,
            }));
            setData(formattedData);
        } catch (error) {
            console.error("Failed to fetch approved reports for chart", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchApprovedReports();
    }, [fetchApprovedReports]);

    if (loading) {
        return <div className="p-4 text-center bg-white rounded-lg shadow">Loading Chart Data...</div>;
    }

    if (data.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800">Approved Report History</h3>
                <p className="mt-2 text-sm text-gray-500">No approved reports found to display in the chart.</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow h-96">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Approved Reports by Date</h3>
            <ResponsiveContainer width="100%" height="90%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0A74DA" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0A74DA" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `R ${value}`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value * 100), 'Amount']} />
                    <Legend />
                    <Area type="monotone" dataKey="amount" stroke="#0A74DA" fillOpacity={1} fill="url(#colorAmount)" />
                    <Line type="monotone" dataKey="amount" stroke="#0A74DA" strokeWidth={2} dot={false} activeDot={{ r: 8 }} name="Approved Amount" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}