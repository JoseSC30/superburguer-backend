import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
    //Agregar el atributo active que es booleano opcional
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}