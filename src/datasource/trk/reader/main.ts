
// import dotenv from 'dotenv';
import { TrackProcessor } from '#src/datasource/trk/reader/trackProcessor.js';
// dotenv.config();

/**
 * This function serves as the entry point for the application. It handles the sequence of operations involving track processing and skeleton precomputed format file creation.
 * The function first sets up the track processor, fetches and processes only the header of the track file, and checks if the header was successfully processed.
 * If the header is present, it then processes a specified number of track data and uploads the results to an S3 bucket.
 *
 * @async
 * @returns {Promise<void>} A promise that resolves when all operations are successfully completed or throws an error if any step fails.
 */
async function main() {

  // Create a global instance
  const trackProcessor = new TrackProcessor();
  // Upload data from cloud
  const trkFileUrl = 'https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67';
  // Upload data from local machine
  // const trkFilePath = '/Users/shrutiv/MyDocuments/GitHub/d4ac43bd-6896-4adf-a911-82edbea21f67.trk';
  
  /* Process the header informtion from first 1000 bytes (0-999). */
  await trackProcessor.streamAndProcessHeader(trkFileUrl, 0, 999);
  if (!trackProcessor.globalHeader) {
    console.error('Error: Failed to fetch or process the TRK header.');
    return;
  }

  /* Process all the tracks from starting from 1 and generate precomputed file for all
  the tracks present in the randomTrackNumbers array. */
  const totalTracks = trackProcessor.globalHeader.n_count;
  const randomTrackNumbers = trackProcessor.getRandomTrackIndices(totalTracks, 1000);
  // const randomTrackNumbers = [1]; // process only single track

  await trackProcessor.processTrackData(randomTrackNumbers, 1, trkFileUrl);
  // await trackProcessor.processTrackData(randomTrackNumbers, 1, trkFilePath);



}

main().catch(console.error);
