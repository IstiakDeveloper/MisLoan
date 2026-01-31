# API Documentation

## Base URL
```
http://block.mousumibd.org/api
```

## Authentication APIs

### 1. Login (POST)
**Endpoint:** `/api/auth/login`

**Request:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": 1,
            "name": "John Doe",
            "email": "user@example.com",
            "photo": null,
            "branch_id": 1,
            "branch": { ... }
        },
        "token": "1|abc123..."
    }
}
```

### 2. Register (POST)
**Endpoint:** `/api/auth/register`

**Request:**
```json
{
    "name": "John Doe",
    "email": "user@example.com",
    "password": "password123",
    "branch_id": 1
}
```

### 3. Get Current User (GET)
**Endpoint:** `/api/auth/user`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "John Doe",
        "email": "user@example.com",
        "branch": { ... }
    }
}
```

### 4. Logout (POST)
**Endpoint:** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

---

## Branch APIs (Protected - Require Token)

### 1. Get All Branches (GET)
**Endpoint:** `/api/branches`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `search` - Search by name, code, address
- `sort_by` - Sort field (branch_name, branch_code, address, created_at)
- `sort_direction` - asc/desc
- `per_page` - Items per page (default: 15)
- `all=true` - Get all without pagination

**Examples:**
```
GET /api/branches
GET /api/branches?search=dhaka
GET /api/branches?sort_by=branch_name&sort_direction=desc
GET /api/branches?all=true
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "branch_name": "Dhaka Branch",
            "branch_code": "DH001",
            "address": "Dhaka, Bangladesh"
        }
    ],
    "pagination": {
        "current_page": 1,
        "per_page": 15,
        "total": 50,
        "last_page": 4
    }
}
```

### 2. Get Single Branch (GET)
**Endpoint:** `/api/branches/{id}`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

### 3. Create Branch (POST)
**Endpoint:** `/api/branches`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request:**
```json
{
    "branch_name": "Dhaka Branch",
    "branch_code": "DH001",
    "address": "Dhaka, Bangladesh"
}
```

### 4. Update Branch (PUT/PATCH)
**Endpoint:** `/api/branches/{id}`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request:**
```json
{
    "branch_name": "Updated Name",
    "address": "New Address"
}
```

### 5. Delete Branch (DELETE)
**Endpoint:** `/api/branches/{id}`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

---

## Usage from Other Projects

### Step 1: Login and Get Token
```javascript
const response = await fetch('http://block.mousumibd.org/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password'
    })
});

const data = await response.json();
const token = data.data.token;
// Store token in localStorage or state
```

### Step 2: Use Token for Other APIs
```javascript
const response = await fetch('http://block.mousumibd.org/api/branches', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    }
});

const branches = await response.json();
```

### Step 3: Check if User is Logged In
```javascript
const response = await fetch('http://block.mousumibd.org/api/auth/user', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    }
});

if (response.ok) {
    const user = await response.json();
    // User is logged in
} else {
    // Redirect to login
}
```

---

## Important Notes

1. **Token Storage:** Token টা অন্য project এ localStorage বা sessionStorage তে store করুন
2. **Auto Login:** প্রতিবার API call করার আগে token check করুন
3. **CORS:** `.env` file এ `SANCTUM_STATEFUL_DOMAINS` add করুন যদি same domain না হয়
4. **Headers:** সব API call এ `Accept: application/json` header দিন
