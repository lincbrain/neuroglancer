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


import type { ChunkManager } from "#src/chunk_manager/frontend.js";
import { WithParameters } from "#src/chunk_manager/frontend.js";
import {
    emptyValidCoordinateSpace,
    makeCoordinateSpace,
    makeIdentityTransform,
} from "#src/coordinate_transform.js";
import { WithCredentialsProvider } from "#src/credentials_provider/chunk_source_frontend.js";
import type {
    CompleteUrlOptions,
    DataSource,
    DataSubsourceEntry,
    GetDataSourceOptions,
} from "#src/datasource/index.js";
import { DataSourceProvider, RedirectError } from "#src/datasource/index.js";
import type {
    SkeletonMetadata,
} from "#src/datasource/trk/base.js";
import {
    SkeletonSourceParameters,
} from "#src/datasource/trk/base.js";
import { TrackProcessor } from "#src/datasource/trk/reader/trackProcessor.js";
import type {
    InlineSegmentProperty,
    InlineSegmentPropertyMap,
} from "#src/segmentation_display_state/property_map.js";
import {
    normalizeInlineSegmentPropertyMap,
    SegmentPropertyMap,
} from "#src/segmentation_display_state/property_map.js";
import type { VertexAttributeInfo } from "#src/skeleton/base.js";
import { SkeletonSource } from "#src/skeleton/frontend.js";

import { DATA_TYPE_ARRAY_CONSTRUCTOR, DataType } from "#src/util/data_type.js";
import type { Borrowed } from "#src/util/disposable.js";
import { mat4 } from "#src/util/geom.js";
import { completeHttpPath } from "#src/util/http_path_completion.js";
import {
    parseArray,
    parseFixedLengthArray,
    parseQueryStringParameters,
    unparseQueryStringParameters,
    verifyEnumString,
    verifyFiniteFloat,
    verifyObject,
    verifyObjectProperty,
    verifyOptionalObjectProperty,
    verifyOptionalString,
    verifyPositiveInt,
    verifyString,
    verifyStringArray,
} from "#src/util/json.js";
import type {
    SpecialProtocolCredentials,
    SpecialProtocolCredentialsProvider,
} from "#src/util/special_protocol_request.js";
import {
    parseSpecialUrl,
} from "#src/util/special_protocol_request.js";
import { Uint64 } from "#src/util/uint64.js";


class trkSkeletonSource extends WithParameters(
    WithCredentialsProvider<SpecialProtocolCredentials>()(SkeletonSource),
    SkeletonSourceParameters,
) {
    get skeletonVertexCoordinatesInVoxels() {
        return false;
    }
    get vertexAttributes() {
        return this.parameters.metadata.vertexAttributes;
    }
}

function parseTransform(data: any): mat4 {
    return verifyObjectProperty(data, "transform", (value) => {
        const transform = mat4.create();
        if (value !== undefined) {
            parseFixedLengthArray(
                transform.subarray(0, 12),
                value,
                verifyFiniteFloat,
            );
        }
        mat4.transpose(transform, transform);
        return transform;
    });
}

interface ParsedSkeletonMetadata {
    metadata: SkeletonMetadata;
    segmentPropertyMap: string | undefined;
}

function parseSkeletonMetadata(data: any): ParsedSkeletonMetadata {
    verifyObject(data);
    const t = verifyObjectProperty(data, "@type", verifyString);
    if (t !== "neuroglancer_skeletons") {
        throw new Error(`Unsupported skeleton type: ${JSON.stringify(t)}`);
    }
    const transform = parseTransform(data);
    const vertexAttributes = new Map<string, VertexAttributeInfo>();
    verifyObjectProperty(data, "vertex_attributes", (attributes) => {
        if (attributes === undefined) return;
        parseArray(attributes, (attributeData) => {
            verifyObject(attributeData);
            const id = verifyObjectProperty(attributeData, "id", verifyString);
            if (id === "") throw new Error("vertex attribute id must not be empty");
            if (vertexAttributes.has(id)) {
                throw new Error(`duplicate vertex attribute id ${JSON.stringify(id)}`);
            }
            const dataType = verifyObjectProperty(attributeData, "data_type", (y) =>
                verifyEnumString(y, DataType),
            );
            const numComponents = verifyObjectProperty(
                attributeData,
                "num_components",
                verifyPositiveInt,
            );
            vertexAttributes.set(id, { dataType, numComponents });
        });
    });
    const segmentPropertyMap = verifyObjectProperty(
        data,
        "segment_properties",
        verifyOptionalString,
    );
    return {
        metadata: {
            transform, vertexAttributes,
        } as SkeletonMetadata,
        segmentPropertyMap,
    };
}

