import { z } from "zod";

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = [
  'api', 'home', 'login', 'signup', 'signin', 'signout', 'register',
  'admin', 'root', 'www', 'mail', 'ftp', 'localhost', 'blog',
  'auth', 'profile', 'settings', 'help', 'support', 'about',
  'contact', 'terms', 'privacy', 'dashboard', 'feed', 'explore',
  'notifications', 'messages', 'search', 'trending', 'thread',
  'post', 'posts', 'user', 'users', 'onboarding', 'error',
  'media', 'upload', 'download', 'static', 'assets', 'public'
];

export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores")
  .refine((username) => !username.startsWith('_'), "Username cannot start with underscore")
  .refine((username) => !username.endsWith('_'), "Username cannot end with underscore")
  .refine((username) => !username.includes('__'), "Username cannot contain consecutive underscores")
  .refine((username) => !RESERVED_USERNAMES.includes(username.toLowerCase()), 
    "This username is reserved and cannot be used");

export const onboardingSchema = z.object({
  username: usernameSchema,
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  location: z.string().max(100, 'Location must be 100 characters or less').optional(),
  website: z.string().url('Invalid URL').optional(),
  birthDate: z.string()
    .min(1, "Birth date is required")
    .refine((date) => {
      if (!date) return false;
      const parsedDate = new Date(date);
      const today = new Date();
      const minAge = new Date();
      minAge.setFullYear(today.getFullYear() - 13); // Minimum age of 13
      
      return !isNaN(parsedDate.getTime()) && 
             parsedDate < today && 
             parsedDate <= minAge;
    }, {
      message: 'You must be at least 13 years old',
    }),
});

export const profileUpdateSchema = z.object({
  username: usernameSchema,
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  location: z.string().max(100, 'Location must be 100 characters or less').optional(),
  website: z.string().url('Invalid URL').optional(),
  birthDate: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const parsedDate = new Date(date);
      const today = new Date();
      const minAge = new Date();
      minAge.setFullYear(today.getFullYear() - 13);
      
      return !isNaN(parsedDate.getTime()) && 
             parsedDate < today && 
             parsedDate <= minAge;
    }, {
      message: 'You must be at least 13 years old',
    }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
