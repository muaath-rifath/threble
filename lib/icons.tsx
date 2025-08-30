// Icon exports from Tabler Icons for consistent usage across the app
import {
  IconLoader2,
  IconBookmark,
  IconBookmarkFilled,
  IconMessage,
  IconMessageCircle,
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconShare2,
  IconSearch,
  IconUsers,
  IconUser,
  IconUserX,
  IconEdit,
  IconTrash,
  IconPhoto,
  IconVideo,
  IconX,
  IconMoon,
  IconSun,
  IconDeviceDesktop,
  IconDots,
  IconDotsVertical,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconPlus,
  IconMinus,
  IconCrown,
  IconShield,
  IconSettings,
  IconThumbUp,
  IconHome,
  IconBell,
  IconMail,
  IconLogout,
  IconLogin,
  IconUserCircle,
  IconTag,
  IconCornerUpLeft,
  IconInfoCircle,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconAlertTriangle,
  IconUpload,
  IconDownload,
  IconCopy,
  IconExternalLink,
  IconCalendar,
  IconClock,
  IconStar,
  IconStarFilled,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconRefresh,
  IconMenu2,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown
} from '@tabler/icons-react';

// Export all icons with consistent naming
export {
  // Loading & Status
  IconLoader2 as Loader,
  IconLoader2,
  
  // Social & Communication
  IconMessage,
  IconMessageCircle,
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconShare2,
  IconBookmark,
  IconBookmarkFilled,
  IconThumbUp,
  
  // Navigation
  IconHome,
  IconSearch,
  IconBell,
  IconMail,
  IconUser,
  IconUsers,
  IconUserX,
  IconSettings,
  
  // Actions
  IconEdit,
  IconTrash,
  IconPlus,
  IconMinus,
  IconDots,
  IconDotsVertical,
  IconX,
  IconCheck,
  IconCopy,
  IconUpload,
  IconDownload,
  IconExternalLink,
  
  // Media
  IconPhoto,
  IconVideo,
  
  // Theme & UI
  IconMoon,
  IconSun,
  IconDeviceDesktop,
  
  // Arrows & Navigation
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  
  // Authority & Roles
  IconCrown,
  IconShield,
  
  // Other
  IconTag,
  IconEye,
  IconEyeOff,
  IconAlertTriangle,
  IconInfoCircle,
  IconCalendar,
  IconClock,
  IconStar,
  IconStarFilled,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconRefresh,
  IconMenu2,
  IconLogout,
  IconLogin
};

// Default icon props
export const defaultIconProps = {
  size: 20,
  stroke: 1.5
};

// Icon size presets
export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40
};

// Common icon combinations for specific use cases
export const PostIcons = {
  Like: IconHeart,
  LikeFilled: IconHeartFilled,
  Comment: IconMessage,
  Share: IconShare,
  Bookmark: IconBookmark,
  BookmarkFilled: IconBookmarkFilled,
  More: IconDots
};

export const NavigationIcons = {
  Home: IconHome,
  Search: IconSearch,
  Notifications: IconBell,
  Messages: IconMail,
  Profile: IconUser,
  Settings: IconSettings
};

export const MediaIcons = {
  Image: IconPhoto,
  Video: IconVideo,
  Upload: IconUpload
};

export const ActionIcons = {
  Edit: IconEdit,
  Delete: IconTrash,
  Add: IconPlus,
  Remove: IconMinus,
  Close: IconX,
  More: IconDots
};

export const ThemeIcons = {
  Light: IconSun,
  Dark: IconMoon,
  System: IconDeviceDesktop
};
