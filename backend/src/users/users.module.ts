import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ProfilePhotoService } from './profile-photo.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, ProfilePhotoService],
  exports: [UsersService],
})
export class UsersModule {}