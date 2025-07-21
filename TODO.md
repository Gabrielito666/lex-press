# TODO

- build

tengo que hacer un script buildeador en lib/builder y luego importarlos en ./build-pages y ./build-server

cosa de que luego se pueda hacer nodemon "node lexpress/build-pages && node index.js" y esto buildee las páginas y luego arranque el server nuevamente.

además este script debe poder recibir como parametros los path de los archivos a buildear.

- podria haber buildOptions tipo.
inline | modules | chunks



- app.html.dynamic(path, ...handlers)

debe permitir construir html dinámico inyectar texto, etc.

antes tenia algo como así

<html>
    <h1><dynamic key="dynamic_title"/></h1>
</html>

y el handler
```javascript
const handler = (req, res) =>
{
    req.dyanmic_keys.dynamic_title = "Este es mi super texto dinámico";
}
app.html.dynamic("page.dynamic.html", handler)
```

y también se podían disponibilizar las keys en un objeto javacript inyectado.

- app.jsx.dynamic(path, ...handlers);

este caso es muy similar acumulas keys en los handlers y luego serán pasados a jsx mediante un hoock

```jsx
import {useDynamic} from "lex-press";

const keys = useDynamic();

return <h1>{keys.dynamic_title}</h1>
```
Esto al usar elementos del backend se buildeara por cada petición entregando al cliente el texto html recien fabricado, lo cual es mas lento que en una página estática pero tiene los beneficios de una página dinámica;