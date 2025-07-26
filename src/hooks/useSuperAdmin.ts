import { useAuthStore } from '../store/authStore';

/**
 * Hook to check if current user is Super Admin
 */
export const useSuperAdmin = () => {
  const { isSuperAdmin, loading, superAdminToken } = useAuthStore();
  
  return {
    isSuperAdmin,
    loading,
    superAdminToken,
    isVerified: isSuperAdmin && !loading
  };
};
