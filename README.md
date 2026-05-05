# Insighta Frontend

A modern web interface for the Profile Intelligence System built with Express.js and EJS templating.

## Features

- **GitHub OAuth Authentication**: Secure login using GitHub OAuth
- **Profile Management**: View, create, search, and delete user profiles
- **Role-based Access Control**: Admin and user role management
- **CSV Export**: Export profile data as CSV (admin only)
- **Responsive Design**: Mobile-friendly interface
- **Modern UI**: Clean, professional design with smooth interactions

## Tech Stack

- **Backend**: Node.js + Express.js
- **Templating**: EJS
- **Styling**: Custom CSS with modern design principles
- **Authentication**: JWT tokens with HTTP-only cookies
- **API Integration**: RESTful API communication with backend

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   BACKEND_URL=https://your-backend-url.com
   JWT_SECRET=your-jwt-secret-here
   NODE_ENV=production
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

   The application will run on `http://localhost:4000`

## API Integration

The frontend communicates with the backend API using:

- **Base URL**: Configured via `BACKEND_URL` environment variable
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **API Version**: All requests include `X-API-Version: 1` header

## Routes

### Authentication
- `GET /` - Login page with GitHub OAuth link
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/logout` - Logout and clear session

### Dashboard
- `GET /dashboard` - Main dashboard with profile listing
- `GET /profiles/search` - Search profiles by name

### Profile Management (Admin Only)
- `POST /profiles` - Create new profile
- `DELETE /profiles/:id` - Delete profile
- `GET /export` - Export profiles as CSV

## User Roles

### Admin Users
- View all profiles
- Create new profiles
- Delete existing profiles
- Export data as CSV
- Search profiles

### Regular Users
- View profiles (read-only)
- Search profiles

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **HTTP-only Cookies**: Prevents XSS attacks
- **CSRF Protection**: Method override for DELETE requests
- **Input Validation**: Server-side validation for all inputs
- **Secure Headers**: Proper CORS and security headers

## Development

### File Structure
```
insighta-frontend/
├── public/
│   ├── styles/
│   │   ├── main.css          # Login page styles
│   │   └── dashboard.css     # Dashboard styles
│   └── js/                   # Client-side JavaScript (future)
├── routes/
│   └── webRoutes.js          # Web routes and API proxy
├── views/
│   ├── login.ejs            # Login page template
│   └── dashboard.ejs        # Dashboard template
├── app.js                   # Express app configuration
├── server.js               # Server entry point
└── .env                    # Environment variables
```

### Adding New Features

1. **New Routes**: Add to `routes/webRoutes.js`
2. **New Templates**: Create EJS files in `views/`
3. **New Styles**: Add CSS to appropriate stylesheet
4. **API Calls**: Use fetch API with proper headers

## Deployment

### Environment Variables for Production
```env
BACKEND_URL=https://your-production-backend.com
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
PORT=4000
```

### Railway Deployment
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Check `BACKEND_URL` in `.env`
   - Ensure backend is running and accessible
   - Check network connectivity

2. **Authentication Issues**
   - Verify JWT_SECRET matches backend
   - Check cookie settings for production
   - Ensure OAuth callback URL is configured

3. **Template Errors**
   - Check EJS syntax in template files
   - Verify data passed to templates
   - Check for undefined variables

### Debug Mode
Set `NODE_ENV=development` for detailed error messages.

## Contributing

1. Follow the existing code style
2. Add proper error handling
3. Test all new features
4. Update documentation

## License

This project is part of the Profile Intelligence System.