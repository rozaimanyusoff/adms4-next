# Media Module - API Reference

## Base Information

**Base URL**: `http://localhost:3000/api/media`

**Authentication**: All endpoints require valid JWT token in `Authorization: Bearer {token}` header

**Content-Type**: `application/json`

**Rate Limits**: Per authorization middleware

## Standard Response Format

### Success Response (200, 201)

```json
{
  "status": "success",
  "message": "Operation description",
  "data": { /* resource or null */ }
}
```

### Error Response (4xx, 5xx)

```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

---

## Endpoints

### 1. Upload Document

**POST** `/upload/document`

Upload a document file directly. File is stored automatically and media record is created in one step.

#### Request

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Body:** Multipart form with `file` field

#### Supported MIME Types
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `text/plain`
- `text/csv`

#### Response (201)

```json
{
  "status": "success",
  "message": "Document uploaded successfully",
  "data": {
    "id": 123,
    "name": "report.pdf",
    "kind": "document",
    "file_url": "http://localhost:3000/uploads/media/documents/file-1704067200000-123456789.pdf",
    "size": 5242880,
    "mime_type": "application/pdf",
    "user_id": 42,
    "project_id": null,
    "tags": null,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z",
    "deleted_at": null
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | - | No file uploaded |
| 400 | - | Unsupported file type |
| 413 | - | File too large |
| 500 | - | Server error |

#### Example

```bash
curl -X POST http://localhost:3000/api/media/upload/document \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "file=@report.pdf"
```

---

### 2. Upload Image

**POST** `/upload/image`

Upload an image file directly. File is stored automatically and media record is created in one step.

#### Request

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Body:** Multipart form with `file` field

#### Supported MIME Types
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

#### Response (201)

```json
{
  "status": "success",
  "message": "Image uploaded successfully",
  "data": {
    "id": 124,
    "name": "photo.jpg",
    "kind": "image",
    "file_url": "http://localhost:3000/uploads/media/images/file-1704067200000-123456789.jpg",
    "size": 2097152,
    "mime_type": "image/jpeg",
    "user_id": 42,
    "project_id": null,
    "tags": null,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z",
    "deleted_at": null
  }
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/media/upload/image \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "file=@photo.jpg"
```

---

### 3. Upload Video

**POST** `/upload/video`

Upload a video file directly. File is stored automatically and media record is created in one step.

#### Request

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Body:** Multipart form with `file` field

#### Supported MIME Types
- `video/mp4`
- `video/mpeg`
- `video/quicktime`
- `video/x-msvideo`
- `video/x-matroska`
- `video/webm`

#### Response (201)

```json
{
  "status": "success",
  "message": "Video uploaded successfully",
  "data": {
    "id": 125,
    "name": "tutorial.mp4",
    "kind": "video",
    "file_url": "http://localhost:3000/uploads/media/videos/file-1704067200000-123456789.mp4",
    "size": 104857600,
    "mime_type": "video/mp4",
    "user_id": 42,
    "project_id": null,
    "tags": null,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z",
    "deleted_at": null
  }
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/media/upload/video \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "file=@tutorial.mp4"
```

---

### 4. Create Media Record

**POST** `/`

Create a media metadata record after successful file upload.

#### Request

**Body:**
```json
{
  "name": "Q4 2024 Financial Report",
  "kind": "document",
  "fileUrl": "http://localhost:3000/uploads/media/document/1704067200000_report.pdf",
  "size": 5242880,
  "mimeType": "application/pdf",
  "tags": ["quarterly", "finance", "2024"],
  "projectId": 42
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | User-friendly name |
| `kind` | enum | Yes | One of: `document`, `image`, `video` |
| `fileUrl` | string | Yes | URL from presign response |
| `size` | number | Yes | File size in bytes |
| `mimeType` | string | Yes | MIME type |
| `tags` | array | No | Array of tag strings |
| `projectId` | number | No | Associated project ID |

#### Response (201)

```json
{
  "status": "success",
  "message": "Media created successfully",
  "data": {
    "id": 123,
    "name": "Q4 2024 Financial Report",
    "kind": "document",
    "file_url": "http://localhost:3000/uploads/media/document/1704067200000_report.pdf",
    "size": 5242880,
    "mime_type": "application/pdf",
    "user_id": 42,
    "project_id": 42,
    "tags": "quarterly,finance,2024",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z",
    "deleted_at": null
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | - | Missing required fields |
| 415 | - | Invalid kind. Must be one of: document, image, video |
| 500 | - | Server error |

---

### 5. List Media

**GET** `/`

List media with optional filters and pagination.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `kind` | enum | - | Filter by: `document`, `image`, `video` |
| `search` | string | - | Search in name or tags |
| `projectId` | number | - | Filter by project ID |
| `page` | number | 1 | Page number (1-based) |
| `limit` | number | 20 | Items per page (max: 100) |

#### Response (200)

```json
{
  "status": "success",
  "message": "Media retrieved successfully",
  "data": {
    "items": [
      {
        "id": 123,
        "name": "Q4 Report",
        "kind": "document",
        "file_url": "http://...",
        "size": 5242880,
        "mime_type": "application/pdf",
        "user_id": 42,
        "project_id": 42,
        "tags": "quarterly,finance",
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T10:00:00Z",
        "deleted_at": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### Examples

```bash
# Get all active documents
curl -X GET "http://localhost:3000/api/media?kind=document" \
  -H "Authorization: Bearer {token}"

# Search media
curl -X GET "http://localhost:3000/api/media?search=invoice" \
  -H "Authorization: Bearer {token}"

# Get project media with pagination
curl -X GET "http://localhost:3000/api/media?projectId=42&page=2&limit=50" \
  -H "Authorization: Bearer {token}"

# Filter by kind and search
curl -X GET "http://localhost:3000/api/media?kind=image&search=product" \
  -H "Authorization: Bearer {token}"
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | - | Invalid kind parameter |
| 400 | - | Invalid pagination parameters |
| 500 | - | Server error |

---

### 6. Get Single Media

**GET** `/:id`

Retrieve a specific media by ID.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Media ID |

#### Response (200)

```json
{
  "status": "success",
  "message": "Media retrieved",
  "data": {
    "id": 123,
    "name": "Q4 Report",
    "kind": "document",
    "file_url": "http://...",
    "size": 5242880,
    "mime_type": "application/pdf",
    "user_id": 42,
    "project_id": 42,
    "tags": "quarterly,finance",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z",
    "deleted_at": null
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | - | Invalid media ID |
| 404 | - | Media not found |
| 500 | - | Server error |

---

### 7. Update Media

**PATCH** `/:id`

Update media metadata (name, tags, project).

#### Request

**Body:**
```json
{
  "name": "Q4 2024 Final Report",
  "tags": ["quarterly", "final", "2024"],
  "projectId": 43
}
```

**Updatable Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Media name |
| `tags` | array | Array of tag strings |
| `projectId` | number | Associated project ID |

#### Response (200)

```json
{
  "status": "success",
  "message": "Media updated successfully",
  "data": {
    "id": 123,
    "name": "Q4 2024 Final Report",
    "kind": "document",
    "file_url": "http://...",
    "size": 5242880,
    "mime_type": "application/pdf",
    "user_id": 42,
    "project_id": 43,
    "tags": "quarterly,final,2024",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-15T14:30:00Z",
    "deleted_at": null
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | - | Invalid media ID |
| 404 | - | Media not found |
| 500 | - | Server error |

---

### 8. Delete Media

**DELETE** `/:id`

Soft delete a media (mark as deleted, keep for audit).

#### Response (200)

```json
{
  "status": "success",
  "message": "Media deleted successfully",
  "data": {
    "id": 123,
    "deletedAt": "2024-01-15T14:35:00Z"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | - | Invalid media ID |
| 404 | - | Media not found |
| 500 | - | Server error |

---

### 9. Get Media Statistics

**GET** `/stats/overview`

Get aggregated media statistics.

#### Response (200)

```json
{
  "status": "success",
  "message": "Statistics retrieved",
  "data": {
    "total": 1250,
    "byKind": {
      "document": 800,
      "image": 350,
      "video": 100
    },
    "totalSize": 52428800000
  }
}
```

---

### 10. Generate Thumbnail

**POST** `/:id/thumbnail`

Queue thumbnail generation for media (images/videos).

#### Response (200)

```json
{
  "status": "success",
  "message": "Thumbnail generation queued",
  "data": {
    "mediaId": 123,
    "status": "processing",
    "message": "Thumbnail generation is processing asynchronously"
  }
}
```

#### Notes

- Currently returns processing status
- In production, implement with ffmpeg (videos) or ImageMagick (images)
- Use job queue for asynchronous processing
- Store thumbnail in separate `media_thumbnails` table

---

### 11. Stream Media

**GET** `/:id/stream`

Get streaming URL with range request support.

#### Response (200)

```json
{
  "status": "success",
  "message": "Stream URL generated",
  "data": {
    "mediaId": 123,
    "streamUrl": "http://localhost:3000/uploads/media/video/...",
    "mimeType": "video/mp4",
    "size": 524288000,
    "supportsRangeRequests": true
  }
}
```

#### Notes

- Currently returns pre-signed URL
- In production, implement actual streaming with range headers
- Support HTTP 206 Partial Content for efficient playback
- Enable seeking in video/audio players

---

## Size Limits by Kind

| Kind | Limit | Use Case |
|------|-------|----------|
| `document` | 50 MB | PDFs, Word, Excel |
| `image` | 10 MB | PNG, JPEG, GIF, WebP |
| `video` | 500 MB | MP4, WebM, MOV |

## MIME Type Restrictions

### Document
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `text/plain`

### Image
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

### Video
- `video/mp4`
- `video/mpeg`
- `video/quicktime`
- `video/x-msvideo`
- `video/webm`

---

## Error Codes Reference

| HTTP Status | Scenario |
|------------|----------|
| 200 | Successful GET or PATCH |
| 201 | Successful POST (create) |
| 400 | Bad request (validation error) |
| 401 | Missing/invalid authentication |
| 404 | Resource not found |
| 413 | Payload too large (over size limit) |
| 415 | Unsupported media type |
| 500 | Server error |

---

## Testing Checklist

- [ ] Upload document (PDF, DOCX)
- [ ] Upload image (JPG, PNG)
- [ ] Upload video (MP4)
- [ ] Verify media record created after upload
- [ ] Verify file stored in correct directory
- [ ] List all media
- [ ] List media by kind (document, image, video)
- [ ] Search media by name/tags
- [ ] Filter media by project
- [ ] Test pagination
- [ ] Get single media
- [ ] Update media metadata
- [ ] Update tags
- [ ] Delete media (soft delete)
- [ ] Verify deleted_at is set
- [ ] Test invalid MIME type (should be rejected)
- [ ] Test oversized file (should be rejected)
- [ ] Test missing auth token (should be 401)
- [ ] Get statistics
- [ ] Verify user_id from JWT is stored
- [ ] Test streaming URL generation
