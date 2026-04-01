import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';
import { AuthType } from './sign-up.dto';

export class SignInDto {
    @IsEnum(AuthType)
    @IsNotEmpty()
    authType: AuthType;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    // Optional because OAuth logins don't send passwords
    @IsOptional()
    @IsString()
    password?: string;

    // Optional because standard logins don't send provider tokens
    @IsOptional()
    @IsString()
    providerToken?: string;
}
