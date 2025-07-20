import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  HardDrive,
  TrendingUp,
  Activity,
  BarChart3,
  MessageSquare,
  Upload,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useSuperAdminStore } from '../../../store/superAdminStore';
import { useAuthStore } from '../../../store/authStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface ActivityData {
  date: string;
  messages: number;
  resources: number;
  communities: number;
}

interface CommunityInsight {
  id: string;
  name: string;
  creatorEmail: string;
  memberCount: number;
  messageCount: number;
  resourceCount: number;
  lastActivity: Date;
}

export const AdminDashboard: React.FC = () => {
  const { analytics, loading, error, loadAnalytics, isUserReady } = useSuperAdminStore();
  const { user, isSuperAdmin } = useAuthStore();
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [communityInsights, setCommunityInsights] = useState<CommunityInsight[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Load analytics data only when user is ready
  useEffect(() => {
    const checkAndLoadAnalytics = async () => {
      const userReady = await isUserReady();
      if (userReady) {
        console.log('🔐 [ADMIN_DASHBOARD] User is ready, loading analytics...');
        loadAnalytics();
      } else {
        console.log('⚠️ [ADMIN_DASHBOARD] User not ready yet, waiting...', { user: !!user, isSuperAdmin });
      }
    };

    // Add a small delay to ensure auth state is settled
    const timer = setTimeout(checkAndLoadAnalytics, 1000);
    return () => clearTimeout(timer);
  }, [user, isSuperAdmin, loadAnalytics, isUserReady]);

  // Load real-time activity data
  const loadActivityData = async () => {
    setLoadingActivity(true);
    try {
      const activityData: ActivityData[] = [];
      const today = new Date();

      // Get data for the past 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        // Count messages for this day
        const messagesQuery = query(
          collection(db, 'messages'),
          where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
          where('createdAt', '<=', Timestamp.fromDate(endOfDay))
        );
        const messagesSnapshot = await getDocs(messagesQuery);

        // Count resources for this day
        const resourcesQuery = query(
          collection(db, 'resources'),
          where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
          where('createdAt', '<=', Timestamp.fromDate(endOfDay))
        );
        const resourcesSnapshot = await getDocs(resourcesQuery);

        // Count communities for this day
        const communitiesQuery = query(
          collection(db, 'communities'),
          where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
          where('createdAt', '<=', Timestamp.fromDate(endOfDay))
        );
        const communitiesSnapshot = await getDocs(communitiesQuery);

        activityData.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          messages: messagesSnapshot.size,
          resources: resourcesSnapshot.size,
          communities: communitiesSnapshot.size
        });
      }

      setActivityData(activityData);
    } catch (error) {
      console.error('Failed to load activity data:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Load community insights
  const loadCommunityInsights = async () => {
    setLoadingInsights(true);
    try {
      const communitiesQuery = query(
        collection(db, 'communities'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const communitiesSnapshot = await getDocs(communitiesQuery);

      const insights: CommunityInsight[] = await Promise.all(
        communitiesSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const communityId = doc.id;

          // Count members
          const membersQuery = query(collection(db, 'communities', communityId, 'roles'));
          const membersSnapshot = await getDocs(membersQuery);

          // Count messages
          const messagesQuery = query(collection(db, 'communities', communityId, 'messages'));
          const messagesSnapshot = await getDocs(messagesQuery);

          // Count resources
          const resourcesQuery = query(collection(db, 'communities', communityId, 'resources'));
          const resourcesSnapshot = await getDocs(resourcesQuery);

          // Get last activity (most recent message)
          let lastActivity = data.createdAt?.toDate() || new Date();
          if (messagesSnapshot.size > 0) {
            const lastMessageQuery = query(
              collection(db, 'communities', communityId, 'messages'),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            const lastMessageSnapshot = await getDocs(lastMessageQuery);
            if (!lastMessageSnapshot.empty) {
              lastActivity = lastMessageSnapshot.docs[0].data().createdAt?.toDate() || lastActivity;
            }
          }

          return {
            id: communityId,
            name: data.name || 'Unknown Community',
            creatorEmail: data.creatorEmail || 'Unknown',
            memberCount: membersSnapshot.size,
            messageCount: messagesSnapshot.size,
            resourceCount: resourcesSnapshot.size,
            lastActivity
          };
        })
      );

      // Sort by activity score (members + messages + resources)
      insights.sort((a, b) => {
        const scoreA = a.memberCount + a.messageCount + a.resourceCount;
        const scoreB = b.memberCount + b.messageCount + b.resourceCount;
        return scoreB - scoreA;
      });

      setCommunityInsights(insights.slice(0, 5));
    } catch (error) {
      console.error('Failed to load community insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Load all data on component mount
  useEffect(() => {
    loadActivityData();
    loadCommunityInsights();
  }, []);

  // Refresh all data
  const refreshData = () => {
    loadAnalytics();
    loadActivityData();
    loadCommunityInsights();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Real-time KPI cards with actual Firebase data
  const stats = [
    {
      title: 'Total Registered Users',
      value: analytics?.totalUsers || 0,
      icon: Users,
      color: 'blue',
      subMetric: `Active this week`,
      loading: loading
    },
    {
      title: 'Total Communities',
      value: analytics?.totalCommunities || 0,
      icon: Building2,
      color: 'green',
      subMetric: `${analytics?.communitiesCreatedThisWeek || 0} created this week`,
      loading: loading
    },
    {
      title: 'Firebase Storage Usage',
      value: analytics?.storageUsage || 0,
      icon: HardDrive,
      color: 'purple',
      subMetric: 'MB used',
      loading: loading
    },
    {
      title: 'Flagged Communities',
      value: analytics?.flaggedCommunities || 0,
      icon: AlertTriangle,
      color: 'red',
      subMetric: 'Requiring attention',
      loading: loading
    },
    {
      title: 'Top Active Community',
      value: analytics?.topActiveCommunities?.[0]?.name || 'None',
      icon: TrendingUp,
      color: 'indigo',
      subMetric: `${analytics?.topActiveCommunities?.[0]?.memberCount || 0} members`,
      loading: loading,
      isText: true
    }
  ];



  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* Refresh Button - Top Right */}
        <div className="flex justify-end">
          <button
            onClick={refreshData}
            disabled={loading || loadingActivity || loadingInsights}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw size={16} className={loading || loadingActivity || loadingInsights ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>
        {/* Real-time KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {stat.title}
                    </p>
                    {stat.loading ? (
                      <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      <p className={`${stat.isText ? 'text-lg' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>
                        {stat.isText ? stat.value : (typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {stat.subMetric}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-100 dark:bg-${stat.color}-900/20 ml-3`}>
                    <Icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Real-time Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                📈 Platform Activity (Past 7 Days)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time data from Firestore collections
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {loadingActivity && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
              <Activity className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis className="text-gray-600 dark:text-gray-400" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: '1px solid rgb(75 85 99)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  name="Messages Sent"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="resources"
                  stroke="#10B981"
                  strokeWidth={3}
                  name="Resources Uploaded"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="communities"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  name="Communities Created"
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Storage Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Storage Usage
            </h3>
            <HardDrive className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Used: {(analytics?.storageUsage || 0).toFixed(1)} MB</span>
                <span>Limit: 1,000 MB</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((analytics?.storageUsage || 0) / 1000) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {((analytics?.storageUsage || 0) / 1000 * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">of limit</p>
            </div>
          </div>
        </motion.div>

        {/* Community Insights Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🗃️ Community Insights
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Top communities with real-time member and activity data
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {loadingInsights && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Community
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loadingInsights ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : communityInsights.length > 0 ? (
                  communityInsights.map((community, index) => (
                    <motion.tr
                      key={community.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {community.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {community.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {community.creatorEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {community.memberCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {community.messageCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Upload className="w-4 h-4 text-purple-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {community.resourceCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {community.lastActivity.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {community.lastActivity.toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">View</span>
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <div className="text-gray-500 dark:text-gray-400">
                        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No communities found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
