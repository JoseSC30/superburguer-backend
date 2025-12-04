import { IsString, MinLength } from 'class-validator';

export class LoginDriverDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;
}
