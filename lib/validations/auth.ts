import { z } from "zod";
import { usernameSchema } from "./username";

export const signUpSchema = z.object({
  username: usernameSchema,
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
