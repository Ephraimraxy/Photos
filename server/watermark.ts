import sharp from "sharp";
import path from "path";

export async function addWatermarkToImage(inputPath: string, outputPath: string): Promise<void> {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  const width = metadata.width || 1000;
  const height = metadata.height || 1000;

  const watermarkSvg = `
    <svg width="${width}" height="${height}">
      <defs>
        <pattern id="watermark" x="0" y="0" width="${width}" height="${height}" patternUnits="userSpaceOnUse">
          <text
            x="${width / 2}"
            y="${height / 2}"
            font-family="Arial, sans-serif"
            font-size="${Math.max(width, height) / 15}"
            font-weight="bold"
            fill="white"
            fill-opacity="0.3"
            text-anchor="middle"
            transform="rotate(-45 ${width / 2} ${height / 2})"
          >
            DOCUEDIT PHOTOS
          </text>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#watermark)"/>
    </svg>
  `;

  await image
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        blend: "over",
      },
    ])
    .jpeg({ quality: 70 })
    .toFile(outputPath);
}

export async function addWatermarkToImageBuffer(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width || 1000;
  const height = metadata.height || 1000;

  const watermarkSvg = `
    <svg width="${width}" height="${height}">
      <defs>
        <pattern id="watermark" x="0" y="0" width="${width}" height="${height}" patternUnits="userSpaceOnUse">
          <text
            x="${width / 2}"
            y="${height / 2}"
            font-family="Arial, sans-serif"
            font-size="${Math.max(width, height) / 15}"
            font-weight="bold"
            fill="white"
            fill-opacity="0.3"
            text-anchor="middle"
            transform="rotate(-45 ${width / 2} ${height / 2})"
          >
            DOCUEDIT PHOTOS
          </text>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#watermark)"/>
    </svg>
  `;

  return await image
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        blend: "over",
      },
    ])
    .jpeg({ quality: 70 })
    .toBuffer();
}

export async function addWatermarkToVideo(inputPath: string, outputPath: string): Promise<string> {
  const thumbnailPath = outputPath.replace(/\.(mp4|webm|mov)$/i, '.jpg');
  
  const placeholderSvg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1a1a1a"/>
      <text
        x="50%"
        y="45%"
        font-family="Arial, sans-serif"
        font-size="48"
        font-weight="bold"
        fill="white"
        fill-opacity="0.3"
        text-anchor="middle"
        transform="rotate(-45 640 360)"
      >
        DOCUEDIT PHOTOS
      </text>
      <text
        x="50%"
        y="55%"
        font-family="Arial, sans-serif"
        font-size="24"
        fill="white"
        fill-opacity="0.6"
        text-anchor="middle"
      >
        Video Preview
      </text>
    </svg>
  `;

  await sharp(Buffer.from(placeholderSvg))
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
    
  return thumbnailPath;
}

export function getWatermarkedFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const base = path.basename(originalFilename, ext);
  return `${base}_watermarked${ext}`;
}
