import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  Disponibilidad,
  ObjetivoUsuario,
  RangoPresupuesto,
} from '../../generated/prisma/client';
import { communeNames, normalizeCommune } from '../jobs/communes';

const trimList = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((item: unknown) =>
        typeof item === 'string' ? item.trim() : item,
      )
    : value;

export class GuardarPreferenciasDto {
  @IsEnum(ObjetivoUsuario, {
    message: 'Selecciona qué quieres hacer en ServiciosYa.',
  })
  goal!: ObjetivoUsuario;

  @Transform(trimList)
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos una categoría.' })
  @ArrayMaxSize(10, { message: 'Puedes elegir hasta 10 categorías.' })
  @ArrayUnique()
  @IsString({ each: true })
  @Length(2, 60, { each: true })
  categories!: string[];

  @IsOptional()
  @Matches(/^\d{1,2}$/, { message: 'La región no es válida.' })
  regionId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeCommune(value))
  @IsIn([...communeNames], {
    message: 'Selecciona una comuna válida de Chile.',
  })
  commune?: string;

  @IsOptional()
  @IsEnum(RangoPresupuesto, { message: 'El rango de precios no es válido.' })
  budgetRange?: RangoPresupuesto;

  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsEnum(Disponibilidad, {
    each: true,
    message: 'La disponibilidad no es válida.',
  })
  availability!: Disponibilidad[];
}
