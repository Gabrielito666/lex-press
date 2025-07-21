# lex-press

DOCUMENTATION IN PROGRESS

This is a beta version.
---
En modo desarrollo

se buildea todo en .lex-press y se lanza el server

En modo build
se buildea todo en .lex-press

En modo start
se lanza el server usando .lex-press
---

npm run dev
NODE_ENV=dev node index.js

npm run build
node node_modules/lex-press/build/index.js [your-entry-point.js]

npm run start
NODE_ENV=production .lex-press/server.js

Debo hacer dos verciones de la libreria. la versión dev y la version prod

la version dev deve compilar reemplazando la dev por la prod.

la version prod no deve tener la posibilidad de bundlear jsx ni el server solo leer el jsx utilizando la cache.