import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'users' })
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [String], default: [] })
  favorites: string[];

  @Prop({ default: 'https://i.ibb.co.com/Zyn02g6/avatar-default.webp' })
  avatar: string;

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @Prop({
    type: [{
      imdbID: { type: String, required: true },
      status: { type: String, enum: ['plan_to_watch', 'watching', 'completed', 'dropped'], default: 'plan_to_watch' },
    }],
    default: [],
  })
  watchStatus: { imdbID: string; status: string }[];
}

export const UserSchema = SchemaFactory.createForClass(User);