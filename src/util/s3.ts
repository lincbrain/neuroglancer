import type { CancellationToken } from "#src/util/cancellation.js";
import { uncancelableToken } from "#src/util/cancellation.js";
import type { ResponseTransform } from "#src/util/http_request.js";
import { cancellableFetchOk } from "#src/util/http_request.js";
import { getS3CompatiblePathCompletions } from "#src/util/s3_bucket_listing.js";

const NEUROGLANCER_BASE_URL = process.env.NEUROGLANCER_BASE_URL || 'https://neuroglancer.lincbrain.org'; // Default to the original URL if MY_ENV_VAR is not set

// Support for s3:// special protocol.
export async function cancellableFetchS3Ok<T>(
  bucket: string,
  path: string,
  requestInit: RequestInit,
  transformResponse: ResponseTransform<T>,
  cancellationToken: CancellationToken = uncancelableToken,
) {
  if (bucket.includes('s3')) {
    return await cancellableFetchOk(
      `https://${bucket}${path}`,
      requestInit,
      transformResponse,
      cancellationToken,
    );
  } else {
    return await cancellableFetchOk(
      `${NEUROGLANCER_BASE_URL}${path}`,
      requestInit,
      transformResponse,
      cancellationToken,
    );
  }
}

export async function getS3PathCompletions(
  bucket: string,
  path: string,
  cancellationToken: CancellationToken,
) {
  if (bucket.includes('s3')) {
    return await getS3CompatiblePathCompletions(
      undefined,
      `s3://${bucket}`,
      `https://${bucket}.s3.amazonaws.com`,
      path,
      cancellationToken,
    );
  } else {
    return await getS3CompatiblePathCompletions(
      undefined,
      NEUROGLANCER_BASE_URL,
      NEUROGLANCER_BASE_URL,
      path,
      cancellationToken,
    );
  }
}
