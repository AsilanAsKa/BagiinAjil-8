# Demo Guide

Энэ guide нь `Donation Auth Module`-ийг presentation эсвэл defense үед demo хийх дарааллыг тайлбарлана.

## Demo Бэлтгэл

Backend dependency суулгах:

```bash
cd backend
npm install
```

Environment file үүсгэх:

```bash
cp .env.example .env
```

`.env` дээр local demo-д дараах тохиргоо байх ёстой:

```env
ENABLE_OTP_DEBUG=true
```

Энэ тохиргоо асаалттай үед register response дээр `devOtp` буцна. Production дээр энэ тохиргоог `false` болгоно.

Server асаах:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## Demo Flow Summary

```text
1. Register user
2. OTP verify
3. Login
4. Access protected profile route
5. Try admin route with donor token
6. Refresh token rotation
7. Logout
8. Try using invalidated refresh token
```

## 1. Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Donor",
    "phone": "+97699112233",
    "email": "donor@example.com",
    "password": "StrongPass123",
    "role": "donor"
  }'
```

Expected result:

- `201 Created`
- User created
- `isVerified: false`
- `devOtp` буцна

Demo тайлбар:

```text
Register хийх үед password bcrypt hash болж хадгалагдана.
Мөн 6 оронтой OTP үүсэж, 2 минутын хугацаатай хадгалагдана.
```

## 2. Verify OTP

Register response дээр ирсэн `devOtp` утгыг ашиглана.

```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "donor@example.com",
    "otp": "123456"
  }'
```

Expected result:

- `200 OK`
- `OTP verified successfully`
- `isVerified: true`

Demo тайлбар:

```text
OTP зөв бол хэрэглэгч verified болно.
OTP expired болсон эсвэл 3 удаа буруу оруулсан бол verify хийх боломжгүй.
```

## 3. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "donor@example.com",
    "password": "StrongPass123"
  }'
```

Expected result:

- `200 OK`
- `accessToken`
- `refreshToken`
- User profile data

Demo тайлбар:

```text
Login амжилттай бол JWT access token болон refresh token үүснэ.
Access token protected route-д ашиглагдана.
Refresh token нь access token шинэчлэхэд ашиглагдана.
```

## 4. Access Protected Profile Route

Login response дээр ирсэн `accessToken`-г ашиглана.

```bash
curl http://localhost:5000/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```

Expected result:

- `200 OK`
- Current user profile

Tokenгүй дуудах demo:

```bash
curl http://localhost:5000/api/users/me
```

Expected result:

```json
{
  "message": "Access token is required"
}
```

## 5. Donor Token-р Admin Route Дуудах

```bash
curl http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <donorAccessToken>"
```

Expected result:

```json
{
  "message": "Forbidden"
}
```

Demo тайлбар:

```text
Энэ нь role-based authorization ажиллаж байгааг харуулна.
Donor role admin endpoint ашиглах эрхгүй тул 403 Forbidden буцна.
```

## 6. Refresh Token Rotation

Login response дээр ирсэн `refreshToken`-г ашиглана.

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

Expected result:

- New `accessToken`
- New `refreshToken`
- Old refresh token invalid болно

Хуучин refresh token-г дахин ашиглах demo:

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<oldRefreshToken>"
  }'
```

Expected result:

```json
{
  "message": "Invalid refresh token"
}
```

## 7. Logout

Шинэ refresh token эсвэл одоо хүчинтэй refresh token ашиглана.

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

Expected result:

```json
{
  "message": "Logout successful"
}
```

Logout дараа refresh хийх:

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<loggedOutRefreshToken>"
  }'
```

Expected result:

```json
{
  "message": "Invalid refresh token"
}
```

## Хамгаалалтын Demo Flow

| Demo алхам | Request | Expected result |
| --- | --- | --- |
| Invalid phone | Register with `phone: "123"` | `400 Validation failed` |
| Duplicate email | Same email-р register хийх | `409 already registered` |
| Wrong OTP | OTP-г 3 удаа буруу оруулах | `423 locked` |
| Wrong password | Login wrong password | `401 Invalid credentials` |
| No token | `/api/users/me` tokenгүй | `401 Access token is required` |
| Non-admin admin route | Donor token-р `/api/admin/users` | `403 Forbidden` |
| Refresh reuse | Old refresh token дахин ашиглах | `401 Invalid refresh token` |
| Logout invalidation | Logout дараа refresh хийх | `401 Invalid refresh token` |

## Test Demo

Automated test ажиллуулах:

```bash
npm test
```

Expected summary:

```text
Test Suites: 1 passed
Tests:       12 passed
```

Test coverage summary:

- Register success
- Duplicate email
- Invalid phone
- OTP verify success
- OTP expired
- OTP 3 failed attempts lock
- Login success
- Wrong password
- Protected route without token
- Admin route blocked for non-admin
- Refresh token rotation
- Logout invalidation
