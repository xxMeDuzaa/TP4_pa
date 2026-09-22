import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsString, IsNotEmpty, ValidateNested, IsPositive } from 'class-validator';

export class PaymentItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsPositive()
  price: number; // Viene en unidades normales (ej: 20)

  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreatePaymentSessionDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  currency: string; // Ej: 'usd'

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items: PaymentItemDto[];
}