async function getSkeletonMetadata(): Promise<ParsedSkeletonMetadata> {
    const metadata = await getMetadata();
    console.log(metadata)
    return parseSkeletonMetadata(metadata);
}

function getDefaultCoordinateSpace() {
    return makeCoordinateSpace({
        names: ["x", "y", "z"],
        units: ["m", "m", "m"],
        scales: Float64Array.of(1e-9, 1e-9, 1e-9),
    });
}

async function getSkeletonSource(
    chunkManager: ChunkManager,
    credentialsProvider: SpecialProtocolCredentialsProvider,
    url: string,
) {

    const skeletonBuffer = await getSkeletonBuffer(url);
    const { metadata, segmentPropertyMap } = await getSkeletonMetadata();

    return {
        source: chunkManager.getChunkSource(trkSkeletonSource, {
            credentialsProvider,
            parameters: {
                url,
                metadata,
                skeletonBuffer
            },
        }),
        transform: metadata.transform,
        segmentPropertyMap,
    };
}

let globalHeader: any = null;

function getMetadata() {
    // Start with the default vertex attributes
    const vertexAttributes = [
        {
            "id": "orientation",
            "data_type": "float32",
            "num_components": 3
        }
    ];

    // Check if globalHeader, globalHeader_n_scalar, and scalar_name are present
    if (globalHeader && globalHeader.n_scalars && globalHeader.scalar_name) {
        for (let i = 0; i < globalHeader.n_scalars; i++) {
            const scalarName = globalHeader.scalar_name[i];
            if (scalarName && scalarName !== '') { // Ensure scalarName is valid and not empty
                vertexAttributes.push({
                    "id": scalarName,               // Use the scalar name as the ID
                    "data_type": "float32",         // Assuming the scalar data type is float32
                    "num_components": 1             // Each scalar is a single component
                });
            }
        }
    }

    return {
        "@type": "neuroglancer_skeletons",
        "vertex_attributes": vertexAttributes,
        "segment_properties": "prop"
    };
}


function getPropMetadata() {
    return {
        "@type": "neuroglancer_segment_properties",
        "inline": {
            "ids": [
                "1"
            ],
            "properties": [
                {
                    "id": "label",
                    "type": "label",
                    "values": [
                        "1"
                    ]
                }
            ]
        }
    };
}

const n_tracks = 1000;
async function getSkeletonBuffer(url: string): Promise<ArrayBuffer> {
    const trackProcessor = new TrackProcessor();
    await trackProcessor.streamAndProcessHeader(url, 0, 999);

    if (!trackProcessor.globalHeader) {
        console.error('Error: Failed to fetch or process the TRK header.');
        return new ArrayBuffer(0);
    }

    // Set globalHeader and process tracks
    globalHeader = trackProcessor.globalHeader;
    console.log(globalHeader);

    const totalTracks = globalHeader?.n_count;
    if (totalTracks !== undefined) {
        const randomTrackNumbers = trackProcessor.getRandomTrackIndices(totalTracks, n_tracks);

        // Process track data and get the skeleton data in arrayBuffer format
        const skeleton = await trackProcessor.processTrackData(randomTrackNumbers, 1, url);
        return skeleton.arrayBuffer || new ArrayBuffer(0);  // Resolves only after processing all tracks
    } else {
        console.error("totalTracks is undefined. Cannot proceed.");
        return new ArrayBuffer(0);
    }
}


