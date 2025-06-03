# LINC Deployment of Neuroglancer

Neuroglancer is deployed purely as a client-side, static application for the LINC project. The reason behind this is to serve and store the Neuroglancer application behind a permissioned AWS CloudFront distribution. This distribution sits in front of an S3 bucket -- the same bucket that also contains all assets for the LINC project (`zarr`, `nifti`, etc.)

## How to deploy:

In LINC's S3 bucket (for example below, `linc-brain-mit-prod-us-east-2`) -- specifically not the `cloudfront` directory:

```
------------------------------------
|        Contents of bucket        |
+----------------------------------+
|  blobs/                          |
|  cloudfront/                     |
|  dandisets/                      |
|  docker_volume_backups/          |
|  fossil_backups/                 |
|  linc-brain-mit-prod-us-east-2/  |
|  neuroglancer_trk/               |
|  niivue/                         |
|  postgres_backups/               |
|  zarr/                           |
+----------------------------------+
```

and within that directory, a few levels down (in `.../cloudfront/frontend/`) -- you'll see a full static build of Neuroglancer (stemning from the `index.html`):

```
----------------------------------------------------------------------------------------------
|                               Contents of /cloudfront/frontend                             |
+----------------------------------------------------+----------------------------+----------+
|                         Key                        |       LastModified         |  Size    |
+----------------------------------------------------+----------------------------+----------+
|  cloudfront/frontend/09f21dcf7b4f13e8.wasm         |  2025-02-11T13:45:09.000Z  |  151589  |
|  cloudfront/frontend/112.fe0b76f4697cb87e.js       |  2025-02-11T13:45:11.000Z  |  84309   |
|  cloudfront/frontend/112.fe0b76f4697cb87e.js.map   |  2025-02-11T13:45:11.000Z  |  442824  |
|  cloudfront/frontend/174.50e353543e20d218.js       |  2025-02-11T13:45:13.000Z  |  747543  |
|  cloudfront/frontend/174.50e353543e20d218.js.map   |  2025-02-11T13:45:15.000Z  |  786449  |
|  cloudfront/frontend/213.4a5fe3423d30be26.js       |  2025-02-11T13:45:15.000Z  |  17690   |
|  cloudfront/frontend/213.4a5fe3423d30be26.js.map   |  2025-02-11T13:45:15.000Z  |  123283  |
|  cloudfront/frontend/265.02b479273a64f2b3.js       |  2025-02-11T13:45:16.000Z  |  239516  |
|  cloudfront/frontend/265.02b479273a64f2b3.js.map   |  2025-02-11T13:45:17.000Z  |  1031405 |
|  cloudfront/frontend/67.daf941485dbf09ec.js        |  2025-02-11T13:45:09.000Z  |  71655   |
|  cloudfront/frontend/67.daf941485dbf09ec.js.map    |  2025-02-11T13:45:10.000Z  |  420835  |
|  cloudfront/frontend/733.3e4d41581f5b1eae.js       |  2025-02-11T13:45:18.000Z  |  603525  |
|  cloudfront/frontend/733.3e4d41581f5b1eae.js.map   |  2025-02-11T13:45:18.000Z  |  647224  |
|  cloudfront/frontend/753.8b11e508e3f78b43.js       |  2025-02-11T13:45:19.000Z  |  40557   |
|  cloudfront/frontend/753.8b11e508e3f78b43.js.map   |  2025-02-11T13:45:19.000Z  |  209141  |
|  cloudfront/frontend/822.35ff5cd70d7770dd.js       |  2025-02-11T13:45:20.000Z  |  7879    |
|  cloudfront/frontend/822.35ff5cd70d7770dd.js.map   |  2025-02-11T13:45:20.000Z  |  39622   |
|  cloudfront/frontend/946.8bc3d103485f753a.js       |  2025-02-11T13:45:21.000Z  |  221006  |
|  cloudfront/frontend/946.8bc3d103485f753a.js.map   |  2025-02-11T13:45:22.000Z  |  1487379 |
|  cloudfront/frontend/bossauth.html                 |  2025-02-11T13:45:23.000Z  |  668     |
|  cloudfront/frontend/def6161ec2354b02.wasm         |  2025-02-11T13:45:23.000Z  |  43596   |
|  cloudfront/frontend/e431fe7ba8d0a870.wasm         |  2025-02-11T13:45:24.000Z  |  44088   |
|  cloudfront/frontend/ee0bb2246382b92e.wasm         |  2025-02-11T13:45:27.000Z  |  2183240 |
|  cloudfront/frontend/google_oauth2_redirect.html   |  2025-02-11T13:45:27.000Z  |  602     |
|  cloudfront/frontend/index.html                    |  2025-02-11T13:45:28.000Z  |  425     |
|  cloudfront/frontend/main.91d107a2a722000c.css     |  2025-02-11T13:45:04.000Z  |  76060   |
|  cloudfront/frontend/main.91d107a2a722000c.css.map |  2025-02-11T13:45:04.000Z  |  131410  |
|  cloudfront/frontend/main.91d107a2a722000c.js      |  2025-02-11T13:45:06.000Z  |  1194942 |
|  cloudfront/frontend/main.91d107a2a722000c.js.map  |  2025-02-11T13:45:09.000Z  |  5195450 |
+----------------------------------------------------+----------------------------+----------+
```

These files are generated via the standard build process that `Neuroglancer` offers -- as noted in the `build` scripts command in Neuroglancer's `package.json`: https://github.com/google/neuroglancer/blob/master/package.json#L23

## Running npm run build from neuroglancer's root

To create the file structre above, you would need to be in the root directory of `neuroglancer` where the `package.json` is.

You may have to conform to the proper `node` version locally in order to build the static `dist/` folder that will eventually be present to deploy Neuroglancer.

You'll notice in the `package.json`, there is a prescribed `engines` entry, such as:

```
"engines": {
    "node": ">=22"
},
```

Prior to running `npm run build`, you may want to use `nvm` or a similar tool to make a `node>=22` environment locally.

Lastly, once you are within a `node>=22`, you may want a clean `node_modules` install, where you would simply run `npm i`

After these steps, `npm run build` should (hopefully) work!

## Issuance of presigned cookies

In order for a user to access the Neuroglancer, they must have so-called presigned cookies that are currently issued via an endpoint on LINC Archive's website -- these cookies can either be retrieved via the UI or directly at the endpoint of `https://api.lincbrain.org/api/permissions/s3/`

Once receiving the cookies, you should see the following entries:

```
CloudFront-Key-Pair-Id
CloudFront-Policy
CloudFront-Signature
```

These cookies will only be visible when on a `*.lincbrain.org` URL, as they should have the `SameSite=True` attribute.










