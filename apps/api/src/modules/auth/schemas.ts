import { z } from "zod";

const nameSchema = z.string().trim().min(2).max(100);
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/\d/);
const courseIdSchema = z.number().int().positive().max(2_147_483_647);

export const signupBodySchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    courseId: courseIdSchema,
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export const updateProfileBodySchema = z
  .object({
    name: nameSchema.optional(),
    courseId: courseIdSchema.optional(),
  })
  .strict()
  .refine(({ name, courseId }) => name !== undefined || courseId !== undefined);

export const invalidSignupInputError = {
  code: "INVALID_SIGNUP_INPUT",
  message: "Signup requires a valid name, email, password, and courseId.",
};

export const invalidLoginInputError = {
  code: "INVALID_LOGIN_INPUT",
  message: "Login requires a valid email and password.",
};

export const invalidCredentialsError = {
  code: "INVALID_CREDENTIALS",
  message: "Invalid email or password.",
};

export const emailAlreadyRegisteredError = {
  code: "EMAIL_ALREADY_REGISTERED",
  message: "Email is already registered.",
};

export const courseNotFoundError = {
  code: "COURSE_NOT_FOUND",
  message: "Course not found.",
};

export const invalidProfileUpdateError = {
  code: "INVALID_PROFILE_UPDATE",
  message: "Profile update must contain only a valid name and/or student courseId.",
};
