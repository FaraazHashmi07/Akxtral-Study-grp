import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Users,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  Mail,
  User,
  Shield,
  Eye,
  Download,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { SuperAdminCommunityView } from '../../../types';

interface CommunityDetailModalProps {
  community: SuperAdminCommunityView;
  onClose: () => void;
}

interface CommunityMember {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  joinedAt: Date;
  lastActive?: Date;
}

interface CommunityMessage {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  createdAt: Date;
  type?: string;
}

interface CommunityResource {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploaderName?: string;
  uploadedAt: Date;
  size?: number;
  downloadUrl?: string;
}

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  creatorName?: string;
}

export const CommunityDetailModal: React.FC<CommunityDetailModalProps> = ({
  community,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'messages' | 'resources' | 'events'>('overview');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [recentMessages, setRecentMessages] = useState<CommunityMessage[]>([]);
  const [recentResources, setRecentResources] = useState<CommunityResource[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CommunityEvent[]>([]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  }, [activeTab, community.id]);

  const loadTabData = async (tab: string) => {
    setLoading(true);
    try {
      console.log(`📊 [COMMUNITY_DETAIL] Loading ${tab} data for community:`, community.id);

      // Import Firestore
      const { collection, getDocs, query, orderBy, limit, doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../../lib/firebase');

      switch (tab) {
        case 'members':
          await loadMembers();
          break;
        case 'messages':
          await loadRecentMessages();
          break;
        case 'resources':
          await loadRecentResources();
          break;
        case 'events':
          await loadUpcomingEvents();
          break;
      }
    } catch (error) {
      console.error(`❌ [COMMUNITY_DETAIL] Failed to load ${tab} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../../../lib/firebase');

    const rolesSnapshot = await getDocs(collection(db, 'communities', community.id, 'roles'));
    const memberData: CommunityMember[] = await Promise.all(
      rolesSnapshot.docs.map(async (roleDoc) => {
        const roleData = roleDoc.data();
        const uid = roleDoc.id;

        // Try to get user info
        let email = 'Unknown';
        let displayName = 'Unknown User';
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            email = userData.email || email;
            displayName = userData.displayName || userData.name || displayName;
          }
        } catch (error) {
          console.warn(`⚠️ [COMMUNITY_DETAIL] Could not fetch user info for ${uid}:`, error);
        }

        return {
          uid,
          email,
          displayName,
          role: roleData.role || 'member',
          joinedAt: roleData.joinedAt?.toDate() || new Date(),
          lastActive: roleData.lastActive?.toDate()
        };
      })
    );

    setMembers(memberData);
  };

  const loadRecentMessages = async () => {
    const { collection, getDocs, query, orderBy, limit, doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../../../lib/firebase');

    const messagesQuery = query(
      collection(db, 'communities', community.id, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const messagesSnapshot = await getDocs(messagesQuery);
    const messageData: CommunityMessage[] = await Promise.all(
      messagesSnapshot.docs.map(async (messageDoc) => {
        const messageData = messageDoc.data();

        // Try to get author info
        let authorName = 'Unknown User';
        let authorEmail = 'Unknown';
        if (messageData.authorId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', messageData.authorId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              authorName = userData.displayName || userData.name || authorName;
              authorEmail = userData.email || authorEmail;
            }
          } catch (error) {
            console.warn(`⚠️ [COMMUNITY_DETAIL] Could not fetch author info for ${messageData.authorId}:`, error);
          }
        }

        return {
          id: messageDoc.id,
          content: messageData.content || '',
          authorId: messageData.authorId || '',
          authorName,
          authorEmail,
          createdAt: messageData.createdAt?.toDate() || new Date(),
          type: messageData.type || 'text'
        };
      })
    );

    setRecentMessages(messageData);
  };

  const loadRecentResources = async () => {
    const { collection, getDocs, query, orderBy, limit, where, doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../../../lib/firebase');

    const resourcesQuery = query(
      collection(db, 'resources'),
      where('communityId', '==', community.id),
      orderBy('uploadedAt', 'desc'),
      limit(5)
    );

    const resourcesSnapshot = await getDocs(resourcesQuery);
    const resourceData: CommunityResource[] = await Promise.all(
      resourcesSnapshot.docs.map(async (resourceDoc) => {
        const resourceData = resourceDoc.data();

        // Try to get uploader info
        let uploaderName = 'Unknown User';
        if (resourceData.uploadedBy) {
          try {
            const userDoc = await getDoc(doc(db, 'users', resourceData.uploadedBy));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              uploaderName = userData.displayName || userData.name || uploaderName;
            }
          } catch (error) {
            console.warn(`⚠️ [COMMUNITY_DETAIL] Could not fetch uploader info for ${resourceData.uploadedBy}:`, error);
          }
        }

        return {
          id: resourceDoc.id,
          name: resourceData.name || 'Unknown File',
          type: resourceData.type || 'file',
          uploadedBy: resourceData.uploadedBy || '',
          uploaderName,
          uploadedAt: resourceData.uploadedAt?.toDate() || new Date(),
          size: resourceData.fileSize,
          downloadUrl: resourceData.url
        };
      })
    );

    setRecentResources(resourceData);
  };

  const loadUpcomingEvents = async () => {
    const { collection, getDocs, query, orderBy, where, limit, doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../../../lib/firebase');

    const now = new Date();
    const eventsQuery = query(
      collection(db, 'communities', community.id, 'calendar'),
      where('startDate', '>=', now),
      orderBy('startDate', 'asc'),
      limit(5)
    );

    const eventsSnapshot = await getDocs(eventsQuery);
    const eventData: CommunityEvent[] = await Promise.all(
      eventsSnapshot.docs.map(async (eventDoc) => {
        const eventData = eventDoc.data();

        // Try to get creator info
        let creatorName = 'Unknown User';
        if (eventData.createdBy) {
          try {
            const userDoc = await getDoc(doc(db, 'users', eventData.createdBy));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              creatorName = userData.displayName || userData.name || creatorName;
            }
          } catch (error) {
            console.warn(`⚠️ [COMMUNITY_DETAIL] Could not fetch creator info for ${eventData.createdBy}:`, error);
          }
        }

        return {
          id: eventDoc.id,
          title: eventData.title || 'Untitled Event',
          description: eventData.description,
          startDate: eventData.startDate?.toDate() || new Date(),
          endDate: eventData.endDate?.toDate(),
          createdBy: eventData.createdBy || '',
          creatorName
        };
      })
    );

    setUpcomingEvents(eventData);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'resources', label: 'Resources', icon: FileText },
    { id: 'events', label: 'Events', icon: Calendar }
  ];

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'community_admin':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'moderator':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'community_admin':
        return 'Admin';
      case 'moderator':
        return 'Moderator';
      default:
        return 'Member';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <span>{community.name}</span>
                {community.flagged && (
                  <AlertTriangle className="w-5 h-5 text-red-500" title="Flagged Community" />
                )}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Community ID: {community.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Community Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="text-gray-900 dark:text-white">{community.name}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Description:</span>
                        <span className="text-gray-900 dark:text-white">{community.description || 'No description'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Created:</span>
                        <span className="text-gray-900 dark:text-white">
                          {community.createdAt.toLocaleDateString()} at {community.createdAt.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Last Activity:</span>
                        <span className="text-gray-900 dark:text-white">
                          {community.lastActivity.toLocaleDateString()} at {community.lastActivity.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Creator Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="text-gray-900 dark:text-white">{community.creatorName || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                        <span className="text-gray-900 dark:text-white">{community.creatorEmail}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600 dark:text-gray-400">UID:</span>
                        <span className="text-gray-900 dark:text-white font-mono text-xs">{community.creatorUid}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Members</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {community.memberCount}
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Messages</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {community.messageCount}
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Resources</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {community.resourceCount}
                      </div>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Events</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                        {community.eventCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Community Members ({members.length})
                </h3>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading members...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No members found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.uid}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <User size={20} className="text-gray-600 dark:text-gray-300" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {member.displayName}
                            </span>
                            {getRoleIcon(member.role)}
                            <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300">
                              {getRoleLabel(member.role)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {member.email}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            Joined: {member.joinedAt.toLocaleDateString()}
                            {member.lastActive && (
                              <span className="ml-2">
                                • Last active: {member.lastActive.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                        {member.uid.substring(0, 8)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Messages (Last 5)
                </h3>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading messages...</span>
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No messages found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <User size={16} className="text-gray-600 dark:text-gray-300" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {message.authorName}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              {message.authorEmail}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {message.createdAt.toLocaleDateString()} {message.createdAt.toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 ml-10">
                        {message.content}
                      </div>
                      {message.type && message.type !== 'text' && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 ml-10 mt-1">
                          Type: {message.type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Resources (Last 5)
                </h3>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading resources...</span>
                </div>
              ) : recentResources.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No resources found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {resource.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Uploaded by {resource.uploaderName} • {formatFileSize(resource.size)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {resource.uploadedAt.toLocaleDateString()} {resource.uploadedAt.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {resource.downloadUrl && (
                          <button
                            onClick={() => window.open(resource.downloadUrl, '_blank')}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        <button
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upcoming Events (Next 5)
                </h3>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading events...</span>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No upcoming events found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          Created by {event.creatorName}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>
                            {event.startDate.toLocaleDateString()} at {event.startDate.toLocaleTimeString()}
                          </span>
                        </div>
                        {event.endDate && (
                          <div className="flex items-center space-x-1">
                            <span>to</span>
                            <span>
                              {event.endDate.toLocaleDateString()} at {event.endDate.toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
