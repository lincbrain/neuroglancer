/**
 * Represents the header of a Track (TRK) file, describing how track data is structured.
 * @interface
 */
export interface TrkHeader {
    id_string: string;
    dim: [number, number, number];
    voxel_size: [number, number, number];
    origin: [number, number, number];
    n_scalars: number;
    scalar_name: string[];
    n_properties: number;
    property_name: string[];
    vox_to_ras: number[][];
    voxel_order: string;
    image_orientation_patient: [number, number, number, number, number, number];
    invert_x: boolean;
    invert_y: boolean;
    invert_z: boolean;
    swap_xy: boolean;
    swap_yz: boolean;
    swap_zx: boolean;
    n_count: number;
    version: number;
    hdr_size: number;
}

/**
 * Handles reading and processing the header of TRK files.
 */
export class TrkHeaderProcessor {

    /**
     * Reads the header from a buffer and returns a structured object.
     * @static
     * @param {Buffer} buffer The buffer containing binary data of a TRK file header.
     * @returns {TrkHeader} The parsed header as a structured object.
     */
    static readTrkHeader(buffer: Buffer): TrkHeader {

        let offset = 0;

        const readChars = (length: number) => {
            const value = buffer.toString('ascii', offset, offset + length).replace(/\0/g, '');
            offset += length;
            return value;
        };

        const readShorts = (length: number): number[] => {
            const values: number[] = [];
            for (let i = 0; i < length; i++) {
                values.push(buffer.readInt16LE(offset));
                offset += 2;
            }
            return values;
        };

        const readFloats = (length: number): number[] => {
            const values: number[] = [];
            for (let i = 0; i < length; i++) {
                values.push(buffer.readFloatLE(offset));
                offset += 4;
            }
            return values;
        };

        const readMatrix = (rows: number, cols: number): number[][] => {
            const matrix: number[][] = [];
            for (let i = 0; i < rows; i++) {
                const row: number[] = [];
                for (let j = 0; j < cols; j++) {
                    row.push(buffer.readFloatLE(offset));
                    offset += 4;
                }
                matrix.push(row);
            }
            return matrix;
        };

        const readUChar = (): boolean => {
            const value = buffer.readUInt8(offset);
            offset += 1;
            return value !== 0;
        };

        const header: TrkHeader = {
            id_string: readChars(6),
            dim: readShorts(3) as [number, number, number],
            voxel_size: readFloats(3) as [number, number, number],
            origin: readFloats(3) as [number, number, number],
            n_scalars: buffer.readInt16LE(offset),
            scalar_name: [],
            n_properties: 0,
            property_name: [],
            vox_to_ras: [],
            voxel_order: '',
            image_orientation_patient: [0, 0, 0, 0, 0, 0],
            invert_x: false,
            invert_y: false,
            invert_z: false,
            swap_xy: false,
            swap_yz: false,
            swap_zx: false,
            n_count: 0,
            version: 0,
            hdr_size: 0,
        };
        offset += 2;

        // Scalar names (10 names x 20 chars each = 200 bytes)
        for (let i = 0; i < 10; i++) {
            header.scalar_name.push(readChars(20));
        }

        header.n_properties = buffer.readInt16LE(offset);
        offset += 2;

        // Property names (10 names x 20 chars each = 200 bytes)
        for (let i = 0; i < 10; i++) {
            header.property_name.push(readChars(20));
        }

        header.vox_to_ras = readMatrix(4, 4);

        offset += 444; // Skipped: Reserved space for future version.

        header.voxel_order = readChars(4);
        offset += 4; // Skipped: paddings

        header.image_orientation_patient = readFloats(6) as [number, number, number, number, number, number];

        offset += 2; // Skipped: paddings

        header.invert_x = readUChar();
        header.invert_y = readUChar();
        header.invert_z = readUChar();
        header.swap_xy = readUChar();
        header.swap_yz = readUChar();
        header.swap_zx = readUChar();

        header.n_count = buffer.readInt32LE(offset);
        offset += 4;

        header.version = buffer.readInt32LE(offset);
        offset += 4;

        header.hdr_size = buffer.readInt32LE(offset);
        offset += 4;

        return header;
    }

    /**
     * Prints detailed information about the TRK file header to the console.
     * @static
     * @param {TrkHeader} header The TRK header to be printed.
     */
    static printTrkHeader(header: TrkHeader): void {
        console.log('--- TRK File Metadata ---');
        console.log(`ID String: ${header.id_string}`);
        console.log(`Dimensions: ${header.dim.join(' x ')}`);
        console.log(`Voxel Size: ${header.voxel_size.join(', ')}`);
        console.log(`Origin: ${header.origin.join(', ')}`);
        console.log(`Number of Scalars per Point: ${header.n_scalars}`);
        console.log(`Scalar Names: ${header.scalar_name.filter(name => name).join(', ')}`);
        console.log(`Number of Properties per Track: ${header.n_properties}`);
        console.log(`Property Names: ${header.property_name.filter(name => name).join(', ')}`);
        console.log('Voxel to RAS Matrix:');
        header.vox_to_ras.forEach(row => console.log(`  [${row.join(', ')}]`));
        console.log(`Voxel Order: ${header.voxel_order}`);
        console.log(`Image Orientation (Patient): ${header.image_orientation_patient.join(', ')}`);
        console.log(`Invert X: ${header.invert_x}`);
        console.log(`Invert Y: ${header.invert_y}`);
        console.log(`Invert Z: ${header.invert_z}`);
        console.log(`Swap XY: ${header.swap_xy}`);
        console.log(`Swap YZ: ${header.swap_yz}`);
        console.log(`Swap ZX: ${header.swap_zx}`);
        console.log(`Number of Tracks: ${header.n_count}`);
        console.log(`Version: ${header.version}`);
        console.log(`Header Size: ${header.hdr_size}`);
    }
}
