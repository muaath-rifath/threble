complete it. provide me with full code

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

- Video Calling
- Stories/Status Feature
- Real-time Messaging
- Custom Photo Feed
- Post Management (Create, Delete)
- User Interactions (Like, Comment)
- Profile Customization
- Dark Mode Support
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
- Join our Discord community
- Check the documentation
- Email support: support@threble.com


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

