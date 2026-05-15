# Module Documentation

## Төслийн Ерөнхий Танилцуулга

`Donation Auth Module` нь онлайн хандивын системийн authentication болон authorization logic-ийг тусгаарласан backend модуль юм. Модуль нь хэрэглэгч бүртгэх, OTP баталгаажуулах, login хийх, JWT token үүсгэх, refresh token ашиглах, logout хийх, profile харах болон role-based access control хийх үүрэгтэй.

Системийн оролцогчид:

- `Guest`: Нэвтрээгүй хэрэглэгч
- `Donor`: Хандивлагч хэрэглэгч
- `Campaign Creator`: Хандивын аян үүсгэгч
- `Admin`: Системийн админ

## Модулийн Зорилго

Модулийн үндсэн зорилго нь хэрэглэгчийн identity-г найдвартай баталгаажуулж, системийн protected resource-ууд руу зөвхөн эрхтэй хэрэглэгч нэвтрэх боломжтой болгох юм.

Энэ зорилгод дараах байдлаар хүрсэн:

- Бүртгэлийн үед email, phone, password, role validation хийх
- Password-г plain text хэлбэрээр хадгалахгүй байх
- OTP ашиглан хэрэглэгчийг баталгаажуулах
- Login-ийн дараа богино хугацааны access token олгох
- Урт хугацааны session-д refresh token ашиглах
- Refresh token-г rotate болон invalidate хийх
- Role бүрийн permission-г middleware түвшинд шалгах

## Folder Structure

```text
donation-auth-module/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   └── db.js
│       ├── controllers/
│       │   ├── adminController.js
│       │   ├── authController.js
│       │   └── userController.js
│       ├── middleware/
│       │   ├── auth.js
│       │   ├── errorHandler.js
│       │   └── validate.js
│       ├── models/
│       │   └── User.js
│       ├── routes/
│       │   ├── adminRoutes.js
│       │   ├── authRoutes.js
│       │   └── userRoutes.js
│       ├── tests/
│       │   └── auth.test.js
│       └── utils/
│           ├── otp.js
│           ├── tokens.js
│           └── validation.js
├── docs/
│   ├── API_ENDPOINTS.md
│   ├── DEMO_GUIDE.md
│   ├── MODULE_DOCUMENTATION.md
│   └── SECURITY_TACTICS.md
└── README.md
```

## Гол Файлуудын Үүрэг

| Файл | Үүрэг |
| --- | --- |
| `backend/src/app.js` | Express app, middleware, routes тохируулах |
| `backend/src/server.js` | Database connect хийж server асаах |
| `backend/src/config/db.js` | MongoDB connection logic |
| `backend/src/models/User.js` | User schema, role, OTP, refresh token model |
| `backend/src/controllers/authController.js` | Register, OTP, login, refresh, logout logic |
| `backend/src/controllers/userController.js` | Profile endpoint logic |
| `backend/src/controllers/adminController.js` | Admin user list endpoint logic |
| `backend/src/middleware/auth.js` | JWT authentication болон role authorization |
| `backend/src/middleware/validate.js` | Validation error response |
| `backend/src/routes/authRoutes.js` | Auth endpoint definitions болон rate limiter |
| `backend/src/utils/otp.js` | OTP үүсгэх, OTP policy constants |
| `backend/src/utils/tokens.js` | JWT sign/verify, refresh token hash |
| `backend/src/tests/auth.test.js` | Integration tests |

## Ашигласан Технологи

| Технологи | Ашигласан шалтгаан |
| --- | --- |
| Node.js | JavaScript backend runtime |
| Express | REST API хурдан, ойлгомжтой байгуулах |
| MongoDB | User authentication data хадгалах |
| Mongoose | Schema validation, model abstraction |
| bcrypt | Password болон OTP secure hash хийх |
| jsonwebtoken | JWT access болон refresh token үүсгэх |
| express-validator | Request body validation |
| express-rate-limit | Login/OTP brute-force эрсдэлийг бууруулах |
| helmet | Security HTTP headers тохируулах |
| cors | Frontend/API origin тохируулах |
| Jest | Test runner |
| Supertest | Express endpoint integration test |
| mongodb-memory-server | Test database-г isolated ажиллуулах |

