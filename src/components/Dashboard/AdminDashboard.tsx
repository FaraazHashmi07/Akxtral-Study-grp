import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  Database,
  TrendingUp,
  UserPlus,
  Shield,
  Bell,
  BarChart3,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const kpiData = [
  { title: 'Total Groups', value: '12', change: '+2', icon: Users, color: 'bg-blue-500' },
  { title: 'Active Members', value: '248', change: '+18', icon: MessageSquare, color: 'bg-green-500' },
  { title: 'Pending Invites', value: '7', change: '-3', icon: UserPlus, color: 'bg-yellow-500' },
  { title: 'Database Records', value: '1,234', change: '+89', icon: Database, color: 'bg-purple-500' }
];

const activityData = [
  { name: 'Mon', messages: 45, uploads: 12, events: 3 },
  { name: 'Tue', messages: 52, uploads: 8, events: 5 },
  { name: 'Wed', messages: 38, uploads: 15, events: 2 },
  { name: 'Thu', messages: 61, uploads: 10, events: 4 },
  { name: 'Fri', messages: 55, uploads: 18, events: 6 },
  { name: 'Sat', messages: 28, uploads: 5, events: 1 },
  { name: 'Sun', messages: 32, uploads: 7, events: 2 }
];

const recentActivity = [
  { id: 1, type: 'message', content: 'New message in React Study Group', time: '2 min ago', user: 'Sarah Chen' },
  { id: 2, type: 'upload', content: 'Uploaded "JavaScript Fundamentals.pdf"', time: '5 min ago', user: 'Mike Johnson' },
  { id: 3, type: 'event', content: 'Created "Weekly Code Review" event', time: '10 min ago', user: 'Alex Smith' },
  { id: 4, type: 'join', content: 'Joined Data Structures group', time: '15 min ago', user: 'Emma Wilson' }
];

export const AdminDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your study groups and monitor activity
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Announcement
        </motion.button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {kpi.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {kpi.value}
                </p>
                <p className={`text-sm mt-1 ${
                  kpi.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.change} this week
                </p>
              </div>
              <div className={`w-12 h-12 ${kpi.color} rounded-lg flex items-center justify-center`}>
                <kpi.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Weekly Activity
            </h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="messages" fill="#3B82F6" />
              <Bar dataKey="uploads" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <Activity className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'message' ? 'bg-blue-500' :
                  activity.type === 'upload' ? 'bg-green-500' :
                  activity.type === 'event' ? 'bg-purple-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{activity.user}</span> {activity.content}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Member Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pending Member Requests
          </h3>
          <Shield className="w-5 h-5 text-gray-500" />
        </div>
        <div className="space-y-4">
          {[
            { name: 'John Doe', email: 'john@example.com', group: 'React Study Group' },
            { name: 'Jane Smith', email: 'jane@example.com', group: 'Data Structures' },
            { name: 'Bob Wilson', email: 'bob@example.com', group: 'Algorithm Practice' }
          ].map((request, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {request.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{request.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{request.email}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Wants to join {request.group}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  Approve
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                >
                  Reject
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};