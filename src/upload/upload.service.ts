import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  constructor(@Inject('SUPABASE') private readonly supabase) {}

  async uploadFile(file: Express.Multer.File) {
    const bucket = 'asah'; // nama bucket di supabase
    const fileName = `${Date.now()}-${file.originalname}`;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    // get public URL
    const { data: publicURL } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {
      status: 200,
      message: 'File uploaded successfully',
      data: {
        path: data.path,
        url: publicURL.publicUrl,
      }
    };
  }
}
