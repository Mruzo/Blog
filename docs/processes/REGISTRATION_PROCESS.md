# Registration Process in React

## Overview

The registration process in the React app allows users to create new accounts through a React component that communicates with Django's REST API. The registered users are stored in the same Django User model database, regardless of whether they register through React or Django templates.

## Architecture

### Frontend (React)

1. **Register Component** (`frontend/src/pages/Register.tsx`)
   - React functional component with form handling
   - Collects user data: username, email, password, password2, first_name, last_name, accept_terms
   - Client-side validation (password matching, terms acceptance)
   - Calls `register` method from `ApiContext`

2. **ApiContext** (`frontend/src/contexts/ApiContext.tsx`)
   - Provides `register` method that:
     - Calls `apiService.register()` to send data to Django API
     - Stores authentication token in `localStorage`
     - Updates `currentUser` state
     - Reloads user data and other app data

3. **API Service** (`frontend/src/services/api.ts`)
   - `register()` method sends POST request to `/api/icvybz/auth/register/`
   - Returns token, user object, message, and email_verification_required flag

### Backend (Django)

1. **API Endpoint** (`icvybz/api_views.py` - `register_api`)
   - URL: `/api/icvybz/auth/register/`
   - Accepts POST requests with JSON data
   - Validates:
     - Required fields: username, email, password
     - Password matching (password === password2)
     - Terms acceptance
     - Username uniqueness
     - Email uniqueness
   - Creates user with `is_active=False` (requires email verification)
   - Generates email verification token
   - Sends verification email
   - Creates authentication token
   - Returns token, user data, message, and email_verification_required flag

2. **User Model**
   - Uses Django's built-in `User` model
   - Same database table for React and Django registrations
   - Email verification handled via token system

## Registration Flow

### Step-by-Step Process

1. **User Navigation**
   - User clicks "Register here" link from Login page (`/login/`)
   - Or navigates directly to `/register/`
   - React Router renders `Register` component

2. **Form Display**
   - Register form shows:
     - Username (required)
     - Email (required)
     - First Name (optional)
     - Last Name (optional)
     - Password (required)
     - Confirm Password (required)
     - Terms & Conditions checkbox (required)

3. **Form Submission**
   - User fills in form fields
   - Client-side validation:
     - Passwords must match
     - Terms must be accepted
   - On submit, `handleSubmit` is called

4. **API Call**
   - `register()` from `ApiContext` is called with form data
   - `apiService.register()` sends POST to `/api/icvybz/auth/register/`
   - Request includes:
     ```json
     {
       "username": "newuser",
       "email": "newuser@example.com",
       "password": "password123",
       "password2": "password123",
       "first_name": "New",
       "last_name": "User",
       "accept_terms": true
     }
     ```

5. **Backend Processing**
   - Django validates all fields
   - Checks username/email uniqueness
   - Creates user with `is_active=False`
   - Generates email verification token
   - Sends verification email to user
   - Creates authentication token
   - Returns response:
     ```json
     {
       "token": "auth-token-here",
       "user": {
         "id": 1,
         "username": "newuser",
         "email": "newuser@example.com",
         "first_name": "New",
         "last_name": "User",
         "is_active": false,
         "is_email_verified": false
       },
       "message": "Registration successful. Please check your email to verify your account.",
       "email_verification_required": true
     }
     ```

6. **Frontend Response Handling**
   - Token stored in `localStorage`
   - User state updated in `ApiContext`
   - Success message displayed
   - User redirected to home page after 2 seconds

7. **Email Verification**
   - User receives email with verification link
   - Clicking link activates account (`is_active=True`)
   - User can then fully use the application

## Error Handling

### Client-Side Validation
- **Passwords don't match**: Error message displayed, API not called
- **Terms not accepted**: Error message displayed, API not called
- **Required fields missing**: Browser validation prevents submission

### Server-Side Validation
- **Username already exists**: Error returned, displayed to user
- **Email already in use**: Error returned, displayed to user
- **Invalid data**: Appropriate error message returned

## Database Storage

**Important**: Both React and Django registrations use the **same Django User model** and **same database table**. This means:
- Users registered via React are stored in the same database as Django registrations
- All user data is consistent regardless of registration method
- Authentication tokens work the same way for both registration methods
- Email verification process is identical

## Testing

### Unit Tests

**File**: `frontend/src/pages/__tests__/Register.test.tsx`

Tests cover:
- ✅ Form rendering (all fields, labels, buttons)
- ✅ Form field updates
- ✅ Checkbox state changes
- ✅ API call with correct data
- ✅ Loading state during submission
- ✅ Client-side validation (password mismatch, terms not accepted)
- ✅ Error message display on API failure
- ✅ Success message display
- ✅ Navigation after successful registration
- ✅ Required field validation

### Integration Tests

**File**: `frontend/src/__tests__/RegisterFlow.test.tsx`

Tests cover:
- ✅ Navigation from login page to register page
- ✅ Complete registration flow (navigate → fill form → submit → success)
- ✅ Password mismatch error handling
- ✅ Terms acceptance validation
- ✅ API error handling
- ✅ Navigation back to login page

### Test Coverage

All registration functionality is covered by tests:
- **Component rendering**: ✅ Tested
- **Form interactions**: ✅ Tested
- **API integration**: ✅ Tested
- **Error handling**: ✅ Tested
- **Navigation flow**: ✅ Tested
- **User experience**: ✅ Tested

## Routes

- **Register Page**: `/register/`
- **Login Page**: `/login/` (contains link to register)
- **API Endpoint**: `/api/icvybz/auth/register/`

## Key Files

### Frontend
- `frontend/src/pages/Register.tsx` - Registration component
- `frontend/src/contexts/ApiContext.tsx` - Register method in context
- `frontend/src/services/api.ts` - API service with register method
- `frontend/src/App.tsx` - Route configuration
- `frontend/src/pages/__tests__/Register.test.tsx` - Unit tests
- `frontend/src/__tests__/RegisterFlow.test.tsx` - Integration tests

### Backend
- `icvybz/api_views.py` - `register_api` function
- `icvybz/api_urls.py` - URL routing for register endpoint

## Security Features

1. **Password Validation**: Passwords must match before submission
2. **Terms Acceptance**: Users must accept terms to register
3. **Email Verification**: Accounts are inactive until email is verified
4. **Token Authentication**: Secure token-based authentication
5. **Unique Username/Email**: Backend validates uniqueness
6. **Inactive by Default**: New users cannot access protected features until verified

## Email Configuration

Registration emails are sent from `justvybz@justvybz.com` (as configured in password reset). The email includes:
- Verification link with user ID and token
- Instructions to verify account
- Site branding

## Summary

The registration process in React is fully functional and tested. Users can:
1. Navigate to the register page
2. Fill out the registration form
3. Submit their information
4. Receive a verification email
5. Verify their account
6. Use the application

All registrations, whether from React or Django, are stored in the same database and use the same authentication system.



