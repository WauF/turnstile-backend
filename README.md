# MODULE_4_BACKEND_DATABASE: Backend & Database Module

## Module Purpose
This module provides the central REST API, database access, and PPE entry decision data flow for the turnstile system.

## Authors
- Ahmet Emre Kurt (Student ID: 220104004016)
- H. Elyesa Yesilyurt (Student ID: 210104004080)

## Dependencies
- Internal modules:
  - Module 1 (AI Detection Module): sends detected PPE list used in access decisions
  - Module 3 (Raspberry Pi / Turnstile Flow): calls RFID lookup and entry-log endpoints
  - Module 5 (Admin Panel): uses worker, role, and reporting endpoints
- Runtime and libraries:
  - Node.js 20.x
  - Express 5.x
  - Prisma ORM
  - PostgreSQL
  - CORS
  - Helmet
  - dotenv
  - swagger-ui-express
  - @aws-sdk/client-s3 (Cloudflare R2 integration)
  - bcryptjs (admin password hashing)
  - jsonwebtoken (JWT validation and signing)
  - multer (multipart/form-data image uploads)

## API Documentation
The interactive API documentation is available at `/docs` (using Swagger UI) and the raw OpenAPI specification is available at `/openapi.json`.

## Quick-Start Integration Example
The example below shows a minimal C++ client integration that calls two core public APIs: RFID card lookup and entry-log write. These device-facing endpoints do not require JWT authentication headers.

```cpp
#include <curl/curl.h>
#include <iostream>
#include <string>

int main() {
    CURL* curl = curl_easy_init();
    if (!curl) return 1;

    // 1) Lookup worker by RFID card UID
    curl_easy_setopt(curl, CURLOPT_URL, "{BACKEND_API_URL}/api/workers/card/A3F2C1D4");
    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "Lookup request failed: " << curl_easy_strerror(res) << "\n";
        curl_easy_cleanup(curl);
        return 1;
    }

    // 2) Write entry log (minimal payload)
    const char* payload =
        "{"
        "\"worker_id\":1,"
        "\"rfid_uid_scanned\":\"A3F2C1D4\","
        "\"result\":\"PASS\","
        "\"detections\":[{"
        "\"ppe_item_id\":1,\"was_required\":true,\"was_detected\":true,\"confidence\":0.97"
        "}]"
        "}";

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_URL, "{BACKEND_API_URL}/api/entry-logs");
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload);

    res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "Entry-log request failed: " << curl_easy_strerror(res) << "\n";
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return 0;
}
```

## API Summary
Public interface for this module is the REST API below. Admin endpoints require a Bearer token (`Authorization: Bearer <token>`) obtained via the authentication endpoints.

