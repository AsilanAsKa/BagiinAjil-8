# API Endpoints

Base URL:

```text
http://localhost:5000
```

Content-Type:

```http
Content-Type: application/json
```

Protected route ашиглах үед:

```http
Authorization: Bearer <accessToken>
```

## Endpoint Summary

| Method | Endpoint | Access | Тайлбар |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Server ажиллаж байгаа эсэх |
| `POST` | `/api/auth/register` | Public | User бүртгэх, OTP үүсгэх |
| `POST` | `/api/auth/verify-otp` | Public, rate limited | OTP баталгаажуулах |
| `POST` | `/api/auth/login` | Public, rate limited | Login хийж token авах |
| `POST` | `/api/auth/refresh` | Public, rate limited | Refresh token rotate хийх |
| `POST` | `/api/auth/logout` | Public | Refresh token invalid хийх |
| `GET` | `/api/users/me` | Authenticated | Current user profile авах |
| `GET` | `/api/admin/users` | Admin only | Бүх user жагсаалт авах |

## GET /health

Server health шалгана.

Response:

```json
{
  "status": "ok"
}
```

## POST /api/auth/register

Шинэ хэрэглэгч бүртгэнэ. Password bcrypt-ээр hash хийгдэж хадгалагдана. Register амжилттай бол OTP үүснэ.

Request:

```json
{
  "name": "Test Donor",
  "phone": "+97699112233",
  "email": "donor@example.com",
  "password": "StrongPass123",
  "role": "donor"
}
```

Allowed roles:

- `donor`
- `campaign_creator`
- `admin`

Success response:

```json
{
  "message": "Registration successful. Verify OTP to activate account.",
  "user": {
    "_id": "user_id",
    "name": "Test Donor",
    "phone": "+97699112233",
    "email": "donor@example.com",
    "role": "donor",
    "isVerified": false
  },
  "devOtp": "123456"
}
```

Note: `devOtp` зөвхөн `NODE_ENV=test` эсвэл `ENABLE_OTP_DEBUG=true` үед буцна.

Possible errors:

| Status | Шалтгаан |
| --- | --- |
| `400` | Validation failed |
| `409` | Email эсвэл phone давхардсан |

## POST /api/auth/verify-otp

Register-ийн дараах OTP-г баталгаажуулна.

Request:

```json
{
  "identifier": "donor@example.com",
  "otp": "123456"
}
```

`identifier` нь email эсвэл phone байж болно.

Success response:

```json
{
  "message": "OTP verified successfully",
  "user": {
    "_id": "user_id",
    "name": "Test Donor",
    "phone": "+97699112233",
    "email": "donor@example.com",
    "role": "donor",
    "isVerified": true
  }
}
```

Possible errors:

| Status | Шалтгаан |
| --- | --- |
| `400` | OTP буруу эсвэл expired |
| `423` | OTP 3 failed attempts дараа locked |
| `429` | Rate limit exceeded |

## POST /api/auth/login

Verified хэрэглэгч email эсвэл phone болон password ашиглан login хийнэ.

Request:

```json
{
  "identifier": "donor@example.com",
  "password": "StrongPass123"
}
```

Success response:

```json
{
  "message": "Login successful",
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "_id": "user_id",
    "name": "Test Donor",
    "phone": "+97699112233",
    "email": "donor@example.com",
    "role": "donor",
    "isVerified": true
  }
}
```

Possible errors:

| Status | Шалтгаан |
| --- | --- |
| `400` | Validation failed |
| `401` | Invalid credentials |
| `403` | OTP verify хийгдээгүй |
| `429` | Rate limit exceeded |

## POST /api/auth/refresh

Refresh token ашиглан шинэ access token болон шинэ refresh token авна. Хуучин refresh token invalid болно.

Request:

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

Success response:

```json
{
  "message": "Token refreshed",
  "accessToken": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

Possible errors:

| Status | Шалтгаан |
| --- | --- |
| `400` | Refresh token request body-д байхгүй |
| `401` | Invalid эсвэл reused refresh token |
| `429` | Rate limit exceeded |

## POST /api/auth/logout

Refresh token-г database-аас устгаж invalid болгоно.

Request:

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

Success response:

```json
{
  "message": "Logout successful"
}
```

Possible errors:

| Status | Шалтгаан |
| --- | --- |
| `400` | Refresh token байхгүй |

## GET /api/users/me

Current authenticated user profile буцаана.

Headers:

```http
Authorization: Bearer <accessToken>
```

Success response:

```json
{
  "user": {
    "_id": "user_id",
    "name": "Test Donor",
    "phone": "+97699112233",
    "email": "donor@example.com",
    "role": "donor",
    "isVerified": true
  }
}
```

Possible errors:

| Status | Шалтгаан |
| --- | --- |
| `401` | Token байхгүй, invalid эсвэл expired |

## GET /api/admin/users

Зөвхөн `admin` role-той хэрэглэгч бүх хэрэглэгчийн жагсаалт авах боломжтой.

Headers:

```http
Authorization: Bearer <adminAccessToken>
```

Success response:

```json
{
  "users": [
    {
      "_id": "user_id",
      "name": "Admin User",
      "phone": "+97699112235",
      "email": "admin@example.com",
      "role": "admin",
      "isVerified": true
    }
  ]
}
```

Possible errors:

| Status | Шалтгаан |
| --- | --- |
| `401` | Token байхгүй, invalid эсвэл expired |
| `403` | User role `admin` биш |
