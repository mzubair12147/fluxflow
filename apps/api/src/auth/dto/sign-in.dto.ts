import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsString,
    ValidateIf,
} from 'class-validator';
import { AuthType, OAuthProvider } from './sign-up.dto';

export class SignInDto {
    @IsEnum(AuthType)
    @IsNotEmpty()
    authType: AuthType;

    @ValidateIf((o) => o.authType === AuthType.EMAIL || o.email !== undefined)
    @IsEmail()
    @IsNotEmpty()
    email?: string;

    // Required for email/password login
    @ValidateIf((o) => o.authType === AuthType.EMAIL)
    @IsNotEmpty()
    @IsString()
    password?: string;

    // Required for OAuth login
    @ValidateIf((o) => o.authType === AuthType.OAUTH)
    @IsEnum(OAuthProvider)
    @IsNotEmpty()
    provider?: OAuthProvider;

    // Required for OAuth login
    @ValidateIf((o) => o.authType === AuthType.OAUTH)
    @IsNotEmpty()
    @IsString()
    providerToken?: string;
}
