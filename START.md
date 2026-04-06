# Writing Site

## Start the server

Open Terminal, then:

```
cd ~/Documents/writing-website
npm start
```

Then open your browser to:

- **Reader view** → http://localhost:3000  (password: `edmund01`)
- **Admin panel** → http://localhost:3000/admin.html  (password: `12345`)

The server keeps running until you close the Terminal window.

---

## Changing passwords

| Password | File | Where |
|---|---|---|
| Reader lock (`edmund01`) | `public/index.html` | look for `const READER_PASSWORD` near the bottom |
| Admin login (`12345`) | `server.js` | look for `const ADMIN_PASSWORD` near the top |
