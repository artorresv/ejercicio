var express = require('express');
var router = express.Router();
const {Pool} = require('pg');

const db = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'calles_cdmx_osm',
  password: '123456',
  port: 5432,
});

router.get('/route', async (req, res, next) => {
  try{

    if (!req.query.x1){
      res.status(200).send('');
    }
    
    const geom = await db.query({text: `SELECT ST_AsText(ST_Transform(ST_MakeLine(route.geom), 3857)) FROM (
    SELECT geom FROM wrk_fromatob('ways', ${req.query.x1}, ${req.query.y1}, ${req.query.x2}, ${req.query.y2})
	ORDER BY seq) AS route`});
    
    if (geom.rowCount > 0){
      res.status(200).send(geom.rows[0].st_astext);
    }
    else{
      res.status(200).send('');
    }
  } catch(err){
    next(err);
  }
});

router.get('/data', async (req, res, next) => {
  try{
    const feats = {
      "type": "FeatureCollection",
      "features": [],
      "crs": {
        "type": "name",
        "properties":
        {
          "name": "urn:ogc:def:crs:EPSG::3857"
        }
      }
    };
    
    if (!req.query.x1){
      res.status(200).json(feats);
    }
    
    const geom = await db.query({text:
    `SELECT ST_AsGeoJSON(ST_Transform(the_geom, 3857)) as geom, uid, incidentedesagregado as incidente FROM siniestrosviales
     WHERE ST_Intersects(
      ST_Transform(the_geom, 3857),
      (SELECT ST_Buffer(ST_Transform(ST_MakeLine(route.geom), 3857), 50) FROM (
        SELECT geom FROM wrk_fromatob('ways', ${req.query.x1}, ${req.query.y1}, ${req.query.x2}, ${req.query.y2})
        ORDER BY seq) AS route
      ))`
    });
    
    if (geom.rowCount > 0){      
      for (var idx = 0; idx < geom.rows.length; idx++){
        const feat = JSON.parse(geom.rows[idx].geom);
        feats.features.push(
          {
            "type": "Feature",
            "id": geom.rows[idx].uid,
            "geometry": {
              "type": feat.type,
              "coordinates": feat.coordinates
            },
            "geometry_name": "the_geom",
            "properties": {
              "incidente": geom.rows[idx].incidente
            }
          }
        );
      }
      
      res.status(200).json(feats);
    }
    else{
      res.status(200).json(feats);
    }
  } catch(err){
    next(err);
  }
});

module.exports = router;
