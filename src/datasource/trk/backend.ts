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



import type { AxiosResponse } from 'axios';
import axios from 'axios';
// import { decodeGzip } from "#src/async_computation/decode_gzip_request.js";
// import { requestAsyncComputation } from "#src/async_computation/request.js";
// import type { Chunk, ChunkManager } from "#src/chunk_manager/backend.js";
import { WithParameters } from "#src/chunk_manager/backend.js";
// import { GenericSharedDataSource } from "#src/chunk_manager/generic_file_source.js";
import { WithSharedCredentialsProviderCounterpart } from "#src/credentials_provider/shared_counterpart.js";
// import type { ShardingParameters } from "#src/datasource/trk/base.js";
import {
    // DataEncoding,
    // ShardingHashFunction,
    SkeletonSourceParameters,
} from "#src/datasource/trk/base.js";
import type { SkeletonChunk } from "#src/skeleton/backend.js";
import { SkeletonSource } from "#src/skeleton/backend.js";
import { decodeSkeletonChunk } from "#src/skeleton/decode_precomputed_skeleton.js";
// import { fetchSpecialHttpByteRange } from "#src/util/byte_range_http_requests.js";
// import type { CancellationToken } from "#src/util/cancellation.js";
// import type { Borrowed } from "#src/util/disposable.js";
// import { convertEndian32, Endianness } from "#src/util/endian.js";
// import { murmurHash3_x86_128Hash64Bits } from "#src/util/hash.js";
// import {
//     isNotFoundError,
//     responseArrayBuffer,
// } from "#src/util/http_request.js";
// import { stableStringify } from "#src/util/json.js";
// import { getObjectId } from "#src/util/object_id.js";
import type {
    SpecialProtocolCredentials,
    // SpecialProtocolCredentialsProvider,
} from "#src/util/special_protocol_request.js";
// import { cancellableFetchSpecialOk } from "#src/util/special_protocol_request.js";
// import { Uint64 } from "#src/util/uint64.js";
import { registerSharedObject } from "#src/worker_rpc.js";


console.log(import.meta.url);

// const shardingHashFunctions: Map<ShardingHashFunction, (out: Uint64) => void> =
//     new Map([
//         [
//             ShardingHashFunction.MURMURHASH3_X86_128,
//             (out) => {
//                 murmurHash3_x86_128Hash64Bits(out, 0, out.low, out.high);
//             },
//         ],
//         [ShardingHashFunction.IDENTITY, (_out) => { }],
//     ]);

// interface ShardInfo {
//     shardUrl: string;
//     offset: Uint64;
// }

// interface DecodedMinishardIndex {
//     data: Uint32Array;
//     shardUrl: string;
// }

// interface MinishardIndexSource
//     extends GenericSharedDataSource<Uint64, DecodedMinishardIndex | undefined> {
//     sharding: ShardingParameters;
//     credentialsProvider: SpecialProtocolCredentialsProvider;
// }

// function getMinishardIndexDataSource(
//     chunkManager: Borrowed<ChunkManager>,
//     credentialsProvider: SpecialProtocolCredentialsProvider,
//     parameters: { url: string; sharding: ShardingParameters | undefined },
// ): MinishardIndexSource | undefined {
//     const { url, sharding } = parameters;
//     if (sharding === undefined) return undefined;
//     const source = GenericSharedDataSource.get<
//         Uint64,
//         DecodedMinishardIndex | undefined
//     >(
//         chunkManager,
//         stableStringify({
//             type: "trk:shardedDataSource",
//             url,
//             sharding,
//             credentialsProvider: getObjectId(credentialsProvider),
//         }),
//         {
//             download: async (
//                 shardAndMinishard: Uint64,
//                 cancellationToken: CancellationToken,
//             ) => {
//                 const minishard = Uint64.lowMask(new Uint64(), sharding.minishardBits);
//                 Uint64.and(minishard, minishard, shardAndMinishard);
//                 const shard = Uint64.lowMask(new Uint64(), sharding.shardBits);
//                 const temp = new Uint64();
//                 Uint64.rshift(temp, shardAndMinishard, sharding.minishardBits);
//                 Uint64.and(shard, shard, temp);
//                 const shardUrl = `${url}/${shard
//                     .toString(16)
//                     .padStart(Math.ceil(sharding.shardBits / 4), "0")}.shard`;
//                 // Retrive minishard index start/end offsets.
//                 const shardIndexSize = new Uint64(16);
//                 Uint64.lshift(shardIndexSize, shardIndexSize, sharding.minishardBits);

