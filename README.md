# lexpress

Este proyecto surge de mi actual hastío de Next.js, que dejo de manifiesto. Estoy cansado de hacer archivos `route.js` que no aceptan *middlewares*, lo que me obliga a importar una gran cantidad de funciones repetitivas en múltiples archivos separados. Si bien me gusta React, últimamente siento que no se ajusta a la regla KISS (*Keep It Simple, Stupid*).

**lexpress** pretende ser un envoltorio para Express con algunos métodos adicionales que aceleran ciertas tareas, con un sistema de soporte nativo para HTML dinámico.

```javascript
    const lexpress = require('lexpress');
    const app = lexpress();

    app.public('my/public/folder');
    app.html.static('/a-custom-route', 'path/to/my/public/html.html');
    app.html.dynamic('/a-custom-route', 'path/to/my/dynamic/html.html', { my : 'dynamic params' });

    app.listen(3000, () => { console.log('Escuchando en el puerto 3000') });
```

Es bastante simple ya que abstrae las rutas públicas.

## app.html.dynamic

Este método es especial. Recibe como tercer parámetro un objeto, una función que retorne un objeto, o una promesa que resuelva un objeto. De esta forma puedes pasar parámetros dinámicos al HTML. Para utilizarlos en el HTML debes hacer lo siguiente:

```html
    <h1><dynamic>nombre_de_mi_parametro</dynamic></h1>
```

Esta etiqueta es un placeholder donde se renderizará el valor de tu objeto. Si como parámetros pasas:

```javascript
    app.html.dynamic('/a-custom-route', 'path/to/my/dynamic/html.html', { nombre_de_mi_parametro : 'Hola Mundo' });
```

Recibirás al otro lado:

```html
    <h1>Hola Mundo</h1>
```

Por ahora solo soporta strings y números.

Además, en el JavaScript del cliente tendrás acceso a estos parámetros con la constante `lexpress.params`:

```javascript
    console.log(lexpress.params.nombre_de_mi_parametro) // imprimiría Hola Mundo
```

En este caso sí podrás acceder a estructuras anidadas, pero no a funciones.

Esto sirve como *server-side rendering*.

Si pasas una promesa o una función (síncrona o asíncrona), esta se resolverá antes de enviarse al cliente para que cuides el tiempo de respuesta. En el caso de utilizar una función, tendrás acceso a `req` y `res` a través de los parámetros, de esta forma puedes utilizar `req.params` y otros datos para tus páginas dinámicas.

También tienes un cuarto parámetro, "onError", que puedes definir si lo deseas. Este recibe un callback que se ejecutará si ocurre un error:

```javascript
    app.html.dynamic(
        '/a-custom-route',
        'path/to/my/dynamic/html.html',
        { nombre_de_mi_parametro : 'Hola Mundo' },
        (err, req, res) => {
            console.log(err);
            res.send('mi respuesta personalizada');
        }
    );
```

Si no utilizas este callback, por defecto se ejecutará `res.status(500)`. De lo contrario, debes manejar la respuesta.

## Métodos adicionales

Finalmente, puedes acceder a los métodos `post`, `put`, `get`, `delete` y `listen` a través de `app`. Si necesitas acceder a un método más específico de Express, tienes la instancia en `app.expressApp`, y la función constructora de Express en `app.express`.

