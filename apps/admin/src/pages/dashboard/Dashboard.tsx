import { Users, Stethoscope, Calendar, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

const stats = [
  { name: 'Total Users', value: '12,345', icon: Users, change: '+12%', color: 'bg-blue-500' },
  { name: 'Active Therapists', value: '234', icon: Stethoscope, change: '+5%', color: 'bg-green-500' },
  { name: 'Appointments Today', value: '89', icon: Calendar, change: '+18%', color: 'bg-purple-500' },
  { name: 'Revenue (Month)', value: '$45,230', icon: DollarSign, change: '+23%', color: 'bg-yellow-500' },
];

const recentActivities = [
  { type: 'user', message: 'New user registered: john.doe@email.com', time: '2 minutes ago' },
  { type: 'therapist', message: 'Dr. Sarah Smith completed verification', time: '15 minutes ago' },
  { type: 'appointment', message: 'New appointment booked (#APT-1234)', time: '32 minutes ago' },
  { type: 'payment', message: 'Payment received: $120.00', time: '1 hour ago' },
  { type: 'therapist', message: 'New therapist application: Dr. Mike Johnson', time: '2 hours ago' },
];

const pendingVerifications = [
  { id: 1, name: 'Dr. Emily Brown', email: 'emily.brown@email.com', date: '2024-01-07' },
  { id: 2, name: 'Dr. James Wilson', email: 'james.wilson@email.com', date: '2024-01-07' },
  { id: 3, name: 'Dr. Lisa Chen', email: 'lisa.chen@email.com', date: '2024-01-06' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center justify-between">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <span className="flex items-center text-sm font-medium text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivities.map((activity, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <span className="flex items-center text-xs text-gray-500 whitespace-nowrap ml-4">
                    <Clock className="h-3 w-3 mr-1" />
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all activity
            </button>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Therapist Verifications
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingVerifications.map((therapist) => (
              <div key={therapist.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{therapist.name}</p>
                    <p className="text-sm text-gray-500">{therapist.email}</p>
                  </div>
                  <button className="btn btn-primary text-xs px-3 py-1">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all pending ({pendingVerifications.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
