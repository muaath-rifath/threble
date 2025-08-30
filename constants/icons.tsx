import {
  IconHome,
  IconSearch,
  IconBookmark,
  IconHeart,
  IconUsers,
  IconUsersGroup,
  IconUser,
  IconMessageCircle,
  IconBell,
  IconCornerUpLeft,
  IconTag,
  IconWorld
} from '@tabler/icons-react';

// Icon components for navigation
export const NavigationIcons = {
  '/assets/home.svg': IconHome,
  '/assets/search.svg': IconSearch,
  '/assets/bookmark.svg': IconBookmark,
  '/assets/heart.svg': IconHeart,
  '/assets/members.svg': IconUsers,
  '/assets/community.svg': IconUsersGroup,
  '/assets/user.svg': IconUser,
  '/assets/dm.svg': IconMessageCircle,
  '/assets/bell.svg': IconBell,
  '/assets/reply.svg': IconCornerUpLeft,
  '/assets/tag.svg': IconTag,
  '/assets/explore.svg': IconSearch,
};

// Updated navigation links with Tabler icons
export const topbarLinks = [
  {
    icon: IconSearch,
    route: "/explore",
    label: "Explore",
  },
  {
    icon: IconBookmark,
    route: "/bookmarks", 
    label: "Bookmarks",
  },
];

export const topbarNav = [
  {
    icon: IconMessageCircle,
    route: "messages",
    label: "Messages",
  },
  {
    icon: IconBell,
    route: "notifications", 
    label: "Notification",
  },
];

export const sidebarLinks = [
  {
    icon: IconHome,
    route: "/",
    label: "Home",
  },
  {
    icon: IconSearch,
    route: "/search",
    label: "Search",
  },
  {
    icon: IconBookmark,
    route: "/bookmarks",
    label: "Bookmarks",
  },
  {
    icon: IconHeart,
    route: "/activity",
    label: "Activity",
  },
  {
    icon: IconUsers,
    route: "/connections",
    label: "Connections",
  },
  {
    icon: IconUsersGroup,
    route: "/communities",
    label: "Communities",
  },
  {
    icon: IconUser,
    route: "/profile",
    label: "Profile",
  },
];

export const leftSidebarLinks = [
  {
    icon: IconHome,
    route: "/",
    label: "Home",
  },
  {
    icon: IconSearch,
    route: "/search",
    label: "Search",
  },
  {
    icon: IconBookmark,
    route: "/bookmarks",
    label: "Bookmarks",
  },
  {
    icon: IconUsersGroup,
    route: "/communities",
    label: "Communities",
  },
  {
    icon: IconUser,
    route: "/profile",
    label: "Profile",
  },
];

export const profileTabs = [
  { value: "threads", label: "Threads", icon: IconCornerUpLeft },
  { value: "replies", label: "Replies", icon: IconUsers },
  { value: "tagged", label: "Tagged", icon: IconTag },
];

export const communityTabs = [
  { value: "threads", label: "Threads", icon: IconCornerUpLeft },
  { value: "members", label: "Members", icon: IconUsers },
  { value: "requests", label: "Requests", icon: IconUser },
];
