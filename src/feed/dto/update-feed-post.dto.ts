import { IsString, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { FeedPostType } from '../feed-post.entity';

export class UpdateFeedPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsEnum(FeedPostType)
  type?: FeedPostType;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
