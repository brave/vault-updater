# Brave Auto Update Services

An auto updater service managing update requests from locally installed updaters

## Setup

Clone the repo

Install dependencies `npm install`

## Endpoints

### Public

GET /1/release/:os/:installed_version - get latest release meta-data if newer than installed version

### Start

npm run build && npm start
