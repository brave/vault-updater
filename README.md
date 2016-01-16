# Brave Auto Update Services

Auto updater service managing update requests from locally installed updaters

## Setup

Clone the repo

Install dependencies `npm install`

## Endpoints

GET /1/release/{platform}/{version} - get latest release meta-data if newer than installed version

## Start

`npm run build && npm start`

## Update

`node tools/update.js --version=X.X.X --notes="Release notes" --overwrite`

## Verification

`npm run verify`
