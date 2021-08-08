DROP TABLE IF EXISTS itineraries;

CREATE TABLE itineraries (
    id                          SERIAL PRIMARY KEY,
    title                       VARCHAR(255) NOT NULL,
    geometry                    jsonb
);

INSERT INTO itineraries (title, geometry)
VALUES ('My Trip', '
{
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": [{
        	"type": "Feature",
                "geometry": {
                "type": "Point",
                "coordinates": [10, 53.55]
            },
            "properties": {
                "name": "Hamburg, Germany"
            }
        }]
    }
}
');