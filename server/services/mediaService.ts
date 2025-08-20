import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import { MediaBanner } from '../models/mongodb-models.js';
import type { InsertMediaBanner, MediaBanner as MediaBannerType } from '@shared/schema';

export class MediaService {
  private bucket: GridFSBucket | null = null;

  private getBucket(): GridFSBucket {
    if (!this.bucket) {
      if (!mongoose.connection.db) {
        throw new Error('MongoDB connection not established');
      }
      this.bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'mediaBanners'
      });
    }
    return this.bucket;
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    originalName: string,
    mimeType: string,
    uploadedBy?: number
  ): Promise<MediaBannerType> {
    try {
      // Create a readable stream from the buffer
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);

      // Determine file type based on MIME type
      const type: 'image' | 'video' = mimeType.startsWith('image/') ? 'image' : 'video';

      // Get the next display order
      const lastBanner = await MediaBanner.findOne().sort({ displayOrder: -1 });
      const displayOrder = lastBanner ? lastBanner.displayOrder + 1 : 1;

      // Upload file to GridFS
      const bucket = this.getBucket();
      const uploadStream = bucket.openUploadStream(fileName, {
        metadata: {
          originalName,
          mimeType,
          type,
          uploadedBy,
          uploadedAt: new Date()
        }
      });

      const fileId = await new Promise<mongoose.Types.ObjectId>((resolve, reject) => {
        readableStream.pipe(uploadStream)
          .on('finish', () => {
            resolve(uploadStream.id as mongoose.Types.ObjectId);
          })
          .on('error', reject);
      });

      // Create media banner record in database
      const mediaBanner = new MediaBanner({
        fileName,
        originalName,
        mimeType,
        size: fileBuffer.length,
        type,
        fileId,
        isActive: true,
        displayOrder,
        uploadedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await mediaBanner.save();

      return {
        id: mediaBanner._id.toString(),
        fileName: mediaBanner.fileName,
        originalName: mediaBanner.originalName,
        mimeType: mediaBanner.mimeType,
        size: mediaBanner.size,
        type: mediaBanner.type,
        fileId: mediaBanner.fileId.toString(),
        isActive: mediaBanner.isActive,
        displayOrder: mediaBanner.displayOrder,
        uploadedBy: mediaBanner.uploadedBy,
        createdAt: mediaBanner.createdAt,
        updatedAt: mediaBanner.updatedAt
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFile(fileId: string): Promise<{ stream: NodeJS.ReadableStream; metadata: any }> {
    try {
      const bucket = this.getBucket();
      const objectId = new mongoose.Types.ObjectId(fileId);
      const downloadStream = bucket.openDownloadStream(objectId);
      
      // Get file metadata
      const files = await bucket.find({ _id: objectId }).toArray();
      const file = files[0];
      
      if (!file) {
        throw new Error('File not found');
      }

      return {
        stream: downloadStream,
        metadata: {
          filename: file.filename,
          contentType: file.metadata?.mimeType || 'application/octet-stream',
          length: file.length,
          uploadDate: file.uploadDate,
          metadata: file.metadata
        }
      };
    } catch (error) {
      console.error('Error retrieving file:', error);
      throw new Error(`Failed to retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(bannerId: string): Promise<void> {
    try {
      const banner = await MediaBanner.findById(bannerId);
      if (!banner) {
        throw new Error('Media banner not found');
      }

      // Delete file from GridFS
      const bucket = this.getBucket();
      await bucket.delete(banner.fileId);

      // Delete banner record from database
      await MediaBanner.findByIdAndDelete(bannerId);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllBanners(): Promise<MediaBannerType[]> {
    try {
      const banners = await MediaBanner.find({ isActive: true })
        .sort({ displayOrder: 1 })
        .exec();

      return banners.map(banner => ({
        id: banner._id.toString(),
        fileName: banner.fileName,
        originalName: banner.originalName,
        mimeType: banner.mimeType,
        size: banner.size,
        type: banner.type,
        fileId: banner.fileId?.toString() || '',
        isActive: banner.isActive,
        displayOrder: banner.displayOrder,
        uploadedBy: banner.uploadedBy,
        createdAt: banner.createdAt,
        updatedAt: banner.updatedAt
      })).filter(banner => banner.fileId); // Only return banners with valid fileIds
    } catch (error) {
      console.error('Error getting banners:', error);
      throw new Error(`Failed to get banners: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateBanner(bannerId: string, updates: Partial<InsertMediaBanner>): Promise<MediaBannerType> {
    try {
      const banner = await MediaBanner.findByIdAndUpdate(
        bannerId,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (!banner) {
        throw new Error('Media banner not found');
      }

      return {
        id: banner._id.toString(),
        fileName: banner.fileName,
        originalName: banner.originalName,
        mimeType: banner.mimeType,
        size: banner.size,
        type: banner.type,
        fileId: banner.fileId?.toString() || '',
        isActive: banner.isActive,
        displayOrder: banner.displayOrder,
        uploadedBy: banner.uploadedBy,
        createdAt: banner.createdAt,
        updatedAt: banner.updatedAt
      };
    } catch (error) {
      console.error('Error updating banner:', error);
      throw new Error(`Failed to update banner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async toggleBannerStatus(bannerId: string): Promise<MediaBannerType> {
    try {
      const banner = await MediaBanner.findById(bannerId);
      if (!banner) {
        throw new Error('Media banner not found');
      }

      banner.isActive = !banner.isActive;
      banner.updatedAt = new Date();
      await banner.save();

      return {
        id: banner._id.toString(),
        fileName: banner.fileName,
        originalName: banner.originalName,
        mimeType: banner.mimeType,
        size: banner.size,
        type: banner.type,
        fileId: banner.fileId?.toString() || '',
        isActive: banner.isActive,
        displayOrder: banner.displayOrder,
        uploadedBy: banner.uploadedBy,
        createdAt: banner.createdAt,
        updatedAt: banner.updatedAt
      };
    } catch (error) {
      console.error('Error toggling banner status:', error);
      throw new Error(`Failed to toggle banner status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reorderBanners(bannerIds: string[]): Promise<void> {
    try {
      const promises = bannerIds.map((bannerId, index) =>
        MediaBanner.findByIdAndUpdate(bannerId, {
          displayOrder: index + 1,
          updatedAt: new Date()
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error reordering banners:', error);
      throw new Error(`Failed to reorder banners: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Create and export a singleton instance
export const mediaService = new MediaService();