# Customer-Side Dynamic Blogs Integration Guide

This guide explains how to integrate **dynamic blogs** into the customer-facing application (web or mobile) of the laundry service. Blogs are managed in the Admin Panel and consumed by the customer app via API.

---

## Overview

- **Admin Panel** creates, edits, and deletes blogs.
- **Customer App** fetches and displays blogs (read-only).
- Blogs include: title, description, image, and metadata.

---

## API Endpoints

### Base URL

```
https://prodlaundry.sigisolutions.net/
```

*For development, use your environment variable (e.g. `LAUNDRY_API_BASE_URL`).*

---

### 1. Get All Blogs

Fetches the list of published blogs.

| Method | Endpoint           | Auth   |
|--------|--------------------|--------|
| `GET`  | `/admin/getAllBlogs` | Bearer token (if required) |

**Request Headers (if auth is required):**

```
Authorization: Bearer <accessToken>
ngrok-skip-browser-warning: true   // if using ngrok
```

**Example Request:**

```javascript
const response = await fetch(`${BASE_URL}admin/getAllBlogs`, {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
  },
});
const data = await response.json();
```

---

### 2. Get Blog by ID

Fetches a single blog by its ID (e.g. for a blog detail page).

| Method | Endpoint                 | Auth   |
|--------|--------------------------|--------|
| `GET`  | `/admin/getBlog/:blogId` | Bearer token (if required) |

**Example Request:**

```javascript
const blogId = 1;
const response = await fetch(`${BASE_URL}admin/getBlog/${blogId}`, {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
  },
});
const data = await response.json();
```

> **Note:** If your backend exposes public blog endpoints (e.g. `/api/blogs`, `/customer/blogs`), use those instead. The structure below will be the same.

---

## Response Structure

### GetAllBlogs Response

The API may return blogs in different shapes. Support all of these:

```javascript
// Option 1: blogs in message array
{
  "status": "1",
  "message": [
    {
      "id": 1,
      "title": "How to Choose the Right Laundry Service",
      "description": "Choosing the right laundry service...",
      "image": "/Public/BlogImages/BlogImg-123.png",
      "status": true,
      "createdAt": "2026-02-02T05:07:27.000Z",
      "updatedAt": "2026-02-02T05:07:27.000Z"
    }
  ],
  "statusCode": 200
}

// Option 2: blogs in data.blogs
{
  "data": {
    "blogs": [ /* same structure as above */ ]
  }
}

// Option 3: blogs in data array
{
  "data": [ /* same structure as above */ ]
}
```

### Blog Object Shape

| Field       | Type    | Description                     |
|------------|---------|---------------------------------|
| `id`       | number  | Unique blog ID                  |
| `title`    | string  | Blog title                      |
| `description` | string | Blog content/body             |
| `image`    | string  | Image path (relative or full URL) |
| `status`   | boolean | Whether blog is published      |
| `createdAt`| string  | ISO date string                 |
| `updatedAt`| string  | ISO date string                 |

---

## Helper: Parse Blogs from Response

Use this function to always get an array of blogs:

```javascript
function parseBlogsFromResponse(data) {
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.data?.blogs)) return data.data.blogs;
  if (Array.isArray(data?.blogs)) return data.blogs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
```

---

## Image URL Handling

The `image` field can be:

- **Full URL:** `https://example.com/Public/BlogImages/...`
- **Relative path:** `/Public/BlogImages/BlogImg-123.png`

Use a helper to build the correct URL:

```javascript
const BASE_URL = "https://prodlaundry.sigisolutions.net/";

function getBlogImageUrl(image) {
  if (!image) return ""; // or a placeholder image
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  return `${BASE_URL}${image.replace(/^\//, "")}`;
}
```

---

## Implementation Examples

### React + Fetch

```jsx
import { useState, useEffect } from "react";

const BASE_URL = "https://prodlaundry.sigisolutions.net/";

function parseBlogsFromResponse(data) {
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.data?.blogs)) return data.data.blogs;
  if (Array.isArray(data?.blogs)) return data.blogs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getBlogImageUrl(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${BASE_URL}${image.replace(/^\//, "")}`;
}

export default function BlogList() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const token = localStorage.getItem("accessToken"); // if required
        const res = await fetch(`${BASE_URL}admin/getAllBlogs`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to fetch blogs");
        setBlogs(parseBlogsFromResponse(data));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBlogs();
  }, []);

  if (loading) return <p>Loading blogs...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="blog-grid">
      {blogs.filter((b) => b.status).map((blog) => (
        <article key={blog.id}>
          <img
            src={getBlogImageUrl(blog.image)}
            alt={blog.title}
            width="400"
            height="200"
            style={{ objectFit: "cover" }}
          />
          <h2>{blog.title}</h2>
          <p>{blog.description}</p>
        </article>
      ))}
    </div>
  );
}
```

---

### React + RTK Query

```javascript
// api.js
getAllBlogs: builder.query({
  query: () => ({
    url: "admin/getAllBlogs",
    method: "GET",
  }),
  transformResponse: (response) => {
    if (Array.isArray(response?.message)) return response.message;
    if (Array.isArray(response?.data?.blogs)) return response.data.blogs;
    if (Array.isArray(response?.blogs)) return response.blogs;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  },
}),

