import { IsDate, IsEmail, IsEnum, IsNotEmpty, IsString, IsTimeZone } from "class-validator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    image: string;

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

    @IsTimeZone()
    created_at: string;

    @IsTimeZone()
    updated_at: string;
}