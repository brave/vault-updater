# Brave Auto Update Services

Auto updater service managing update requests from locally installed updaters

## Setup

Clone the repo

Install dependencies `npm install`

## Endpoints

GET /1/release/{platform}/{version} - get latest release meta-data if newer than installed version

GET /latest/osx - redirect to the latest OSx dmg installer
GET /latest/winx64 - redirect to the latest Windows setup file

## Starting locally

You will want rabbitmq and mongodb installed 

`npm start`


## Starting with docker-compose

Install docker compose with

```
pip install docker-compose
```

then just type
```
docker-compose up
```

To bring up the server. It will run on 8192


## Update and verification steps

`node tools/update.js --version=X.X.X --notes="Release notes" --overwrite`
`node tools/uploader.js --source=/path/to/browser-laptop --send`
`npm run verify`

## Test

`npm run build && npm test`

## Environment variables

Required

```S3_CRASH_KEY - AWS provided credentials key
S3_CRASH_SECRET - AS provided credentials secret
MONGOLAB_URI - Mongo format connection URI```

Defaults

```S3_CRASH_REGION - defaults to 'us-east-1'
S3_CRASH_BUCKET - defaults to 'crashes'```

Optional

```IGNORE_S3 - If set, turns off S3 crash mini dump storage```
