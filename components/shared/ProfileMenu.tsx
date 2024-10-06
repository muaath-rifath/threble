import { useSession } from 'next-auth/react';
import ProfileDropdown from './ProfileDropdown';

const Header = () => {
  const { data: session } = useSession();

  const handleEditProfile = () => {
    // Handle edit profile action
  };

  const handleSettings = () => {
    // Handle settings action
  };

  const handleLogout = () => {
    // Handle logout action
  };

  return (
    <header className="flex justify-between items-center">
      {/* Other header content */}
      {session?.user && (
        <div className="ml-auto">
          <ProfileDropdown
            user={{
              name: session.user.name || '',
              email: session.user.email || '',
              image: session.user.image || undefined,
            }}
            onEditProfile={handleEditProfile}
            onSettings={handleSettings}
            onLogout={handleLogout}
          />
        </div>
      )}
    </header>
  );
};

export default Header;
