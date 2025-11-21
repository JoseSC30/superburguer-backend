import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsPositive, ValidateNested } from 'class-validator';

class OrderItemDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  userId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
