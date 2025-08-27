# Threble

A modern, open-source social media platform built for the tech community, licensed under GPL v3.

## Tech Stack

- Next.js & React
- TypeScript
- Tailwind CSS
- Prisma ORM
- NextAuth.js
- SchadCn Components
- PostgreSQL

## Features

- **Secure Authentication**: Robust user management powered by NextAuth.js
- **Real-Time Updates**: Instant feedback and live interactions
- **Responsive Design**: Seamless experience across all devices
- **Community Tools**: Posts, comments, and user interaction features
- **Professional Networking**: LinkedIn-style connection system with requests and suggestions
- **Connection Management**: Send, accept, reject, and manage professional connections
- **Smart Suggestions**: AI-powered connection recommendations based on mutual connections and communities
- **Developer-First**: Built with modern development practices

## Quick Start

Launch the development server:
```bash
npm run dev

# or
yarn dev

# or
pnpm dev

# or
bun dev
```

Visit http://localhost:3000 to view the application.

## Environment Setup

Create a `.env` file in the root directory:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
AZURE_AD_CLIENT_ID=your_azure_ad_client_id
AZURE_AD_CLIENT_SECRET=your_azure_ad_client_secret
AZURE_AD_TENANT_ID=your_azure_ad_tenant_id
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
DATABASE_URL=your_database_url
```

## Development

Edit `app/page.tsx` to modify the main page. Changes will be reflected automatically.

## Upcoming Features

- Stories/Status Feature
- Custom Photo Feed
- Direct Message
- Search Functionality
- Notification System

## Resources

- Next.js Documentation
- Next.js Tutorial
- Next.js GitHub Repository

## Deployment

Deploy easily using Vercel, the platform from Next.js creators. Refer to the Next.js deployment documentation for detailed instructions.

## Authentication Flow

Leverages NextAuth with Prisma, it authentication provides:

- **OAuth Integration**: Google, GitHub, and Azure AD login
- **Database Sync**: Direct PostgreSQL integration via Prisma (No need for model (schema) for this)
- **Session Handling**: Automatic JWT management
- **Route Protection**: Built-in NextAuth middleware
- **Type Safety**: Full TypeScript support

For setup instructions, check `/docs/auth.md`.

## Notification System

Threble features a comprehensive notification system with mobile-responsive design:

### Features
- **Smart Notification Button**: Automatically detects device type
  - **Desktop**: Shows dropdown with recent notifications
  - **Mobile**: Navigates to dedicated notifications page
- **Real-time Updates**: Live notification count and status updates
- **Interactive Notifications**: Click to navigate to relevant content
- **Mark as Read**: Individual and bulk mark-as-read functionality
- **Notification Types**: Support for connections, posts, communities, and more

### Mobile-First Design
- **Responsive Dropdown**: Full-featured dropdown on desktop
- **Dedicated Page**: Full-screen notification page on mobile devices
- **Tab Navigation**: Separate tabs for all and unread notifications
- **Pull-to-Refresh**: Easy refresh mechanism on mobile

### API Integration
- `GET /api/notifications` - Fetch notifications with filtering
- `PATCH /api/notifications` - Mark notifications as read
- Real-time badge count updates
- Pagination support for large notification lists

## Connection System

Threble includes a comprehensive LinkedIn-style connection system:

### Features
- **Connection Requests**: Send and receive connection requests with proper notifications
- **Connection Management**: Accept, reject, or remove connections
- **Smart Suggestions**: Get connection recommendations based on:
  - Mutual connections
  - Shared communities
  - Profile similarity
- **Connection Status Tracking**: Real-time status updates (pending, connected, rejected)
- **Mutual Connection Display**: See shared connections with other users

### API Endpoints
- `GET/POST /api/user/connections` - Manage connections
- `GET /api/user/connections/requests` - Handle connection requests  
- `GET /api/user/connections/suggestions` - Get connection suggestions
- `GET /api/user/connections/status/[userId]` - Check connection status
- `GET /api/user/connections/mutual/[userId]` - Get mutual connections

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run test`
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support

If you need help or have questions:
- Open an issue
- Email support: 

## Scripts

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run linting
npm run lint
```