| Public Function (Endpoint) | Auth Required | Parameters | Return Value / Behavior |
|---|---|---|---|
| GET /api/health | No | None | 200 JSON: status, timestamp |
| POST /api/auth/signup | No | Body: `SignUpRequest` (email, password, name) | 201 JSON: Admin user profile and JWT |
| POST /api/auth/login | No | Body: `LoginRequest` (email, password) | 200 JSON: Admin user profile and JWT |
| GET /api/auth/me | Yes | None | 200 JSON: Current authenticated admin profile |
| GET /api/workers | Yes | Query: `is_active` (bool, optional), `role_id` (int, optional) | 200 JSON: WorkersListResponse |
| POST /api/workers | Yes | Body: `CreateWorkerRequest` | 201 JSON: WorkerSingleResponse; errors 404, 409, 422 |
| GET /api/workers/{id} | Yes | Path: `id` (int) | 200 JSON: WorkerSingleResponse; 404 ErrorEnvelope |
| PUT /api/workers/{id} | Yes | Path: `id` (int), Body: `UpdateWorkerRequest` | 200 JSON: WorkerSingleResponse; errors 404, 409 |
| DELETE /api/workers/{id} | Yes | Path: `id` (int) | 200 JSON: Soft-delete/deactivate worker (clears RFID UID) |
| DELETE /api/workers/{id}/permanent | Yes | Path: `id` (int) | 200 JSON: Hard-delete worker record from DB and profile photo from R2 |
| POST /api/workers/{id}/photo | Yes | Path: `id` (int), Multipart Body: `photo` (file, max 5MB) | 200 JSON: WorkerSingleResponse with R2 photo URL |
| DELETE /api/workers/{id}/photo | Yes | Path: `id` (int) | 200 JSON: Worker profile photo deletion from R2 |
| GET /api/workers/digital-twin/{id} | Yes | Path: `id` (int) | 200 JSON: WorkerDigitalTwinResponse (compliance stats and 10 latest entry logs) |
| GET /api/workers/card/{uid} | No | Path: `uid` (string) | 200 JSON: WorkerCardLookupResponse; 404 ErrorEnvelope (Public RPi endpoint) |
| POST /api/rfid/scan | No | Body: `RfidScanRequest` (rfid, timestamp) | 201 JSON: RfidScanResponse (Stores latest scanned RFID card UID) |
| GET /api/rfid/scan | No | None | 200 JSON: RfidScanResponse (Retrieves latest scanned RFID card UID) |
| GET /api/roles | Yes | None | 200 JSON: RolesListResponse |
| POST /api/roles | Yes | Body: `CreateRoleRequest` | 201 JSON: RoleSingleResponse; errors 409, 422 |
| GET /api/roles/{id}/ppe | Yes | Path: `id` (int) | 200 JSON: RolePpeResponse; 404 ErrorEnvelope |
| PUT /api/roles/{id}/ppe | Yes | Path: `id` (int), Body: `ppe_item_ids` (int[]) | 200 JSON: RolePpeResponse; errors 404, 422 |
| GET /api/ppe-items | Yes | None | 200 JSON: PpeItemsListResponse |
| GET /api/ppe-items/{id} | Yes | Path: `id` (int) | 200 JSON: PpeItemSingleResponse; 404 ErrorEnvelope |
| POST /api/entry-logs | No | Body: `CreateEntryLogRequest` | 201 JSON: EntryLogCreateResponse; 422 ErrorEnvelope (Public RPi endpoint) |
| GET /api/entry-logs | Yes | Query: `worker_id`, `result`, `start_date`, `end_date`, `limit`, `offset` | 200 JSON: EntryLogsListResponse |
| GET /api/entry-logs/stats | Yes | Query: `start_date`, `end_date` | 200 JSON: EntryLogStatsResponse |

## Known Limitations and TODOs
- Access decision comparison logic depends on consistent PPE item keys between AI labels and database `item_key` values.
- Add idempotency strategy for repeated entry-log submissions from unstable network clients.
- Add request-rate limiting and audit trails for admin write operations.
- Add integration tests that validate Module 3 and Module 5 workflows over local network.

## Version History
This section mirrors module-level API/header changelog intent.

| Version | Date | Changes |
|---|---|---|
| 1.4.0 | 2026-06-03 | Added worker digital twin endpoint (`GET /api/workers/digital-twin/{id}`), RFID scan endpoints (`POST/GET /api/rfid/scan`), hard-delete worker endpoint (`DELETE /api/workers/{id}/permanent`) with Cloudflare R2 cleanup, automatic worker reactivation on RFID card assignment, and optional RFID card UID for workers. |
| 1.3.0 | 2026-05-17 | Added Cloudflare R2 integration for worker profile photo upload and delete endpoints (`POST/DELETE /api/workers/{id}/photo`). Implemented JWT authentication routes (`/api/auth/signup`, `/api/auth/login`, `/api/auth/me`) and middleware to secure admin panel operations. |
| 1.2.0 | 2026-03-28 | Added `daily_data` field to `/api/entry-logs/stats` response. |
| 1.1.0 | 2026-03-28 | Added Swagger UI integration (`/docs`) and confirmed endpoint contracts set in OpenAPI, including worker, role, PPE, and entry-log routes. |
| 1.0.0 | 2026-03-20 | Initial backend/database module baseline: REST server, schema, and core data models. |
