# Tonasco Jig Management - Angular Frontend

Responsive Angular frontend scaffold for the Tonasco Jig Management system.

## Included
- Responsive desktop/mobile home page
- Professional Tonasco-style UI
- “Smart System” status chip
- Part-number search form
- Add Inventory page
- Angular Router
- HttpClient configuration
- Jig API service scaffold
- Railway API URL environment placeholder

## Run locally
```bash
npm install
npm start
```
Then open `http://localhost:4200`.

## Connect Railway backend
Edit:
`src/environments/environment.ts`

Replace:
```ts
apiUrl: 'https://YOUR-RAILWAY-BACKEND.up.railway.app/api'
```
with the real Railway backend URL.

Expected future endpoints:
- `GET /api/jigs?partNumber=...`
- `POST /api/jigs`

## Push to GitHub
```bash
git clone https://github.com/Prof-Aiman/Tonasco.git
cd Tonasco
# Copy these project files into the repository folder, then:
git add .
git commit -m "Initialize Angular jig management frontend"
git push origin main
```

## Note
The connected GitHub integration currently has read access but returned HTTP 403 when attempting to create files. Once GitHub write access is enabled for the integration, the project can be pushed directly by ChatGPT.
