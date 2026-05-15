# Donation Auth Module

`Donation Auth Module` нь “Хандивын систем”-ийн хэрэглэгчийн бүртгэл, нэвтрэлт, OTP баталгаажуулалт, JWT authentication, refresh token rotation, logout, profile access болон role-based authorization-ийг хариуцсан backend модуль юм.

Энэ модуль нь `Donor`, `Campaign Creator`, `Admin`, `Guest` оролцогчтой онлайн хандивын системд зориулсан бөгөөд Node.js, Express, MongoDB, Mongoose технологи дээр хэрэгжсэн.

## Модулийн Зорилго

Хандивын системд хэрэглэгчийг аюулгүй бүртгэх, баталгаажуулах, нэвтрүүлэх, session/token удирдах, мөн role бүрийн эрхийг backend түвшинд хамгаалах.

Үндсэн боломжууд:

- Хэрэглэгч бүртгэх
- 6 оронтой OTP үүсгэх, шалгах
- OTP-г 2 минутын хүчинтэй хугацаатай болгох
- OTP-г 3 удаа буруу оруулахад lock хийх
- Email эсвэл утасны дугаараар login хийх
- JWT access token үүсгэх
- Refresh token rotation болон invalidation хийх
- Logout хийх
- Profile харах
- Admin-only route хамгаалах

## Documentation

| Баримт | Тайлбар |
| --- | --- |
| [Module Documentation](docs/MODULE_DOCUMENTATION.md) | Төслийн бүтэц, flow, role authorization, ажиллуулах заавар |
| [API Endpoints](docs/API_ENDPOINTS.md) | Endpoint бүрийн request, response, access rule |
| [Security Tactics](docs/SECURITY_TACTICS.md) | Хэрэгжүүлсэн хамгаалалтын тактикууд |
| [Demo Guide](docs/DEMO_GUIDE.md) | Presentation/demo хийх дараалал |

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

## Ашигласан Технологи

| Технологи | Үүрэг |
| --- | --- |
| Node.js | Backend runtime |
| Express | REST API framework |
| MongoDB | User, OTP, refresh token хадгалах database |
| Mongoose | MongoDB schema/model layer |
| bcrypt | Password болон OTP hash хийх |
| JSON Web Token | Access token болон refresh token үүсгэх |
| express-validator | Input validation |
| express-rate-limit | Login, OTP, refresh endpoint rate limiting |
| helmet | HTTP security headers |
| cors | Cross-origin request тохиргоо |
| Jest | Automated test framework |
| Supertest | API integration testing |
| mongodb-memory-server | Test environment-д in-memory MongoDB |

## API Товч Танилцуулга

Base URL:

```text
http://localhost:5000
```

| Method | Endpoint | Access | Тайлбар |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Хэрэглэгч бүртгэх, OTP үүсгэх |
| `POST` | `/api/auth/verify-otp` | Public | OTP баталгаажуулах |
| `POST` | `/api/auth/login` | Public | Email/phone + password ашиглан login хийх |
| `POST` | `/api/auth/refresh` | Public | Refresh token rotate хийж шинэ token авах |
| `POST` | `/api/auth/logout` | Public | Refresh token invalid хийх |
| `GET` | `/api/users/me` | Authenticated | Нэвтэрсэн хэрэглэгчийн profile авах |
| `GET` | `/api/admin/users` | Admin only | Бүх хэрэглэгчийн жагсаалт авах |
| `GET` | `/health` | Public | Server health шалгах |

Дэлгэрэнгүй API documentation: [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)

## Authentication Flow

```text
Register
  -> OTP үүснэ
  -> OTP verify
  -> Login
  -> Access token + refresh token авна
  -> Protected route ашиглана
  -> Refresh token rotate хийнэ
  -> Logout үед refresh token invalid болно
```

## Security Tactics

Энэ модуль дараах хамгаалалтын тактикуудыг хэрэгжүүлсэн:

- bcrypt password hashing
- JWT access token
- Refresh token rotation/invalidation
- OTP 2 минут хүчинтэй
- OTP 3 failed attempts lock
- Input validation
- Rate limiting
- Helmet security headers
- CORS тохиргоо

Дэлгэрэнгүй: [docs/SECURITY_TACTICS.md](docs/SECURITY_TACTICS.md)

## Project Ажиллуулах

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Server default port:

```text
http://localhost:5000
```

Local demo хийх үед `.env.example` дотор `ENABLE_OTP_DEBUG=true` байгаа тул register response дээр `devOtp` буцна. Production орчинд үүнийг `false` болгоно.

## Test Ажиллуулах

```bash
cd backend
npm test
```

Test summary:

```text
Test Suites: 1 passed
Tests:       12 passed
```

Covered tests:

- register success
- duplicate email
- invalid phone
- OTP verify success
- OTP expired
- OTP 3 failed attempts
- login success
- wrong password
- access protected route without token
- admin route blocked for non-admin
- refresh token rotates and invalidates old token
- logout invalidates refresh token

## Demo Flow

Presentation дээр дараах дарааллаар demo хийхэд тохиромжтой:

1. Register хийх
2. Response-оос `devOtp` авах
3. OTP verify хийх
4. Login хийж access token, refresh token авах
5. `/api/users/me` protected route дуудах
6. Donor эрхээр `/api/admin/users` дуудаж blocked болохыг харуулах
7. Refresh token rotate хийх
8. Logout хийж refresh token invalid болохыг харуулах

Дэлгэрэнгүй demo guide: [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md)

## PDF Documentation Үүсгэх

Professional PDF documentation нь [docs/PROJECT_DOCUMENTATION.html](docs/PROJECT_DOCUMENTATION.html) source-оос Google Chrome headless print engine ашиглан үүсгэгдсэн.

PDF файл:

```text
docs/PROJECT_DOCUMENTATION.pdf
```

PDF-г дахин generate хийх команд:

```bash
google-chrome \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --no-pdf-header-footer \
  --print-to-pdf=docs/PROJECT_DOCUMENTATION.pdf \
  docs/PROJECT_DOCUMENTATION.html
```

Энэ арга нь markdown documentation-ийн агуулгыг styled HTML layout болгон нэгтгээд PDF болгож хэвлэдэг тул simple text export биш, presentation-ready project documentation гаргана.
