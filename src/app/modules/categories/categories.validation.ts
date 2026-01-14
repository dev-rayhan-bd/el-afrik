import { z } from "zod";

export const CategoryCreateSchema = z
  .object({

      categoryName: z.string().min(1),


  })
 
