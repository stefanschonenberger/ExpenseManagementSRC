// src/components/LoginPage.tsx

'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { useRouter } from 'next/navigation'; // Import the router

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, setIsManager } = useAuthStore();
  const router = useRouter(); // Get the router instance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const token = response.data.access_token;
      
      if (token) {
        const managerStatusResponse = await api.get('/user/is-manager', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // This part is the same: update the store
        setIsManager(managerStatusResponse.data.isManager);
        login(token);

        // FIX: After setting the state, force a redirect to the dashboard.
        router.push('/');
      }
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Sign in to your account
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
          {error && <p className="text-sm text-center text-danger">{error}</p>}
          <div>
            <button
              type="submit"
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
