/**
 * @license
 * Copyright 2016 Google Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import { WithParameters } from "#src/chunk_manager/backend.js";
import { WithSharedCredentialsProviderCounterpart } from "#src/credentials_provider/shared_counterpart.js";
import {
    SkeletonSourceParameters,
} from "#src/datasource/trk/base.js";
import type { SkeletonChunk } from "#src/skeleton/backend.js";
import { SkeletonSource } from "#src/skeleton/backend.js";
import { decodeSkeletonChunk } from "#src/skeleton/decode_precomputed_skeleton.js";
import type {
    SpecialProtocolCredentials,
} from "#src/util/special_protocol_request.js";
import { registerSharedObject } from "#src/worker_rpc.js";


console.log(import.meta.url);

@registerSharedObject()
export class trkSkeletonSource extends WithParameters(
    WithSharedCredentialsProviderCounterpart<SpecialProtocolCredentials>()(
        SkeletonSource,
    ),
    SkeletonSourceParameters,
) {
    async download(chunk: SkeletonChunk,
    ) {
        const { parameters } = this;
        
        decodeSkeletonChunk(chunk, parameters.skeletonBuffer, parameters.metadata.vertexAttributes);
    }
}

