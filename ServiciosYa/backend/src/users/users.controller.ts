import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Put,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import {
  MAX_PROFILE_PHOTO_BYTES,
  ProfilePhotoService,
} from './profile-photo.service';
import type { UploadedImage } from '../common/image-upload';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profilePhotos: ProfilePhotoService,
  ) {}

  // =====================================
  // FOTO DE PERFIL
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Put('me/foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: {
        fileSize: MAX_PROFILE_PHOTO_BYTES,
        files: 1,
        fields: 0,
        parts: 2,
      },
    }),
  )
  updateMyPhoto(
    @Req() request: any,
    @UploadedFile() foto?: UploadedImage,
  ) {
    return this.profilePhotos.guardar(request.user.sub, foto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/foto')
  removeMyPhoto(@Req() request: any) {
    return this.profilePhotos.quitar(request.user.sub);
  }

  // Pública, como el resto del perfil. La app agrega ?v=fecha para renovar la caché.
  @Get(':id/foto')
  @Header('Cache-Control', 'public, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  async photo(@Param('id') id: string) {
    const foto = await this.profilePhotos.obtener(id);
    return new StreamableFile(foto.bytes, { type: foto.type });
  }

  // =====================================
  // LISTA DE USUARIOS PARA DESCUBRIR
  // =====================================

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  // =====================================
  // OBTENER MI PERFIL
  // =====================================
  //
  // El usuario se obtiene directamente
  // desde el JWT.
  //
  // No necesitamos recibir el ID desde
  // la aplicación móvil.
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMyProfile(
    @Req() request: any,
  ) {
    const usuarioId =
      request.user.sub;

    const usuario =
      await this.usersService.findOne(
        usuarioId,
      );

    if (!usuario) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    return usuario;
  }

  // =====================================
  // EDITAR MI PERFIL
  // =====================================
  //
  // PATCH /users/me
  //
  // Solo puede modificar el usuario
  // identificado mediante el JWT.
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyProfile(
    @Req() request: any,
    @Body()
    updateProfileDto: UpdateProfileDto,
  ) {
    const usuarioId =
      request.user.sub;

    return this.usersService.updateProfile(
      usuarioId,
      updateProfileDto,
    );
  }

  // =====================================
  // PERFIL PÚBLICO COMPLETO
  // =====================================

  @Get(':id/perfil')
  async findPublicProfile(
    @Req() request: any,
  ) {
    /*
     * Esta ruta mantiene la estructura
     * que ya utilizaba ServiciosYa.
     */

    const id =
      request.params.id;

    return this.usersService.findPublicProfile(
      id,
    );
  }

  // =====================================
  // INFORMACIÓN BÁSICA DE UN USUARIO
  // =====================================

  @Get(':id')
  async findOne(
    @Req() request: any,
  ) {
    const id =
      request.params.id;

    const usuario =
      await this.usersService.findPublicUser(id);

    if (!usuario) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    return usuario;
  }
}
