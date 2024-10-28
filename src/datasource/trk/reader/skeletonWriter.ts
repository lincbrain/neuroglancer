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
  static createArrayBuffer(vertices: Vertex[], edges: Edge[], orientations: number[][]): ArrayBuffer {
    const vertexCount = vertices.length;
    const edgeCount = edges.length;

    const vertexSize = 12; // 3 floats (x, y, z), each 4 bytes
    const edgeSize = 8;    // 2 uint32s (source and target), each 4 bytes
    const orientationSize = 12; // 3 floats (x, y, z) for orientations

    const bufferSize = 4 + 4 + (vertexSize * vertexCount) + (edgeSize * edgeCount) + (orientationSize * vertexCount);
    
    // Create an ArrayBuffer and a DataView to manipulate it
    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);
    let offset = 0;

    // Write the number of vertices
    dataView.setUint32(offset, vertexCount, true);
    offset += 4;

    // Write the number of edges
    dataView.setUint32(offset, edgeCount, true);
    offset += 4;

    // Write the vertices (3 floats per vertex: x, y, z)
    for (let i = 0; i < vertexCount; i++) {
      dataView.setFloat32(offset, vertices[i].x * 1E6, true);
      dataView.setFloat32(offset + 4, vertices[i].y * 1E6, true);
      dataView.setFloat32(offset + 8, vertices[i].z * 1E6, true);
      offset += 12;
    }

    // Write the edges (2 uint32 per edge: vertex1, vertex2)
    for (let i = 0; i < edgeCount; i++) {
      dataView.setUint32(offset, edges[i].vertex1, true);
      dataView.setUint32(offset + 4, edges[i].vertex2, true);
      offset += 8;
    }

    // Write the orientations (3 floats per vertex: x, y, z)
    for (let i = 0; i < vertexCount; i++) {
      dataView.setFloat32(offset, orientations[i][0], true);
      dataView.setFloat32(offset + 4, orientations[i][1], true);
      dataView.setFloat32(offset + 8, orientations[i][2], true);
      offset += 12;
    }

    return buffer;
  }

  /**
   * Sends the ArrayBuffer containing skeleton data to the backend.
   * @param {ArrayBuffer} buffer - The ArrayBuffer to send.
   * @param {string} url - The URL of the backend endpoint.
   */
  static async sendArrayBufferToBackend(buffer: ArrayBuffer, url: string): Promise<void> {
    // try {
    //   const response = await axios.post(url, buffer, {
    //     headers: {
    //       'Content-Type': 'application/octet-stream'
    //     }
    //   });
    //   console.log("ArrayBuffer sent to backend successfully", response.data);
    // } catch (error) {
    //   console.error("Error sending ArrayBuffer to backend", error);
    // }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: buffer,
        headers: {
          'Content-Type': 'application/octet-stream',
        }
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const responseData = await response.json();
      console.log("ArrayBuffer sent to backend successfully", responseData);
    } catch (error) {
      console.error("Error sending ArrayBuffer to backend", error);
    }


  }

}
