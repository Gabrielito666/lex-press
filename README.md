# lex-press

DOCUMENTATION IN PROGRESS

This is a beta version.

---
En modo desarrollo

se buildea todo en .lex y se lanza el server

En modo build
se buildea todo en .lex

En modo start
se lanza el server usando .lex
---

npm run dev
NODE_ENV=dev node index.js

npm run build
BUILD_MODE=true ENTRY_POINT=./index.js node index.js

npm run start
NODE_ENV=production .lex-press/server.js

Debo hacer dos verciones de la libreria. la versión dev y la version prod

la version dev deve compilar reemplazando la dev por la prod.

la version prod no deve tener la posibilidad de bundlear jsx ni el server solo leer el jsx utilizando la cache.