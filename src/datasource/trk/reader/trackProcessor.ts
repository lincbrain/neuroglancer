
import { Buffer } from 'buffer';
import axios from 'axios';
import { type Vertex, type Edge, SkeletonWriter } from '#src/datasource/trk/reader/skeletonWriter.js';
import type { TrkHeader } from '#src/datasource/trk/reader/trkHeader.js';
import { TrkHeaderProcessor } from '#src/datasource/trk/reader/trkHeader.js';
import { VoxelToRASConverter } from '#src/datasource/trk/reader/voxelToRASConverter.js';


/**
 * Represents the processing state of track data, indicating progress in bytes and tracks.
 * @interface
 */
export interface ProcessState {
    byteOffset: number;
    trackNumber: number;
    offset: number;
}

/**
 * Represents a 3D orientation vector.
 * @typedef Orientation
 */
type Orientation = [number, number, number];

/**
 * Manages the processing of track data from TRK files, including streaming, and processing track data.
 */
export class TrackProcessor {
    globalHeader: TrkHeader | null;

    /**
     * Initializes a new instance of the TrackProcessor class with an optional global header.
     * @param {TrkHeader | null} globalHeader - The global header of the TRK file.
     */
    constructor(globalHeader: TrkHeader | null = null) {
        this.globalHeader = globalHeader;
    }

