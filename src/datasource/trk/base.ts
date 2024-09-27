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

import type { VertexAttributeInfo } from "#src/skeleton/base.js";
import type { mat4 } from "#src/util/geom.js";

export enum DataEncoding {
  RAW = 0,
  GZIP = 1,
}

export enum ShardingHashFunction {
  IDENTITY = 0,
  MURMURHASH3_X86_128 = 1,
}

export interface ShardingParameters {
  hash: ShardingHashFunction;
  preshiftBits: number;
  minishardBits: number;
  shardBits: number;
  minishardIndexEncoding: DataEncoding;
  dataEncoding: DataEncoding;
}

export interface SkeletonMetadata {
  transform: mat4;
  vertexAttributes: Map<string, VertexAttributeInfo>;
  sharding: ShardingParameters | undefined;
}

export class SkeletonSourceParameters {
  url: string;
  metadata: SkeletonMetadata;

  static RPC_ID = "trk/SkeletonSource";
}


export class IndexedSegmentPropertySourceParameters {
  url: string;
  sharding: ShardingParameters | undefined;
  static RPC_ID = "trk/IndexedSegmentPropertySource";
}
