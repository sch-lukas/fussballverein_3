-- Copyright (C) 2025 - present Dein Name
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- Aufruf:
-- docker compose exec db bash
-- psql --dbname=fussballverein --username=fussballverein --file=/sql/create-table-fussballverein.sql

-- Indexe auflisten:
-- psql --dbname=fussballverein --username=fussballverein
--  SELECT   tablename, indexname, indexdef, tablespace
--  FROM     pg_indexes
--  WHERE    schemaname = 'fussballverein'
--  ORDER BY tablename, indexname;
--  \q

-- Tablespace setzen
SET default_tablespace = fussballvereinspace;

-- Schema
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION fussballverein;

ALTER ROLE fussballverein SET search_path = 'fussballverein';
SET search_path TO 'fussballverein';

-- Fussballverein
CREATE TABLE IF NOT EXISTS fussballverein (
    id               integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    name             text NOT NULL,
    gruendungsdatum  date,
    website          text,
    email            text,
    telefonnummer    text,
    mitgliederanzahl integer,
    erzeugt          timestamp NOT NULL DEFAULT NOW(),
    aktualisiert     timestamp NOT NULL DEFAULT NOW()
);

-- Stadion (1:1 zu Fussballverein)
CREATE TABLE IF NOT EXISTS stadion (
    id                integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    stadt             text NOT NULL,
    strasse           text,
    hausnummer        text,
    kapazitaet        integer NOT NULL,
    fussballverein_id integer NOT NULL UNIQUE REFERENCES fussballverein ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS stadion_fussballverein_id_idx ON stadion(fussballverein_id);

-- Spieler (1:n zu Fussballverein)
CREATE TABLE IF NOT EXISTS spieler (
    id                integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    vorname           text NOT NULL,
    nachname          text NOT NULL,
    alter             integer,
    starker_fuss      text,
    fussballverein_id integer NOT NULL REFERENCES fussballverein ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS spieler_fussballverein_id_idx ON spieler(fussballverein_id);
