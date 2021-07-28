const spicedPg = require("spiced-pg");

const database = process.env.DB || "express-postgis-example";

function getDatabaseURL() {
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}
	const { DATABASE_USERNAME, DATABASE_PASSWORD } = require("./secrets.json");
	return `postgres:${DATABASE_USERNAME}:${DATABASE_PASSWORD}@localhost:5432/${database}`;
}

const db = spicedPg(getDatabaseURL());

console.log(`[express-postgis-example] connecting to ${database}`);

function getItineraryById(id) {
	return db
		.query("SELECT * FROM itineraries WHERE id = $1", [id])
		.then((result) => result.rows[0]);
}

function updateItineraryById({ id, steps }) {
	return db
		.query("UPDATE itineraries SET steps = ($2)::jsonb WHERE id = $1", [
			id,
			JSON.stringify(steps),
		])
		.then((result) => result.rows[0]);
}

module.exports = {
	getItineraryById,
	updateItineraryById,
};
