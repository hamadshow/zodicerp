import React from 'react';
import { Head } from '@inertiajs/react';

export default function CustomersDashboard() {
  return (
    <>
      <Head>
        <title>Customers Dashboard</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        <nav className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex items-center">
                <h1 className="text-lg font-semibold">Customers</h1>
              </div>
              <div className="flex items-center gap-4">
                <a href="/admin" className="text-sm text-blue-600">
                  Admin
                </a>
                <a href="/suppliers" className="text-sm text-blue-600">
                  Suppliers
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl p-6">
          <h2 className="text-2xl font-bold mb-4">Customers Dashboard</h2>
          <p>Welcome, Customer. Browse and manage your account here.</p>
        </main>
      </div>
    </>
  );
}
