import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RecordFormat, RecordCategory } from './record.enum';
import { Track } from '../../integrations/musicbrainz/musicbrainz.service';

@Schema({ timestamps: true })
export class Record extends Document {
  @Prop({ required: true })
  artist: string;

  @Prop({ required: true })
  album: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  qty: number;

  @Prop({ enum: RecordFormat, required: true })
  format: RecordFormat;

  @Prop({ enum: RecordCategory, required: true })
  category: RecordCategory;

  @Prop({ required: false })
  mbid?: string;

  @Prop({ required: false })
  tracklist?: Track[];
}

export const RecordSchema = SchemaFactory.createForClass(Record);

// Compound unique index: a record is uniquely identified by artist + album + format
RecordSchema.index({ artist: 1, album: 1, format: 1 }, { unique: true });

// Index for category filter (common query pattern)
RecordSchema.index({ category: 1 });

// Text index for general search (q parameter)
RecordSchema.index({ artist: 'text', album: 'text' });
