# Studio Collaboration Request Flow - Review & Testing Guide

## Overview
This document reviews the complete flow of studio collaboration requests, from creation to acceptance/decline.

## Flow Diagram

```
User A (Requester)                    User B (Studio Owner)
     |                                       |
     | 1. Clicks "Collaborate"              |
     |    on Studios page                   |
     |                                       |
     | 2. POST /studios/{id}/               |
     |    collaboration-requests/create/     |
     |                                       |
     | 3. Request created in DB             |
     |    (status='pending')                 |
     |                                       |
     | 4. Success message shown             |
     |                                       |
     |                                       | 5. Polling every 10s
     |                                       |    GET /studios/{id}/
     |                                       |    collaboration-requests/
     |                                       |
     |                                       | 6. Notification badge
     |                                       |    appears with count
     |                                       |
     |                                       | 7. Owner clicks bell icon
     |                                       |    Modal opens showing
     |                                       |    requester details
     |                                       |
     |                                       | 8. Owner accepts/declines
     |                                       |    POST /studios/{id}/
     |                                       |    collaboration-requests/
     |                                       |    {id}/accept|decline/
     |                                       |
     |                                       | 9. If accepted:
     |                                       |    - StudioCollaborator created
     |                                       |    - Request status='accepted'
     |                                       |    - Collaborator appears in team
```

## Backend API Endpoints

### 1. Create Collaboration Request
- **Endpoint**: `POST /api/icvybz/studios/<studio_id>/collaboration-requests/create/`
- **Auth**: Required (IsAuthenticated)
- **Request Body**:
  ```json
  {
    "role": "writer",  // Optional, defaults to 'writer'
    "message": ""      // Optional
  }
  ```
- **Response**: `201 Created` with request data
- **Validations**:
  - User cannot be the studio owner
  - User cannot already be an active collaborator
  - User cannot have a pending request
  - If user has a declined request, it's deleted first (due to unique_together constraint)

### 2. Get Collaboration Requests
- **Endpoint**: `GET /api/icvybz/studios/<studio_id>/collaboration-requests/`
- **Auth**: Required (IsAuthenticated)
- **Permission**: Only studio owner can see requests
- **Response**: `200 OK` with `{results: [...]}`
- **Filters**: Only returns requests with `status='pending'`
- **Ordering**: Most recent first (`-created_at`)

### 3. Accept Collaboration Request
- **Endpoint**: `POST /api/icvybz/studios/<studio_id>/collaboration-requests/<request_id>/accept/`
- **Auth**: Required (IsAuthenticated)
- **Permission**: Only studio owner can accept
- **Actions**:
  - Creates `StudioCollaborator` with `is_active=True`
  - Updates request `status='accepted'`
- **Response**: `200 OK` with updated request data

### 4. Decline Collaboration Request
- **Endpoint**: `POST /api/icvybz/studios/<studio_id>/collaboration-requests/<request_id>/decline/`
- **Auth**: Required (IsAuthenticated)
- **Permission**: Only studio owner can decline
- **Actions**:
  - Updates request `status='declined'`
- **Response**: `200 OK` with updated request data

## Frontend Components

### Studios.tsx - Request Creation
- **Location**: `/immersivecomics/studios/`
- **Button**: "Collaborate" button on each studio card
- **Action**: Calls `apiService.createStudioCollaborationRequest()`
- **Success**: Shows message "Collaboration request sent! The studio owner will review it."

### MyStudio.tsx - Request Management
- **Location**: `/immersivecomics/my-studio/`
- **Notification Button**: 
  - Always visible (bell icon)
  - Yellow/warning when requests exist
  - Grey/light when no requests
  - Shows red badge with count when requests exist
- **Polling**: Refreshes requests every 10 seconds
- **Modal**: Shows list of pending requests with:
  - Requester name (first_name + last_name or username)
  - Requester username (@username)
  - Requested role (badge with icon)
  - Request date
  - Optional message
  - Accept/Decline buttons

## Data Models

### StudioCollaborationRequest
```python
- studio: ForeignKey to Studio
- requester: ForeignKey to User
- role: CharField (writer, 3d_artist, voice_actor, sound_engineer, cinematographer)
- status: CharField (pending, accepted, declined)
- message: TextField (optional)
- created_at: DateTimeField
- updated_at: DateTimeField
- unique_together: ['studio', 'requester']
```

### StudioCollaborator
```python
- studio: ForeignKey to Studio
- user: ForeignKey to User
- role: CharField
- joined_at: DateTimeField
- is_active: BooleanField
- unique_together: ['studio', 'user']
```

