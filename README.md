# MetaMask + Express Login Example


1. create .env with JWT_SECRET
2. npm install
3. npm run dev
4. open http://localhost:3000


Flow:
- Frontend requests a nonce for the user's address (/auth/nonce)
- Frontend asks MetaMask to sign the nonce
- Frontend sends address+signature to server (/auth/login)
- Server verifies signature, issues JWT cookie
- Dashboard calls /api/me to confirm