    /**
     * Streams the TRK file header from a URL and processes it to set the global header.
     * @async
     * @param {string} url - The URL of the TRK file.
     * @param {number} start - The start byte position for the range request.
     * @param {number} end - The end byte position for the range request.
     */
    async streamAndProcessHeader(url: string, start: number, end: number) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'Range': `bytes=${start}-${end}`,
                },
            });
            const buffer = Buffer.from(response.data);
            this.globalHeader = TrkHeaderProcessor.readTrkHeader(buffer);
            // TrkHeaderProcessor.printTrkHeader(this.globalHeader);
        } catch (error) {
            console.error('Error streaming or processing the TRK file header:', error);
        }
    }

    /**
     * Computes the 3D orientation vectors for track points, normalizing them to unit vectors.
     * @static
     * @param {number[][]} points - The array of 3D points for which to compute orientations.
     * @returns {number[][]} An array of normalized 3D orientation vectors.
     */
    static computeOrientation(points: number[][]): number[][] {
        // Step 1: Compute directed orientation of each edge
        let orient: number[][] = points.slice(1).map((point, i) => {
            return [
                point[0] - points[i][0],
                point[1] - points[i][1],
                point[2] - points[i][2]
            ];
        });

        // Step 2: Compute orientation for each vertex
        const originalOrient = [...orient];
        orient = [
            ...originalOrient.slice(0, 1), // First vertex (only one edge)
            ...originalOrient.slice(0, -1).map((o, i) => {
                return [
                    o[0] + orient[i + 1][0], // x
                    o[1] + orient[i + 1][1], // y
                    o[2] + orient[i + 1][2]  // z
                ];
            }),
            ...originalOrient.slice(-1) // Last vertex (only one edge)
        ];

        // Step 3: Normalize orientation vectors to unit length
        orient = orient.map((o: number[]) => {
            const length = Math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2]);
            const normalizedLength = Math.max(length, 1e-12); // Avoid division by 0
            return [o[0] / normalizedLength, o[1] / normalizedLength, o[2] / normalizedLength] as Orientation;
        });


        return orient;
    }

    /**
     * Processes the track data for selected track numbers and writes the result to disk.
     * @async
     * @param {number[]} randomTrackNumbers - The array of track numbers to be processed.
     * @param {number} trackNumber - The current track number being processed.
     * @param {string} filePath - The file path of the TRK file.
     * @returns {Promise<{processState: ProcessState; timestamp: string}>} A promise that resolves to the processing state and a timestamp.
     */
    async processTrackData(randomTrackNumbers: number[], trackNumber: number, filePath: string): Promise<{ processState: ProcessState; timestamp: string, arrayBuffer?: ArrayBuffer }> {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);

        if (!this.globalHeader) {
            console.error('Error: Global header is not initialized.');
            return { processState: { byteOffset: 0, trackNumber, offset: 0 }, timestamp };
        }

        const maxTracksToProcess = randomTrackNumbers.length;
        const vertices: Vertex[] = [];
        const edges: Edge[] = [];
        const orientations: number[][] = [];
        const scalarsArray: { [key: string]: number }[] = [];
        let trackProcessedCount = 0;
        let vertexIndex = 0;

        try {
            const { dataView, buffer } = await this.loadFileBuffer(filePath);
            let offset = 1000;

            const numScalarsPerPoint = this.globalHeader.n_scalars || 0;
            const scalarNames = this.globalHeader.scalar_name || [];
            let minScalar = Infinity;
            let maxScalar = -Infinity;

            while (trackProcessedCount < maxTracksToProcess && offset < buffer.byteLength) {
                const n_points = dataView.getInt32(offset, true);
                offset += 4;

                if (randomTrackNumbers.includes(trackNumber)) {
                    const points: number[][] = [];
                    for (let i = 0; i < n_points; i++) {
                        const x = dataView.getFloat32(offset, true);
                        const y = dataView.getFloat32(offset + 4, true);
                        const z = dataView.getFloat32(offset + 8, true);
                        offset += 12;
                        points.push([x, y, z]);

                        const voxelPoint: [number, number, number] = [x, y, z];
                        const affine = VoxelToRASConverter.getAffineToRasmm(this.globalHeader);
                        const rasPoint = VoxelToRASConverter.applyAffineMatrix(voxelPoint, affine);

                        vertices.push({ x: rasPoint[0], y: rasPoint[1], z: rasPoint[2] });

                        if (i > 0) {
                            edges.push({ vertex1: vertexIndex - 1, vertex2: vertexIndex });
                        }
                        vertexIndex++;

                        const scalars: number[] = [];
                        const normalizedScalars: number[] = [];

                        if (numScalarsPerPoint > 0) {
                            for (let s = 0; s < numScalarsPerPoint; s++) {
                                const scalarValue = dataView.getFloat32(offset, true);
                                scalars.push(scalarValue);
                                offset += 4;
                        
                                // Update the min and max scalar values
                                if (scalarValue < minScalar) minScalar = scalarValue;
                                if (scalarValue > maxScalar) maxScalar = scalarValue;
                            }
                        
                            // Normalize scalars after finding min and max
                            for (const scalar of scalars) {
                                const normalizedScalar = (scalar - minScalar) / (maxScalar - minScalar);
                                normalizedScalars.push(normalizedScalar);
                            }
                        
                            scalarsArray.push(
                                normalizedScalars.reduce((acc, scalar, idx) => {
                                    acc[scalarNames[idx] || `scalar${idx + 1}`] = scalar;
                                    return acc;
                                }, {} as { [key: string]: number })
                            );
                        }


                    }

                    const orient = TrackProcessor.computeOrientation(points);
                    orientations.push(...orient);

                    trackProcessedCount++;

                    if (trackProcessedCount >= maxTracksToProcess) {
                        // After processing, log the min and max values
                        console.log(`Scalar range: min = ${minScalar}, max = ${maxScalar}`);
                        const arrayBuffer = SkeletonWriter.createArrayBuffer(vertices, edges, orientations, scalarsArray);
                        return { processState: { byteOffset: 0, trackNumber, offset: 0 }, timestamp, arrayBuffer };
                    }
                } else {
                    offset += n_points * (12 + numScalarsPerPoint * 4);
                }

                trackNumber++;
            }

            return { processState: { byteOffset: 0, trackNumber, offset: 0 }, timestamp };

        } catch (error) {
            console.error('Error fetching or processing track data:', error);
            return { processState: { byteOffset: 0, trackNumber, offset: 0 }, timestamp };
        }
    }


    /**
     * Shuffles and selects a random number of track indices from a total number of tracks.
     * @param {number} totalTracks - The total number of tracks available.
     * @param {number} numTracks - The number of tracks to select.
     * @returns {number[]} An array of randomly selected track indices.
     */
    getRandomTrackIndices(totalTracks: number, numTracks: number): number[] {
        const trackIndices = Array.from({ length: totalTracks }, (_, i) => i + 1); // Create an array of track numbers
        for (let i = trackIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [trackIndices[i], trackIndices[j]] = [trackIndices[j], trackIndices[i]]; // Shuffle array
        }
        return trackIndices.slice(0, numTracks); // Return the first `numTracks` tracks
    }

    /**
     * Loads the binary data of a file from a URL or local path into a buffer and creates a DataView for processing.
     * @param {string} filePath - The URL or local path of the file to load.
     * @returns {Promise<{dataView: DataView; buffer: Buffer}>} A promise that resolves to the DataView and buffer of the file.
     */
    loadFileBuffer(filePath: string) {

        return axios.get(filePath, { responseType: 'arraybuffer' })
            .then(response => {
                const buffer = Buffer.from(response.data);
                const dataView = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
                console.log('Data loaded from URL successfully.');
                return {
                    dataView,
                    buffer
                };
            })
            .catch(error => {
                console.error('Failed to load file from URL:', error);
                throw error;
            });
    }

}