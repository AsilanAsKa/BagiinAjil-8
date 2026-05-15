# Security Tactics

Энэ баримт нь `Donation Auth Module` дээр хэрэгжүүлсэн хамгаалалтын тактикуудыг тайлбарлана.

## Security Overview

Модуль нь authentication болон authorization хэсэгт нийтлэг гардаг дараах эрсдэлүүдийг бууруулах зорилготой:

- Plain text password хадгалах
- Token hijacking болон refresh token reuse
- OTP brute-force attack
- Invalid input-оор database/API logic эвдэх
- Login brute-force attack
- Protected route руу tokenгүй нэвтрэх
- Admin route руу энгийн хэрэглэгч нэвтрэх
- Browser security header дутуу байх
- CORS буруу тохиргоо

## bcrypt Password Hashing

Password-г database-д plain text хэлбэрээр хадгалахгүй.

Implementation:

- Register үед `bcrypt.hash(password, 12)` ашиглана
- Login үед `bcrypt.compare(password, user.password)` ашиглана
- `password` field нь Mongoose schema дээр `select: false`

Үр дүн:

- Database leak болсон ч хэрэглэгчийн password шууд ил болохгүй
- Password comparison secure hash дээр хийгдэнэ

## JWT Access Token

Login амжилттай бол access token үүснэ.

Access token payload:

```json
{
  "sub": "user_id",
  "role": "donor"
}
```

Implementation:

- `jsonwebtoken.sign` ашиглана
- Secret нь `JWT_ACCESS_SECRET`
- Default TTL нь `15m`
- Protected route дээр `Authorization: Bearer <token>` header шалгана

Үр дүн:

- API request бүр user identity болон role мэдээлэлтэй баталгаажна
- Богино хугацааны token ашигласнаар stolen token-ийн эрсдэл багасна

## Refresh Token Rotation / Invalidation

Refresh token нь access token expire болсон үед шинэ token авахад ашиглагдана.

Implementation:

- Refresh token JWT хэлбэрээр үүснэ
- Database-д refresh token raw value биш, SHA-256 hash хадгалагдана
- Refresh endpoint дуудагдах үед хуучин refresh token устаж, шинэ refresh token үүснэ
- Logout үед refresh token hash database-аас устна
- Хуучин refresh token дахин ашиглавал `401 Invalid refresh token`

Үр дүн:

- Refresh token reuse attack илүү хязгаарлагдана
- Logout хийсний дараа session үргэлжлэхгүй
- Database leak болсон ч raw refresh token ил болохгүй

## OTP 2 Минут Хүчинтэй

Register-ийн дараа 6 оронтой OTP үүснэ.

Implementation:

- OTP 6 digit random code байна
- OTP hash database-д хадгалагдана
- `expiresAt = Date.now() + 2 minutes`
- Verify үед current time `expiresAt`-аас хэтэрсэн эсэхийг шалгана

Үр дүн:

- OTP удаан хугацаанд хүчинтэй үлдэхгүй
- Хуучин OTP ашиглан account verify хийх боломжгүй

## OTP 3 Failed Attempts Lock

OTP-г brute-force хийхээс хамгаалж failed attempts limit хэрэгжүүлсэн.

Implementation:

- User model дээр `otp.attempts` хадгална
- Буруу OTP бүр дээр attempts нэмэгдэнэ
- Attempts 3 хүрвэл `otp.locked = true`
- Locked болсон OTP дахин verify хийх боломжгүй

Response:

```json
{
  "message": "OTP is locked after 3 failed attempts"
}
```

Үр дүн:

- 6 оронтой OTP-г олон удаа таах боломж хязгаарлагдана

## Input Validation

Request body дээр validation хийгдэнэ.

Implementation:

- `express-validator` ашигласан
- Email format шалгана
- Phone format шалгана
- Password minimum length шалгана
- Role зөв утгатай эсэхийг шалгана
- OTP 6 digit эсэхийг шалгана

Validation error response:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Invalid phone number"
    }
  ]
}
```

Үр дүн:

- Буруу, incomplete, malicious input API logic руу орохоос өмнө reject хийгдэнэ

## Rate Limiting

Sensitive endpoint-ууд дээр request limit тавьсан.

Rate limited endpoints:

| Endpoint | Limit |
| --- | --- |
| `/api/auth/login` | 15 минутанд 10 request |
| `/api/auth/refresh` | 15 минутанд 10 request |
| `/api/auth/verify-otp` | 5 минутанд 5 request |

Implementation:

- `express-rate-limit` ашигласан
- Standard rate limit headers идэвхтэй
- Test environment дээр automated test-д саад болохгүйгээр skip хийсэн

Үр дүн:

- Login brute-force attack буурна
- OTP brute-force attack буурна
- Refresh endpoint abuse буурна

## Helmet Security Headers

Express app дээр `helmet()` middleware ашигласан.

Үр дүн:

- Browser security headers нэмэгдэнэ
- Common web attack surface багасна
- Default Express response илүү secure болно

## CORS Тохиргоо

CORS нь frontend origin-ийг тохируулахад ашиглагдана.

Implementation:

```js
cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
})
```

Local development:

```env
CORS_ORIGIN=http://localhost:3000
```

Production зөвлөмж:

- `CORS_ORIGIN=*` ашиглахгүй
- Зөвхөн production frontend domain-г зөвшөөрөх
- Credential ашиглаж байгаа бол trusted origin заавал тохируулах

## Protected Data Exposure Control

Sensitive fields default query дээр буцахгүй.

Schema дээр:

- `password`: `select: false`
- `otp.codeHash`: `select: false`
- `refreshTokens`: `select: false`

Response дээр:

- `toSafeObject()` ашиглаж password, OTP, refresh token мэдээллийг устгана

Үр дүн:

- API response дээр password hash, OTP hash, refresh token hash алдагдахгүй

## Security Demo Points

Presentation дээр дараах хамгаалалтуудыг шууд харуулж болно:

| Demo | Хүлээгдэх үр дүн |
| --- | --- |
| Invalid phone register | `400 Validation failed` |
| Duplicate email register | `409 already registered` |
| Wrong OTP 3 удаа | `423 locked` |
| Wrong password login | `401 Invalid credentials` |
| `/api/users/me` tokenгүй | `401 Access token is required` |
| Donor-р `/api/admin/users` | `403 Forbidden` |
| Refresh token reuse | `401 Invalid refresh token` |
| Logout дараа refresh хийх | `401 Invalid refresh token` |
