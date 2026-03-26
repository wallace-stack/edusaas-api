import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { FeedPost } from './feed-post.entity';
import { SchoolsModule } from '../schools/schools.module';
import { ClassesModule } from '../classes/classes.module';
import { PlansModule } from '../plans/plans.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedPost]),
    SchoolsModule,
    ClassesModule,
    PlansModule,
    EnrollmentModule,
    CloudinaryModule,
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
