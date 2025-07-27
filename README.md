# Study Group Collaboration App

A React TypeScript application for managing study groups and communities with Firebase authentication and authorization.

## Features

- **Firebase Authentication**: Email/password and Google OAuth sign-in
- **Community-Based Authorization**: Role-based permissions within communities
- **Real-time Chat**: Community messaging and discussions
- **Resource Sharing**: Upload and share study materials
- **Event Management**: Create and manage study sessions and events
- **Responsive Design**: Works on desktop and mobile devices

## Authentication System

### User Roles (Community-Scoped)

All users have the same global role (`user`), but can have different roles within specific communities:

- **community_admin**: Full control over community settings, members, and content
- **community_moderator**: Can moderate content, approve members, and manage events
- **community_member**: Can participate in discussions, upload resources, and create events
- **community_viewer**: Read-only access to community content

### Role Assignment

- **Community Creation**: User who creates a community automatically becomes `community_admin`
- **Role Management**: Only `community_admin` can assign/change roles within their community
- **Join Process**: Users request to join → moderators/admins approve → becomes `community_member`

## Firebase Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firebase Services Required

1. **Authentication**: Enable Email/Password and Google providers
2. **Firestore**: For user profiles and community data
3. **Storage**: For file uploads (avatars, resources)

### Security Rules

Deploy the included `firestore.rules` and `storage.rules` to your Firebase project:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd study-group-collaboration-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication, Firestore, and Storage
   - Copy your config to `.env` file

4. **Deploy security rules**
   ```bash
   firebase init
   firebase deploy --only firestore:rules,storage
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Authentication components
│   ├── Chat/           # Chat interface
│   ├── Communities/    # Community management
│   ├── Dashboard/      # User dashboard
│   └── Layout/         # Layout components
├── lib/                # Utility libraries
│   ├── auth.ts         # Authentication helpers
│   ├── authorization.tsx # Authorization logic
│   ├── firebase.ts     # Firebase configuration
│   └── userProfile.ts  # User profile management
├── store/              # State management (Zustand)
├── types/              # TypeScript type definitions
└── main.tsx           # Application entry point
```

## Key Features

### Authentication Flow

1. **Sign Up/Sign In**: Email/password or Google OAuth
2. **Email Verification**: Required for new accounts
3. **Optional 2FA**: Users can enable two-factor authentication
4. **Profile Management**: Users can update their profiles and avatars

### Community Management

1. **Create Community**: Any authenticated user can create communities
2. **Join Communities**: Request-based membership with approval process
3. **Role Management**: Community admins can assign roles to members
4. **Content Moderation**: Moderators can manage messages and resources

### Permissions System

- **Community Creation**: Open to all authenticated users
- **Content Access**: Based on community membership and role
- **Moderation**: Limited to community moderators and admins
- **Administration**: Scoped to individual communities only

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Build Tool**: Vite
- **UI Components**: Framer Motion, Lucide React

## Security Considerations

- All authentication handled by Firebase Auth
- Role-based access control via Firestore security rules
- File uploads restricted by type and size
- Community-scoped permissions prevent unauthorized access
- No global administrative privileges - all admin functions are community-specific

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

---
*Last deployment: 2024-12-19*
