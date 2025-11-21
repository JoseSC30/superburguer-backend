import { IsOptional, IsString } from "class-validator";

export class CreateUserDto {
    @IsOptional()
    @IsString()
    telegramId: string;
    
    @IsOptional()
    @IsString()
    name: string;
}
