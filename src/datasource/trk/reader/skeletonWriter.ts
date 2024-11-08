// import axios from "axios";

/**
 * Represents a 3D vertex with coordinates.
 * @interface
 */
export interface Vertex {
  x: number;
  y: number;
  z: number;
}

/**
 * Represents an edge connecting two vertices by their indices.
 * @interface
 */
export interface Edge {
  vertex1: number;
  vertex2: number;
}

/**
 * Provides utilities for creating skeleton data, storing it in an ArrayBuffer,
 * and sending it to a backend service.
 */
export class SkeletonWriter {

  /**
   * Creates an ArrayBuffer with skeleton data, including vertices, edges, and orientations.
   * @static
   * @param {Vertex[]} vertices - The list of vertices to store.
   * @param {Edge[]} edges - The list of edges connecting the vertices.
   * @param {number[][]} orientations - The orientations of each vertex.
   * @returns {ArrayBuffer} - The created ArrayBuffer containing the skeleton data.
   */
  static createArrayBuffer(vertices: Vertex[], edges: Edge[], orientations: number[][], scalarsArray: { [key: string]: number }[]): ArrayBuffer {
    const vertexCount = vertices.length;
    const edgeCount = edges.length;

    const vertexSize = 12; // 3 floats (x, y, z), each 4 bytes
    const edgeSize = 8;    // 2 uint32s (source and target), each 4 bytes
    const orientationSize = 12; // 3 floats (x, y, z) for orientations
    const scalarSize = scalarsArray.length > 0 ? 4 * Object.keys(scalarsArray[0]).length : 0;

    const bufferSize = 4 + 4 + (vertexSize * vertexCount) + (edgeSize * edgeCount) + (orientationSize * vertexCount) + scalarSize * vertexCount;

    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);
    let offset = 0;

    dataView.setUint32(offset, vertexCount, true);
    offset += 4;
    dataView.setUint32(offset, edgeCount, true);
    offset += 4;

    for (let i = 0; i < vertexCount; i++) {
      dataView.setFloat32(offset, vertices[i].x * 1E6, true);
      dataView.setFloat32(offset + 4, vertices[i].y * 1E6, true);
      dataView.setFloat32(offset + 8, vertices[i].z * 1E6, true);
      offset += 12;
    }

    for (let i = 0; i < edgeCount; i++) {
      dataView.setUint32(offset, edges[i].vertex1, true);
      dataView.setUint32(offset + 4, edges[i].vertex2, true);
      offset += 8;
    }

    for (let i = 0; i < vertexCount; i++) {
      dataView.setFloat32(offset, orientations[i][0], true);
      dataView.setFloat32(offset + 4, orientations[i][1], true);
      dataView.setFloat32(offset + 8, orientations[i][2], true);
      offset += 12;
    }

    for (let i = 0; i < vertexCount; i++) {
      const scalarValues = scalarsArray[i];
      Object.values(scalarValues).forEach(scalar => {
        dataView.setFloat32(offset, scalar, true);
        offset += 4;
      });
    }

    return buffer;
  }


}
