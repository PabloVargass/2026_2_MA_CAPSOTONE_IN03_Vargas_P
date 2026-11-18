import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitIdentityDto {
  @IsString() @MaxLength(15) rut!: string;
  @IsIn(['true']) consentimiento!: string;
}

// Solicitud a administración sin documentos; el mensaje es opcional.
export class RequestIdentityDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  mensaje?: string;
}
