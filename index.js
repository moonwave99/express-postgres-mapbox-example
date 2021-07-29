const path = require("path");
const express = require("express");
const { MAPBOX_ACCESS_TOKEN } = require("./secrets.json");
const { getItineraryById, updateItineraryById } = require("./db");

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/api/config", (request, response) => {
    response.json({
        accessToken: MAPBOX_ACCESS_TOKEN,
        center: [11.07778, 49.45278],
        style: "mapbox://styles/mapbox/streets-v11",
        zoom: 5,
    });
});

app.get("/api/itineraries/:id", async (request, response) => {
    const itinerary = await getItineraryById(request.params.id);
    response.json(itinerary || {});
});

app.put("/api/itineraries/:id", async (request, response) => {
    const itinerary = await updateItineraryById({
        id: request.params.id,
        ...request.body,
    });
    response.json(itinerary || {});
});

app.listen(3000, () =>
    console.log("[express-postgres-mapbox-example] Listening on port 3000")
);