//                 // Multiply minishard by 16.
//                 const shardIndexStart = Uint64.lshift(new Uint64(), minishard, 4);
//                 const shardIndexEnd = Uint64.addUint32(
//                     new Uint64(),
//                     shardIndexStart,
//                     16,
//                 );
//                 let shardIndexResponse: ArrayBuffer;
//                 try {
//                     shardIndexResponse = await fetchSpecialHttpByteRange(
//                         credentialsProvider,
//                         shardUrl,
//                         shardIndexStart,
//                         shardIndexEnd,
//                         cancellationToken,
//                     );
//                 } catch (e) {
//                     if (isNotFoundError(e)) return { data: undefined, size: 0 };
//                     throw e;
//                 }
//                 if (shardIndexResponse.byteLength !== 16) {
//                     throw new Error("Failed to retrieve minishard offset");
//                 }
//                 const shardIndexDv = new DataView(shardIndexResponse);
//                 const minishardStartOffset = new Uint64(
//                     shardIndexDv.getUint32(0, /*littleEndian=*/ true),
//                     shardIndexDv.getUint32(4, /*littleEndian=*/ true),
//                 );
//                 const minishardEndOffset = new Uint64(
//                     shardIndexDv.getUint32(8, /*littleEndian=*/ true),
//                     shardIndexDv.getUint32(12, /*littleEndian=*/ true),
//                 );
//                 if (Uint64.equal(minishardStartOffset, minishardEndOffset)) {
//                     return { data: undefined, size: 0 };
//                 }
//                 // The start/end offsets in the shard index are relative to the end of the shard
//                 // index.
//                 Uint64.add(minishardStartOffset, minishardStartOffset, shardIndexSize);
//                 Uint64.add(minishardEndOffset, minishardEndOffset, shardIndexSize);

//                 let minishardIndexResponse = await fetchSpecialHttpByteRange(
//                     credentialsProvider,
//                     shardUrl,
//                     minishardStartOffset,
//                     minishardEndOffset,
//                     cancellationToken,
//                 );
//                 if (sharding.minishardIndexEncoding === DataEncoding.GZIP) {
//                     minishardIndexResponse = (
//                         await requestAsyncComputation(
//                             decodeGzip,
//                             cancellationToken,
//                             [minishardIndexResponse],
//                             new Uint8Array(minishardIndexResponse),
//                         )
//                     ).buffer;
//                 }
//                 if (minishardIndexResponse.byteLength % 24 !== 0) {
//                     throw new Error(
//                         `Invalid minishard index length: ${minishardIndexResponse.byteLength}`,
//                     );
//                 }
//                 const minishardIndex = new Uint32Array(minishardIndexResponse);
//                 convertEndian32(minishardIndex, Endianness.LITTLE);

