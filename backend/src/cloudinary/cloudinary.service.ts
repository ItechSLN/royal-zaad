import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  onModuleInit() {
    this.configured = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
    );

    if (!this.configured) {
      this.logger.warn(
        'CLOUDINARY_* is not set — file uploads are disabled. Image URLs still work.',
      );
      return;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /** Fails loudly and usefully rather than surfacing a gateway 401 as a 500. */
  private assertConfigured(): void {
    if (this.configured) return;

    throw new ServiceUnavailableException(
      'File uploads are not configured on this server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or provide an image URL instead.',
    );
  }

  /** `folder` keeps product and category assets separate in the media library. */
  upload(
    file: Express.Multer.File,
    folder = 'products',
  ): Promise<{ secure_url: string; public_id: string }> {
    this.assertConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new Error(
                    typeof error?.message === 'string'
                      ? error.message
                      : 'Cloudinary upload failed',
                  ),
            );
            return;
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async remove(publicId: string): Promise<void> {
    if (!this.configured) return;
    await cloudinary.uploader.destroy(publicId);
  }
}
