# Brave Auto Update Services

Auto updater service managing update requests from locally installed updaters

## Setup

Clone the repo

Install dependencies `npm install`

## Start

`npm start`

## Environment variables

```
MLAB_URI:               URL to Mongo [required]
CLOUDAMQP_URL:          URL to RabbitMQ [required]

FIXIE_URL:              URL to fixie [optional]
PAPERTRAIL_API_TOKEN:   Papertrail API token [optional]

S3_CRASH_KEY:           S3 crash key [required]
S3_CRASH_SECRET:        S3 crash secret [required]
S3_CRASH_BUCKET:        S3 crash bucket name [default]
S3_CRASH_REGION:        us-east-1 [default]

FEATURE_REFERRAL_PROMO: If set request will be proxied to the referral promo for the download endpoints [optional]
BEHIND_FASTLY:          If set the IP address sent to the referral promo will be in the second in the list rather than the first [optional]
S3_DOWNLOAD_BUCKET:     S3 download bucket name [default]
S3_DOWNLOAD_KEY:        S3 download key [required if FEATURE_REFERRAL_PROMO set]
S3_DOWNLOAD_SECRET:     S3 download secret [required if FEATURE_REFERRAL_PROMO set]
```