## Authentication Flow

```text
1. User register хийнэ
2. Server password-г bcrypt-ээр hash хийнэ
3. Server 6 оронтой OTP үүсгэнэ
4. User OTP verify хийнэ
5. User email/phone + password ашиглан login хийнэ
6. Server access token болон refresh token үүсгэнэ
7. User protected route руу Bearer access token-той request явуулна
8. Access token expire бол refresh token ашиглан шинэ token авна
9. Refresh үед refresh token rotate хийгдэнэ
10. Logout үед refresh token invalid болно
```

## OTP Verification Flow

```text
Register
  -> 6 оронтой OTP үүснэ
  -> OTP hash database-д хадгалагдана
  -> OTP expiresAt = одоогийн цаг + 2 минут

Verify OTP
  -> identifier email эсвэл phone-оор user хайна
  -> OTP locked эсэхийг шалгана
  -> OTP expire болсон эсэхийг шалгана
  -> bcrypt.compare ашиглаж OTP шалгана
  -> зөв бол user.isVerified = true
  -> буруу бол attempts нэмэгдэнэ
  -> attempts 3 хүрвэл locked = true
```

## Role-Based Authorization

Role-based authorization нь `authenticate` болон `authorizeRoles` middleware-ээр хэрэгжсэн.

Protected route flow:

```text
Authorization header
  -> Bearer token шалгах
  -> JWT verify хийх
  -> User database-аас хайх
  -> req.user дээр user оноох
  -> route handler ажиллах
```

Admin-only route flow:

```text
GET /api/admin/users
  -> authenticate
  -> authorizeRoles('admin')
  -> role admin биш бол 403 Forbidden
  -> role admin бол users list буцаана
```

Role тайлбар:

| Role | Эрх |
| --- | --- |
| `guest` | Public endpoint ашиглана. Database role биш. |
| `donor` | Register, OTP verify, login, profile access хийх боломжтой |
| `campaign_creator` | Authenticated хэрэглэгчийн эрхтэй. Цааш campaign module-д өргөтгөхөд бэлэн |
| `admin` | Admin-only route ашиглах эрхтэй |

## Project Ажиллуулах

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default server:

```text
http://localhost:5000
```

Environment variables:

| Нэр | Тайлбар |
| --- | --- |
| `PORT` | API server port |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `ACCESS_TOKEN_TTL` | Access token хүчинтэй хугацаа |
| `REFRESH_TOKEN_TTL` | Refresh token хүчинтэй хугацаа |
| `CORS_ORIGIN` | Зөвшөөрөх frontend origin |
| `ENABLE_OTP_DEBUG` | Local demo үед OTP-г response дээр харуулах эсэх |

## Test Ажиллуулах

```bash
cd backend
npm test
```

Test result summary:

```text
Test Suites: 1 passed
Tests:       12 passed
```

Covered test cases:

| Test | Тайлбар |
| --- | --- |
| register success | Зөв payload-оор user үүсэх |
| duplicate email | Давхардсан email reject хийх |
| invalid phone | Буруу phone validation error өгөх |
| OTP verify success | Зөв OTP user-г verified болгох |
| OTP expired | Expired OTP reject хийх |
| OTP 3 failed attempts | 3 буруу оролдлогын дараа lock хийх |
| login success | Verified user login хийж token авах |
| wrong password | Буруу password reject хийх |
| protected route without token | Token байхгүй үед 401 өгөх |
| admin route blocked for non-admin | Donor admin route ашиглах үед 403 өгөх |
| refresh token rotates and invalidates old token | Refresh token rotation шалгах |
| logout invalidates refresh token | Logout дараа refresh token хүчингүй болох |
