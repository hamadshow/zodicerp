import React from 'react';
import { DashboardStats } from '@/types';
import { CurrencyDollarIcon, UsersIcon, CubeIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

interface StatsCardsProps {
  stats: DashboardStats;
  loading?: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const cards = [
    {
      title: 'Total Revenue',
      value: `$${stats.summary.total_revenue.toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      change: '+12.5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Orders',
      value: stats.summary.total_orders.toLocaleString(),
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
      change: '+8.2%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Products',
      value: stats.summary.total_products.toLocaleString(),
      icon: CubeIcon,
      color: 'bg-purple-500',
      change: '+4.1%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Users',
      value: stats.summary.total_users.toLocaleString(),
      icon: UsersIcon,
      color: 'bg-orange-500',
      change: '+16.3%',
      changeType: 'positive' as const,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
            <div className="mt-4">
              <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.color}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${
                card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {card.change}
              </span>
              <span className="text-sm text-gray-500 ml-2">from last month</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;