## Testing Checklist

### Test 1: Create Request (User A)
1. ✅ User A logs in on Device 1
2. ✅ Navigate to `/immersivecomics/studios/`
3. ✅ Find a studio owned by User B
4. ✅ Click "Collaborate" button
5. ✅ Verify success message appears
6. ✅ Check browser console for API call success

### Test 2: Receive Notification (User B)
1. ✅ User B logs in on Device 2
2. ✅ Navigate to `/immersivecomics/my-studio/`
3. ✅ Wait up to 10 seconds for polling
4. ✅ Verify notification bell icon appears with yellow background
5. ✅ Verify red badge shows correct count
6. ✅ Check browser console for:
   - "Loaded collaboration requests: [...]"
   - Studio ID, Current user ID, Studio owner ID match

### Test 3: View Request Details (User B)
1. ✅ Click notification bell icon
2. ✅ Verify modal opens
3. ✅ Verify requester information displays:
   - Name (first_name + last_name or username)
   - Username (@username)
   - Role badge
   - Request date
4. ✅ Verify Accept and Decline buttons are visible

### Test 4: Accept Request (User B)
1. ✅ Click "Accept" button on a request
2. ✅ Verify success message appears
3. ✅ Verify modal closes or updates
4. ✅ Verify requester appears in Team section as collaborator
5. ✅ Verify notification badge count decreases
6. ✅ Verify request no longer appears in modal

### Test 5: Decline Request (User B)
1. ✅ Click "Decline" button on a request
2. ✅ Verify success message appears
3. ✅ Verify modal updates
4. ✅ Verify notification badge count decreases
5. ✅ Verify request no longer appears in modal

### Test 6: Polling Verification
1. ✅ User A creates a request
2. ✅ User B's page is already open on `/immersivecomics/my-studio/`
3. ✅ Wait 10 seconds (polling interval)
4. ✅ Verify notification appears automatically without refresh
5. ✅ Verify console shows periodic "Loaded collaboration requests" logs

## Common Issues & Solutions

### Issue 1: Notification doesn't appear
**Possible Causes**:
- User is not the studio owner (check console for 403 error)
- Migration not run (table doesn't exist)
- Polling not working (check console for errors)

**Solutions**:
- Verify user ID matches studio owner ID in console
- Run migrations: `python manage.py migrate`
- Check browser console for API errors

### Issue 2: Request creation fails
**Possible Causes**:
- User is already the owner
- User is already a collaborator
- User already has a pending request
- Unique constraint violation

**Solutions**:
- Check error message in console
- Verify user is not owner/collaborator
- Check for existing pending requests

### Issue 3: Requester info not showing
**Possible Causes**:
- Serializer not including requester data
- API not returning requester field

**Solutions**:
- Verify `StudioCollaborationRequestSerializer` includes `requester = UserSerializer(read_only=True)`
- Check API response in browser Network tab
- Verify `select_related('requester')` in query

## API Response Format

### Get Requests Response
```json
{
  "results": [
    {
      "id": 1,
      "studio": {...},
      "requester": {
        "id": 2,
        "username": "requester_username",
        "email": "requester@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "role": "writer",
      "status": "pending",
      "message": "",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

## Database Queries

### Create Request
```python
StudioCollaborationRequest.objects.create(
    studio=studio,
    requester=request.user,
    role=role,
    message=message
)
```

### Get Pending Requests
```python
StudioCollaborationRequest.objects.filter(
    studio=studio,
    status='pending'
).order_by('-created_at').select_related('requester')
```

### Accept Request
```python
# Creates StudioCollaborator
StudioCollaborator.objects.get_or_create(
    studio=studio,
    user=requester,
    defaults={'role': role, 'is_active': True}
)
# Updates request status
request.status = 'accepted'
request.save()
```

## Security Considerations

1. **Authentication**: All endpoints require authentication
2. **Authorization**: Only studio owner can view/accept/decline requests
3. **Validation**: Prevents duplicate requests, owner self-requests
4. **Data Integrity**: Unique constraints prevent duplicate collaborators

## Performance Considerations

1. **Polling Interval**: 10 seconds (balance between responsiveness and server load)
2. **Database Queries**: Uses `select_related('requester')` to avoid N+1 queries
3. **Indexing**: Indexes on `['studio', 'status']` and `['requester', 'status']`

## Future Enhancements

1. WebSocket support for real-time notifications
2. Email notifications for studio owners
3. Request expiration (auto-decline after X days)
4. Bulk accept/decline actions
5. Request history view


