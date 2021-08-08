(async function () {
    console.log("[express-postgres-mapbox-example:start]");

    const RESULTS_LIMIT = 3;
    const QUERY_MIN_LENGTH = 3;
    const PATH_COLORS = {
        driving: "green",
        cycling: "blue",
    };

    const { accessToken, center, style, zoom, id } = await fetch(
        "/api/config"
    ).then((response) => response.json());

    const itinerary = await fetch(`/api/itineraries/${id}`).then((response) =>
        response.json()
    );
    const itinieraryId = `itinerary_${itinerary.id}`;

    const { geocoding, directions } = mapboxSdk({ accessToken });
    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
        container: "map",
        style,
        center,
        zoom,
    });

    const $controls = document.querySelector(".controls");
    const $itinerary = $controls.querySelector(".itinerary");
    const $form = $controls.querySelector(".controls form");
    const $input = $form.querySelector('input[name="location"]');
    const $locationCoords = $form.querySelector(
        'input[name="location_coords"]'
    );
    const $suggestions = $form.querySelector(".location-suggestions");
    const $saveButton = $controls.querySelector(".save");

    $controls.querySelector("h1").innerHTML = itinerary.title;

    // this should be throttled, in order not to make too many requests
    $input.addEventListener("input", (event) => {
        const query = event.target.value;
        if (query.length < QUERY_MIN_LENGTH) {
            return;
        }
        geocoding
            .forwardGeocode({ query, limit: RESULTS_LIMIT })
            .send()
            .then((response) => {
                $suggestions.innerHTML = response.body.features
                    .map(
                        ({ place_name, geometry }) =>
                            `<li data-coordinates="${JSON.stringify(
                                geometry.coordinates
                            )}">${place_name}</li>`
                    )
                    .join("\n");
            });
    });

    // set clicked suggestion as selected destination
    $suggestions.addEventListener("click", (event) => {
        const location = event.target.innerText;
        $input.value = location;
        $locationCoords.value = event.target.dataset.coordinates;
        $suggestions.innerHTML = "";
    });

    // close suggestions when clicking outside
    document.addEventListener("click", (event) => {
        if (!event.target.dataset.coordinates) {
            $suggestions.innerHTML = "";
        }
    });

    $form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const profile = event.target.profile.value;
        const location = event.target.location.value;

        // extract coordinates from the hidden field
        let endCoordinates;
        try {
            endCoordinates = JSON.parse(event.target.location_coords.value);
        } catch (error) {
            return;
        }

        const route = await getRoute({
            profile,
            location,
            startCoordinates: getLastStepArrival(),
            endCoordinates,
        });

        if (!route) {
            return;
        }

        const step = {
            type: "Feature",
            geometry: route.geometry,
            properties: {
                name: location,
                profile,
                color: PATH_COLORS[profile] || PATH_COLORS["driving"],
            },
        };

        itinerary.geometry.data.features.push(step);
        map.getSource(itinieraryId).setData(itinerary.geometry.data);

        addDataItem({
            coordinates:
                step.geometry.coordinates[step.geometry.coordinates.length - 1],
            name: step.properties.name,
            map,
            $itinerary,
        });
    });

    $saveButton.addEventListener("click", () => {
        fetch(`/api/itineraries/${itinerary.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ geometry: itinerary.geometry }),
        })
            .then((response) => response.json())
            .then((data) => console.log("[itinerary:save] success!", data))
            .catch((error) => console.error("[itinerary:save]", error));
    });

    map.on("load", () => {
        map.addSource(itinieraryId, itinerary.geometry);
        map.addLayer({
            id: itinieraryId,
            type: "line",
            source: itinieraryId,
            layout: {
                "line-join": "round",
                "line-cap": "round",
            },
            paint: {
                "line-color": ["get", "color"],
                "line-width": 3,
            },
        });
        itinerary.geometry.data.features.forEach(({ geometry, properties }) => {
            const coordinates =
                geometry.type === "Point"
                    ? geometry.coordinates
                    : geometry.coordinates[geometry.coordinates.length - 1];
            addDataItem({
                coordinates,
                name: properties.name,
                map,
                $itinerary,
            });
        });
    });

    async function getRoute({ profile, startCoordinates, endCoordinates }) {
        return directions
            .getDirections({
                profile,
                geometries: "geojson",
                waypoints: [
                    {
                        coordinates: startCoordinates,
                    },
                    {
                        coordinates: endCoordinates,
                    },
                ],
            })
            .send()
            .then((response) => response.body.routes[0]);
    }

    function addDataItem({ coordinates, name, map, $itinerary }) {
        new mapboxgl.Marker().setLngLat(coordinates).addTo(map);
        $itinerary.innerHTML += `<li>${name}</li>`;
    }

    function getLastStepArrival() {
        const { features } = itinerary.geometry.data;
        const lastStep = features[features.length - 1];
        if (lastStep.geometry.type === "Point") {
            return lastStep.geometry.coordinates;
        }
        return lastStep.geometry.coordinates[
            lastStep.geometry.coordinates.length - 1
        ];
    }
})();
