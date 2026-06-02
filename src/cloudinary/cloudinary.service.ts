import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow('CLOUDINARY_API_SECRET'),
    });
  }

  /** Upload de imagem para o feed (webp, max 1200px) */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    return this._upload(file.buffer, {
      folder: 'edusaas/feed',
      format: 'webp',
      quality: 'auto',
      transformation: [{ width: 1200, crop: 'limit' }],
      resource_type: 'image',
    });
  }

  /**
   * Upload de anexo do caderno de planejamento.
   * - Imagens (jpeg/png): salvo como webp comprimido
   * - PDFs: resource_type 'raw', sem transformação
   */
  async uploadAttachment(file: Express.Multer.File, mimeType: string): Promise<string> {
    const isPdf = mimeType === 'application/pdf';
    const options: UploadApiOptions = isPdf
      ? { folder: 'edusaas/planejamentos/anexos', resource_type: 'raw' }
      : {
          folder: 'edusaas/planejamentos/anexos',
          resource_type: 'image',
          format: 'webp',
          quality: 'auto',
          transformation: [{ width: 1200, crop: 'limit' }],
        };
    return this._upload(file.buffer, options);
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  // ─── privado ──────────────────────────────────────────────────────────────

  private _upload(buffer: Buffer, options: UploadApiOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result: UploadApiResponse) => {
          if (error || !result) {
            return reject(new InternalServerErrorException('Falha ao fazer upload do arquivo.'));
          }
          resolve(result.secure_url);
        },
      );
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(stream);
    });
  }
}
