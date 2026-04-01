import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    ValidateIf,
} from 'class-validator';

export enum AuthType {
    EMAIL = 'email',
    OAUTH = 'oauth',
}

export class SignUpDto {
    @IsEnum(AuthType)
    @IsNotEmpty()
    authType: AuthType;

    // 1. Email is ALWAYS required in your schema
    @IsEmail()
    @IsNotEmpty()
    email: string;

    // 2. First Name is ALWAYS required (mapped to profiles.firstName)
    @IsString()
    @IsNotEmpty()
    firstName: string;

    // 3. Last Name is Optional (mapped to profiles.lastName)
    @IsOptional()
    @IsString()
    lastName?: string;

    // 4. Password is ONLY required if they are not using Google/Apple
    @ValidateIf((o) => o.authType === AuthType.EMAIL)
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @IsNotEmpty()
    password?: string;

    // 5. Provider Token (from OAuth) is ONLY required if authType is 'oauth'
    @ValidateIf((o) => o.authType === AuthType.OAUTH)
    @IsString()
    @IsNotEmpty()
    providerToken?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;
}