//                 const minishardIndexSize = minishardIndex.byteLength / 24;
//                 let prevEntryKeyLow = 0;
//                 let prevEntryKeyHigh = 0;
//                 // Offsets in the minishard index are relative to the end of the shard index.
//                 let prevStartLow = shardIndexSize.low;
//                 let prevStartHigh = shardIndexSize.high;
//                 for (let i = 0; i < minishardIndexSize; ++i) {
//                     let entryKeyLow = prevEntryKeyLow + minishardIndex[i * 2];
//                     let entryKeyHigh = prevEntryKeyHigh + minishardIndex[i * 2 + 1];
//                     if (entryKeyLow >= 4294967296) {
//                         entryKeyLow -= 4294967296;
//                         entryKeyHigh += 1;
//                     }
//                     prevEntryKeyLow = minishardIndex[i * 2] = entryKeyLow;
//                     prevEntryKeyHigh = minishardIndex[i * 2 + 1] = entryKeyHigh;
//                     let startLow =
//                         prevStartLow + minishardIndex[(minishardIndexSize + i) * 2];
//                     let startHigh =
//                         prevStartHigh + minishardIndex[(minishardIndexSize + i) * 2 + 1];
//                     if (startLow >= 4294967296) {
//                         startLow -= 4294967296;
//                         startHigh += 1;
//                     }
//                     minishardIndex[(minishardIndexSize + i) * 2] = startLow;
//                     minishardIndex[(minishardIndexSize + i) * 2 + 1] = startHigh;
//                     const sizeLow = minishardIndex[(2 * minishardIndexSize + i) * 2];
//                     const sizeHigh = minishardIndex[(2 * minishardIndexSize + i) * 2 + 1];
//                     let endLow = startLow + sizeLow;
//                     let endHigh = startHigh + sizeHigh;
//                     if (endLow >= 4294967296) {
//                         endLow -= 4294967296;
//                         endHigh += 1;
//                     }
//                     prevStartLow = endLow;
//                     prevStartHigh = endHigh;
//                     minishardIndex[(2 * minishardIndexSize + i) * 2] = endLow;
//                     minishardIndex[(2 * minishardIndexSize + i) * 2 + 1] = endHigh;
//                 }
//                 return {
//                     data: { data: minishardIndex, shardUrl },
//                     size: minishardIndex.byteLength,
//                 };
//             },
//             encodeKey: (key: Uint64) => key.toString(),
//             sourceQueueLevel: 1,
//         },
//     ) as MinishardIndexSource;
//     source.sharding = sharding;
//     source.credentialsProvider = credentialsProvider;
//     return source;
// }

// function findMinishardEntry(
//     minishardIndex: DecodedMinishardIndex,
//     key: Uint64,
// ): { startOffset: Uint64; endOffset: Uint64 } | undefined {
//     const minishardIndexData = minishardIndex.data;
//     const minishardIndexSize = minishardIndexData.length / 6;
//     const keyLow = key.low;
//     const keyHigh = key.high;
//     for (let i = 0; i < minishardIndexSize; ++i) {
//         if (
//             minishardIndexData[i * 2] !== keyLow ||
//             minishardIndexData[i * 2 + 1] !== keyHigh
//         ) {
//             continue;
//         }
//         const startOffset = new Uint64(
//             minishardIndexData[(minishardIndexSize + i) * 2],
//             minishardIndexData[(minishardIndexSize + i) * 2 + 1],
//         );
//         const endOffset = new Uint64(
//             minishardIndexData[(2 * minishardIndexSize + i) * 2],
//             minishardIndexData[(2 * minishardIndexSize + i) * 2 + 1],
//         );
//         return { startOffset, endOffset };
//     }
//     return undefined;
// }

