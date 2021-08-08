# Express-postgres-mapbox example

![Example screenshot](/screenshot.png)

## Starting

First, create and populate the db:

```
$ createdb express-postgres-mapbox-example
$ npm run db:init
```

Then create a `secrets.json` file with:

```json
{
    "DATABASE_USERNAME": "your database username",
    "DATABASE_PASSWORD": "your database password",
    "MAPBOX_ACCESS_TOKEN": "your mapbox access token"
}
```

Finally:

```
$ npm start
```

And visit http://localhost:3000!

## Storing GeoJSON inside the database

Since we need it just for storage and not for querying, the [`jsonb` postgres type][jsonb] is enough:

```js
function updateItineraryById({ id, steps }) {
    return db
        .query(
            "UPDATE itineraries SET steps = ($2)::jsonb WHERE id = $1 RETURNING *",
            [id, JSON.stringify(steps)]
        )
        .then((result) => result.rows[0]);
}
```

[jsonb]: https://www.postgresql.org/docs/12/functions-json.html
