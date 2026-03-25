import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, MaxLength, IsNotEmpty } from 'class-validator';
import { FeedPostType } from '../feed-post.entity';

export class CreateFeedPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsEnum(FeedPostType)
  type?: FeedPostType;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsInt()
  classId?: number;
}
