
# CostCutter REST API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

This API uses GitHub OAuth for authentication.

### Login with GitHub

**GET** `/auth/github`

Initiates GitHub OAuth login.

### GitHub OAuth Callback

**GET** `/auth/github/callback`

Callback URL for GitHub OAuth. Redirects to the dashboard on successful authentication.

### Logout

**GET** `/logout`

Logs out the user and redirects to the home page.

## Endpoints

### Home

**GET** `/`

Returns a welcome message and a link to login with GitHub.

#### Response

```
<h1>Welcome to My Node App</h1>
<a href="/auth/github">Login with GitHub</a>
```

### Dashboard

**GET** `/dashboard`

Returns a dashboard view with a list of items for the authenticated user.

#### Response

```html
<h1>Hello {username}, welcome to your dashboard!</h1>
<table border="1">
  <tr>
    <th>ID</th>
    <th>Description</th>
    <th>Cost</th>
    <th>Date</th>
    <th>URL</th>
  </tr>
  {items.map(item => `
    <tr>
      <td>{item.id}</td>
      <td>{item.description}</td>
      <td>{item.cost}</td>
      <td>{item.date.toISOString().split('T')[0]}</td>
      <td><a href="{item.url}" target="_blank">Link</a></td>
    </tr>
  `).join('')}
</table>
<a href="/submit-url">Submit URL</a>
<a href="/logout">Logout</a>
```

### Submit URL Form

**GET** `/submit-url`

Returns a form for submitting a URL to extract item details.

#### Response

```html
<h1>Submit a URL</h1>
<form action="/add-url" method="POST">
  <label for="url">URL:</label>
  <input type="text" id="url" name="url" required>
  <button type="submit">Submit</button>
</form>
<a href="/dashboard">Back to Dashboard</a>
```

### Add Item via URL

**POST** `/add-url`

Extracts item details from the provided URL using the OpenAI API and adds the item to the database.

#### Request

```json
{
  "url": "string"
}
```

#### Response

**201 Created**

```json
{
  "id": "string",
  "description": "string",
  "cost": number,
  "date": "string",
  "url": "string",
  "userId": "string"
}
```

**400 Bad Request**

```json
{
  "message": "Error message",
  "error": "Detailed error message"
}
```

### Add Item Directly

**POST** `/add-item`

Adds an item to the database with the provided details.

#### Request

```json
{
  "description": "string",
  "cost": "number",
  "url": "string"
}
```

#### Response

**201 Created**

```json
{
  "id": "string",
  "description": "string",
  "cost": number,
  "date": "string",
  "url": "string",
  "userId": "string"
}
```

**400 Bad Request**

```json
{
  "message": "Error message",
  "error": "Detailed error message"
}
```

## Error Handling

All endpoints may return the following error responses:

**401 Unauthorized**

```json
{
  "message": "Unauthorized"
}
```

**500 Internal Server Error**

```json
{
  "message": "Internal Server Error"
}
```

## Example Usage

### Example cURL Request to `/add-item`

```bash
curl -X POST http://localhost:3000/add-item \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<YOUR_SESSION_COOKIE>" \
  -d '{
    "description": "Sample Item",
    "cost": "15.00",
    "url": "http://example.com/item"
  }'
```

### Example cURL Request to `/add-url`

```bash
curl -X POST http://localhost:3000/add-url \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<YOUR_SESSION_COOKIE>" \
  -d '{
    "url": "https://www.amazon.com/Anker-Bi-Directional-Switcher-Compatible-Projector/dp/B0CJT6JBM8/?_encoding=UTF8&pd_rd_w=QyQuL&content-id=amzn1.sym.f8fbf489-893c-481c-b7fa-18e0b0ecaa0c%3Aamzn1.symc.a68f4ca3-28dc-4388-a2cf-24672c480d8f&pf_rd_p=f8fbf489-893c-481c-b7fa-18e0b0ecaa0c&pf_rd_r=422GTW005B9YJRKKYWDW&pd_rd_wg=gNpfN&pd_rd_r=0de7d2f7-3493-4cb7-8743-118b29fd3954&ref_=pd_hp_d_atf_ci_mcx_mr_ca_hp_atf_d&th=1"
  }'
```

Replace `<YOUR_SESSION_COOKIE>` with your actual session cookie value obtained from the login process.
