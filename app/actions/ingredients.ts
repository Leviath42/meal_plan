export type IngredientFormState = {
  errors?: Record<string, string[]>;
} | null;

export async function createIngredient(
  prevState: IngredientFormState,
  formData: FormData
): Promise<IngredientFormState> {
  const parsed = ingredientInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.insert(ingredients).values(parsed.data);
  } catch {
    return { errors: { name: ['Cet ingrédient existe déjà'] } };
  }

  revalidatePath('/ingredients');
  redirect('/ingredients');
}