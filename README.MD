**PREREQUISITOS**

* ubuntu > 18.04
* docker > 18.06.*
* osmctools:  `sudo apt-get install osmctools`
* osm2pgrouting:  `sudo apt-get install osm2pgrouting`
* psql: `apt-get install postgresql-client-10`

**CLONAR EL REPOSITORIO**

*Asumiendo que este directorio existe y tiene permisos...*

`cd /opt/postgis/ejercicio/`

`git clone https://github.com/artorresv/ejercicio.git`

*Construir la aplicación*

`cd pgrouting-test`

`npm install`

Si todo sale bien el directorio tiene un contenido similar a este:

`ls -lt`

`drwxr-xr-x   5 atorres atorres  4096 Feb 28 05:26 public`

`-rw-rw-r--   1 atorres atorres   326 Feb 28 05:25 package.json`

`-rw-rw-r--   1 atorres atorres  1078 Feb 28 01:21 app.js`

`-rw-rw-r--   1 atorres atorres 35749 Feb 27 22:09 package-lock.json`

`drwxr-xr-x   2 atorres atorres  4096 Feb 27 21:38 routes`

`drwxr-xr-x   2 atorres atorres  4096 Feb 27 20:54 bin`

`drwxr-xr-x   2 atorres atorres  4096 Feb 27 20:54 views`

**INSTALAR POSTGRES/POSTGIS/PGROUTING**

Cambiar al directorio con los datos de prueba:

`cd /opt/postgis/ejercicio/datos`

(La imagen de docker es esta: `https://github.com/Starefossen/docker-pgrouting/`)

Instalar el contenedor:

`docker run --name pgrouting-test --rm -d -P -p 5432:5432 -e POSTGRES_PASSWORD=123456 -d starefossen/pgrouting`

*Verificar que el contenedor funciona:*

`docker image ls`

`REPOSITORY              TAG                 IMAGE ID            CREATED             SIZE`

`starefossen/pgrouting   latest              780a35ec8668        13 days ago         638MB`

`...`

*Para revisar las versiones instaladas:*

`docker image inspect 780a35ec8668`

`  ...`

`  "PG_MAJOR=10",`

`  "PG_VERSION=10.7-1.pgdg90+1",`

`  "PGDATA=/var/lib/postgresql/data",`

`  "POSTGIS_MAJOR=2.5",`

`  "POSTGIS_VERSION=2.5.1+dfsg-1.pgdg90+1",`

`  "PGROUTING_MAJOR=2.5",`

`  "PGROUTING_VERSION=2.5.2"`

`  ...`

*A partir de este punto la base de datos se puede administrar con pgAdmin, con psql desde ubuntu,*
*o bien con psql desde dentro del contenedor:*

`docker run -it --link pgrouting-test:postgres --rm postgres \`
`  sh -c 'exec psql -h "$POSTGRES_PORT_5432_TCP_ADDR" -p "$POSTGRES_PORT_5432_TCP_PORT" -U postgres'`

**PREPARAR DATOS DE CALLES DE OSM**

*Descargar OSM para México, la última versión está actualizada al 2019-02-26T21:14:03Z:*

`wget "https://download.geofabrik.de/north-america/mexico-latest.osm.bz2"`

*Los datos se descomprimen en formato osm (xml), en el archivo "mexico-latest.osm":*

`bzip2 -dk mexico-latest.osm.bz2`

*Limpiar etiquetas no utlizadas y recortar al área de la CDMX:*

`osmconvert mexico-latest.osm --drop-author --drop-version --out-osm --complete-ways -b=-99.3573,19.1322,-98.9433,19.5927 -o=mexico-latest-cdmx.osm`

*Crear base de datos para los datos de OSM y de reportes del C5:*

`psql -h localhost -p 5432 -U postgres -c 'CREATE DATABASE calles_cdmx_osm'`

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres -c 'CREATE EXTENSION postgis'`

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres -c 'CREATE EXTENSION pgRouting'`

*Publicar funciones auxiliares...*

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres -a -f wrk_dijkstra.sql`

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres -a -f wrk_fromAtoB.sql`

*Publicar en "calles_cdmx_osm" los datos de OSM para la CDMX:*

`osm2pgrouting -f mexico-latest-cdmx.osm -c /usr/share/osm2pgrouting/mapconfig.xml -d calles_cdmx_osm -U postgres --clean`

**PREPARAR LOS DATOS DE REPORTES DEL C5**

*Descarga los datos originales:*

`wget -O siniestros.all.csv "https://datos.cdmx.gob.mx/explore/dataset/reportes-de-siniestros-viales-c5/download/?format=csv&timezone=America/Mexico_City&use_labels_for_header=true"`

*Quita la primer fila (los headers):*

`tail -n +2 siniestros.all.csv > siniestros.csv`

*Crear la tabla:*

`psql -h localhost -d calles -p 5432 -U postgres -a -f create.siniestrosviales.sql`

*Copia los registros del csv a la tabla siniestrosviales:*

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres --command "\copy public.siniestrosviales FROM 'siniestros.csv' DELIMITER ';' CSV ENCODING 'UTF8';"`

