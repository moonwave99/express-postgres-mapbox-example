DROP TABLE IF EXISTS itineraries;

CREATE TABLE itineraries (
    id                          SERIAL PRIMARY KEY,
    title                       VARCHAR(255) NOT NULL,
    start_location_name         VARCHAR(255) NOT NULL,
    start_location_coordinates  real[],
    steps                       jsonb
);

INSERT INTO itineraries (title, start_location_name, start_location_coordinates) VALUES ('My Trip', 'Hamburg, Germany', '{10, 53.55}');