import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, User, Mail, MessageSquare } from 'lucide-react';
import { BaseModal } from '../UI/ModalContainer';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getPendingJoinRequests, approveJoinRequest, rejectJoinRequest } from '../../services/communityService';
import { JoinRequest } from '../../types';

interface JoinRequestsModalProps {
  communityId: string;
  communityName: string;
}

export const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({ 
  communityId, 
  communityName 
}) => {
  const { closeModal, showToast } = useUIStore();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadJoinRequests();
  }, [communityId]);

  const loadJoinRequests = async () => {
    try {
      console.log('📋 [ADMIN] Loading join requests for community:', communityId);
      setLoading(true);
      const pendingRequests = await getPendingJoinRequests(communityId);
      setRequests(pendingRequests);
      console.log('✅ [ADMIN] Loaded join requests:', pendingRequests.length);
    } catch (error) {
      console.error('❌ [ADMIN] Failed to load join requests:', error);
      showToast({
        type: 'error',
        title: 'Failed to load requests',
        message: 'Could not load pending join requests'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: JoinRequest) => {
    if (!user) return;
    
    setProcessingRequests(prev => new Set([...prev, request.id]));
    
    try {
      console.log('✅ [ADMIN] Approving join request:', request.id);
      await approveJoinRequest(request.id, user.uid);
      
      showToast({
        type: 'success',
        title: 'Request Approved',
        message: `${request.userDisplayName || request.userEmail} has been added to the community`
      });
      
      // Remove the request from the list
      setRequests(prev => prev.filter(r => r.id !== request.id));
      
    } catch (error) {
      console.error('❌ [ADMIN] Failed to approve request:', error);
      showToast({
        type: 'error',
        title: 'Approval Failed',
        message: 'Could not approve the join request'
      });
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.id);
        return newSet;
      });
    }
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    if (!user) return;
    
    setProcessingRequests(prev => new Set([...prev, request.id]));
    
    try {
      console.log('❌ [ADMIN] Rejecting join request:', request.id);
      await rejectJoinRequest(request.id, user.uid);
      
      showToast({
        type: 'success',
        title: 'Request Rejected',
        message: `Join request from ${request.userDisplayName || request.userEmail} has been rejected`
      });
      
      // Remove the request from the list
      setRequests(prev => prev.filter(r => r.id !== request.id));
      
    } catch (error) {
      console.error('❌ [ADMIN] Failed to reject request:', error);
      showToast({
        type: 'error',
        title: 'Rejection Failed',
        message: 'Could not reject the join request'
      });
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.id);
        return newSet;
      });
    }
  };

  return (
    <BaseModal title={`Join Requests - ${communityName}`} size="lg">
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Pending Requests
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no pending join requests for this community.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Pending Requests ({requests.length})
              </h3>
              <button
                onClick={loadJoinRequests}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Refresh
              </button>
            </div>
            
            {requests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <User size={20} className="text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {request.userDisplayName || 'Unknown User'}
                        </h4>
                        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                          <Mail size={14} />
                          <span>{request.userEmail}</span>
                        </div>
                      </div>
                    </div>
                    
                    {request.message && (
                      <div className="mb-3">
                        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <MessageSquare size={14} />
                          <span>Message:</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border">
                          {request.message}
                        </p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Requested {request.createdAt.toLocaleDateString()} at {request.createdAt.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleApproveRequest(request)}
                      disabled={processingRequests.has(request.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded-lg transition-colors"
                    >
                      <Check size={16} />
                      <span>Approve</span>
                    </button>
                    
                    <button
                      onClick={() => handleRejectRequest(request)}
                      disabled={processingRequests.has(request.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded-lg transition-colors"
                    >
                      <X size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={closeModal}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </BaseModal>
  );
};