*Agrega primary key:*

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres -a -f create.primarykey.sql`

*Agregar campo de geometría:*

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres -c 'ALTER TABLE public.siniestrosviales ADD COLUMN the_geom geometry(Point,4326);'`

*Genera la geometría con las columnas correspondientes:*

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres -c "UPDATE public.siniestrosviales SET the_geom = ST_GeomFromText('POINT(' || longitud || ' ' || latitud || ')', 4326);"`

*Crea el índice espacial:*

`psql -h localhost -d calles_cdmx_osm -p 5432 -U postgres -c 'CREATE INDEX siniestrosviales_geom_idx ON public.siniestrosviales USING gist (the_geom) TABLESPACE pg_default;'`

*Respaldar la base de datos:*

`pg_dump -h localhost -d calles_cdmx_osm -p 5432 -U postgres -W -F t > siniestrosviales.db.tar`

**APLICACION WEB**

*Iniciar la aplicación:*

Ir al directorio de la aplicación:

`cd /opt/postgis/ejercicio/pgrouting-test`

Iniciar el servicio:

`DEBUG=myapp:* npm start`

Si todo sale bien debe salir un aviso como este:

`> pgrouting-test@0.0.0 start /opt/postgis/ejercicio/pgrouting-test`

`> node ./bin/www`

Ahora entrar a:

`http://localhost:3000/pgrouting-test.html`

*(Se puede sustituir 'localhost' por la ip, pero hay que cambiar también las ocurrencias*
*de 'localhost' en `./public/pgrouting-test.html`)*

*Uso de la aplicación:*

1. Hacer click en dos ubicaciones distintas (de preferencia no muy retiradas).

Se observaran dos puntos pequeños, con borde rojo y centro blanco:

![paso 1](https://raw.githubusercontent.com/artorresv/ejercicio/master/pgrouting-test/public/images/img_01.png?token=ACEmbZET9rJn0XMuQM3aP52rbRtoBH6Oks5cd-JywA%3D%3D)

Después de algunos segundos se dibuja una línea en color rojo que va del punto incial al punto final:

![paso 2](https://raw.githubusercontent.com/artorresv/ejercicio/master/pgrouting-test/public/images/img_02.png?token=ACEmbYd2lLLLVbtiAuff4ryg4Ip6lBcGks5cd-MRwA%3D%3D)

Esta es la ruta más corta para ir en vehículo desde el punto incial al punto final. Ver los detalles en:

 * (Línea 20) /opt/postgis/ejercicio/pgrouting-test/routes/postgis.js
 * /opt/postgis/ejercicio/datos/wrk_fromAtoB.sql
 
El algoritmo para determinar la ruta y en general todos los detalles se pueden consultar en:

`http://docs.pgrouting.org/2.6/en/pgr_dijkstra.html`

Unos segundos después de que aparezca la ruta, se mostrarán todos los incidentes reportados al C5, en un radio de 50 metros respecto al trazo de la ruta:

![paso 3](https://raw.githubusercontent.com/artorresv/ejercicio/master/pgrouting-test/public/images/img_03.png?token=ACEmbeVX_D4xqnzq5urt9o3cJGUmRZS0ks5cd-NiwA%3D%3D)

Los puntos se agrupan en clusters siempre que la distancia entre ellos sea menor a 20 pixeles.
Ver detalle en:

 * (Línea 83) /opt/postgis/ejercicio/pgrouting-test/public/pgrouting-test.html
 
Para examinar el código que accede a la base de datos ver:

 * (Línea 57, Col. 70) /opt/postgis/ejercicio/pgrouting-test/routes/postgis.js

Hacer zoom en el mapa para ver los puntos de los incidentes más desagrupados:

![paso 4](https://raw.githubusercontent.com/artorresv/ejercicio/master/pgrouting-test/public/images/img_04.png?token=ACEmbbZvHhxRnRZpLtrphsbIqXcGpg_Qks5cd-OewA%3D%3D)
 
2. Para elegir dos nuevos puntos de origen/destino hacer click en el botón 'clear':

![paso 5](https://raw.githubusercontent.com/artorresv/ejercicio/master/pgrouting-test/public/images/img_05.png?token=ACEmbb0-DHzd6wb7hihPDIghsqXv_yMDks5cd-O2wA%3D%3D)

Volver a dar click en dos ubicaciones distintas

**COMENTARIOS FINALES**

* Los datos para calcular las rutas óptimas se tomaron del proyecto OpenStreetMap para México, son la última versión disponible
* Los datos, tanto de OpenStreetMap como del C5 no están "limpios", en general tienen errores e inconsistencias que habría que arreglar para una aplicación real
* Naturalmente, la consulta que la base de datos del C5 se puede personalizar tanto como se quiera, por ejemplo para filtrar los incidentes por fecha, hora, tipo de evento, etc.
* Del mismo modo, la ruta óptima que cálcula la base de datos de calles es solo una de las opciones disponibles, en general:
  * Es posible determinar la ruta óptima para un trayecto en vehículo, caminando, etc.
  * El criterio para determinar la ruta puede ser el tiempo, la distancia o cualquier otra medida de "costo"
* En general la aplicación y los servicios de datos no están optimizados, hay varias cosas que se pueden hacer para mejorar el rendimiento