import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from './ProfileDropdown';

const ProfileMenu = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleProfile = () => {
    router.push('/profile');
  };

  const handleSettings = () => {
    router.push('/profile');
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      toast({
        title: "Signing out...",
        description: "Please wait while we sign you out.",
      });
      
      await signOut({ 
        callbackUrl: '/signin',
        redirect: true 
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      // Fallback: force redirect to signin page
      window.location.href = '/signin';
    } finally {
      setShowLogoutDialog(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <ProfileDropdown
        user={{
          name: session.user.name || '',
          email: session.user.email || '',
          image: session.user.image || undefined,
        }}
        onProfile={handleProfile}
        onSettings={handleSettings}
        onLogout={handleLogoutClick}
      />
      
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black dark:text-white">Sign out of your account?</AlertDialogTitle>
            <AlertDialogDescription className="text-black/60 dark:text-white/60">
              You will be redirected to the sign-in page and will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-500 text-white hover:bg-red-600 rounded-2xl shadow-lg shadow-red-500/25"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProfileMenu;