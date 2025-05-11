# Scraper FullStack Morocco

A web scraping tool designed to collect and aggregate full-stack developer job listings from various Moroccan job portals.

## Description

This project scrapes job posting websites in Morocco for full-stack developer positions. It extracts relevant information such as job title, company name, location, salary (when available), job description, and requirements. The data can be exported in various formats for analysis or job hunting purposes.

## Features

-   Scrapes multiple job portals in Morocco
-   Collects full-stack developer job listings
-   Extracts detailed job information
-   Filters results based on criteria like experience level, skills, etc.
-   Exports data to JSON, CSV, or Excel format
-   Avoids duplicate listings

## Technologies Used

-   Node.js
-   Puppeteer/Cheerio for web scraping
-   Express.js (if API endpoints are included)
-   MongoDB/SQLite (for data storage)

## Installation

1. Clone this repository:

    ```
    git clone https://github.com/marouaneMJH/agencies-scraping
    cd scraper-fullstack-morocco
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Create necessary data directories:

    ```
    mkdir -p src/data src/data/sort-list
    ```

4. Configure environment variables by creating a `.env` file based on `.env.example`

## Usage

### Running the Scraper

To start scraping job listings, run:

```
    npm run start
```
