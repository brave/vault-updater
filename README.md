# Brave Auto Update Services

Auto updater service managing update requests from locally installed updaters

## Setup

Clone the repo

Install dependencies `npm install`

## Endpoints

GET /1/release/{platform}/{version} - get latest release meta-data if newer than installed version

GET /latest/osx - redirect to the latest OSx dmg installer
GET /latest/winx64 - redirect to the latest Windows setup file

## Start

`npm run build && npm start`

## Update and verification steps

`node tools/update.js --version=X.X.X --notes="Release notes" --overwrite`
`node tools/uploader.js --source=/path/to/browser-laptop --send`
`npm run verify`
