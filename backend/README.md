# Tonasco Jig Backend

Google Sheet columns expected in A:H:
Part number | Register ID | Machine | Bin Number | Status | Who Borrow? | Date Borrow | Date Return

Railway variables required:
GOOGLE_SHEET_ID
GOOGLE_SHEET_TAB
GOOGLE_CLIENT_EMAIL
GOOGLE_PRIVATE_KEY
FRONTEND_ORIGIN=https://prof-aiman.github.io

Endpoints:
GET /api/health
GET /api/jigs?partNumber=T0017986
POST /api/jigs
PATCH /api/jigs/:registerId/borrow
PATCH /api/jigs/:registerId/return

Never upload the Google service-account JSON/private key to GitHub.
