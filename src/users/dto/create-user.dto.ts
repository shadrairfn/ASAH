import { IsDate, IsEmail, IsEnum, IsNotEmpty, IsString, IsTimeZone } from "class-validator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    id_user: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    image: Express.Multer.File;

    @IsDate()
    birth_date: Date;

    @IsEnum(["male", "female", "other"], {
        message: 'Valid gender required'
    })
    gender_type: "male" | "female" | "other";

    @IsEnum(["user", "admin", "institution_admin"], {
        message: 'Valid role required'
    })
    role: "user" | "admin" | "institution_admin";

    @IsString()
    refresh_token: string;

    @IsTimeZone()
    created_at: string;

    @IsTimeZone()
    updated_at: string;
}