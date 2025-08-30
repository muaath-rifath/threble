import {
  IconCompass,
  IconBookmark,
  IconMessage,
  IconBell,
  IconHome,
  IconSearch,
  IconHeart,
  IconUsers,
  IconUsersGroup,
  IconUser,
  IconMessageCircle,
  IconTag,
  IconUserPlus
} from '@tabler/icons-react';

export const topbarLinks = [
  {
    icon: IconCompass,
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
  icon: IconMessage,
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
    { value: "threads", label: "Threads", icon: IconMessageCircle },
    { value: "replies", label: "Replies", icon: IconUsers },
    { value: "tagged", label: "Tagged", icon: IconTag },
  ];

  export const communityTabs = [
    { value: "threads", label: "Threads", icon: IconMessageCircle },
    { value: "members", label: "Members", icon: IconUsers },
    { value: "requests", label: "Requests", icon: IconUserPlus },
  ];
  
  export const userProfile = {
    icon: IconUser,
    route: "/profile",
    label: "Profile",
  };
  