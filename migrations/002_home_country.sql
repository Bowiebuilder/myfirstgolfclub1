-- Migration: add homeCountry column to submissions
ALTER TABLE submissions ADD COLUMN homeCountry TEXT;
