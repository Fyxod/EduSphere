# EduSphere API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Auth Routes (`/api/auth`)

### POST /register

Register a new user.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "..."
    },
    "token": "jwt_token_here"
  }
}
```

### POST /login

Login an existing user.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

### POST /logout

Logout the current user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /me

Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

## User Routes (`/api/users`)

### GET /profile

Get user profile (protected).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

### PUT /profile

Update user profile (protected).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "name": "New Name",
  "bio": "My bio",
  "avatar": "url_to_avatar"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

### PUT /password

Change password (protected).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### GET /purchases

Get user's purchased courses (protected, user role only).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "courses": [...]
  }
}
```

---

## Course Routes (`/api/courses`)

### GET /

Get all published courses with optional filters.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category
- `search` (string): Search in title/description
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `creator` (string): Filter by creator ID
- `sort` (string): Sort field (default: -createdAt)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "courses": [...],
    "pagination": {
      "page": 1,
      "pages": 5,
      "total": 50
    }
  }
}
```

### GET /:id

Get a single course by ID with sections and videos.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "course": {
      "_id": "...",
      "courseId": "abc1234",
      "title": "Course Title",
      "description": "...",
      "creator": { ... },
      "sections": [
        {
          "_id": "...",
          "title": "Section 1",
          "videos": [...]
        }
      ],
      "totalVideos": 10,
      "totalDuration": 3600
    }
  }
}
```

### POST /

Create a new course (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "title": "Course Title",
  "description": "Course description",
  "category": "Programming",
  "thumbnail": "url_to_thumbnail",
  "price": 49.99,
  "published": false
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "course": { ... }
  }
}
```

### PUT /:id

Update a course (protected, creator only, own courses).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "title": "Updated Title",
  "price": 59.99
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "course": { ... }
  }
}
```

### DELETE /:id

Delete a course (protected, creator only, own courses).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

---

## Section Routes (`/api/sections`)

### POST /

Add a section to a course (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "courseId": "course_id",
  "title": "Section Title",
  "order": 1
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "section": { ... }
  }
}
```

### PUT /:id

Update a section (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "title": "Updated Section Title"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "section": { ... }
  }
}
```

### DELETE /:id

Delete a section (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Section deleted successfully"
}
```

### PUT /reorder

Reorder sections in a course (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "courseId": "course_id",
  "sectionIds": ["section_id_1", "section_id_2", "section_id_3"]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "sections": [...]
  }
}
```

---

## Video Routes (`/api/videos`)

### POST /

Upload a video to a section (protected, creator only).

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**

- `video`: Video file
- `sectionId`: Section ID
- `title`: Video title
- `order`: Video order (optional)

**Response (201):**

```json
{
  "success": true,
  "data": {
    "video": {
      "_id": "...",
      "videoId": "abc1234",
      "title": "Video Title",
      "filename": "coursename_abc1234.mp4",
      "duration": 600,
      "order": 1
    }
  }
}
```

### PUT /:id

Update a video (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "title": "Updated Video Title",
  "order": 2
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "video": { ... }
  }
}
```

### DELETE /:id

Delete a video (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

### GET /stream/:id

Stream a video (protected, requires purchase or creator).

**Headers:** `Authorization: Bearer <token>` (or `?token=` query param)

**Response:** Video stream (video/mp4)

---

## Purchase Routes (`/api/purchases`)

### POST /

Purchase a course (protected, user only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "courseId": "course_id"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "purchase": {
      "_id": "...",
      "user": "user_id",
      "course": "course_id",
      "amount": 49.99,
      "purchasedAt": "..."
    }
  }
}
```

### GET /

Get all purchases for current user (protected).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "purchases": [...]
  }
}
```

### GET /check/:courseId

Check if user has purchased a course (protected).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "purchased": true,
    "purchase": { ... }
  }
}
```

---

## Progress Routes (`/api/progress`)

### POST /complete

Mark a video as complete (protected).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "courseId": "course_id",
  "videoId": "video_id"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "progress": {
      "completedVideos": ["video_id_1", "video_id_2"],
      "lastWatchedVideo": "video_id"
    }
  }
}
```

### DELETE /complete

Mark a video as incomplete (protected).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "courseId": "course_id",
  "videoId": "video_id"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "progress": { ... }
  }
}
```

### GET /:courseId

Get progress for a course (protected).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "progress": { ... },
    "percentage": 50
  }
}
```

### PUT /last-watched

Update last watched video (protected).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "courseId": "course_id",
  "videoId": "video_id"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "progress": { ... }
  }
}
```

---

## Creator Routes (`/api/creator`)

### GET /stats

Get creator statistics (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalCourses": 10,
    "totalStudents": 500,
    "totalRevenue": 25000,
    "coursesStats": [
      {
        "courseId": "...",
        "title": "Course Title",
        "students": 50,
        "revenue": 2500
      }
    ]
  }
}
```

### GET /courses

Get creator's courses (protected, creator only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**

```json
{
  "success": true,
  "data": {
    "courses": [...],
    "pagination": { ... }
  }
}
```

---

## Upload Routes (`/api/upload`)

### POST /image

Upload an image (protected).

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**

- `image`: Image file (jpg, jpeg, png, gif, webp)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "url": "/uploads/images/filename.jpg"
  }
}
```

---

## Categories Routes (`/api/categories`)

### GET /

Get all available categories.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "categories": [
      "Programming",
      "Web Development",
      "Mobile Development",
      "Data Science",
      "Machine Learning",
      "Design",
      "Business",
      "Marketing",
      "Photography",
      "Music",
      "Health & Fitness",
      "Personal Development"
    ]
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

### Common Error Codes:

- `VALIDATION_ERROR` (400): Invalid input data
- `UNAUTHORIZED` (401): Missing or invalid token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `DUPLICATE_ERROR` (400): Duplicate entry (e.g., email already exists)
- `SERVER_ERROR` (500): Internal server error

---

## Environment Variables

Create a `.env` file in the backend folder with:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/edusphere
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
```

---

## Running the Server

```bash
# Development
cd backend
npm install
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5000`
