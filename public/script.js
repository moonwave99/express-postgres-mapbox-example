(async function () {
    console.log("[express-postgres-mapbox-example:start]");

    const PATH_COLORS = {
        driving: "green",
        cycling: "blue",
    };

    const { accessToken, center, style, zoom } = await axios
        .get("/api/config")
        .then((response) => response.data);

    const itinerary = await axios
        .get("/api/itineraries/1")
        .then((response) => response.data);

    const { geocoding, directions } = mapboxSdk({ accessToken });
    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
        container: "map",
        style,
        center,
        zoom,
    });

    // the first step is the itinerary start location
    const steps = [
        {
            properties: {
                id: 1,
                name: itinerary.start_location_name,
            },
            geometry: {
                coordinates: [itinerary.start_location_coordinates],
            },
        },
        ...(itinerary.steps || []),
    ];

    const $controls = document.querySelector(".controls");
    const $itinerary = $controls.querySelector(".itinerary");
    const $form = $controls.querySelector(".controls form");
    const $input = $form.querySelector('input[name="location"]');
    const $locationCoords = $form.querySelector(
        'input[name="location_coords"]'
    );
    const $suggestions = $form.querySelector(".location-suggestions");
    const $saveButton = $controls.querySelector(".save");

    $controls.querySelector("h2").innerHTML = itinerary.title;

    // this should be throttled, in order not to make too many requests
    $input.addEventListener("input", (event) => {
        const query = event.target.value;
        if (query.length < 3) {
            return;
        }
        geocoding
            .forwardGeocode({ query, limit: 3 })
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
            geometry: route.geometry,
            properties: {
                id: getNextStepId(),
                name: location,
                profile,
            },
        };

        addStepToMap(step);
        steps.push(step);
    });

    $saveButton.addEventListener("click", () => {
        // exclude the first step from the steps
        // because it is the start location
        axios
            .put("/api/itineraries/1", { steps: steps.slice(1) })
            .then((response) =>
                console.log("[itinerary:save] success!", response.data)
            )
            .catch((errror) => console.error("[itinerary:save]", error));
    });

    map.on("load", () => steps.forEach(addStepToMap));

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

    function addStepToMap(step) {
        const { id, profile, name } = step.properties;
        map.addSource(`step_${id}`, {
            type: "geojson",
            data: {
                type: "Feature",
                ...step.geometry,
            },
        });
        map.addLayer({
            id: `step_${id}`,
            type: "line",
            source: `step_${id}`,
            layout: {
                "line-join": "round",
                "line-cap": "round",
            },
            paint: {
                "line-color": PATH_COLORS[profile || "driving"],
                "line-width": 3,
            },
        });
        new mapboxgl.Marker()
            .setLngLat(
                step.geometry.coordinates[step.geometry.coordinates.length - 1]
            )
            .addTo(map);
        $itinerary.innerHTML += `<li>${name}</li>`;
    }

    function getNextStepId() {
        return steps[steps.length - 1].properties.id + 1;
    }

    function getLastStepArrival() {
        const lastStep = steps[steps.length - 1];
        return lastStep.geometry.coordinates[
            lastStep.geometry.coordinates.length - 1
        ];
    }
})();
