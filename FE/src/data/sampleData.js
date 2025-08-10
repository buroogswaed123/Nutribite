

// Sample Recipes
// Sample Recipes
export const sampleRecipes = [
  {
    id: 'recipe-1',
    name: 'Avocado Toast with Egg',
    description: 'A simple, nutritious breakfast that combines creamy avocado with protein-rich eggs on whole grain toast.',
    imageUrl: 'https://images.pexels.com/photos/704569/pexels-photo-704569.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    prepTime: 5,
    cookTime: 5,
    servings: 1,
    ingredients: [
      {
        id: 'ingredient-1',
        name: 'Whole grain bread',
        amount: 1,
        unit: 'slice',
        calories: 80,
        nutrition: { protein: 4, carbs: 15, fat: 1 },
      },
      {
        id: 'ingredient-2',
        name: 'Avocado',
        amount: 0.5,
        unit: 'whole',
        calories: 114,
        nutrition: { protein: 1.5, carbs: 6, fat: 10.5 },
      },
      {
        id: 'ingredient-3',
        name: 'Egg',
        amount: 1,
        unit: 'large',
        calories: 72,
        nutrition: { protein: 6.3, carbs: 0.4, fat: 5 },
      },
      {
        id: 'ingredient-4',
        name: 'Salt and pepper',
        amount: 1,
        unit: 'pinch',
        calories: 0,
        nutrition: { protein: 0, carbs: 0, fat: 0 },
      },
    ],
    instructions: [
      'Toast the bread until golden and firm.',
      'While the bread is toasting, mash the avocado in a small bowl with a fork.',
      'Fry the egg to your liking (sunny side up recommended).',
      'Spread the mashed avocado on the toast.',
      'Top with the fried egg, and season with salt and pepper to taste.',
    ],
    nutrition: {
      calories: 266,
      protein: 11.8,
      carbs: 21.4,
      fat: 16.5,
      fiber: 6.7,
      sugar: 1.2,
      sodium: 210,
    },
    tags: ['breakfast', 'vegetarian', 'high-protein', 'quick'],
    difficulty: 'easy',
  },
  // ... (other recipes unchanged)
];

// Sample Meals
export const sampleMeals = [
  {
    id: 'meal-1',
    name: 'Breakfast',
    type: 'breakfast',
    recipes: [sampleRecipes[0]], // Avocado Toast with Egg
    calories: sampleRecipes[0].nutrition.calories,
    nutrition: {
      protein: sampleRecipes[0].nutrition.protein,
      carbs: sampleRecipes[0].nutrition.carbs,
      fat: sampleRecipes[0].nutrition.fat,
    },
    imageUrl: sampleRecipes[0].imageUrl,
  },
  // ... (other meals unchanged)
];

// Sample Meal Plans
export const sampleMealPlans = [
  {
    id: 'plan-1',
    name: '1800 Calorie Balanced Plan',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    meals: [sampleMeals[0], sampleMeals[2], sampleMeals[3]],
    totalCalories: sampleMeals[0].calories + sampleMeals[2].calories + sampleMeals[3].calories,
    nutrition: {
      protein: sampleMeals[0].nutrition.protein + sampleMeals[2].nutrition.protein + sampleMeals[3].nutrition.protein,
      carbs: sampleMeals[0].nutrition.carbs + sampleMeals[2].nutrition.carbs + sampleMeals[3].nutrition.carbs,
      fat: sampleMeals[0].nutrition.fat + sampleMeals[2].nutrition.fat + sampleMeals[3].nutrition.fat,
    },
    dietType: 'balanced',
    targetCalories: 1800,
    numberOfMeals: 3,
  },
  {
    id: 'plan-2',
    name: '2000 Calorie High Protein Plan',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    meals: sampleMeals,
    totalCalories: sampleMeals.reduce((sum, meal) => sum + meal.calories, 0),
    nutrition: {
      protein: sampleMeals.reduce((sum, meal) => sum + meal.nutrition.protein, 0),
      carbs: sampleMeals.reduce((sum, meal) => sum + meal.nutrition.carbs, 0),
      fat: sampleMeals.reduce((sum, meal) => sum + meal.nutrition.fat, 0),
    },
    dietType: 'high-protein',
    targetCalories: 2000,
    numberOfMeals: 4,
  },
];