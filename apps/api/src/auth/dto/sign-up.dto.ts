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

export enum OAuthProvider {
    GOOGLE = 'google',
    APPLE = 'apple',
    GITHUB = 'github',
}

export class SignUpDto {
    @IsEnum(AuthType)
    @IsNotEmpty()
    authType: AuthType;

    // Required for email auth, optional fallback for OAuth
    @ValidateIf((o) => o.authType === AuthType.EMAIL || o.email !== undefined)
    @IsEmail()
    @IsNotEmpty()
    email?: string;

    // Required for email auth, optional fallback for OAuth
    @ValidateIf(
        (o) => o.authType === AuthType.EMAIL || o.firstName !== undefined,
    )
    @IsString()
    @IsNotEmpty()
    firstName?: string;

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

    // 5. OAuth provider is required when authType is 'oauth'
    @ValidateIf((o) => o.authType === AuthType.OAUTH)
    @IsEnum(OAuthProvider)
    @IsNotEmpty()
    provider?: OAuthProvider;

    // 6. Provider Token (from OAuth) is ONLY required if authType is 'oauth'
    @ValidateIf((o) => o.authType === AuthType.OAUTH)
    @IsString()
    @IsNotEmpty()
    providerToken?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;
}
