(async function () {
	console.log("express-postgis-example");

	const PATH_COLORS = {
		driving: "green",
		cycling: "blue",
	};

	const { accessToken, center } = await axios
		.get("/api/config")
		.then((response) => response.data);

	const itinerary = await axios
		.get("/api/itineraries/1")
		.then((response) => response.data);

	const { geocoding, directions } = mapboxSdk({ accessToken });
	mapboxgl.accessToken = accessToken;

	const map = new mapboxgl.Map({
		container: "map",
		style: "mapbox://styles/mapbox/streets-v11",
		center,
		zoom: 5,
	});

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

	initControls({ geocoding, directions });

	function initControls() {
		const $controls = document.querySelector(".controls");
		const $title = $controls.querySelector("h2");
		const $itinerary = $controls.querySelector(".itinerary");
		const $form = $controls.querySelector(".controls form");
		const $input = $form.querySelector('input[name="location"]');
		const $locationCoords = $form.querySelector(
			'input[name="location_coords"]'
		);
		const $suggestions = $form.querySelector(".location-suggestions");
		const $saveButton = $controls.querySelector(".save");

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

		$suggestions.addEventListener("click", (event) => {
			const location = event.target.innerText;
			$input.value = location;
			$locationCoords.value = event.target.dataset.coordinates;
		});

		$form.addEventListener("submit", (event) => {
			event.preventDefault();
			const profile = event.target.profile.value;
			const location = event.target.location.value;
			let endingCoordinates;

			try {
				endingCoordinates = JSON.parse(event.target.location_coords.value);
			} catch (error) {
				return;
			}

			directions
				.getDirections({
					profile,
					geometries: "geojson",
					waypoints: [
						{
							coordinates:
								steps[steps.length - 1].geometry.coordinates[
									steps[steps.length - 1].geometry.coordinates.length - 1
								],
						},
						{
							coordinates: endingCoordinates,
						},
					],
				})
				.send()
				.then((response) => {
					const { routes } = response.body;

					if (routes.length === 0) {
						return;
					}

					const step = {
						geometry: routes[0].geometry,
						properties: {
							id: steps[steps.length - 1].properties.id + 1,
							name: location,
							profile,
						},
					};

					const { id } = step.properties;
					console.log(step);

					map.addSource(`step_${id}`, {
						type: "geojson",
						data: {
							type: "Feature",
							...step,
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
							"line-color": PATH_COLORS[profile],
							"line-width": 3,
						},
					});

					new mapboxgl.Marker().setLngLat(endingCoordinates).addTo(map);

					steps.push(step);
					$itinerary.innerHTML += `<li>${location}</li>`;
				});
		});

		$saveButton.addEventListener("click", () => {
			axios
				.put("/api/itineraries/1", { steps: steps.slice(1) })
				.then((response) => {
					console.log("[itinerary:save] success!", response.data);
				});
		});

		$title.innerHTML = itinerary.title;

		setTimeout(() => {
			steps.forEach((step) => {
				const { id, name, profile } = step.properties;
				$itinerary.innerHTML += `<li class="start">${name}</li>`;
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
			});
		}, 500);
	}
})();