getBlogById: builder.query({
  query: (blogId) => ({
    url: `admin/getBlog/${blogId}`,
    method: "GET",
  }),
}),
```

```jsx
// BlogList.jsx
import { useGetAllBlogsQuery } from "./api";

export default function BlogList() {
  const { data: blogs = [], isLoading, error } = useGetAllBlogsQuery();

  const publishedBlogs = blogs.filter((b) => b.status);

  // ... render using getBlogImageUrl for images
}
```

---

### Vanilla JavaScript

```html
<div id="blog-list"></div>

<script>
  const BASE_URL = "https://prodlaundry.sigisolutions.net/";

  function getBlogImageUrl(image) {
    if (!image) return "";
    if (image.startsWith("http")) return image;
    return BASE_URL + image.replace(/^\//, "");
  }

  function parseBlogs(data) {
    if (Array.isArray(data?.message)) return data.message;
    if (Array.isArray(data?.data?.blogs)) return data.data.blogs;
    if (Array.isArray(data?.blogs)) return data.blogs;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  async function loadBlogs() {
    const container = document.getElementById("blog-list");
    container.innerHTML = "<p>Loading...</p>";

    try {
      const res = await fetch(BASE_URL + "admin/getAllBlogs");
      const data = await res.json();
      const blogs = parseBlogs(data).filter((b) => b.status);

      container.innerHTML = blogs
        .map(
          (blog) => `
          <article>
            <img src="${getBlogImageUrl(blog.image)}" alt="${blog.title}" />
            <h2>${blog.title}</h2>
            <p>${blog.description}</p>
          </article>
        `
        )
        .join("");
    } catch (err) {
      container.innerHTML = "<p>Failed to load blogs.</p>";
    }
  }

  loadBlogs();
</script>
```

---

## UI Recommendations

| Page      | Purpose                               | Data Source          |
|-----------|----------------------------------------|----------------------|
| Blog List | Show all published blogs in a grid     | `getAllBlogs`        |
| Blog Detail | Show full blog (title, image, body) | `getBlog/:id`        |

### List Page

- Use a responsive grid (e.g. 3 columns desktop, 2 tablet, 1 mobile).
- Show image, title, and a short description (e.g. first 2 lines).
- Link each card to `/blog/:id` for the detail view.
- Optional: limit description with CSS `line-clamp` or truncate.

### Detail Page

- Full-width or centered layout.
- Large image at top.
- Full description below.
- Optional: `createdAt` or `updatedAt` for dates.

### Image Sizing

- Use fixed height (e.g. 200px) so cards are aligned.
- Use `object-fit: cover` so images don’t stretch.

```css
.blog-image {
  height: 200px;
  width: 100%;
  object-fit: cover;
}
```

---

## Filtering Published Blogs

Only show blogs where `status === true`:

```javascript
const publishedBlogs = blogs.filter((blog) => blog.status);
```

---

## Error Handling

- Handle network errors and show a fallback message.
- Handle empty responses with a “No blogs yet” state.
- If images fail to load, use a placeholder or alt text.

---

## Checklist

- [ ] Add `BASE_URL` (or env variable) for the API.
- [ ] Implement `parseBlogsFromResponse()` for different response shapes.
- [ ] Implement `getBlogImageUrl()` for correct image URLs.
- [ ] Filter by `status === true` for published blogs only.
- [ ] Add loading and error states.
- [ ] Optional: add blog detail page with `getBlog/:id`.
- [ ] Ensure images use `object-fit: cover` for consistent layout.

---

## Questions?

For backend-specific behavior (auth, public vs admin endpoints), check with the API/backend team.