// async function getShardedData(
//     minishardIndexSource: MinishardIndexSource,
//     chunk: Chunk,
//     key: Uint64,
//     cancellationToken: CancellationToken,
// ): Promise<{ shardInfo: ShardInfo; data: ArrayBuffer } | undefined> {
//     const { sharding } = minishardIndexSource;
//     const hashFunction = shardingHashFunctions.get(sharding.hash)!;
//     const hashCode = Uint64.rshift(new Uint64(), key, sharding.preshiftBits);
//     hashFunction(hashCode);
//     const shardAndMinishard = Uint64.lowMask(
//         new Uint64(),
//         sharding.minishardBits + sharding.shardBits,
//     );
//     Uint64.and(shardAndMinishard, shardAndMinishard, hashCode);
//     const getPriority = () => ({
//         priorityTier: chunk.priorityTier,
//         priority: chunk.priority,
//     });
//     const minishardIndex = await minishardIndexSource.getData(
//         shardAndMinishard,
//         getPriority,
//         cancellationToken,
//     );
//     if (minishardIndex === undefined) return undefined;
//     const minishardEntry = findMinishardEntry(minishardIndex, key);
//     if (minishardEntry === undefined) return undefined;
//     const { startOffset, endOffset } = minishardEntry;
//     let data = await fetchSpecialHttpByteRange(
//         minishardIndexSource.credentialsProvider,
//         minishardIndex.shardUrl,
//         startOffset,
//         endOffset,
//         cancellationToken,
//     );
//     if (minishardIndexSource.sharding.dataEncoding === DataEncoding.GZIP) {
//         data = (
//             await requestAsyncComputation(
//                 decodeGzip,
//                 cancellationToken,
//                 [data],
//                 new Uint8Array(data),
//             )
//         ).buffer;
//     }
//     return {
//         data,
//         shardInfo: { shardUrl: minishardIndex.shardUrl, offset: startOffset },
//     };
// }

// function getOrNotFoundError<T>(v: T | undefined) {
//     if (v === undefined) throw new Error("not found");
//     return v;
// }


// async function fetchByUint64(
//     credentialsProvider: SpecialProtocolCredentialsProvider,
//     url: string,
//     chunk: Chunk,
//     minishardIndexSource: MinishardIndexSource | undefined,
//     id: Uint64,
//     cancellationToken: CancellationToken,
// ) {
//     if (minishardIndexSource === undefined) {
//         try {
//             return await cancellableFetchSpecialOk(
//                 credentialsProvider,
//                 `${url}/${id}`,
//                 {},
//                 responseArrayBuffer,
//                 cancellationToken,
//             );
//         } catch (e) {
//             if (isNotFoundError(e)) return undefined;
//             throw e;
//         }
//     }
//     const result = await getShardedData(
//         minishardIndexSource,
//         chunk,
//         id,
//         cancellationToken,
//     );
//     if (result === undefined) return undefined;
//     return result.data;
// }


@registerSharedObject()
export class trkSkeletonSource extends WithParameters(
    WithSharedCredentialsProviderCounterpart<SpecialProtocolCredentials>()(
        SkeletonSource,
    ),
    SkeletonSourceParameters,
) {
    // private minishardIndexSource = getMinishardIndexDataSource(
    //     this.chunkManager,
    //     this.credentialsProvider,
    //     { url: this.parameters.url, sharding: this.parameters.metadata.sharding },
    // );

    async download(chunk: SkeletonChunk,
        // cancellationToken: CancellationToken
    ) {
        const { parameters } = this;
        // const response = getOrNotFoundError(
        //     await fetchByUint64(
        //         this.credentialsProvider,
        //         parameters.url,
        //         chunk,
        //         this.minishardIndexSource,
        //         chunk.objectId,
        //         cancellationToken,
        //     ),
        // );

        // console.log("reponse: ", response);


        let response: AxiosResponse<any, any> | null = null;

        try {
            response = await axios.get("http://127.0.0.1:9123/Users/shrutiv/MyDocuments/GitHub/Neuroglancer-Tractography/src/tract/20240920_163900/1",
                { responseType: 'arraybuffer' });

            if (response && response.data) {
                console.log("1: ", response.data);

                // Create DataView from response.data
                const dv = new DataView(response.data);

                // Read the number of vertices and edges
                const numVertices = dv.getUint32(0, true);
                console.log(numVertices);
                const numEdges = dv.getUint32(4, true);
                console.log(numEdges);
            } else {
                throw new Error("No data received from response.");
            }

        } catch (error) {
            console.error('Error fetching data', error);
        }

        // Only call decodeSkeletonChunk if response is not null
        if (response !== null) {
            console.log("Inside download()");
            decodeSkeletonChunk(chunk, response.data, parameters.metadata.vertexAttributes);
        } else {
            console.error("Cannot call decodeSkeletonChunk, response is null.");
        }
        
    }
}

