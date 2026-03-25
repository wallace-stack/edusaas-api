import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { FeedPost } from './feed-post.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ClassesModule } from '../classes/classes.module';
import { PlansModule } from '../plans/plans.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedPost]),
    CloudinaryModule,
    ClassesModule,
    PlansModule,
    EnrollmentModule,
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
