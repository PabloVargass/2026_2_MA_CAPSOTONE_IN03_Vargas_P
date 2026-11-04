import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { user: { sub: string } };

import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PublicationQueryDto } from './dto/publication-query.dto';

import { JobsService } from './jobs.service';
import { ServiceOffersService } from './service-offers.service';
import { ServiceOfferDto } from './dto/service-offer.dto';
import { JobManagementService } from './job-management.service';
import { JobEvidenceService, MAX_EVIDENCE_BYTES } from './job-evidence.service';
import type { UploadedImage } from '../common/image-upload';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly offersService: ServiceOffersService,
    private readonly management: JobManagementService,
    private readonly evidence: JobEvidenceService,
  ) {}

  // =====================================
  // GESTIÓN DEL DUEÑO: PAUSAR, REANUDAR, CANCELAR, ELIMINAR
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Patch(':id/pausar')
  pausar(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.management.pausar(request.user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reanudar')
  reanudar(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.management.reanudar(request.user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancelar')
  cancelar(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.management.cancelar(request.user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.management.eliminar(request.user.sub, id);
  }

  // =====================================
  // EVIDENCIAS DEL TRABAJO
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Get(':id/evidencias')
  @Header('Cache-Control', 'private, no-store')
  listarEvidencias(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.evidence.listar(request.user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/evidencias')
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: MAX_EVIDENCE_BYTES, files: 1, fields: 0, parts: 2 },
    }),
  )
  subirEvidencia(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFile() foto?: UploadedImage,
  ) {
    return this.evidence.subir(request.user.sub, id, foto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/evidencias/:evidenciaId')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async verEvidencia(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
  ) {
    const foto = await this.evidence.foto(request.user.sub, id, evidenciaId);
    return new StreamableFile(foto.bytes, { type: foto.type });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/evidencias/:evidenciaId')
  eliminarEvidencia(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
  ) {
    return this.evidence.eliminar(request.user.sub, id, evidenciaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/ofertas-servicio')
  offer(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ServiceOfferDto,
  ) {
    return this.offersService.create(request.user.sub, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('ofertas-servicio/:id/aceptar')
  acceptOffer(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.offersService.respond(request.user.sub, id, true);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('ofertas-servicio/:id/rechazar')
  rejectOffer(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.offersService.respond(request.user.sub, id, false);
  }

  // =====================================
  // LISTAR TRABAJOS DISPONIBLES
  // =====================================

  @Get('categories')
  categories() {
    return this.jobsService.categories();
  }

  @Get()
  findAll(@Query() query: PublicationQueryDto) {
    return this.jobsService.findAll(query);
  }

  // =====================================
  // MIS TRABAJOS
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Get('mis-trabajos')
  misTrabajos(@Req() request: AuthenticatedRequest) {
    return this.jobsService.misTrabajos(request.user.sub);
  }

  // =====================================
  // INICIAR TRABAJO
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Patch(':id/iniciar')
  iniciarTrabajo(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.jobsService.iniciarTrabajo(request.user.sub, id);
  }

  // =====================================
  // COMPLETAR TRABAJO
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Patch(':id/completar')
  completarTrabajo(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.jobsService.completarTrabajo(request.user.sub, id);
  }

  // =====================================
  // EDITAR TRABAJO
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    updateJobDto: UpdateJobDto,
  ) {
    return this.jobsService.update(request.user.sub, id, updateJobDto);
  }

  // =====================================
  // OBTENER TRABAJO POR ID
  // =====================================

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @Req() request: Request & { user?: { sub: string } },
  ) {
    const trabajo = await this.jobsService.findOne(id, request.user?.sub);

    if (!trabajo) {
      throw new NotFoundException('Trabajo no encontrado.');
    }

    return trabajo;
  }

  // =====================================
  // CREAR TRABAJO
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body()
    createJobDto: CreateJobDto,
  ) {
    return this.jobsService.create(request.user.sub, createJobDto);
  }
}