async function getSkeletonsDataSource(
    options: GetDataSourceOptions,
    credentialsProvider: SpecialProtocolCredentialsProvider,
    url: string,
): Promise<DataSource> {
    const {
        source: skeletons,
        transform,
        segmentPropertyMap,
    } = await getSkeletonSource(options.chunkManager, credentialsProvider, url);
    const subsources: DataSubsourceEntry[] = [
        {
            id: "default",
            default: true,
            subsource: { mesh: skeletons },
            subsourceToModelSubspaceTransform: transform,
        },
    ];
    if (segmentPropertyMap !== undefined) {
        const metadata = await getPropMetadata();
        const segmentPropertyMapData = getSegmentPropertyMap(
            options.chunkManager,
            credentialsProvider,
            metadata,
        );
        subsources.push({
            id: "properties",
            default: true,
            subsource: { segmentPropertyMap: segmentPropertyMapData },
        });
    }
    return {
        modelTransform: makeIdentityTransform(getDefaultCoordinateSpace()),
        subsources,
    };
}

function parseInlinePropertyMap(data: unknown): InlineSegmentPropertyMap {
    verifyObject(data);
    const tempUint64 = new Uint64();
    const ids = verifyObjectProperty(data, "ids", (idsObj) => {
        idsObj = verifyStringArray(idsObj);
        const numIds = idsObj.length;
        const ids = new Uint32Array(numIds * 2);
        for (let i = 0; i < numIds; ++i) {
            if (!tempUint64.tryParseString(idsObj[i])) {
                throw new Error(`Invalid uint64 id: ${JSON.stringify(idsObj[i])}`);
            }
            ids[2 * i] = tempUint64.low;
            ids[2 * i + 1] = tempUint64.high;
        }
        return ids;
    });
    const numIds = ids.length / 2;
    const properties = verifyObjectProperty(data, "properties", (propertiesObj) =>
        parseArray(propertiesObj, (propertyObj): InlineSegmentProperty => {
            verifyObject(propertyObj);
            const id = verifyObjectProperty(propertyObj, "id", verifyString);
            const description = verifyOptionalObjectProperty(
                propertyObj,
                "description",
                verifyString,
            );
            const type = verifyObjectProperty(propertyObj, "type", (type) => {
                if (
                    type !== "label" &&
                    type !== "description" &&
                    type !== "string" &&
                    type !== "tags" &&
                    type !== "number"
                ) {
                    throw new Error(`Invalid property type: ${JSON.stringify(type)}`);
                }
                return type;
            });
            if (type === "tags") {
                const tags = verifyObjectProperty(
                    propertyObj,
                    "tags",
                    verifyStringArray,
                );
                let tagDescriptions = verifyOptionalObjectProperty(
                    propertyObj,
                    "tag_descriptions",
                    verifyStringArray,
                );
                if (tagDescriptions === undefined) {
                    tagDescriptions = new Array(tags.length);
                    tagDescriptions.fill("");
                } else {
                    if (tagDescriptions.length !== tags.length) {
                        throw new Error(
                            `Expected tag_descriptions to have length: ${tags.length}`,
                        );
                    }
                }
                const values = verifyObjectProperty(
                    propertyObj,
                    "values",
                    (valuesObj) => {
                        if (!Array.isArray(valuesObj) || valuesObj.length !== numIds) {
                            throw new Error(
                                `Expected ${numIds} values, but received: ${valuesObj.length}`,
                            );
                        }
                        return valuesObj.map((tagIndices) => {
                            return String.fromCharCode(...tagIndices);
                        });
                    },
                );
                return { id, description, type, tags, tagDescriptions, values };
            }
            if (type === "number") {
                const dataType = verifyObjectProperty(propertyObj, "data_type", (x) =>
                    verifyEnumString(x, DataType),
                );
                if (dataType === DataType.UINT64) {
                    throw new Error("uint64 properties not supported");
                }
                const values = verifyObjectProperty(
                    propertyObj,
                    "values",
                    (valuesObj) => {
                        if (!Array.isArray(valuesObj) || valuesObj.length !== numIds) {
                            throw new Error(
                                `Expected ${numIds} values, but received: ${valuesObj.length}`,
                            );
                        }
                        return DATA_TYPE_ARRAY_CONSTRUCTOR[dataType].from(valuesObj);
                    },
                );
                let min = Infinity;
                let max = -Infinity;
                for (let i = values.length - 1; i >= 0; --i) {
                    const v = values[i];
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
                return { id, description, type, dataType, values, bounds: [min, max] };
            }
            const values = verifyObjectProperty(
                propertyObj,
                "values",
                (valuesObj) => {
                    verifyStringArray(valuesObj);
                    if (valuesObj.length !== numIds) {
                        throw new Error(
                            `Expected ${numIds} values, but received: ${valuesObj.length}`,
                        );
                    }
                    return valuesObj;
                },
            );
            return { id, description, type, values };
        }),
    );
    return normalizeInlineSegmentPropertyMap({ ids, properties });
}

export function getSegmentPropertyMap(
    chunkManager: Borrowed<ChunkManager>,
    credentialsProvider: SpecialProtocolCredentialsProvider,
    data: unknown,
): SegmentPropertyMap {
    chunkManager;
    credentialsProvider;
    try {
        const t = verifyObjectProperty(data, "@type", verifyString);
        if (t !== "neuroglancer_segment_properties") {
            throw new Error(
                `Unsupported segment property map type: ${JSON.stringify(t)}`,
            );
        }
        const inlineProperties = verifyOptionalObjectProperty(
            data,
            "inline",
            parseInlinePropertyMap,
        );
        return new SegmentPropertyMap({ inlineProperties });
    } catch (e) {
        throw new Error(`Error parsing segment property map: ${e.message}`);
    }
}

async function getSegmentPropertyMapDataSource(
    options: GetDataSourceOptions,
    credentialsProvider: SpecialProtocolCredentialsProvider,
    metadata: unknown,
): Promise<DataSource> {
    options;
    return {
        modelTransform: makeIdentityTransform(emptyValidCoordinateSpace),
        subsources: [
            {
                id: "default",
                default: true,
                subsource: {
                    segmentPropertyMap: getSegmentPropertyMap(
                        options.chunkManager,
                        credentialsProvider,
                        metadata,
                    ),
                },
            },
        ],
    };
}

const urlPattern = /^([^#]*)(?:#(.*))?$/;

export function parseProviderUrl(providerUrl: string) {
    let [, url, fragment] = providerUrl.match(urlPattern)!;
    if (url.endsWith("/")) {
        url = url.substring(0, url.length - 1);
    }
    const parameters = parseQueryStringParameters(fragment || "");
    return { url, parameters };
}

export function unparseProviderUrl(url: string, parameters: any) {
    const fragment = unparseQueryStringParameters(parameters);
    if (fragment) {
        url += `#${fragment}`;
    }
    return url;
}

export class TrkDataSource extends DataSourceProvider {
    get description() {
        return "Single trk file";
    }

    get(options: GetDataSourceOptions): Promise<DataSource> {
        const { url: providerUrl, parameters } = parseProviderUrl(
            options.providerUrl,
        );
        return options.chunkManager.memoize.getUncounted(
            { type: "trk:get", providerUrl, parameters },
            async (): Promise<DataSource> => {
                const { url, credentialsProvider } = parseSpecialUrl(
                    providerUrl,
                    options.credentialsManager,
                );

                console.log(url)

                let metadata: any;
                try {
                    metadata = await getMetadata();
                    console.log(metadata)
                } catch (e) {
                    throw new Error(`Failed to get metadata for ${url}: ${e}`);
                }

                verifyObject(metadata);

                const redirect = verifyOptionalObjectProperty(
                    metadata,
                    "redirect",
                    verifyString,
                );

                if (redirect !== undefined) {
                    throw new RedirectError(redirect);
                }
                const t = verifyOptionalObjectProperty(metadata, "@type", verifyString);
                console.log(t)
                console.log(options)
                console.log(credentialsProvider)
                console.log(url)
                switch (t) {
                    case "neuroglancer_skeletons":
                        return await getSkeletonsDataSource(
                            options,
                            credentialsProvider,
                            url,
                        );

                    case "neuroglancer_segment_properties":
                        return await getSegmentPropertyMapDataSource(
                            options,
                            credentialsProvider,
                            metadata,
                        );

                    default:
                        throw new Error(`Invalid type: ${JSON.stringify(t)}`);
                }
            },
        );
    }
    completeUrl(options: CompleteUrlOptions) {
        return completeHttpPath(
            options.credentialsManager,
            options.providerUrl,
            options.cancellationToken,
        );
    }
}
